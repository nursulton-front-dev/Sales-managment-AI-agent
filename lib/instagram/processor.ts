import {
  getWorkspaceById,
  updateWorkspace,
  getInstagramEventByEventId,
  createInstagramEvent,
  updateInstagramEvent,
  getAllConversations,
  createConversation,
  getConversationById,
  createMessage,
  getMessagesByConversationId,
  getAllAgents,
  recordTokenTransaction,
} from '@/src/db';
import { decryptToken } from '@/lib/instagram/config';
import { sendInstagramDirectMessage } from '@/lib/instagram/client';
import { processAgentMessage } from '@/lib/ai/gateway';

export interface InstagramMessageJob {
  eventId: string;
  senderId: string;
  recipientId: string;
  messageText: string;
  timestamp: number;
  workspaceId: string;
}

/**
 * Process single Instagram Direct inbound message asynchronously
 */
export async function processInstagramMessageJob(job: InstagramMessageJob): Promise<void> {
  const { eventId, senderId, recipientId, messageText, workspaceId } = job;

  // 1. Double check event in DB
  const event = await getInstagramEventByEventId(eventId);
  if (!event || event.status === 'replied' || event.status === 'ignored') {
    return;
  }

  // 2. Fetch fresh workspace state
  const ws = await getWorkspaceById(workspaceId);
  if (!ws || !ws.instagramConnected || !ws.instagramAccessToken) {
    await updateInstagramEvent(event.id, {
      status: 'ignored',
      errorReason: 'Workspace Instagram integration is inactive or disconnected',
    });
    return;
  }

  // 3. Find or create unified conversation in Neon Postgres
  // Channel: 'Instagram', clientPhone: `ig:${senderId}`
  const allConvs = await getAllConversations(workspaceId);
  let conv = allConvs.find(
    (c) => c.channel === 'Instagram' && c.clientPhone === `ig:${senderId}`
  );

  if (!conv) {
    conv = await createConversation({
      workspaceId,
      agentId: ws.instagramAgentId || null,
      clientName: `Instagram пользователь (@${senderId.slice(-4)})`,
      clientPhone: `ig:${senderId}`,
      channel: 'Instagram',
      status: 'active',
      lastMessageText: messageText,
    });
  }

  // 4. Save incoming message from client
  await createMessage({
    conversationId: conv.id,
    workspaceId,
    sender: 'client',
    text: messageText,
    tokensCost: 0,
  });

  // 5. Check Human Takeover mode & AutoReply toggle
  // If human takeover is active, stop automatic responses immediately
  if (conv.status === 'human_takeover') {
    await updateInstagramEvent(event.id, {
      status: 'human_takeover',
      processedAt: new Date(),
      errorReason: 'Ручной перехват активен: автоответы заблокированы оператором',
    });
    return;
  }

  if (!ws.instagramAutoReply) {
    await updateInstagramEvent(event.id, {
      status: 'ignored',
      processedAt: new Date(),
      errorReason: 'Автоответы выключены в настройках интеграции',
    });
    return;
  }

  // 6. Check Token Balance
  if (ws.tokenBalance < 1) {
    await updateInstagramEvent(event.id, {
      status: 'failed',
      processedAt: new Date(),
      errorReason: 'Недостаточно токенов на балансе для ответа',
    });
    return;
  }

  // 7. Re-check human takeover status right before AI generation and sending
  const freshConv = await getConversationById(conv.id);
  if (freshConv?.status === 'human_takeover') {
    await updateInstagramEvent(event.id, {
      status: 'human_takeover',
      processedAt: new Date(),
      errorReason: 'Ручной перехват активирован перед отправкой',
    });
    return;
  }

  // 8. Load conversation history for agent context
  const existingMsgs = await getMessagesByConversationId(conv.id);
  const formattedHistory = existingMsgs
    .filter((m) => m.sender === 'client' || m.sender === 'agent')
    .slice(-10)
    .map((m) => ({
      role: (m.sender === 'client' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

  // 9. Generate AI reply via unified gateway
  try {
    const aiResult = await processAgentMessage({
      message: messageText,
      agentId: ws.instagramAgentId || undefined,
      workspaceId: ws.id,
      clientName: conv.clientName,
      clientPhone: conv.clientPhone,
      channel: 'Instagram',
      history: formattedHistory,
      isSandbox: false,
    });

    // Final pre-flight check before API request: is human takeover triggered during LLM latency?
    const finalConvCheck = await getConversationById(conv.id);
    if (finalConvCheck?.status === 'human_takeover') {
      await updateInstagramEvent(event.id, {
        status: 'human_takeover',
        processedAt: new Date(),
        errorReason: 'Ручной перехват активирован во время генерации ответа',
      });
      return;
    }

    // 10. Decrypt Instagram access token
    const accessToken = decryptToken(ws.instagramAccessToken);
    if (!accessToken) {
      throw new Error('Не удалось расшифровать Instagram токен');
    }

    // 11. Send reply via official Instagram Graph API
    await sendInstagramDirectMessage({
      recipientId: senderId,
      text: aiResult.reply,
      accessToken,
    });

    // 12. Save agent message to conversation
    await createMessage({
      conversationId: conv.id,
      workspaceId,
      sender: 'agent',
      text: aiResult.reply,
      tokensCost: aiResult.tokensCost,
    });

    // 13. Mark event as successfully replied
    await updateInstagramEvent(event.id, {
      status: 'replied',
      processedAt: new Date(),
    });
  } catch (err: any) {
    console.error('Instagram message processing error:', err);
    
    // Check if token expired
    if (String(err.message).includes('TOKEN_EXPIRED')) {
      await updateWorkspace(ws.id, {
        instagramStatus: 'needs_reconnect',
        instagramLastError: err.message,
      });
    }

    await updateInstagramEvent(event.id, {
      status: 'failed',
      processedAt: new Date(),
      errorReason: err.message || 'Ошибка отправки ответа',
    });
  }
}
