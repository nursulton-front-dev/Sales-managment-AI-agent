import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

export const isNeonConfigured = Boolean(
  process.env.DATABASE_URL &&
  !process.env.DATABASE_URL.includes('placeholder') &&
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))
);

let dbInstance: NeonHttpDatabase<typeof schema> | null = null;

if (isNeonConfigured) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    dbInstance = drizzle(sql, { schema });
  } catch (err) {
    console.warn('Neon connection failed, falling back to local store:', err);
    dbInstance = null;
  }
}

export const db = dbInstance;

// ================= FALLBACK PERSISTENT STORE =================
// Ensures seamless out-of-the-box operation even without Neon credentials

interface DBData {
  workspaces: schema.Workspace[];
  agents: schema.Agent[];
  leads: schema.Lead[];
  tokenLogs: schema.TokenLog[];
  conversations: schema.Conversation[];
  messages: schema.Message[];
  appointments: schema.Appointment[];
  orders: schema.Order[];
  supportSessions: schema.SupportSession[];
  trialGrants: schema.TrialGrant[];
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'db_store.json');

const INITIAL_SEED: DBData = {
  workspaces: [],
  agents: [],
  leads: [],
  tokenLogs: [],
  conversations: [],
  messages: [],
  appointments: [],
  orders: [],
  supportSessions: [],
  trialGrants: [],
};

function readStore(): DBData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_SEED, null, 2), 'utf-8');
      return INITIAL_SEED;
    }
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Convert date strings back to Date objects
    if (parsed.workspaces) {
      parsed.workspaces.forEach((w: any) => {
        if (w.createdAt) w.createdAt = new Date(w.createdAt);
        if (w.subExpiresAt) w.subExpiresAt = new Date(w.subExpiresAt);
      });
    }
    if (parsed.agents) {
      parsed.agents.forEach((a: any) => {
        if (a.createdAt) a.createdAt = new Date(a.createdAt);
      });
    }
    if (parsed.leads) {
      parsed.leads.forEach((l: any) => {
        if (l.createdAt) l.createdAt = new Date(l.createdAt);
        if (l.appointmentTime) l.appointmentTime = new Date(l.appointmentTime);
      });
    }
    if (parsed.tokenLogs) {
      parsed.tokenLogs.forEach((t: any) => {
        if (t.createdAt) t.createdAt = new Date(t.createdAt);
      });
    }
    return parsed;
  } catch (err) {
    console.error('Error reading DB store:', err);
    return INITIAL_SEED;
  }
}

function writeStore(data: DBData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB store:', err);
  }
}

// ================= REPOSITORY METHODS =================

export async function getAllWorkspaces(): Promise<schema.Workspace[]> {
  if (db) {
    try {
      const rows = await db.select().from(schema.workspaces);
      return rows;
    } catch (err) {
      console.warn('Neon select workspaces error:', err);
    }
  }
  const store = readStore();
  return store.workspaces;
}

export async function getWorkspaceById(id: string): Promise<schema.Workspace | null> {
  if (db) {
    try {
      const rows = await db.select().from(schema.workspaces).where(eq(schema.workspaces.id, id));
      return rows[0] || null;
    } catch (err) {
      console.warn('Neon select workspace by id error:', err);
    }
  }
  const store = readStore();
  return store.workspaces.find((w) => w.id === id) || null;
}

export async function getWorkspaceByEmail(email: string): Promise<schema.Workspace | null> {
  if (db) {
    try {
      const rows = await db.select().from(schema.workspaces).where(eq(schema.workspaces.ownerEmail, email));
      return rows[0] || null;
    } catch (err) {
      console.warn('Neon select workspace by email error:', err);
    }
  }
  const store = readStore();
  return store.workspaces.find((w) => w.ownerEmail.toLowerCase() === email.toLowerCase()) || null;
}

export async function createWorkspace(data: schema.NewWorkspace): Promise<schema.Workspace> {
  const newWs: schema.Workspace = {
    id: data.id || `ws_${Date.now()}`,
    companyName: data.companyName,
    niche: data.niche,
    ownerName: data.ownerName,
    ownerEmail: data.ownerEmail,
    ownerPhone: data.ownerPhone,
    passwordHash: data.passwordHash,
    teamSize: data.teamSize,
    dailyLeadsVolume: data.dailyLeadsVolume,
    plan: data.plan || 'trial',
    tokenBalance: data.tokenBalance !== undefined ? data.tokenBalance : (data.emailVerified ? 100 : 0),
    status: data.status || 'active',
    emailVerified: data.emailVerified !== undefined ? data.emailVerified : false,
    verificationCode: data.verificationCode || null,
    verificationSentAt: data.verificationSentAt || new Date(),
    subExpiresAt: data.subExpiresAt || new Date(Date.now() + 86400000 * 3),
    googleCalendarConnected: data.googleCalendarConnected !== undefined ? data.googleCalendarConnected : false,
    googleCalendarEmail: data.googleCalendarEmail || null,
    googleRefreshToken: data.googleRefreshToken || null,
    googleCalendarId: data.googleCalendarId || 'primary',
    googleCalendarWorkingHours: data.googleCalendarWorkingHours || '10:00-18:00',
    googleCalendarSlotDuration: data.googleCalendarSlotDuration || 45,
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.workspaces).values(newWs);
    } catch (err) {
      console.warn('Neon insert workspace error:', err);
    }
  }

  const store = readStore();
  // Filter out any existing with same email or id
  store.workspaces = [newWs, ...store.workspaces.filter((w) => w.id !== newWs.id && w.ownerEmail !== newWs.ownerEmail)];

  if (newWs.tokenBalance > 0) {
    const bonusLog: schema.TokenLog = {
      id: `log_${Date.now()}`,
      workspaceId: newWs.id,
      actionType: 'trial_bonus',
      tokensDelta: newWs.tokenBalance,
      amountUsd: '0',
      paymentMethod: 'system',
      description: 'Бонус при регистрации организации',
      createdAt: new Date(),
    };
    store.tokenLogs.unshift(bonusLog);
  }

  writeStore(store);
  return newWs;
}

export async function updateWorkspace(id: string, updates: Partial<schema.Workspace>): Promise<schema.Workspace | null> {
  if (db) {
    try {
      await db.update(schema.workspaces).set(updates).where(eq(schema.workspaces.id, id));
    } catch (err) {
      console.warn('Neon update workspace error:', err);
    }
  }

  const store = readStore();
  let updated: schema.Workspace | null = null;
  store.workspaces = store.workspaces.map((w) => {
    if (w.id === id) {
      updated = { ...w, ...updates };
      return updated;
    }
    return w;
  });

  if (updated) {
    writeStore(store);
  }
  return updated;
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  if (db) {
    try {
      await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));
    } catch (err) {
      console.warn('Neon delete workspace error:', err);
    }
  }

  const store = readStore();
  store.workspaces = store.workspaces.filter((w) => w.id !== id);
  store.agents = store.agents.filter((a) => a.workspaceId !== id);
  store.leads = store.leads.filter((l) => l.workspaceId !== id);
  store.tokenLogs = store.tokenLogs.filter((t) => t.workspaceId !== id);
  writeStore(store);
  return true;
}

export async function clearAllTestData(): Promise<void> {
  if (db) {
    try {
      await db.delete(schema.supportMessages);
      await db.delete(schema.supportTickets);
      await db.delete(schema.adminAuditLogs);
      await db.delete(schema.messages);
      await db.delete(schema.conversations);
      await db.delete(schema.appointments);
      await db.delete(schema.orders);
      await db.delete(schema.tokenLogs);
      await db.delete(schema.leads);
      await db.delete(schema.agents);
      await db.delete(schema.supportSessions);
      await db.delete(schema.trialGrants);
      await db.delete(schema.workspaces);
    } catch (err) {
      console.warn('Neon clearAllTestData error:', err);
    }
  }
  const store = readStore();
  store.workspaces = [];
  store.agents = [];
  store.leads = [];
  store.tokenLogs = [];
  store.conversations = [];
  store.messages = [];
  store.appointments = [];
  store.orders = [];
  store.supportSessions = [];
  store.trialGrants = [];
  writeStore(store);
}

export async function getAllAgents(workspaceId?: string): Promise<schema.Agent[]> {
  if (db) {
    try {
      if (workspaceId) {
        return await db.select().from(schema.agents).where(eq(schema.agents.workspaceId, workspaceId));
      }
      return await db.select().from(schema.agents);
    } catch (err) {
      console.warn('Neon select agents error:', err);
    }
  }
  const store = readStore();
  if (workspaceId) {
    return store.agents.filter((a) => a.workspaceId === workspaceId);
  }
  return store.agents;
}

export async function createAgent(data: Partial<schema.NewAgent> & { workspaceId: string; name: string; systemPrompt: string; nicheTemplate?: string }): Promise<schema.Agent> {
  const newAgent: schema.Agent = {
    id: data.id || `agent_${Date.now()}`,
    workspaceId: data.workspaceId,
    name: data.name,
    nicheTemplate: data.nicheTemplate || 'other',
    knowledgeBase: data.knowledgeBase || '',
    qualificationQuestions: data.qualificationQuestions || [],
    systemPrompt: data.systemPrompt,
    tgBotToken: data.tgBotToken || null,
    googleCalendarConnected: data.googleCalendarConnected || false,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.agents).values(newAgent);
    } catch (err) {
      console.warn('Neon insert agent error:', err);
    }
  }

  const store = readStore();
  store.agents.unshift(newAgent);
  writeStore(store);
  return newAgent;
}

export async function updateAgent(id: string, updates: Partial<schema.Agent>): Promise<schema.Agent | null> {
  if (db) {
    try {
      await db.update(schema.agents).set(updates).where(eq(schema.agents.id, id));
    } catch (err) {
      console.warn('Neon update agent error:', err);
    }
  }

  const store = readStore();
  let updated: schema.Agent | null = null;
  store.agents = store.agents.map((a) => {
    if (a.id === id) {
      updated = { ...a, ...updates };
      return updated;
    }
    return a;
  });

  if (updated) {
    writeStore(store);
  }
  return updated;
}

export async function getAllLeads(workspaceId?: string): Promise<schema.Lead[]> {
  if (db) {
    try {
      if (workspaceId) {
        return await db.select().from(schema.leads).where(eq(schema.leads.workspaceId, workspaceId));
      }
      return await db.select().from(schema.leads);
    } catch (err) {
      console.warn('Neon select leads error:', err);
    }
  }
  const store = readStore();
  if (workspaceId) {
    return store.leads.filter((l) => l.workspaceId === workspaceId);
  }
  return store.leads;
}

export async function createLead(data: Partial<schema.NewLead> & { workspaceId: string; clientName: string; clientPhone: string; channel: string }): Promise<schema.Lead> {
  const newLead: schema.Lead = {
    id: data.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: data.workspaceId,
    agentId: data.agentId || null,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    channel: data.channel,
    status: data.status || 'new',
    appointmentTime: data.appointmentTime || null,
    googleEventId: data.googleEventId || null,
    googleEventLink: data.googleEventLink || null,
    tokensSpent: data.tokensSpent !== undefined ? data.tokensSpent : 0,
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.leads).values(newLead);
    } catch (err) {
      console.warn('Neon insert lead error:', err);
    }
  }

  const store = readStore();
  store.leads.unshift(newLead);
  writeStore(store);
  return newLead;
}

export async function updateLead(id: string, updates: Partial<schema.Lead>): Promise<schema.Lead | null> {
  if (db) {
    try {
      await db.update(schema.leads).set(updates).where(eq(schema.leads.id, id));
    } catch (err) {
      console.warn('Neon update lead error:', err);
    }
  }

  const store = readStore();
  let updated: schema.Lead | null = null;
  store.leads = store.leads.map((l) => {
    if (l.id === id) {
      updated = { ...l, ...updates };
      return updated;
    }
    return l;
  });

  if (updated) {
    writeStore(store);
  }
  return updated;
}

export async function getAllTokenLogs(workspaceId?: string): Promise<schema.TokenLog[]> {
  if (db) {
    try {
      if (workspaceId) {
        return await db.select().from(schema.tokenLogs).where(eq(schema.tokenLogs.workspaceId, workspaceId));
      }
      return await db.select().from(schema.tokenLogs);
    } catch (err) {
      console.warn('Neon select tokenLogs error:', err);
    }
  }
  const store = readStore();
  if (workspaceId) {
    return store.tokenLogs.filter((t) => t.workspaceId === workspaceId);
  }
  return store.tokenLogs;
}

export async function addTokenLog(data: schema.NewTokenLog): Promise<schema.TokenLog> {
  const newLog: schema.TokenLog = {
    id: data.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: data.workspaceId,
    actionType: data.actionType,
    tokensDelta: data.tokensDelta,
    amountUsd: data.amountUsd || '0',
    paymentMethod: data.paymentMethod || 'system',
    description: data.description || '',
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.tokenLogs).values(newLog);
    } catch (err) {
      console.warn('Neon insert tokenLog error:', err);
    }
  }

  const store = readStore();
  store.tokenLogs.unshift(newLog);
  writeStore(store);
  return newLog;
}

// ================= ATOMIC TOKEN TRANSACTION =================
export async function recordTokenTransaction({
  workspaceId,
  actionType,
  tokensDelta,
  amountUsd = '0',
  paymentMethod = 'system',
  description = '',
}: {
  workspaceId: string;
  actionType: string;
  tokensDelta: number;
  amountUsd?: string;
  paymentMethod?: string;
  description?: string;
}): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const ws = await getWorkspaceById(workspaceId);
  if (!ws) {
    return { success: false, newBalance: 0, error: 'Организация не найдена' };
  }

  const currentBalance = ws.tokenBalance ?? 0;
  const newBalance = currentBalance + tokensDelta;

  if (newBalance < 0) {
    return {
      success: false,
      newBalance: currentBalance,
      error: `Недостаточно токенов (текущий баланс: ${currentBalance}, требуется: ${Math.abs(tokensDelta)})`,
    };
  }

  // Update workspace balance
  await updateWorkspace(workspaceId, { tokenBalance: newBalance });

  // Record log
  await addTokenLog({
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspaceId,
    actionType,
    tokensDelta,
    amountUsd,
    paymentMethod,
    description,
  });

  return { success: true, newBalance };
}

// ================= CONVERSATIONS & MESSAGES =================
export async function getAllConversations(workspaceId?: string): Promise<schema.Conversation[]> {
  if (db) {
    try {
      if (workspaceId) {
        return await db.select().from(schema.conversations).where(eq(schema.conversations.workspaceId, workspaceId));
      }
      return await db.select().from(schema.conversations);
    } catch (err) {
      console.warn('Neon select conversations error:', err);
    }
  }
  const store = readStore();
  if (workspaceId) {
    return (store.conversations || []).filter((c) => c.workspaceId === workspaceId);
  }
  return store.conversations || [];
}

export async function getConversationById(id: string): Promise<schema.Conversation | null> {
  if (db) {
    try {
      const rows = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id));
      return rows[0] || null;
    } catch (err) {
      console.warn('Neon select conversation by id error:', err);
    }
  }
  const store = readStore();
  return (store.conversations || []).find((c) => c.id === id) || null;
}

export async function createConversation(data: Partial<schema.NewConversation> & {
  workspaceId: string;
  clientName: string;
  clientPhone: string;
}): Promise<schema.Conversation> {
  const newConv: schema.Conversation = {
    id: data.id || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: data.workspaceId,
    agentId: data.agentId || null,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    channel: data.channel || 'Telegram',
    status: data.status || 'active',
    lastMessageText: data.lastMessageText || '',
    lastMessageAt: new Date(),
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.conversations).values(newConv);
    } catch (err) {
      console.warn('Neon insert conversation error:', err);
    }
  }

  const store = readStore();
  if (!store.conversations) store.conversations = [];
  store.conversations.unshift(newConv);
  writeStore(store);
  return newConv;
}

export async function updateConversation(id: string, updates: Partial<schema.Conversation>): Promise<schema.Conversation | null> {
  if (db) {
    try {
      await db.update(schema.conversations).set(updates).where(eq(schema.conversations.id, id));
    } catch (err) {
      console.warn('Neon update conversation error:', err);
    }
  }

  const store = readStore();
  if (!store.conversations) store.conversations = [];
  let updated: schema.Conversation | null = null;
  store.conversations = store.conversations.map((c) => {
    if (c.id === id) {
      updated = { ...c, ...updates };
      return updated;
    }
    return c;
  });

  if (updated) {
    writeStore(store);
  }
  return updated;
}

export async function getMessagesByConversationId(conversationId: string): Promise<schema.Message[]> {
  if (db) {
    try {
      return await db.select().from(schema.messages).where(eq(schema.messages.conversationId, conversationId));
    } catch (err) {
      console.warn('Neon select messages error:', err);
    }
  }
  const store = readStore();
  return (store.messages || []).filter((m) => m.conversationId === conversationId);
}

export async function createMessage(data: Partial<schema.NewMessage> & {
  conversationId: string;
  workspaceId: string;
  sender: 'client' | 'agent' | 'human';
  text: string;
}): Promise<schema.Message> {
  const newMsg: schema.Message = {
    id: data.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    conversationId: data.conversationId,
    workspaceId: data.workspaceId,
    sender: data.sender,
    text: data.text,
    tokensCost: data.tokensCost || 0,
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.messages).values(newMsg);
      await db.update(schema.conversations).set({
        lastMessageText: newMsg.text,
        lastMessageAt: newMsg.createdAt,
      }).where(eq(schema.conversations.id, data.conversationId));
    } catch (err) {
      console.warn('Neon insert message error:', err);
    }
  }

  const store = readStore();
  if (!store.messages) store.messages = [];
  store.messages.push(newMsg);
  if (!store.conversations) store.conversations = [];
  store.conversations = store.conversations.map((c) => {
    if (c.id === data.conversationId) {
      return { ...c, lastMessageText: newMsg.text, lastMessageAt: newMsg.createdAt };
    }
    return c;
  });
  writeStore(store);
  return newMsg;
}

// ================= APPOINTMENTS =================
export async function getAllAppointments(workspaceId?: string): Promise<schema.Appointment[]> {
  if (db) {
    try {
      if (workspaceId) {
        return await db.select().from(schema.appointments).where(eq(schema.appointments.workspaceId, workspaceId));
      }
      return await db.select().from(schema.appointments);
    } catch (err) {
      console.warn('Neon select appointments error:', err);
    }
  }
  const store = readStore();
  if (workspaceId) {
    return (store.appointments || []).filter((a) => a.workspaceId === workspaceId);
  }
  return store.appointments || [];
}

export async function createAppointment(data: Partial<schema.NewAppointment> & {
  workspaceId: string;
  clientName: string;
  clientPhone: string;
  startTime: Date;
  endTime: Date;
}): Promise<schema.Appointment> {
  const newApp: schema.Appointment = {
    id: data.id || `app_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: data.workspaceId,
    leadId: data.leadId || null,
    agentId: data.agentId || null,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    serviceName: data.serviceName || 'Консультация / Пробный урок',
    specialistName: data.specialistName || 'Дежурный специалист',
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status || 'scheduled',
    googleEventId: data.googleEventId || null,
    googleEventLink: data.googleEventLink || null,
    reminderSent: data.reminderSent || false,
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.appointments).values(newApp);
    } catch (err) {
      console.warn('Neon insert appointment error:', err);
    }
  }

  const store = readStore();
  if (!store.appointments) store.appointments = [];
  store.appointments.unshift(newApp);
  writeStore(store);
  return newApp;
}

export async function updateAppointment(id: string, updates: Partial<schema.Appointment>): Promise<schema.Appointment | null> {
  if (db) {
    try {
      await db.update(schema.appointments).set(updates).where(eq(schema.appointments.id, id));
    } catch (err) {
      console.warn('Neon update appointment error:', err);
    }
  }

  const store = readStore();
  if (!store.appointments) store.appointments = [];
  let updated: schema.Appointment | null = null;
  store.appointments = store.appointments.map((a) => {
    if (a.id === id) {
      updated = { ...a, ...updates };
      return updated;
    }
    return a;
  });

  if (updated) {
    writeStore(store);
  }
  return updated;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  if (db) {
    try {
      await db.delete(schema.appointments).where(eq(schema.appointments.id, id));
    } catch (err) {
      console.warn('Neon delete appointment error:', err);
    }
  }

  const store = readStore();
  if (!store.appointments) store.appointments = [];
  store.appointments = store.appointments.filter((a) => a.id !== id);
  writeStore(store);
  return true;
}

export async function findExistingAppointment(
  workspaceId: string,
  clientPhone: string,
  startTime: Date
): Promise<schema.Appointment | null> {
  let all = await getAllAppointments(workspaceId);
  if (!all.length) {
    all = await getAllAppointments();
  }
  const targetTime = startTime.getTime();
  const clean = (p: string) => (p || '').replace(/\D/g, '');
  const targetPhone = clean(clientPhone);

  return (
    all.find((a) => {
      const matchPhone = clean(a.clientPhone) === targetPhone;
      const notCancelled = a.status !== 'cancelled';
      const timeDiffMs = Math.abs(new Date(a.startTime).getTime() - targetTime);
      return matchPhone && notCancelled && timeDiffMs < 45 * 60000;
    }) || null
  );
}

// ================= ORDERS (E-COMMERCE) =================
export async function getAllOrders(workspaceId?: string): Promise<schema.Order[]> {
  if (db) {
    try {
      if (workspaceId) {
        return await db.select().from(schema.orders).where(eq(schema.orders.workspaceId, workspaceId));
      }
      return await db.select().from(schema.orders);
    } catch (err) {
      console.warn('Neon select orders error:', err);
    }
  }
  const store = readStore();
  if (workspaceId) {
    return (store.orders || []).filter((o) => o.workspaceId === workspaceId);
  }
  return store.orders || [];
}

export async function createOrder(data: Partial<schema.NewOrder> & {
  workspaceId: string;
  clientName: string;
  clientPhone: string;
  totalAmount: number;
}): Promise<schema.Order> {
  const newOrder: schema.Order = {
    id: data.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: data.workspaceId,
    leadId: data.leadId || null,
    clientName: data.clientName,
    clientPhone: data.clientPhone,
    items: data.items || [],
    totalAmount: data.totalAmount,
    currency: data.currency || 'UZS',
    deliveryAddress: data.deliveryAddress || '',
    status: data.status || 'new',
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.orders).values(newOrder);
    } catch (err) {
      console.warn('Neon insert order error:', err);
    }
  }

  const store = readStore();
  if (!store.orders) store.orders = [];
  store.orders.unshift(newOrder);
  writeStore(store);
  return newOrder;
}

export async function updateOrder(id: string, updates: Partial<schema.Order>): Promise<schema.Order | null> {
  if (db) {
    try {
      await db.update(schema.orders).set(updates).where(eq(schema.orders.id, id));
    } catch (err) {
      console.warn('Neon update order error:', err);
    }
  }

  const store = readStore();
  if (!store.orders) store.orders = [];
  let updated: schema.Order | null = null;
  store.orders = store.orders.map((o) => {
    if (o.id === id) {
      updated = { ...o, ...updates };
      return updated;
    }
    return o;
  });

  if (updated) {
    writeStore(store);
  }
  return updated;
}

// ================= SUPPORT SESSIONS (SUPER_ADMIN) =================
export async function createSupportSession(superAdminEmail: string, targetWorkspaceId: string, reason: string): Promise<schema.SupportSession> {
  const newSession: schema.SupportSession = {
    id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    superAdminEmail,
    targetWorkspaceId,
    reason,
    startedAt: new Date(),
    endedAt: null,
    isActive: true,
  };

  if (db) {
    try {
      await db.insert(schema.supportSessions).values(newSession);
    } catch (err) {
      console.warn('Neon insert supportSession error:', err);
    }
  }

  const store = readStore();
  if (!store.supportSessions) store.supportSessions = [];
  store.supportSessions.unshift(newSession);
  writeStore(store);
  return newSession;
}

export async function getActiveSupportSession(targetWorkspaceId: string): Promise<schema.SupportSession | null> {
  if (db) {
    try {
      const rows = await db
        .select()
        .from(schema.supportSessions)
        .where(eq(schema.supportSessions.targetWorkspaceId, targetWorkspaceId));
      const active = rows.find((r) => r.isActive);
      return active || null;
    } catch (err) {
      console.warn('Neon select active supportSession error:', err);
    }
  }
  const store = readStore();
  return (store.supportSessions || []).find((s) => s.targetWorkspaceId === targetWorkspaceId && s.isActive) || null;
}

export async function endSupportSession(id: string): Promise<boolean> {
  if (db) {
    try {
      await db.update(schema.supportSessions).set({ isActive: false, endedAt: new Date() }).where(eq(schema.supportSessions.id, id));
    } catch (err) {
      console.warn('Neon end supportSession error:', err);
    }
  }
  const store = readStore();
  if (!store.supportSessions) store.supportSessions = [];
  store.supportSessions = store.supportSessions.map((s) => (s.id === id ? { ...s, isActive: false, endedAt: new Date() } : s));
  writeStore(store);
  return true;
}

// ================= TRIAL GRANTS (ANTI-FRAUD) =================
export async function hasClaimedTrial(email: string, phone: string): Promise<boolean> {
  if (db) {
    try {
      const rows = await db.select().from(schema.trialGrants);
      const matched = rows.find(
        (r) => r.ownerEmail.toLowerCase() === email.toLowerCase() || r.ownerPhone === phone
      );
      return Boolean(matched);
    } catch (err) {
      console.warn('Neon check trialGrants error:', err);
    }
  }
  const store = readStore();
  return (store.trialGrants || []).some(
    (g) => g.ownerEmail.toLowerCase() === email.toLowerCase() || g.ownerPhone === phone
  );
}

export async function recordTrialGrant(ownerEmail: string, ownerPhone: string, workspaceId: string, grantedTokens = 100): Promise<schema.TrialGrant> {
  const grant: schema.TrialGrant = {
    id: `grant_${Date.now()}`,
    ownerEmail: ownerEmail.toLowerCase(),
    ownerPhone,
    workspaceId,
    grantedTokens,
    grantedAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.trialGrants).values(grant);
    } catch (err) {
      console.warn('Neon insert trialGrant error:', err);
    }
  }

  const store = readStore();
  if (!store.trialGrants) store.trialGrants = [];
  store.trialGrants.push(grant);
  writeStore(store);
  return grant;
}

// ================= ADMIN AUDIT LOGS =================
export async function createAdminAuditLog(data: Omit<schema.AdminAuditLog, 'id' | 'createdAt'>): Promise<schema.AdminAuditLog> {
  const log: schema.AdminAuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    adminEmail: data.adminEmail,
    adminRole: data.adminRole,
    entityType: data.entityType,
    entityId: data.entityId,
    action: data.action,
    reason: data.reason,
    diffBefore: data.diffBefore || null,
    diffAfter: data.diffAfter || null,
    result: data.result || 'success',
    createdAt: new Date(),
  };

  if (db) {
    try {
      await db.insert(schema.adminAuditLogs).values(log);
    } catch (err) {
      console.warn('Neon insert adminAuditLog error:', err);
    }
  }

  const store = readStore() as any;
  if (!store.adminAuditLogs) store.adminAuditLogs = [];
  store.adminAuditLogs.unshift(log);
  writeStore(store);
  return log;
}

export async function getAllAdminAuditLogs(): Promise<schema.AdminAuditLog[]> {
  if (db) {
    try {
      const rows = await db.select().from(schema.adminAuditLogs);
      return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('Neon select adminAuditLogs error:', err);
    }
  }
  const store = readStore() as any;
  return (store.adminAuditLogs || []).sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
