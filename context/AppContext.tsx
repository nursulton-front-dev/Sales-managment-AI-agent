'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';

export type PlanType = 'TRIAL' | 'START' | 'BUSINESS' | 'PRO';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  companyName: string;
  isDemo: boolean;
  emailVerified?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  niche: string;
  nicheId: 'courses' | 'clinic' | 'beauty' | 'ecommerce' | string;
  systemPrompt: string;
  priceList: string;
  qualificationQuestions: string[];
  telegramToken?: string;
  googleCalendarEnabled: boolean;
  autoReminderEnabled: boolean;
  isActive: boolean;
  tokensUsed: number;
  conversionRate: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  clientName: string;
  channel: 'Telegram' | 'Instagram';
  status: 'Новый' | 'Квалифицирован' | 'Записан в календарь';
  appointmentDate: string | null;
  tokensSpent: number;
  contact: string;
  notes?: string;
  createdAt: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  user: UserProfile | null;
  isDemoMode: boolean;
  plan: PlanType;
  trialDaysLeft: number;
  tokenBalance: number;
  agents: Agent[];
  leads: Lead[];
  activeAgent: Agent | null;
  isSandboxOpen: boolean;
  sandboxAgent: Agent | null;
  toasts: ToastMessage[];
  addTokens: (amount: number, description?: string) => void;
  deductTokens: (amount: number, reason: string) => boolean;
  createAgent: (data: Omit<Agent, 'id' | 'createdAt' | 'tokensUsed' | 'conversionRate'>) => Agent;
  toggleAgentStatus: (id: string) => void;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Lead;
  updateLeadStatus: (id: string, status: Lead['status']) => void;
  setPlan: (plan: PlanType) => void;
  openSandbox: (agentId?: string) => void;
  closeSandbox: () => void;
  showToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  loginDemo: (email?: string, company?: string) => void;
  emailVerified: boolean;
  verifyEmail: (code: string) => Promise<boolean>;
  sendVerificationCode: () => Promise<string | null>;
  setWorkspace: (ws: { id: string; companyName: string; ownerName: string; ownerEmail: string; plan: string; tokenBalance: number; emailVerified?: boolean }) => void;
  logout: () => void;
  isGoogleCalendarConnected: boolean;
  isCalendarModalOpen: boolean;
  openCalendarModal: () => void;
  closeCalendarModal: () => void;
  connectGoogleCalendar: () => void;
  disconnectGoogleCalendar: () => void;
}

const DEFAULT_AGENTS: Agent[] = [];
const DEFAULT_LEADS: Lead[] = [];
const DEFAULT_USER: UserProfile | null = null;

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [plan, setPlanState] = useState<PlanType>("TRIAL");
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(3);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);
  const [sandboxAgentId, setSandboxAgentId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load state from localStorage & backend on client mount
  useEffect(() => {
    let currentWsId: string | undefined;
    try {
      const savedUserStr = localStorage.getItem("ai_os_user");
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

      // Purge stale mock users and data
      if (savedUser && (savedUser.id === "usr_demo_01" || savedUser.companyName === "EduCenter Global")) {
        localStorage.removeItem("ai_os_user");
        localStorage.removeItem("ai_os_agents");
        localStorage.removeItem("ai_os_leads");
        localStorage.removeItem("ai_os_workspace");
        localStorage.removeItem("ai_os_tokens");
        localStorage.removeItem("ai_os_email_verified");
        localStorage.removeItem("ai_os_gcal_connected");
      } else if (savedUser) {
        currentWsId = savedUser.id;
        setUser(savedUser);
        const savedPlan = localStorage.getItem("ai_os_plan");
        const savedTokens = localStorage.getItem("ai_os_tokens");
        const savedVerified = localStorage.getItem("ai_os_email_verified");
        const savedGCal = localStorage.getItem("ai_os_gcal_connected");
        if (savedPlan) setPlanState(savedPlan as PlanType);
        if (savedTokens) setTokenBalance(Number(savedTokens));
        if (savedVerified !== null) setEmailVerified(savedVerified === "true");
        if (savedGCal !== null) setIsGoogleCalendarConnected(savedGCal === "true");
      }
    } catch {
      // ignore
    } finally {
      setIsInitialized(true);
    }

    // Sync from server via session cookie
    fetch('/api/workspace/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.workspace) {
          const ws = data.workspace;
          const userProfile: UserProfile = {
            id: ws.id,
            email: ws.ownerEmail,
            name: ws.ownerName,
            companyName: ws.companyName,
            isDemo: false,
            emailVerified: Boolean(ws.emailVerified),
          };
          setUser(userProfile);
          setPlanState((ws.plan || 'TRIAL').toUpperCase() as PlanType);
          setTokenBalance(ws.tokenBalance ?? 0);
          setEmailVerified(Boolean(ws.emailVerified));
          setIsGoogleCalendarConnected(Boolean(ws.googleCalendarConnected));

          // Load live leads and agents for this workspace
          fetch('/api/leads?workspaceId=' + ws.id)
            .then((r) => r.json())
            .then((leadData) => {
              if (leadData.success && Array.isArray(leadData.leads)) {
                const mappedLeads: Lead[] = leadData.leads.map((l: any) => ({
                  id: l.id,
                  clientName: l.clientName,
                  channel: (l.channel as 'Telegram' | 'Instagram') || 'Telegram',
                  status: l.status === 'booked' ? 'Записан в календарь' : l.status === 'qualified' ? 'Квалифицирован' : 'Новый',
                  appointmentDate: l.appointmentTime ? new Date(l.appointmentTime).toISOString() : null,
                  tokensSpent: l.tokensSpent || 0,
                  contact: l.clientPhone || '@unknown',
                  notes: l.status === 'booked' ? 'Забронирован слот в Google Календаре' : 'Квалификация через ИИ-сотрудника',
                  createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
                }));
                setLeads(mappedLeads);
              }
            })
            .catch(() => {});

          fetch('/api/agents?workspaceId=' + ws.id)
            .then((r) => r.json())
            .then((agentData) => {
              if (agentData.success && Array.isArray(agentData.agents)) {
                const mappedAgents: Agent[] = agentData.agents.map((a: any) => ({
                  id: a.id,
                  name: a.name,
                  niche: a.nicheTemplate,
                  nicheId: a.nicheTemplate,
                  systemPrompt: a.systemPrompt,
                  priceList: a.knowledgeBase || '',
                  qualificationQuestions: a.qualificationQuestions || [],
                  telegramToken: a.tgBotToken || undefined,
                  googleCalendarEnabled: Boolean(a.googleCalendarConnected),
                  autoReminderEnabled: true,
                  isActive: Boolean(a.isActive),
                  tokensUsed: 0,
                  conversionRate: '0.0%',
                  createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
                }));
                setAgents(mappedAgents);
              }
            })
            .catch(() => {});
        } else if (data.success === false) {
          // If server reports workspace no longer exists (e.g. DB was wiped), purge client cache
          setUser(null);
          setAgents([]);
          setLeads([]);
          setTokenBalance(0);
          setEmailVerified(false);
          setIsGoogleCalendarConnected(false);
          try {
            localStorage.removeItem('ai_os_user');
            localStorage.removeItem('ai_os_workspace');
            localStorage.removeItem('ai_os_tokens');
            localStorage.removeItem('ai_os_plan');
            localStorage.removeItem('ai_os_agents');
            localStorage.removeItem('ai_os_leads');
            localStorage.removeItem('ai_os_email_verified');
            localStorage.removeItem('ai_os_gcal_connected');
            document.cookie = 'ai_os_workspace_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      if (user) localStorage.setItem('ai_os_user', JSON.stringify(user));
      localStorage.setItem('ai_os_plan', plan);
      localStorage.setItem('ai_os_tokens', tokenBalance.toString());
      localStorage.setItem('ai_os_agents', JSON.stringify(agents));
      localStorage.setItem('ai_os_leads', JSON.stringify(leads));
    } catch {
      // ignore
    }
  }, [user, plan, tokenBalance, agents, leads, isInitialized]);

  const showToast = (title: string, description?: string, type: ToastMessage['type'] = 'success') => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addTokens = (amount: number, description?: string) => {
    setTokenBalance((prev) => {
      const next = prev + amount;
      return next;
    });
    showToast(
      `⚡ Баланс пополнен на +${amount.toLocaleString()} токенов!`,
      description || 'Токены готовы к расходу на диалоги и авто-записи.',
      'success'
    );
  };

  const deductTokens = (amount: number, reason: string): boolean => {
    if (tokenBalance < amount) {
      showToast(
        'Недостаточно токенов!',
        `Требуется ${amount} токенов, на балансе: ${tokenBalance}. Пополните баланс в разделе "Тарифы".`,
        'error'
      );
      return false;
    }

    setTokenBalance((prev) => Math.max(0, prev - amount));
    return true;
  };

  const createAgent = (data: Omit<Agent, 'id' | 'createdAt' | 'tokensUsed' | 'conversionRate'>): Agent => {
    const newAgent: Agent = {
      ...data,
      id: 'agent-' + Date.now(),
      tokensUsed: 0,
      conversionRate: '0.0%',
      createdAt: new Date().toISOString()
    };
    setAgents((prev) => [newAgent, ...prev]);

    fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: user?.id || 'ws_edu_01',
        name: newAgent.name,
        nicheTemplate: newAgent.nicheId,
        knowledgeBase: newAgent.priceList,
        qualificationQuestions: newAgent.qualificationQuestions,
        systemPrompt: newAgent.systemPrompt,
        tgBotToken: newAgent.telegramToken,
        googleCalendarConnected: newAgent.googleCalendarEnabled,
        isActive: newAgent.isActive,
      }),
    }).catch(() => {});

    showToast(
      '🤖 Агент успешно создан!',
      `"${newAgent.name}" готов к работе и квалификации клиентов.`,
      'success'
    );
    return newAgent;
  };

  const toggleAgentStatus = (id: string) => {
    let newStatus = true;
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const next = !a.isActive;
          newStatus = next;
          showToast(
            next ? 'Агент активирован' : 'Агент приостановлен',
            `Статус агента "${a.name}" изменен.`,
            'info'
          );
          return { ...a, isActive: next };
        }
        return a;
      })
    );

    // Sync with backend
    fetch('/api/agents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: newStatus }),
    }).catch(() => {});
  };

  const addLead = (leadData: Omit<Lead, 'id' | 'createdAt'>): Lead => {
    const newLead: Lead = {
      ...leadData,
      id: 'lead-' + Date.now(),
      createdAt: new Date().toISOString()
    };
    setLeads((prev) => [newLead, ...prev]);

    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: user?.id || 'ws_edu_01',
        clientName: leadData.clientName,
        clientPhone: leadData.contact,
        channel: leadData.channel,
        status: leadData.status === 'Записан в календарь' ? 'booked' : leadData.status === 'Квалифицирован' ? 'qualified' : 'new',
        appointmentTime: leadData.appointmentDate,
        tokensSpent: leadData.tokensSpent,
      }),
    }).catch(() => {});

    return newLead;
  };

  const updateLeadStatus = (id: string, status: Lead['status']) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
    showToast('Статус лида обновлен', `Новый статус: ${status}`, 'info');

    // Async backend update
    fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        status: status === 'Записан в календарь' ? 'booked' : status === 'Квалифицирован' ? 'qualified' : 'new',
      }),
    }).catch(() => {});
  };

  const setPlan = (newPlan: PlanType) => {
    setPlanState(newPlan);
    let bonus = 0;
    if (newPlan === 'START') bonus = 2000;
    if (newPlan === 'BUSINESS') bonus = 6000;
    if (newPlan === 'PRO') bonus = 15000;
    if (bonus > 0) {
      setTokenBalance((prev) => prev + bonus);
    }
    showToast(
      `Тариф изменен на ${newPlan}!`,
      `Вам начислено +${bonus.toLocaleString()} токенов согласно тарифу.`,
      'success'
    );
  };

  const openSandbox = (agentId?: string) => {
    if (agentId) {
      setSandboxAgentId(agentId);
    } else if (agents.length > 0) {
      setSandboxAgentId(agents[0].id);
    }
    setIsSandboxOpen(true);
  };

  const closeSandbox = () => {
    setIsSandboxOpen(false);
  };

  const loginDemo = (email?: string, company?: string) => {
    const demoUser: UserProfile = {
      id: 'usr_' + Date.now(),
      email: email || 'demo@business-os.ai',
      name: 'Демо Пользователь',
      companyName: company || 'Тестовая Компания',
      isDemo: true
    };
    setUser(demoUser);
    setIsDemoMode(true);
    setTokenBalance(100);
    setTrialDaysLeft(3);
    showToast('Добро пожаловать в Демо-режим!', 'Вам начислено 100 бонусных токенов и 3 дня бесплатного доступа.', 'success');
  };

  const setWorkspace = (ws: {
    id: string;
    companyName: string;
    ownerName: string;
    ownerEmail: string;
    plan: string;
    tokenBalance: number;
    emailVerified?: boolean;
  }) => {
    const isVerified = ws.emailVerified !== undefined ? ws.emailVerified : false;
    const newUser: UserProfile = {
      id: ws.id,
      email: ws.ownerEmail,
      name: ws.ownerName,
      companyName: ws.companyName,
      isDemo: false,
      emailVerified: isVerified,
    };
    setUser(newUser);
    setPlanState((ws.plan.toUpperCase() as PlanType) || 'TRIAL');
    setTokenBalance(ws.tokenBalance);
    setEmailVerified(isVerified);
    setIsDemoMode(false);
    try {
      localStorage.setItem('ai_os_user', JSON.stringify(newUser));
      localStorage.setItem('ai_os_plan', ws.plan.toUpperCase());
      localStorage.setItem('ai_os_tokens', ws.tokenBalance.toString());
      localStorage.setItem('ai_os_workspace', JSON.stringify(ws));
      localStorage.setItem('ai_os_email_verified', isVerified ? 'true' : 'false');
    } catch {
      // ignore
    }
    showToast(
      `Кабинет: ${ws.companyName}`,
      `Вы переключились на организацию ${ws.companyName}. Баланс: ${ws.tokenBalance} токенов.`,
      'success'
    );
  };

  const verifyEmail = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          workspaceId: user?.id,
          code,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast('Ошибка подтверждения', data.error || 'Неверный код', 'error');
        return false;
      }
      setEmailVerified(true);
      if (data.workspace?.tokenBalance !== undefined) {
        setTokenBalance(data.workspace.tokenBalance);
      } else {
        setTokenBalance((prev) => (prev === 0 ? 100 : prev));
      }
      try {
        localStorage.setItem('ai_os_email_verified', 'true');
        if (data.workspace?.tokenBalance) {
          localStorage.setItem('ai_os_tokens', data.workspace.tokenBalance.toString());
        }
      } catch {
        // ignore
      }
      showToast('🎉 Email подтвержден!', 'Вам начислено 100 бонусных токенов!', 'success');
      return true;
    } catch (err: any) {
      showToast('Ошибка', err.message || 'Сбой сети', 'error');
      return false;
    }
  };

  const sendVerificationCode = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email,
          workspaceId: user?.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Код отправлен!', data.message || 'Проверьте ваш Email', 'info');
        return data.code || null;
      }
      return null;
    } catch {
      return null;
    }
  };

  const openCalendarModal = () => setIsCalendarModalOpen(true);
  const closeCalendarModal = () => setIsCalendarModalOpen(false);

  const connectGoogleCalendar = () => {
    setIsGoogleCalendarConnected(true);
    setIsCalendarModalOpen(false);
    try {
      localStorage.setItem('ai_os_gcal_connected', 'true');
    } catch {}
    showToast(
      'Google Календарь подключен!',
      'Синхронизация активна: ИИ проверяет свободные слоты (10:00–18:00) и вносит авто-записи.',
      'success'
    );
  };

  const disconnectGoogleCalendar = () => {
    setIsGoogleCalendarConnected(false);
    try {
      localStorage.setItem('ai_os_gcal_connected', 'false');
    } catch {}
    showToast('Google Календарь отключен', undefined, 'info');
  };

  const logout = () => {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      if (supabase) supabase.auth.signOut();
    }
    setUser(null);
    setAgents([]);
    setLeads([]);
    setTokenBalance(0);
    setEmailVerified(false);
    setIsDemoMode(false);
    setIsGoogleCalendarConnected(false);
    try {
      localStorage.removeItem('ai_os_user');
      localStorage.removeItem('ai_os_workspace');
      localStorage.removeItem('ai_os_tokens');
      localStorage.removeItem('ai_os_plan');
      localStorage.removeItem('ai_os_agents');
      localStorage.removeItem('ai_os_leads');
      localStorage.removeItem('ai_os_email_verified');
      localStorage.removeItem('ai_os_gcal_connected');
    } catch {
      // ignore
    }
    showToast('Вы вышли из системы', undefined, 'info');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const activeAgent = agents.find((a) => a.isActive) || agents[0] || null;
  const sandboxAgent = agents.find((a) => a.id === sandboxAgentId) || activeAgent;

  return (
    <AppContext.Provider
      value={{
        user,
        isDemoMode,
        plan,
        trialDaysLeft,
        tokenBalance,
        agents,
        leads,
        activeAgent,
        isSandboxOpen,
        sandboxAgent,
        toasts,
        addTokens,
        deductTokens,
        createAgent,
        toggleAgentStatus,
        addLead,
        updateLeadStatus,
        setPlan,
        openSandbox,
        closeSandbox,
        showToast,
        removeToast,
        loginDemo,
        emailVerified,
        verifyEmail,
        sendVerificationCode,
        setWorkspace,
        logout,
        isGoogleCalendarConnected,
        isCalendarModalOpen,
        openCalendarModal,
        closeCalendarModal,
        connectGoogleCalendar,
        disconnectGoogleCalendar,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppContextProvider');
  }
  return context;
}
