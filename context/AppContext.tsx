'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { authClient } from '@/lib/auth-client';

export type PlanType = 'TRIAL' | 'START' | 'BUSINESS' | 'PRO';
export interface UserProfile { id: string; email: string; name: string; companyName: string; isDemo: boolean; emailVerified?: boolean; role?: string; }
export interface Agent {
  id: string; name: string; niche: string; nicheId: string; systemPrompt: string; priceList: string;
  qualificationQuestions: string[]; telegramToken?: string; telegramConnected?: boolean; telegramUsername?: string | null;
  googleCalendarEnabled: boolean; autoReminderEnabled: boolean; isActive: boolean;
  tokensUsed: number; conversionRate: string; createdAt: string;
}
export interface Lead {
  id: string; clientName: string; channel: 'Telegram' | 'Instagram';
  status: 'Новый' | 'Квалифицирован' | 'Записан в календарь';
  appointmentDate: string | null; tokensSpent: number; contact: string; notes?: string; createdAt: string;
}
export interface ToastMessage { id: string; title: string; description?: string; type: 'success' | 'info' | 'warning' | 'error'; }
interface WorkspaceData { subscriptionActive?: boolean; trialDaysLeft?: number; id: string; companyName: string; ownerName: string; ownerEmail: string; plan: string; tokenBalance: number; emailVerified?: boolean; googleCalendarConnected?: boolean; subExpiresAt?: string | null; status?: string; instagramConnected?: boolean; instagramAgentId?: string | null; }
interface AgentData { id: string; name: string; nicheTemplate: string; systemPrompt: string; knowledgeBase?: string; qualificationQuestions?: string[]; telegramConnected?: boolean; telegramUsername?: string | null; googleCalendarConnected?: boolean; isActive?: boolean; createdAt: string; }
interface LeadData { id: string; clientName: string; channel: Lead['channel']; status: string; appointmentTime?: string; tokensSpent?: number; clientPhone?: string; createdAt: string; }
type NewAgent = Omit<Agent, 'id' | 'createdAt' | 'tokensUsed' | 'conversionRate'>;
type NewLead = Omit<Lead, 'id' | 'createdAt'>;
interface AppContextType {
  user: UserProfile | null; isDemoMode: boolean; plan: PlanType; trialDaysLeft: number; tokenBalance: number;
  workspace: WorkspaceData | null; workspaceLoading: boolean; workspaceError: string | null; isSuperAdmin: boolean; isImpersonating: boolean; supportSessionReason: string;
  agents: Agent[]; leads: Lead[]; agentsLoading: boolean; leadsLoading: boolean; agentsError: string | null; leadsError: string | null;
  activeAgent: Agent | null; isSandboxOpen: boolean; sandboxAgent: Agent | null; toasts: ToastMessage[];
  createAgent: (data: NewAgent) => Promise<Agent>; toggleAgentStatus: (id: string) => Promise<void>;
  addLead: (data: NewLead) => Promise<Lead>; updateLeadStatus: (id: string, status: Lead['status']) => Promise<void>;
  refreshWorkspace: () => Promise<void>; refreshAgents: () => Promise<void>; refreshLeads: () => Promise<void>;
  setPlan: (plan: PlanType) => void; openSandbox: (id?: string) => void; closeSandbox: () => void;
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void; removeToast: (id: string) => void;
  emailVerified: boolean; verifyEmail: (code: string) => Promise<boolean>; sendVerificationCode: () => Promise<string | null>;
  setWorkspace: (workspace: WorkspaceData) => void; logout: () => Promise<void>;
  isGoogleCalendarConnected: boolean; isCalendarModalOpen: boolean; openCalendarModal: () => void; closeCalendarModal: () => void;
  connectGoogleCalendar: () => void; disconnectGoogleCalendar: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const statusToServer = (status: Lead['status']) => status === 'Записан в календарь' ? 'booked' : status === 'Квалифицирован' ? 'qualified' : 'new';
const mapAgent = (a: AgentData): Agent => ({ id: a.id, name: a.name, niche: a.nicheTemplate, nicheId: a.nicheTemplate, systemPrompt: a.systemPrompt, priceList: a.knowledgeBase || '', qualificationQuestions: a.qualificationQuestions || [], telegramConnected: Boolean(a.telegramConnected), telegramUsername: a.telegramUsername, googleCalendarEnabled: Boolean(a.googleCalendarConnected), autoReminderEnabled: false, isActive: Boolean(a.isActive), tokensUsed: 0, conversionRate: '', createdAt: a.createdAt });
const mapLead = (l: LeadData): Lead => ({ id: l.id, clientName: l.clientName, channel: l.channel, status: l.status === 'booked' ? 'Записан в календарь' : l.status === 'qualified' ? 'Квалифицирован' : 'Новый', appointmentDate: l.appointmentTime || null, tokensSpent: l.tokensSpent || 0, contact: l.clientPhone || '', createdAt: l.createdAt });

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok || data.success === false) throw new Error(data.error || 'Не удалось загрузить данные. Попробуйте ещё раз.');
  return data as T;
}
const jsonRequest = (method: string, body: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [workspace, saveWorkspace] = useState<WorkspaceData | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [supportSession, setSupportSession] = useState({ isImpersonating: false, reason: '' });
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxAgentId, setSandboxAgentId] = useState<string | null>(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const pending = useRef(new Set<string>());
  const removeToast = useCallback((id: string) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const showToast = useCallback((title: string, description?: string, type: ToastMessage['type'] = 'success') => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, title, description, type }]);
    window.setTimeout(() => removeToast(id), 4500);
  }, [removeToast]);
  const setWorkspace = useCallback((ws: WorkspaceData) => {
    saveWorkspace(ws);
    setUser((previous) => ({ id: ws.id, name: ws.ownerName, email: ws.ownerEmail, companyName: ws.companyName, isDemo: false, emailVerified: Boolean(ws.emailVerified), role: previous?.role }));
  }, []);
  const refreshWorkspace = useCallback(async () => {
    try {
      const res = await fetch('/api/workspace/settings');
      if (res.status === 401) { setUser(null); saveWorkspace(null); setIsSuperAdmin(false); setAgents([]); setLeads([]); setWorkspaceError(null); return; }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось загрузить рабочее пространство');
      setWorkspace(data.workspace);
      setSupportSession({ isImpersonating: Boolean(data.isImpersonating), reason: data.supportSessionReason || '' });
      setIsSuperAdmin(Boolean(data.isSuperAdmin));
      setUser((previous) => previous ? { ...previous, role: data.role } : previous);
      setWorkspaceError(null);
    } catch (error) { setWorkspaceError(error instanceof Error ? error.message : 'Ошибка сети'); }
    finally { setWorkspaceLoading(false); }
  }, [setWorkspace]);
  const refreshAgents = useCallback(async () => {
    try { const data = await request<{ agents: AgentData[] }>('/api/agents'); setAgents(data.agents.map(mapAgent)); setAgentsError(null); }
    catch (error) { setAgentsError(error instanceof Error ? error.message : 'Не удалось загрузить сотрудников'); }
    finally { setAgentsLoading(false); }
  }, []);
  const refreshLeads = useCallback(async () => {
    try { const data = await request<{ leads: LeadData[] }>('/api/leads'); setLeads(data.leads.map(mapLead)); setLeadsError(null); }
    catch (error) { setLeadsError(error instanceof Error ? error.message : 'Не удалось загрузить лидов'); }
    finally { setLeadsLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async API request; state is updated after the response.
  useEffect(() => { void refreshWorkspace(); }, [refreshWorkspace]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async API request; state is updated after the response.
  useEffect(() => { if (user?.id) { void refreshAgents(); void refreshLeads(); } }, [user?.id, refreshAgents, refreshLeads]);

  const createAgent = async (data: NewAgent) => {
    const result = await request<{ agent: AgentData; warning?: string }>('/api/agents', jsonRequest('POST', { name: data.name, nicheTemplate: data.nicheId, knowledgeBase: data.priceList, qualificationQuestions: data.qualificationQuestions, systemPrompt: data.systemPrompt, tgBotToken: data.telegramToken, googleCalendarConnected: data.googleCalendarEnabled, isActive: data.isActive }));
    const agent = mapAgent(result.agent); setAgents((items) => [agent, ...items]);
    showToast('Сотрудник создан', result.warning || 'Проверьте ответы в тест-драйве и подключите канал.', result.warning ? 'warning' : 'success'); return agent;
  };
  const toggleAgentStatus = async (id: string) => {
    if (pending.current.has(id)) return;
    const agent = agents.find((item) => item.id === id); if (!agent) return;
    pending.current.add(id);
    try {
      const data = await request<{ agent: AgentData }>('/api/agents', jsonRequest('PATCH', { id, isActive: !agent.isActive }));
      setAgents((items) => items.map((item) => item.id === id ? { ...mapAgent(data.agent), telegramConnected: agent.telegramConnected } : item)); showToast('Статус сохранён');
    } catch (error) { showToast('Не удалось изменить статус', error instanceof Error ? error.message : 'Ошибка сети', 'error'); }
    finally { pending.current.delete(id); }
  };
  const addLead = async (data: NewLead) => {
    const result = await request<{ lead: LeadData }>('/api/leads', jsonRequest('POST', { clientName: data.clientName, clientPhone: data.contact, channel: data.channel, status: statusToServer(data.status), appointmentTime: data.appointmentDate }));
    const lead = mapLead(result.lead); setLeads((items) => [lead, ...items]); return lead;
  };
  const updateLeadStatus = async (id: string, status: Lead['status']) => {
    if (pending.current.has(id)) return; pending.current.add(id);
    try { const data = await request<{ lead: LeadData }>('/api/leads', jsonRequest('PATCH', { id, status: statusToServer(status) })); setLeads((items) => items.map((item) => item.id === id ? mapLead(data.lead) : item)); showToast('Статус лида сохранён'); }
    catch (error) { showToast('Не удалось сохранить статус', error instanceof Error ? error.message : 'Ошибка сети', 'error'); }
    finally { pending.current.delete(id); }
  };
  const verifyEmail = async (code: string) => {
    try { await request('/api/auth/verify-email', jsonRequest('POST', { email: user?.email, workspaceId: user?.id, code })); await refreshWorkspace(); showToast('Email подтверждён'); return true; }
    catch (error) { showToast('Ошибка подтверждения', error instanceof Error ? error.message : 'Ошибка сети', 'error'); return false; }
  };
  const sendVerificationCode = async () => {
    try { await request('/api/auth/send-code', jsonRequest('POST', { email: user?.email, workspaceId: user?.id })); showToast('Код отправлен', 'Проверьте вашу почту.', 'info'); }
    catch (error) { showToast('Не удалось отправить код', error instanceof Error ? error.message : 'Ошибка сети', 'error'); }
    return null;
  };
  const logout = async () => {
    try {
      const result = await authClient.signOut(); if (result.error) throw new Error(result.error.message);
      await fetch('/api/auth/logout', { method: 'POST' });
      for (const key of Object.keys(localStorage)) if (key.startsWith('ai_os_')) localStorage.removeItem(key);
      setUser(null); saveWorkspace(null); setAgents([]); setLeads([]); window.location.assign('/login');
    } catch { showToast('Не удалось выйти', 'Попробуйте ещё раз.', 'error'); }
  };
  const activeAgent = agents.find((agent) => agent.isActive) || agents[0] || null;
  const plan = (workspace?.plan.toUpperCase() || 'TRIAL') as PlanType;
  const trialDaysLeft = workspace?.trialDaysLeft || 0;
  return <AppContext.Provider value={{ user, workspace, workspaceLoading, workspaceError, isSuperAdmin, isImpersonating: supportSession.isImpersonating, supportSessionReason: supportSession.reason, isDemoMode: false, plan, trialDaysLeft, tokenBalance: workspace?.tokenBalance ?? 0, agents, leads, agentsLoading, leadsLoading, agentsError, leadsError, activeAgent, isSandboxOpen, sandboxAgent: agents.find((agent) => agent.id === sandboxAgentId) || activeAgent, toasts, createAgent, toggleAgentStatus, addLead, updateLeadStatus, refreshWorkspace, refreshAgents, refreshLeads, setPlan: () => { void refreshWorkspace(); }, openSandbox: (id) => { setSandboxAgentId(id || activeAgent?.id || null); setIsSandboxOpen(true); }, closeSandbox: () => setIsSandboxOpen(false), showToast, removeToast, emailVerified: Boolean(workspace?.emailVerified), verifyEmail, sendVerificationCode, setWorkspace, logout, isGoogleCalendarConnected: Boolean(workspace?.googleCalendarConnected), isCalendarModalOpen, openCalendarModal: () => setIsCalendarModalOpen(true), closeCalendarModal: () => setIsCalendarModalOpen(false), connectGoogleCalendar: () => { void refreshWorkspace(); setIsCalendarModalOpen(false); }, disconnectGoogleCalendar: () => { void refreshWorkspace(); } }}>{children}</AppContext.Provider>;
}
export function useApp() { const value = useContext(AppContext); if (!value) throw new Error('useApp must be used within AppContextProvider'); return value; }
