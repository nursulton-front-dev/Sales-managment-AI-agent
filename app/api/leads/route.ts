import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllLeads, createLead, updateLead, getAllAgents } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // Strict multi-tenant isolation: SuperAdmin can view target workspace if impersonating,
    // otherwise requests are strictly locked to session.workspaceId.
    const requestedWorkspaceId = searchParams.get('workspaceId');
    const workspaceId =
      session.isSuperAdmin && requestedWorkspaceId
        ? requestedWorkspaceId
        : session.workspaceId;

    const leads = await getAllLeads(workspaceId);
    return NextResponse.json({ success: true, leads });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Не удалось обработать запрос' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) {
      return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    }

    const body = await req.json();
    const workspaceId = session.workspaceId;

    if (typeof body.clientName !== 'string' || !body.clientName.trim() || body.clientName.length > 200) {
      return NextResponse.json({ success: false, error: 'Обязательные поля: clientName' }, { status: 400 });
    }

    if (body.agentId && !(await getAllAgents(workspaceId)).some((agent) => agent.id === body.agentId)) {
      return NextResponse.json({ success: false, error: 'Сотрудник не найден' }, { status: 404 });
    }
    if ((body.status !== undefined && !['new', 'qualified', 'booked'].includes(body.status)) ||
        (body.channel !== undefined && !['Telegram', 'Instagram'].includes(body.channel)) ||
        (body.clientPhone !== undefined && (typeof body.clientPhone !== 'string' || body.clientPhone.length > 100))) {
      return NextResponse.json({ success: false, error: 'Проверьте контакт, канал и этап лида' }, { status: 400 });
    }
    if (body.appointmentTime && (typeof body.appointmentTime !== 'string' || !Number.isFinite(Date.parse(body.appointmentTime)))) {
      return NextResponse.json({ success: false, error: 'Некорректная дата записи' }, { status: 400 });
    }
    const lead = await createLead({
      workspaceId,
      agentId: body.agentId || null,
      clientName: body.clientName.trim(),
      clientPhone: body.clientPhone || '',
      channel: body.channel || 'Telegram',
      status: body.status || 'new',
      appointmentTime: body.appointmentTime ? new Date(body.appointmentTime) : null,
      tokensSpent: 0,
    });

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Не удалось обработать запрос' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSessionContext();
    if (!session.workspaceId) return NextResponse.json({ success: false, error: 'Требуется авторизация' }, { status: 401 });
    const body = await req.json();
    const { id, status, appointmentTime } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Поле id обязательно' }, { status: 400 });
    }

    const owned = (await getAllLeads(session.workspaceId)).some((item) => item.id === id);
    if (!owned) return NextResponse.json({ success: false, error: 'Объект не найден' }, { status: 404 });
    const updates: Parameters<typeof updateLead>[1] = {};
    if (status && !['new', 'qualified', 'booked'].includes(status)) return NextResponse.json({ success: false, error: 'Недопустимый этап' }, { status: 400 });
    if (status) updates.status = status;
    if (appointmentTime && (typeof appointmentTime !== 'string' || !Number.isFinite(Date.parse(appointmentTime)))) return NextResponse.json({ success: false, error: 'Некорректная дата записи' }, { status: 400 });
    if (appointmentTime !== undefined) updates.appointmentTime = appointmentTime ? new Date(appointmentTime) : null;

    const updated = await updateLead(id, updates);
    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Не удалось обработать запрос' }, { status: 500 });
  }
}
