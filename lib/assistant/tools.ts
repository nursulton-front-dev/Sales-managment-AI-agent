/**
 * Platform Assistant Diagnostic & Safe Execution Tools
 * gapcha AI · Scoped to Authenticated Workspace Session
 */

import { getWorkspaceById, getAllAgents } from '@/src/db';
import { widgetForWorkspace } from '@/lib/server/widget/repository';
import { getWorkspaceChannelsSummary } from '@/lib/channels/status';
import { getMaxAgentsForPlan } from '@/lib/pricing';
import { isWorkspaceEntitled } from '@/lib/server/security/entitlements';
import { createSupportTicket } from '@/lib/server/support';
import { db } from '@/src/db';
import { channelEvents } from '@/src/db/schema';
import { eq, and, desc, isNotNull } from 'drizzle-orm';
import { AssistantDiagnosticsSummary, AssistantPendingAction, AssistantActionResult } from './types';

/**
 * Gathers complete diagnostics for an authenticated workspace.
 * Only accesses data strictly within the specified workspaceId.
 */
export async function getWorkspaceDiagnostics(workspaceId: string): Promise<AssistantDiagnosticsSummary> {
  const [workspace, agents, widget] = await Promise.all([
    getWorkspaceById(workspaceId),
    getAllAgents(workspaceId),
    widgetForWorkspace(workspaceId).catch(() => null),
  ]);

  if (!workspace) {
    throw new Error('Workspace not found');
  }

  const channelsSummary = getWorkspaceChannelsSummary(workspace, agents, widget);
  const plan = workspace.plan || 'trial';
  const maxAgents = getMaxAgentsForPlan(plan);
  const activeAgents = agents.filter((a: any) => a.isActive);

  // Safe sanitized recent errors (last 5)
  let sanitizedErrors: Array<{ code: string; channel: string; timestamp: string; description: string }> = [];
  if (db) {
    const recentFailedEvents = await db
      .select({
        id: channelEvents.id,
        channel: channelEvents.channel,
        errorCode: channelEvents.errorCode,
        createdAt: channelEvents.createdAt,
      })
      .from(channelEvents)
      .where(and(eq(channelEvents.workspaceId, workspaceId), isNotNull(channelEvents.errorCode)))
      .orderBy(desc(channelEvents.createdAt))
      .limit(5)
      .catch(() => []);

    sanitizedErrors = recentFailedEvents.map((e: any) => ({
      code: e.errorCode || 'processing_error',
      channel: e.channel,
      timestamp: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
      description: sanitizeErrorCode(e.errorCode || 'processing_error'),
    }));
  }

  if (workspace.instagramLastError && workspace.instagramStatus === 'error') {
    sanitizedErrors.unshift({
      code: 'instagram_meta_error',
      channel: 'Instagram',
      timestamp: new Date().toISOString(),
      description: 'Ошибка авторизации или прав в Meta Graph API',
    });
  }

  const tb = channelsSummary.channels.find(c => c.id === 'telegram_business');
  const ig = channelsSummary.channels.find(c => c.id === 'instagram');

  return {
    workspaceId,
    checkedAt: new Date().toISOString(),
    channels: {
      telegramBusiness: tb ? {
        status: tb.state === 'not_connected' ? 'disconnected' : tb.state as any,
        username: tb.identifier,
        canReply: tb.canReply,
      } : undefined,
      instagram: ig ? {
        status: ig.state === 'not_connected' ? 'disconnected' : ig.state as any,
        username: ig.identifier,
        autoReply: ig.canReply,
      } : undefined,
      websiteWidget: {
        configured: Boolean(widget?.enabled),
        activeAgentsCount: activeAgents.length,
      },
    },
    agent: {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      primaryAgentName: agents[0]?.name,
      hasKnowledgeBase: Boolean(agents[0]?.knowledgeBase && agents[0].knowledgeBase.length > 20),
      calendarEnabled: Boolean(agents.some((a: any) => a.googleCalendarConnected)),
    },
    calendar: {
      connected: Boolean(workspace.googleCalendarConnected),
      email: workspace.googleCalendarEmail,
      workingHours: workspace.googleCalendarWorkingHours || '10:00-18:00',
      slotDuration: workspace.googleCalendarSlotDuration || 45,
    },
    quota: {
      plan,
      tokenBalance: workspace.tokenBalance,
      maxAgents,
      isEntitled: isWorkspaceEntitled(workspace).entitled,
    },
    recentErrors: sanitizedErrors,
  };
}

/**
 * Maps technical error codes to clear, human-understandable explanations.
 */
function sanitizeErrorCode(code: string): string {
  switch (code) {
    case 'model_unavailable':
      return 'ИИ-модель временно недоступна у провайдера. Запрос будет повторен автоматически.';
    case 'rate_limit_exceeded':
      return 'Превышен лимит частоты запросов интеграции.';
    case 'token_expired':
      return 'Срок действия авторизационного токена истёк. Требуется повторный вход в канал.';
    case 'permission_revoked':
      return 'Права бота были отозваны в настройках мессенджера.';
    case 'insufficient_tokens':
      return 'Баланс ответов исчерпан. Пополните баланс в разделе «Тарифы».';
    default:
      return 'Временный сбой обработки сообщения.';
  }
}

/**
 * Prepares a support ticket action with user confirmation gate.
 */
export function prepareSupportTicketAction(
  diagnostics: AssistantDiagnosticsSummary,
  params: {
    type?: 'question' | 'bug' | 'complaint' | 'suggestion';
    subject: string;
    description: string;
  }
): AssistantPendingAction {
  const diagSummary = [
    `План: ${diagnostics.quota?.plan.toUpperCase()}, Баланс: ${diagnostics.quota?.tokenBalance} ответов`,
    `Сотрудников: ${diagnostics.agent?.activeAgents}/${diagnostics.quota?.maxAgents} активных`,
    `Telegram Business: ${diagnostics.channels?.telegramBusiness?.status || 'отключен'}`,
    `Instagram Direct: ${diagnostics.channels?.instagram?.status || 'отключен'}`,
    `Google Calendar: ${diagnostics.calendar?.connected ? 'подключен' : 'отключен'}`,
    diagnostics.recentErrors && diagnostics.recentErrors.length > 0
      ? `Последняя ошибка: ${diagnostics.recentErrors[0].code} (${diagnostics.recentErrors[0].channel})`
      : 'Ошибок в очереди не зафиксировано',
  ].join(' | ');

  return {
    id: `action_ticket_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'create_support_ticket',
    title: 'Создать обращение в техническую поддержку gapcha AI',
    description: `Будет создано обращение с темой «${params.subject}» и прикреплена безопасная сводка диагностики вашей компании.`,
    payload: {
      type: params.type || 'bug',
      subject: params.subject,
      description: params.description,
      diagnosticsSummary: diagSummary,
    },
  };
}

/**
 * Executes support ticket creation upon verified user confirmation.
 */
export async function executeSupportTicketCreation(
  workspaceId: string,
  authorEmail: string,
  authorName: string,
  payload: AssistantPendingAction['payload']
): Promise<AssistantActionResult> {
  try {
    const fullDescription = payload.diagnosticsSummary
      ? `${payload.description}\n\n--- Сводка диагностики помощника платформы ---\n${payload.diagnosticsSummary}`
      : payload.description;

    const ticket = await createSupportTicket({
      workspaceId,
      authorEmail,
      authorName: authorName || 'Пользователь платформы',
      type: payload.type,
      subject: payload.subject.slice(0, 200),
      description: fullDescription.slice(0, 10000),
      attachments: [],
    });

    return {
      success: true,
      ticketNumber: String(ticket.ticketNumber),
      ticketId: ticket.id,
      message: `Обращение #${ticket.ticketNumber} успешно создано. Наша команда поддержки свяжется с вами в разделе «Поддержка».`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Не удалось создать обращение',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
