/**
 * Platform Assistant Type Definitions
 * gapcha AI · Enterprise Architecture
 */

export type AssistantLanguage = 'ru' | 'uz';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  diagnostics?: AssistantDiagnosticsSummary;
  pendingAction?: AssistantPendingAction;
  actionResult?: AssistantActionResult;
}

export interface AssistantDiagnosticsSummary {
  workspaceId: string;
  checkedAt: string;
  channels?: {
    telegramBusiness?: {
      status: 'connected' | 'disconnected' | 'needs_reconnect' | 'needs_permission';
      username?: string | null;
      canReply?: boolean;
    };
    instagram?: {
      status: 'connected' | 'disconnected' | 'needs_reconnect' | 'error';
      username?: string | null;
      autoReply?: boolean;
    };
    websiteWidget?: {
      configured: boolean;
      activeAgentsCount: number;
    };
  };
  agent?: {
    totalAgents: number;
    activeAgents: number;
    primaryAgentName?: string;
    hasKnowledgeBase: boolean;
    calendarEnabled: boolean;
  };
  calendar?: {
    connected: boolean;
    email?: string | null;
    workingHours?: string | null;
    slotDuration?: number | null;
  };
  quota?: {
    plan: string;
    tokenBalance: number;
    maxAgents: number;
    isEntitled: boolean;
  };
  recentErrors?: Array<{
    code: string;
    channel: string;
    timestamp: string;
    description: string;
  }>;
}

export interface AssistantPendingAction {
  id: string;
  type: 'create_support_ticket';
  title: string;
  description: string;
  payload: {
    type: 'question' | 'bug' | 'complaint' | 'suggestion';
    subject: string;
    description: string;
    diagnosticsSummary?: string;
  };
}

export interface AssistantActionResult {
  success: boolean;
  message: string;
  ticketNumber?: string;
  ticketId?: string;
  error?: string;
}

export interface KnowledgeSnippet {
  id: string;
  category: 'auth' | 'agents' | 'channels' | 'instagram' | 'widget' | 'calendar' | 'conversations' | 'leads' | 'billing' | 'support';
  titleRu: string;
  titleUz: string;
  contentRu: string;
  contentUz: string;
  quickLink?: string;
  tags: string[];
}
