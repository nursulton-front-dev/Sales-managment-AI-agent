import { NextRequest, NextResponse, connection } from 'next/server';
import { processAgentMessage } from '@/lib/ai/gateway';
import { getAllAgents, createLead, getAllWorkspaces } from '@/src/db';

export async function GET(req: NextRequest) {
  await connection();
  return NextResponse.json({
    status: 'online',
    service: 'Chorla AI Telegram Webhook Router',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    // Check message payload
    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true, note: 'No text message' });
    }

    const chatId = message.chat?.id;
    const text = message.text;
    const fromName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || 'Пользователь Telegram';
    const username = message.from?.username ? `@${message.from.username}` : `id:${chatId}`;

    // Find agent by token or default
    const agents = await getAllAgents();
    const activeAgent = agents.find((a) => a.isActive) || agents[0];

    // Process message through AI engine
    const aiResult = await processAgentMessage({
      message: text,
      agentId: activeAgent?.id,
      workspaceId: activeAgent?.workspaceId,
      clientName: fromName,
      clientPhone: username,
      channel: 'Telegram',
    });

    // Attempt real Telegram sendMessage if bot token is provided
    if (activeAgent?.tgBotToken && !activeAgent.tgBotToken.includes('sample') && !activeAgent.tgBotToken.includes('demo')) {
      try {
        await fetch(`https://api.telegram.org/bot${activeAgent.tgBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: aiResult.reply,
            parse_mode: 'Markdown',
          }),
        });
      } catch (tgErr) {
        console.warn('Telegram API send error:', tgErr);
      }
    }

    return NextResponse.json({
      ok: true,
      sender: fromName,
      userQuery: text,
      botReply: aiResult.reply,
      tokensCost: aiResult.tokensCost,
      isBooking: aiResult.isBooking,
    });
  } catch (error: any) {
    console.error('Error handling telegram webhook:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
