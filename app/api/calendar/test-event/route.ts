import { NextRequest, NextResponse, connection } from 'next/server';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  findExistingGoogleCalendarEvent,
  generateDirectGoogleCalendarLink,
} from '@/lib/calendar/google';
import {
  getWorkspaceById,
  getAllWorkspaces,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  findExistingAppointment,
  getAllAppointments,
} from '@/src/db';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  await connection();
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action = 'create', // 'create' | 'reschedule' | 'cancel'
      workspaceId,
      summary,
      clientName = 'Тестовый Клиент',
      clientPhone = '+998 90 123 45 67',
      startTime,
      endTime,
      eventId,
      appointmentId,
    } = body;

    const cookieStore = await cookies();
    const targetId = workspaceId || cookieStore.get('ai_os_workspace_id')?.value;

    let ws = null;
    if (targetId) {
      ws = await getWorkspaceById(targetId);
    }
    if (!ws) {
      const all = await getAllWorkspaces();
      if (all.length > 0) ws = all[0];
    }

    const actualWorkspaceId = ws?.id || 'ws_default';

    // -------------------------------------------------------------
    // SCENARIO 1: CANCEL / DELETE
    // -------------------------------------------------------------
    if (action === 'cancel') {
      let liveCancelled = false;
      if (ws?.googleRefreshToken && eventId) {
        try {
          await deleteGoogleCalendarEvent(ws.googleRefreshToken, eventId);
          liveCancelled = true;
        } catch (err: any) {
          console.warn('Google Calendar delete error:', err.message);
        }
      }

      // Update DB appointment status
      if (appointmentId) {
        await updateAppointment(appointmentId, { status: 'cancelled' });
      }

      return NextResponse.json({
        success: true,
        action: 'cancel',
        isLiveApi: liveCancelled,
        appointmentId,
        eventId,
        message: 'Встреча успешно отменена в календаре.',
      });
    }

    // -------------------------------------------------------------
    // SCENARIO 2: RESCHEDULE / MOVE (ПЕРЕНОС)
    // -------------------------------------------------------------
    if (action === 'reschedule') {
      const newStart = startTime ? new Date(startTime) : new Date(Date.now() + 2 * 86400000); // 2 days later
      if (!startTime) newStart.setHours(16, 0, 0, 0);
      const newEnd = endTime ? new Date(endTime) : new Date(newStart.getTime() + 45 * 60000);

      let liveUpdated = null;
      if (ws?.googleRefreshToken && eventId) {
        try {
          liveUpdated = await updateGoogleCalendarEvent(ws.googleRefreshToken, eventId, {
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
            summary: summary || `Перенесённый урок — ${clientName}`,
          });
        } catch (err: any) {
          console.warn('Google Calendar patch error:', err.message);
        }
      }

      // Update DB appointment
      let updatedApp = null;
      if (appointmentId) {
        updatedApp = await updateAppointment(appointmentId, {
          startTime: newStart,
          endTime: newEnd,
          status: 'rescheduled',
        });
      }

      return NextResponse.json({
        success: true,
        action: 'reschedule',
        isLiveApi: Boolean(liveUpdated),
        eventId: liveUpdated?.id || eventId,
        newStartTime: newStart.toISOString(),
        newEndTime: newEnd.toISOString(),
        appointment: updatedApp,
        message: 'Встреча успешно перенесена на новое время.',
      });
    }

    // -------------------------------------------------------------
    // SCENARIO 3: CREATE (WITH DUPLICATE / IDEMPOTENCY CHECK)
    // -------------------------------------------------------------
    const start = startTime ? new Date(startTime) : new Date(Date.now() + 86400000);
    if (!startTime) start.setHours(14, 0, 0, 0);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 45 * 60000);

    // IDEMPOTENCY / DUPLICATE CHECK:
    // Check if appointment for this phone at this time already exists
    const existingDb = await findExistingAppointment(actualWorkspaceId, clientPhone, start);
    console.log('[DEBUG] test-event findExistingAppointment result:', {
      actualWorkspaceId,
      clientPhone,
      start: start.toISOString(),
      found: Boolean(existingDb),
      existingDbId: existingDb?.id,
    });
    if (existingDb) {
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        action: 'create',
        eventId: existingDb.googleEventId,
        appointmentId: existingDb.id,
        htmlLink: existingDb.googleEventLink,
        message: 'Запись на указанное время для данного контакта уже существует. Повторное создание пропущено (дубликат исключён).',
      });
    }

    const eventTitle = summary || `Пробный урок / Встреча — ${clientName}`;
    const eventDesc = `Клиент: ${clientName}\nТелефон: ${clientPhone}\nЗаписано ИИ-агентом AI Business OS`;

    let googleEventId: string | undefined = undefined;
    let googleEventLink: string | undefined = undefined;
    let isLiveApi = false;

    if (ws?.googleRefreshToken) {
      try {
        // Also check Google Calendar directly for duplicates
        const gExisting = await findExistingGoogleCalendarEvent(
          ws.googleRefreshToken,
          new Date(start.getTime() - 15 * 60000).toISOString(),
          new Date(end.getTime() + 15 * 60000).toISOString(),
          clientPhone
        );

        if (gExisting) {
          return NextResponse.json({
            success: true,
            isDuplicate: true,
            isLiveApi: true,
            eventId: gExisting.id,
            htmlLink: gExisting.htmlLink,
            summary: gExisting.summary,
            message: 'Событие уже присутствует в Google Календаре (дубликат исключён).',
          });
        }

        const result = await createGoogleCalendarEvent(ws.googleRefreshToken, {
          summary: eventTitle,
          description: eventDesc,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          attendeeName: clientName,
          attendeePhone: clientPhone,
        });

        googleEventId = result.id;
        googleEventLink = result.htmlLink;
        isLiveApi = true;
      } catch (err: any) {
        console.warn('Google Calendar live API create error:', err.message);
      }
    }

    if (!googleEventLink) {
      googleEventLink = generateDirectGoogleCalendarLink({
        title: eventTitle,
        details: eventDesc,
        startTime: start,
        endTime: end,
      });
    }

    // Save to appointments DB
    const newAppointment = await createAppointment({
      workspaceId: actualWorkspaceId,
      clientName,
      clientPhone,
      serviceName: 'Пробный урок / Встреча',
      startTime: start,
      endTime: end,
      status: 'confirmed',
      googleEventId,
      googleEventLink,
    });

    return NextResponse.json({
      success: true,
      action: 'create',
      isDuplicate: false,
      isLiveApi,
      eventId: googleEventId || `direct_${Date.now()}`,
      appointmentId: newAppointment.id,
      htmlLink: googleEventLink,
      summary: eventTitle,
      message: isLiveApi
        ? 'Событие успешно создано в Google Календаре!'
        : 'Запись успешно создана в базе организации со ссылкой на Google Календарь.',
    });
  } catch (error: any) {
    console.error('Error handling calendar test event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
