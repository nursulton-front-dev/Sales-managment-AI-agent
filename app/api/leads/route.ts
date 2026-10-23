import { NextRequest, NextResponse, connection } from 'next/server';
import { getAllLeads, createLead, updateLead } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';

export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSessionContext();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId') || session.workspaceId || undefined;

    const leads = await getAllLeads(workspaceId);
    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionContext();
    const body = await req.json();
    const workspaceId = body.workspaceId || session.workspaceId;

    if (!workspaceId || !body.clientName) {
      return NextResponse.json({ success: false, error: 'Обязательные поля: clientName' }, { status: 400 });
    }

    const lead = await createLead({
      workspaceId,
      agentId: body.agentId || null,
      clientName: body.clientName,
      clientPhone: body.clientPhone || '+998 90 000 00 00',
      channel: body.channel || 'Telegram',
      status: body.status || 'new',
      appointmentTime: body.appointmentTime ? new Date(body.appointmentTime) : null,
      tokensSpent: body.tokensSpent || 0,
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, appointmentTime } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Поле id обязательно' }, { status: 400 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (appointmentTime !== undefined) updates.appointmentTime = appointmentTime ? new Date(appointmentTime) : null;

    const updated = await updateLead(id, updates);
    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
