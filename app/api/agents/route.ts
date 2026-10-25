import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllAgents, createAgent, updateAgent } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

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
    return NextResponse.json({ success: true, agents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    if (!body.name || !body.systemPrompt) {
      return NextResponse.json({ success: false, error: 'Обязательные поля: name, systemPrompt' }, { status: 400 });
    }

    const agent = await createAgent({
      workspaceId,
      name: body.name,
      nicheTemplate: body.nicheTemplate || 'other',
      knowledgeBase: body.knowledgeBase || '',
      qualificationQuestions: body.qualificationQuestions || [],
      systemPrompt: body.systemPrompt,
      tgBotToken: body.tgBotToken || null,
      googleCalendarConnected: body.googleCalendarConnected ?? false,
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({ success: true, agent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive, name, systemPrompt, knowledgeBase, qualificationQuestions, tgBotToken, googleCalendarConnected } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Поле id обязательно' }, { status: 400 });
    }

    const updates: any = {};
    if (isActive !== undefined) updates.isActive = isActive;
    if (name !== undefined) updates.name = name;
    if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
    if (knowledgeBase !== undefined) updates.knowledgeBase = knowledgeBase;
    if (qualificationQuestions !== undefined) updates.qualificationQuestions = qualificationQuestions;
    if (tgBotToken !== undefined) updates.tgBotToken = tgBotToken;
    if (googleCalendarConnected !== undefined) updates.googleCalendarConnected = googleCalendarConnected;

    const updated = await updateAgent(id, updates);
    return NextResponse.json({ success: true, agent: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
