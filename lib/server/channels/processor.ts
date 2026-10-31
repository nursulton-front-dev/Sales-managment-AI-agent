import { createConversation, createMessage, getAllAgents, getConversationById, getMessagesByConversationId, getWorkspaceById, updateConversation, updateWorkspace } from '@/src/db';
import { processAgentMessage, AgentReplyUnavailableError } from '@/lib/ai/gateway';
import { telegramCall } from '@/lib/server/telegram';
import { decryptToken } from '@/lib/instagram/config';
import { sendInstagramDirectMessage } from '@/lib/instagram/client';
import type { ChannelEvent } from '@/src/db/schema';
import { claimEvent, dueEvents, patchEvent } from './events';
import { DeliveryRejectedError } from './errors';
import { widgetForWorkspace } from '@/lib/server/widget/repository';

async function stop(event: ChannelEvent, code: string) {
  await patchEvent(event.id, { status: 'ignored', errorCode: code, lockedUntil: null });
}

export async function processChannelEvent(id: string) {
  const event = await claimEvent(id);
  if (!event) return;
  const payload = { ...event.payload };
  let stage = event.stage;
  try {
    const [workspace, agents] = await Promise.all([getWorkspaceById(event.workspaceId), getAllAgents(event.workspaceId)]);
    const agent = agents.find((item) => item.id === payload.agentId);
    if (!workspace || workspace.status !== 'active' || !agent) { await stop(event, 'inactive'); return; }
    const conversation = await createConversation({ id: event.conversationId, workspaceId: event.workspaceId, agentId: agent.id, channel: event.channel, clientName: payload.clientName, clientPhone: payload.contact });
    await createMessage({ id: `in_${event.id}`, conversationId: conversation.id, workspaceId: event.workspaceId, sender: 'client', text: payload.text, createdAt: event.createdAt });

    // Finalize a confirmed delivery even when an operator paused the conversation meanwhile.
    if (stage !== 'delivered') {
      const widget = event.channel === 'WebWidget' ? await widgetForWorkspace(event.workspaceId) : null;
      if (!agent.isActive || (event.channel === 'WebWidget' && (!widget?.enabled || widget.agentId !== agent.id)) || (event.channel === 'Instagram' && (!workspace.instagramConnected || !workspace.instagramAutoReply || workspace.instagramAgentId !== agent.id)) || (event.channel === 'Telegram' && !agent.tgBotToken)) { await stop(event, 'inactive'); return; }
      if (conversation.status !== 'active') { await stop(event, 'human_takeover'); return; }
    }

    if (stage === 'received') {
      const messages = await getMessagesByConversationId(conversation.id);
      stage = 'generating';
      await patchEvent(id, { stage });
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
      if (!currentAgent?.isActive || currentWorkspace?.status !== 'active' || (event.channel === 'Telegram' && currentAgent.tgBotToken !== agent.tgBotToken) || (event.channel === 'Instagram' && (!currentWorkspace.instagramAutoReply || !currentWorkspace.instagramConnected || currentWorkspace.instagramAgentId !== agent.id)) || (event.channel === 'WebWidget' && (!currentWidget?.enabled || currentWidget.agentId !== agent.id))) { await stop(event, 'inactive'); return; }
      if (!payload.reply) throw new Error('Missing prepared reply');
      // Persist this boundary BEFORE the external side effect. An uncertain send is never retried.
      stage = 'sending';
      await patchEvent(id, { stage });
      if (event.channel === 'Telegram') {
        await telegramCall(agent.tgBotToken!, 'sendMessage', { chat_id: payload.contact.slice(3), text: payload.reply });
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
      if (error instanceof AgentReplyUnavailableError) { stage = 'received'; code = 'model_unavailable'; }
      else { status = 'review'; code = 'outcome_unknown'; }
    } else if (stage === 'sending') {
      if (error instanceof DeliveryRejectedError) {
        stage = 'prepared';
        code = error.code;
        status = error.retryable ? 'retry' : 'review';
        if (code === 'needs_reconnect') await updateWorkspace(event.workspaceId, { instagramStatus: 'needs_reconnect', instagramAutoReply: false });
      } else { status = 'review'; code = 'outcome_unknown'; }
    }
    if (event.attempts >= 5 && status === 'retry') { status = 'review'; code = 'attempts_exhausted'; }
    if (status === 'review') await updateConversation(event.conversationId, { status: 'human_takeover' });
    await patchEvent(id, { status, stage, payload, errorCode: code, lockedUntil: null, availableAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** event.attempts) * 1000) });
    console.warn(JSON.stringify({ time: new Date().toISOString(), channel: event.channel, eventId: id, code, status }));
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
