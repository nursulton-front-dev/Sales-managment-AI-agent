import { NextRequest, NextResponse, connection } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { DeepSeekProvider } from '@/lib/server/ai/providers/deepseek';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin' }, { status: 403 });
    }

    const provider = new DeepSeekProvider();
    const isConfigured = provider.isConfigured();

    return NextResponse.json({
      success: true,
      provider: provider.name,
      model: provider.defaultModel,
      baseUrl: provider.baseUrl,
      thinkingMode: provider.thinkingMode,
      configured: isConfigured,
      toolsMode: process.env.AI_SANDBOX_TOOLS_MODE || 'dry_run',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Доступ разрешен только SuperAdmin' }, { status: 403 });
    }

    const provider = new DeepSeekProvider();
    if (!provider.isConfigured()) {
      return NextResponse.json({
        success: false,
        configured: false,
        error: 'DEEPSEEK_API_KEY отсутствует. Добавьте DEEPSEEK_API_KEY в .env.local для проведения теста.',
      });
    }

    // Check health & model availability
    const health = await provider.checkHealth();
    if (!health.ok) {
      return NextResponse.json({
        success: false,
        configured: true,
        error: health.message,
      });
    }

    // Run short smoke completion test
    const testResult = await provider.complete({
      messages: [
        { role: 'system', content: 'Ответь кратко одним словом "OK", если ты на связи.' },
        { role: 'user', content: 'Тест связи Chorla AI' },
      ],
      maxTokens: 20,
      temperature: 0.1,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      model: provider.defaultModel,
      healthMessage: health.message,
      smokeReply: testResult.content,
      durationMs: testResult.durationMs,
      usage: testResult.usage,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
