import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/src/db';
import { createGoogleCalendarEvent, getGoogleCalendarEvent, getGoogleCalendarFreeBusy } from './google';

interface BookingPayload {
  agentId: string;
  clientName: string;
  clientPhone: string;
  channel: string;
  summary: string;
  timeZone: string;
}
interface Reservation extends Record<string, unknown> {
  id: string;
  workspace_id: string;
  starts_at: Date | string;
  ends_at: Date | string;
  status: 'reserved' | 'creating' | 'confirmed' | 'rejected' | 'review';
  google_event_id: string;
  payload: BookingPayload;
  lead_id: string | null;
}
export type BookingResult = { status: 'confirmed'; eventId: string; leadId: string } | { status: 'busy' } | { status: 'pending' };

function database() {
  if (!db) throw new Error('Booking requires a shared database');
  return db;
}

/** No in-memory fallback: reservation admission must be shared by all servers. */
export async function bookReservedInterval(input: {
  workspaceId: string; requestKey: string; start: string; end: string;
  refreshToken: string; payload: BookingPayload;
}): Promise<BookingResult> {
  const connection = database();
  const id = randomUUID();
  const eventId = randomUUID().replaceAll('-', '');
  const admitted = await connection.execute<{ id: string | null }>(sql`
    SELECT reserve_calendar_interval(${id}, ${input.workspaceId}, 'primary', ${input.requestKey},
      ${input.start}::timestamptz, ${input.end}::timestamptz, ${eventId}, ${JSON.stringify(input.payload)}::jsonb) AS id
  `);
  if (!admitted.rows[0]?.id) return { status: 'busy' };
  const selected = await connection.execute<Reservation>(sql`
    SELECT * FROM calendar_reservations WHERE id = ${admitted.rows[0].id} AND workspace_id = ${input.workspaceId}
  `);
  const reservation = selected.rows[0];
  if (!reservation) throw new Error('Reservation missing');
  return completeReservation(reservation, input.refreshToken);
}

/** Recovery only reads Google after the durable creating boundary; never repeats POST. */
export async function completeReservation(r: Reservation, refreshToken: string): Promise<BookingResult> {
  const connection = database();
  if (r.status === 'confirmed' && r.lead_id) return { status: 'confirmed', eventId: r.google_event_id, leadId: r.lead_id };
  if (r.status === 'rejected') return { status: 'busy' };
  const start = new Date(r.starts_at).toISOString();
  const end = new Date(r.ends_at).toISOString();
  let event;
  if (r.status === 'reserved') {
    // A failed read is safe to retry: no provider mutation has been attempted yet.
    const busy = await getGoogleCalendarFreeBusy(refreshToken, start, end);
    if (Date.parse(start) <= Date.now() || busy.some((b) => Date.parse(b.start) < Date.parse(end) && Date.parse(b.end) > Date.parse(start))) {
      await connection.execute(sql`UPDATE calendar_reservations SET status = 'rejected', updated_at = now() WHERE id = ${r.id} AND status = 'reserved'`);
      return { status: 'busy' };
    }
    const claimed = await connection.execute<{ id: string }>(sql`
      UPDATE calendar_reservations SET status = 'creating', updated_at = now()
      WHERE id = ${r.id} AND status = 'reserved' RETURNING id
    `);
    if (!claimed.rows.length) return { status: 'pending' };
    try {
      event = await createGoogleCalendarEvent(refreshToken, {
        id: r.google_event_id, summary: r.payload.summary,
        description: 'Запись через gapcha AI', startTime: start, endTime: end,
        timeZone: r.payload.timeZone,
      });
    } catch {
      await connection.execute(sql`UPDATE calendar_reservations SET status = 'review', updated_at = now() WHERE id = ${r.id} AND status = 'creating'`);
      return { status: 'pending' };
    }
  } else {
    event = await getGoogleCalendarEvent(refreshToken, r.google_event_id);
    if (!event) return { status: 'pending' };
  }
  if (event.id !== r.google_event_id || event.status !== 'confirmed' || Date.parse(event.startTime) !== Date.parse(start) || Date.parse(event.endTime) !== Date.parse(end)) {
    await connection.execute(sql`UPDATE calendar_reservations SET status = 'review', updated_at = now() WHERE id = ${r.id} AND status <> 'confirmed'`);
    return { status: 'pending' };
  }
  // Both the lead and confirmation commit or roll back together. Replays use the same lead ID.
  const leadId = `booking_${r.id}`;
  await connection.execute(sql`
    WITH saved AS (
      INSERT INTO leads (id, workspace_id, agent_id, client_name, client_phone, channel, status, appointment_time, google_event_id, google_event_link)
      VALUES (${leadId}, ${r.workspace_id}, ${r.payload.agentId}, ${r.payload.clientName}, ${r.payload.clientPhone}, ${r.payload.channel}, 'booked', ${start}::timestamptz, ${r.google_event_id}, ${event.htmlLink})
      ON CONFLICT (id) DO UPDATE SET google_event_link = EXCLUDED.google_event_link
      RETURNING id
    ) UPDATE calendar_reservations SET status = 'confirmed', lead_id = saved.id, updated_at = now()
      FROM saved WHERE calendar_reservations.id = ${r.id}
  `);
  return { status: 'confirmed', eventId: r.google_event_id, leadId };
}
