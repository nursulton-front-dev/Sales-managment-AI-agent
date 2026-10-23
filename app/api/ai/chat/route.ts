import { NextRequest, NextResponse } from 'next/server';
import { processAgentMessage } from '@/lib/ai/gateway';

export async function POST(req: NextRequest) {
  try {
    const { message, agentId, workspaceId, history, clientName, clientPhone, channel, isSandbox } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Поле message обязательно' }, { status: 400 });
    }

    const result = await processAgentMessage({
      message,
      agentId,
      workspaceId,
      history,
      clientName,
      clientPhone,
      channel,
      isSandbox: Boolean(isSandbox),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in AI chat route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
