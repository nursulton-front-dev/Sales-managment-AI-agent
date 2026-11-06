import { createConversation, createMessage, getAllAgents, getConversationById, getMessagesByConversationId, getWorkspaceById, updateConversation, updateWorkspace } from '@/src/db';
import { processAgentMessage, AgentReplyUnavailableError } from '@/lib/ai/gateway';
import { telegramCall, sendTelegramChatAction } from '@/lib/server/telegram';
import { decryptToken } from '@/lib/instagram/config';
import { sendInstagramDirectMessage } from '@/lib/instagram/client';
import type { ChannelEvent } from '@/src/db/schema';
import { claimEvent, dueEvents, patchEvent, advanceConversationRetries, oldestEligibleConversationEvent } from './events';
import { DeliveryRejectedError } from './errors';
import { widgetForWorkspace } from '@/lib/server/widget/repository';
import { isWorkspaceEntitled } from '@/lib/server/security/entitlements';

async function stop(event: ChannelEvent, code: string) {
  if (event.payload?.tokensCost && event.payload.tokensCost > 0) {
    try {
      const { recordTokenTransaction } = await import('@/src/db');
      await recordTokenTransaction({
        workspaceId: event.workspaceId,
        actionType: 'refund',
        tokensDelta: event.payload.tokensCost,
        description: `Возврат токенов: ответ не отправлен (${code}) [event:${event.id}]`,
      });
      event.payload.tokensCost = 0;
    } catch (refundErr) {
      console.warn('Failed to refund undelivered tokens:', refundErr);
    }
  }
  await patchEvent(event.id, { payload: event.payload, status: 'ignored', errorCode: code, lockedUntil: null });
}

export async function processChannelEvent(id: string) {
  const event = await claimEvent(id);
  if (!event) return;
  const payload = { ...event.payload };
  let stage = event.stage;
  try {
    const [workspace, agents] = await Promise.all([getWorkspaceById(event.workspaceId), getAllAgents(event.workspaceId)]);
    const agent = agents.find((item) => item.id === payload.agentId);
    const entitlement = isWorkspaceEntitled(workspace);
    if (!workspace || !entitlement.entitled || !agent) { await stop(event, entitlement.reason || 'inactive'); return; }
    const conversation = await createConversation({ id: event.conversationId, workspaceId: event.workspaceId, agentId: agent.id, channel: event.channel, clientName: payload.clientName, clientPhone: payload.contact });
    await createMessage({ id: `in_${event.id}`, conversationId: conversation.id, workspaceId: event.workspaceId, sender: 'client', text: payload.text, createdAt: event.createdAt });

    // Finalize a confirmed delivery even when an operator paused the conversation meanwhile.
    if (stage !== 'delivered') {
      const widget = event.channel === 'WebWidget' ? await widgetForWorkspace(event.workspaceId) : null;
      const tgToken = payload.businessConnectionId
        ? (process.env.TELEGRAM_SERVICE_BOT_TOKEN || agent.tgBotToken)
        : agent.tgBotToken;
      const isTgBusiness = Boolean(payload.businessConnectionId);
      const tgBusinessInvalid = isTgBusiness && (
        !workspace.telegramBusinessConnected ||
        !workspace.telegramBusinessEnabled ||
        !workspace.telegramBusinessCanReply ||
        (workspace.telegramBusinessConnectionId && workspace.telegramBusinessConnectionId !== payload.businessConnectionId)
      );
      if (!agent.isActive || (event.channel === 'WebWidget' && (!widget?.enabled || widget.agentId !== agent.id)) || (event.channel === 'Instagram' && (!workspace.instagramConnected || !workspace.instagramAutoReply || workspace.instagramAgentId !== agent.id)) || (event.channel === 'Telegram' && (!tgToken || tgBusinessInvalid))) { await stop(event, 'inactive'); return; }
      if (conversation.status !== 'active') { await stop(event, 'human_takeover'); return; }
    }

    if (stage === 'received') {
      const messages = await getMessagesByConversationId(conversation.id);
      stage = 'generating';
      await patchEvent(id, { stage });

      // Signal real-time "typing..." status in Telegram while AI generates the response
      const tgToken = payload.businessConnectionId
        ? (process.env.TELEGRAM_SERVICE_BOT_TOKEN || agent.tgBotToken)
        : agent.tgBotToken;
      if (event.channel === 'Telegram' && tgToken && payload.contact.startsWith('id:')) {
        void sendTelegramChatAction(tgToken, payload.contact.slice(3), 'typing', payload.businessConnectionId);
      }

      const result = await processAgentMessage({ message: payload.text, agentId: agent.id, workspaceId: event.workspaceId, clientName: conversation.clientName, clientPhone: conversation.clientPhone, channel: event.channel,
        history: messages.filter((message) => message.id !== `in_${event.id}`).slice(-12).map((message) => ({ role: message.sender === 'client' ? 'user' as const : 'assistant' as const, content: message.text })),
      });
      payload.reply = result.reply;
      payload.tokensCost = result.tokensCost;
      stage = 'prepared';
      await patchEvent(id, { payload, stage });
    }

    if (stage === 'prepared') {
      const fresh = await getConversationById(conversation.id);
      if (fresh?.status !== 'active') { await stop(event, 'human_takeover'); return; }
      const currentAgent = (await getAllAgents(event.workspaceId)).find((item) => item.id === agent.id);
      const currentWorkspace = await getWorkspaceById(event.workspaceId);
      const currentWidget = event.channel === 'WebWidget' ? await widgetForWorkspace(event.workspaceId) : null;
      const currentTgToken = payload.businessConnectionId
        ? (process.env.TELEGRAM_SERVICE_BOT_TOKEN || currentAgent?.tgBotToken)
        : currentAgent?.tgBotToken;
      const currentTgBusinessInvalid = Boolean(payload.businessConnectionId) && (
        !currentWorkspace?.telegramBusinessConnected ||
        !currentWorkspace?.telegramBusinessEnabled ||
        !currentWorkspace?.telegramBusinessCanReply ||
        (currentWorkspace?.telegramBusinessConnectionId && currentWorkspace.telegramBusinessConnectionId !== payload.businessConnectionId)
      );
      const freshEntitlement = isWorkspaceEntitled(currentWorkspace);
      if (!currentAgent?.isActive || !freshEntitlement.entitled || (event.channel === 'Telegram' && (!currentTgToken || currentTgBusinessInvalid)) || (event.channel === 'Instagram' && (!currentWorkspace?.instagramAutoReply || !currentWorkspace?.instagramConnected || currentWorkspace?.instagramAgentId !== agent.id)) || (event.channel === 'WebWidget' && (!currentWidget?.enabled || currentWidget.agentId !== agent.id))) { await stop(event, freshEntitlement.reason || 'inactive'); return; }
      if (!payload.reply) throw new Error('Missing prepared reply');
      // Persist this boundary BEFORE the external side effect. An uncertain send is never retried.
      stage = 'sending';
      await patchEvent(id, { stage });
      if (event.channel === 'Telegram') {
        const sendBody: Record<string, unknown> = { chat_id: payload.contact.slice(3), text: payload.reply };
        if (payload.businessConnectionId) {
          sendBody.business_connection_id = payload.businessConnectionId;
        }
        await telegramCall(currentTgToken!, 'sendMessage', sendBody);
      } else if (event.channel === 'Instagram') {
        const token = workspace.instagramAccessToken && decryptToken(workspace.instagramAccessToken);
        if (!token) throw new DeliveryRejectedError(false, 'needs_reconnect');
        await sendInstagramDirectMessage({ recipientId: payload.contact.slice(3), text: payload.reply, accessToken: token });
      }
      // Website delivery is an idempotent insert read by the visitor's authenticated polling.
      stage = 'delivered';
      await patchEvent(id, { stage });
    }

    if (stage === 'delivered') {
      await createMessage({ id: `out_${id}`, conversationId: conversation.id, workspaceId: event.workspaceId, sender: 'agent', text: payload.reply!, tokensCost: payload.tokensCost || 0 });
      await patchEvent(id, { status: 'done', lockedUntil: null, errorCode: null });
    }
  } catch (error) {
    let status = 'retry';
    let code = 'temporary_failure';
    if (stage === 'generating') {
      if (error instanceof AgentReplyUnavailableError) {
        stage = 'received';
        code = error.code || 'model_unavailable';
        if (code === 'insufficient_balance' || code === 'auth_error') {
          status = 'review';
        }
      } else {
        status = 'review';
        code = 'outcome_unknown';
      }
    } else if (stage === 'sending') {
      if (error instanceof DeliveryRejectedError) {
        stage = 'prepared';
        code = error.code;
        status = error.retryable ? 'retry' : 'review';
        if (code === 'needs_reconnect') await updateWorkspace(event.workspaceId, { instagramStatus: 'needs_reconnect', instagramAutoReply: false });
      } else {
        status = 'review';
        code = 'outcome_unknown';
      }
    }
    if (event.attempts >= 5 && status === 'retry') { status = 'review'; code = 'attempts_exhausted'; }
    if (status === 'review') {
      await updateConversation(event.conversationId, { status: 'human_takeover' });
      // If delivery failed permanently, refund the debited tokens
      if (payload.tokensCost && payload.tokensCost > 0) {
        try {
          const { recordTokenTransaction } = await import('@/src/db');
          await recordTokenTransaction({
            workspaceId: event.workspaceId,
            actionType: 'refund',
            tokensDelta: payload.tokensCost,
            description: `Возврат токенов: ошибка доставки (${code}) [event:${event.id}]`,
          });
          payload.tokensCost = 0;
        } catch (refundErr) {
          console.warn('Failed to refund undelivered tokens:', refundErr);
        }
      }
    }
    const backoffSeconds = Math.min(3600, 30 * 2 ** event.attempts);
    await patchEvent(id, { status, stage, payload, errorCode: code, lockedUntil: null, availableAt: new Date(Date.now() + backoffSeconds * 1000) });
    console.warn(JSON.stringify({ time: new Date().toISOString(), channel: event.channel, eventId: id, code, status }));

    if (status === 'retry') {
      scheduleRetryTrigger(backoffSeconds * 1000);
    }
  }
}

export async function drainChannelEvents(limit = 4) {
  // One event per conversation, at most four in parallel. Provider timeouts bound each task
  // below the route's duration; sequential batches could be killed halfway through a debit.
  const due = await dueEvents(50);
  const conversations = new Set<string>();
  const batch = due.filter((event) => {
    if (conversations.has(event.conversationId)) return false;
    conversations.add(event.conversationId); return true;
  }).slice(0, Math.min(limit, 4));
  await Promise.all(batch.map((event) => processChannelEvent(event.id)));
  return batch.length;
}

export async function wakeConversationQueue(conversationId: string) {
  await advanceConversationRetries(conversationId);
  const nextId = await oldestEligibleConversationEvent(conversationId);
  if (nextId) {
    await processChannelEvent(nextId);
  }
}

let retryTimer: NodeJS.Timeout | null = null;
export function scheduleRetryTrigger(delayMs: number) {
  if (typeof setTimeout === 'undefined') return;
  const ms = Math.min(Math.max(delayMs, 1000), 60000);
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void drainChannelEvents().catch(() => {});
  }, ms);
  retryTimer.unref?.();
}
