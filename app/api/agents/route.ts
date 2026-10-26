import { connectTelegram, telegramStatus } from '@/lib/server/telegram';
import { publicAgent } from '@/lib/server/public-data';
import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllAgents, createAgent, updateAgent } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

function invalidFields(body: Record<string, unknown>) {
  for (const [field, limit, required] of [['name', 200, true], ['systemPrompt', 30000, true], ['knowledgeBase', 50000, false], ['nicheTemplate', 100, false]] as const) {
    const value = body[field];
    if (value !== undefined && (typeof value !== 'string' || value.length > limit || (required && !value.trim()))) return true;
  }
  if (body.qualificationQuestions !== undefined && (!Array.isArray(body.qualificationQuestions) || body.qualificationQuestions.length > 50 || body.qualificationQuestions.some((value) => typeof value !== 'string' || value.length > 1000))) return true;
  for (const field of ['isActive', 'googleCalendarConnected']) if (body[field] !== undefined && typeof body[field] !== 'boolean') return true;
  if (body.tgBotToken !== undefined && body.tgBotToken !== null && (typeof body.tgBotToken !== 'string' || body.tgBotToken.length > 200)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedWorkspaceId = searchParams.get('workspaceId');
    const workspaceId =
      session.isSuperAdmin && requestedWorkspaceId
        ? requestedWorkspaceId
        : session.workspaceId;

    const agents = await getAllAgents(workspaceId);
    return NextResponse.json({ success: true, agents: await Promise.all(agents.map(async (agent) => { const telegram = await telegramStatus(agent.id, agent.tgBotToken); return { ...publicAgent(agent), telegramConnected: telegram.connected, telegramUsername: telegram.username }; })) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Не удалось обработать запрос' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const workspaceId = session.workspaceId;

    if (!body.name || !body.systemPrompt || invalidFields(body)) {
      return NextResponse.json({ success: false, error: 'Обязательные поля: name, systemPrompt' }, { status: 400 });
    }

    const agent = await createAgent({
      workspaceId,
      name: body.name,
      nicheTemplate: body.nicheTemplate || 'other',
      knowledgeBase: body.knowledgeBase || '',
      qualificationQuestions: body.qualificationQuestions || [],
      systemPrompt: body.systemPrompt,
      tgBotToken: null,
      googleCalendarConnected: body.googleCalendarConnected ?? false,
      isActive: body.isActive ?? true,
    });

    if (body.tgBotToken) {
      try { await connectTelegram(agent.id, body.tgBotToken); await updateAgent(agent.id, { tgBotToken: body.tgBotToken }); }
      catch { return NextResponse.json({ success: true, agent: publicAgent(agent), warning: 'Сотрудник создан. Подключите Telegram в разделе интеграций.' }); }
    }
    return NextResponse.json({ success: true, agent: { ...publicAgent(agent), telegramConnected: Boolean(body.tgBotToken) } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Не удалось обработать запрос' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    const body = await req.json();
    const { id, isActive, name, systemPrompt, knowledgeBase, qualificationQuestions, tgBotToken, googleCalendarConnected } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Поле id обязательно' }, { status: 400 });
    }

    const owned = (await getAllAgents(session.workspaceId)).some((item) => item.id === id);
    if (!owned) return NextResponse.json({ success: false, error: 'Объект не найден' }, { status: 404 });
    if (invalidFields(body)) return NextResponse.json({ success: false, error: 'Проверьте поля сотрудника' }, { status: 400 });
    const updates: Parameters<typeof updateAgent>[1] = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (name !== undefined) updates.name = name;
    if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
    if (knowledgeBase !== undefined) updates.knowledgeBase = knowledgeBase;
    if (qualificationQuestions !== undefined) updates.qualificationQuestions = qualificationQuestions;
    if (tgBotToken) { await connectTelegram(id, tgBotToken); updates.tgBotToken = tgBotToken; }
    if (googleCalendarConnected !== undefined) updates.googleCalendarConnected = googleCalendarConnected;

    const updated = await updateAgent(id, updates);
    return NextResponse.json({ success: true, agent: updated ? { ...publicAgent(updated), ...(tgBotToken ? { telegramConnected: true } : {}) } : null });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Не удалось обработать запрос' }, { status: 500 });
  }
}
