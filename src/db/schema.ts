import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

// 1. Workspaces (Организации)
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  companyName: text('company_name').notNull(),
  niche: text('niche').notNull(), // 'education', 'clinic', 'salon', 'ecommerce', 'other'
  ownerName: text('owner_name').notNull(),
  ownerEmail: text('owner_email').notNull().unique(),
  ownerPhone: text('owner_phone').notNull(), // '+998...'
  passwordHash: text('password_hash').notNull(),
  teamSize: text('team_size').notNull(), // '1', '2-5', '6-15', '15+'
  dailyLeadsVolume: text('daily_leads_volume').notNull(), // '<20', '20-100', '100+'
  plan: text('plan').notNull().default('trial'), // 'trial', 'start', 'business', 'pro'
  tokenBalance: integer('token_balance').notNull().default(100),
  status: text('status').notNull().default('active'), // 'active', 'blocked'
  emailVerified: boolean('email_verified').notNull().default(false),
  verificationCode: text('verification_code'),
  verificationSentAt: timestamp('verification_sent_at', { withTimezone: true }),
  subExpiresAt: timestamp('sub_expires_at', { withTimezone: true }),
  googleCalendarConnected: boolean('google_calendar_connected').notNull().default(false),
  googleCalendarEmail: text('google_calendar_email'),
  googleRefreshToken: text('google_refresh_token'),
  googleCalendarId: text('google_calendar_id').default('primary'),
  googleCalendarWorkingHours: text('google_calendar_working_hours').default('10:00-18:00'),
  googleCalendarSlotDuration: integer('google_calendar_slot_duration').default(45),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Agents (ИИ-агенты)
export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  nicheTemplate: text('niche_template').notNull(),
  knowledgeBase: text('knowledge_base').notNull().default(''),
  qualificationQuestions: jsonb('qualification_questions').$type<string[]>().default([]),
  systemPrompt: text('system_prompt').notNull(),
  tgBotToken: text('tg_bot_token'),
  googleCalendarConnected: boolean('google_calendar_connected').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Leads (Лиды и воронка)
export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone').notNull(),
  channel: text('channel').notNull(), // 'Telegram', 'Instagram'
  status: text('status').notNull().default('new'), // 'new', 'qualified', 'booked'
  appointmentTime: timestamp('appointment_time', { withTimezone: true }),
  googleEventId: text('google_event_id'),
  googleEventLink: text('google_event_link'),
  tokensSpent: integer('tokens_spent').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Token Logs (История токенов и оплат)
export const tokenLogs = pgTable('token_logs', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(), // 'trial_grant', 'topup', 'subscription', 'chat_reply', 'calendar_booking', 'reminder', 'refund', 'admin_adjustment'
  tokensDelta: integer('tokens_delta').notNull(),
  amountUsd: text('amount_usd').notNull().default('0'),
  paymentMethod: text('payment_method').notNull().default('system'), // 'payme', 'click', 'uzum', 'card', 'system'
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Conversations (Диалоги с клиентами)
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone').notNull(),
  channel: text('channel').notNull().default('Telegram'), // 'Telegram', 'Instagram', 'WebWidget'
  status: text('status').notNull().default('active'), // 'active' (AI responds), 'human_takeover' (paused for human), 'closed'
  lastMessageText: text('last_message_text').default(''),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Messages (Сообщения диалогов)
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  sender: text('sender').notNull(), // 'client', 'agent', 'human'
  text: text('text').notNull(),
  tokensCost: integer('tokens_cost').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Appointments (Записи на прием / уроки / слоты)
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  agentId: text('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone').notNull(),
  serviceName: text('service_name').notNull().default('Консультация / Пробный урок'),
  specialistName: text('specialist_name').default('Дежурный специалист'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('scheduled'), // 'scheduled', 'confirmed', 'cancelled', 'completed'
  googleEventId: text('google_event_id'),
  googleEventLink: text('google_event_link'),
  reminderSent: boolean('reminder_sent').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Orders (Заказы для eCommerce магазина)
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  leadId: text('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  clientName: text('client_name').notNull(),
  clientPhone: text('client_phone').notNull(),
  items: jsonb('items').$type<Array<{ title: string; price: number; quantity: number; variant?: string }>>().default([]),
  totalAmount: integer('total_amount').notNull().default(0),
  currency: text('currency').notNull().default('UZS'),
  deliveryAddress: text('delivery_address').default(''),
  status: text('status').notNull().default('new'), // 'new', 'confirmed', 'paid', 'delivered', 'cancelled'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. Support Sessions (Сессии поддержки основателя super_admin)
export const supportSessions = pgTable('support_sessions', {
  id: text('id').primaryKey(),
  superAdminEmail: text('super_admin_email').notNull(),
  targetWorkspaceId: text('target_workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
});

// 10. Trial Grants (Защита от повторных триалов)
export const trialGrants = pgTable('trial_grants', {
  id: text('id').primaryKey(),
  ownerEmail: text('owner_email').notNull().unique(),
  ownerPhone: text('owner_phone').notNull(),
  workspaceId: text('workspace_id').notNull(),
  grantedTokens: integer('granted_tokens').notNull().default(100),
  grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
});

// 11. Users (Better Auth)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Sessions (Better Auth)
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Accounts (Better Auth)
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 8. Verifications (Better Auth)
export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 12. Support Tickets (Обращения, жалобы и предложения пользователей)
export const supportTickets = pgTable('support_tickets', {
  id: text('id').primaryKey(),
  ticketNumber: integer('ticket_number').notNull(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  authorEmail: text('author_email').notNull(),
  authorName: text('author_name').notNull(),
  type: text('type').notNull(), // 'question', 'bug', 'complaint', 'suggestion'
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('new'), // 'new', 'in_progress', 'waiting_user', 'resolved'
  assignedTo: text('assigned_to'), // email or name of support agent
  unreadByCustomer: boolean('unread_by_customer').notNull().default(false),
  unreadBySupport: boolean('unread_by_support').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 13. Support Messages (Переписка по обращению)
export const supportMessages = pgTable('support_messages', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id')
    .notNull()
    .references(() => supportTickets.id, { onDelete: 'cascade' }),
  senderRole: text('sender_role').notNull(), // 'customer', 'support'
  senderEmail: text('sender_email').notNull(),
  senderName: text('sender_name').notNull(),
  text: text('text').notNull(),
  isInternalNote: boolean('is_internal_note').notNull().default(false),
  attachments: jsonb('attachments').$type<Array<{ name: string; url: string; size: number; mimeType: string }>>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 14. Admin Audit Logs (Журнал действий администраторов платформы)
export const adminAuditLogs = pgTable('admin_audit_logs', {
  id: text('id').primaryKey(),
  adminEmail: text('admin_email').notNull(),
  adminRole: text('admin_role').notNull(), // 'super_admin', 'support', 'finance'
  entityType: text('entity_type').notNull(), // 'workspace', 'agent', 'billing', 'support_ticket', 'system'
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'add_tokens', 'change_plan', 'suspend_workspace', 'suspend_agent', 'extend_trial', 'reply_ticket', 'support_session_start'
  reason: text('reason').notNull(),
  diffBefore: jsonb('diff_before'),
  diffAfter: jsonb('diff_after'),
  result: text('result').notNull().default('success'), // 'success', 'failed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type TokenLog = typeof tokenLogs.$inferSelect;
export type NewTokenLog = typeof tokenLogs.$inferInsert;
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type SupportSession = typeof supportSessions.$inferSelect;
export type NewSupportSession = typeof supportSessions.$inferInsert;
export type TrialGrant = typeof trialGrants.$inferSelect;
export type NewTrialGrant = typeof trialGrants.$inferInsert;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type NewSupportMessage = typeof supportMessages.$inferInsert;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLogs.$inferInsert;
