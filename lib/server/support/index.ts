import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export interface CreateTicketParams {
  workspaceId: string;
  authorEmail: string;
  authorName: string;
  type: 'question' | 'bug' | 'complaint' | 'suggestion';
  subject: string;
  description: string;
  attachments?: Array<{ name: string; url: string; size: number; mimeType: string }>;
}

export async function createSupportTicket(params: CreateTicketParams) {
  if (!db) throw new Error('Database is not initialized');

  // Generate sequential-like ticket number based on existing count
  const allTickets = await db.select().from(schema.supportTickets);
  const ticketNumber = 1000 + allTickets.length + 1;
  const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const now = new Date();
  const [ticket] = await db
    .insert(schema.supportTickets)
    .values({
      id: ticketId,
      ticketNumber,
      workspaceId: params.workspaceId,
      authorEmail: params.authorEmail,
      authorName: params.authorName,
      type: params.type,
      subject: params.subject,
      description: params.description,
      status: 'new',
      unreadByCustomer: false,
      unreadBySupport: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Create initial message with attachments
  await db.insert(schema.supportMessages).values({
    id: `msg_${Date.now()}_init`,
    ticketId,
    senderRole: 'customer',
    senderEmail: params.authorEmail,
    senderName: params.authorName,
    text: params.description,
    isInternalNote: false,
    attachments: params.attachments || [],
    createdAt: now,
  });

  return ticket;
}

export async function getCustomerTickets(authorEmail: string, workspaceId: string) {
  if (!db) return [];
  return db
    .select()
    .from(schema.supportTickets)
    .where(
      and(
        eq(schema.supportTickets.authorEmail, authorEmail),
        eq(schema.supportTickets.workspaceId, workspaceId)
      )
    )
    .orderBy(desc(schema.supportTickets.updatedAt));
}

export async function getAllSupportTicketsForAdmin() {
  if (!db) return [];
  return db
    .select()
    .from(schema.supportTickets)
    .orderBy(desc(schema.supportTickets.updatedAt));
}

export async function getSupportTicketById(ticketId: string) {
  if (!db) return null;
  const [ticket] = await db
    .select()
    .from(schema.supportTickets)
    .where(eq(schema.supportTickets.id, ticketId))
    .limit(1);
  return ticket || null;
}

export async function getTicketMessages(ticketId: string, includeInternalNotes: boolean = false) {
  if (!db) return [];
  const rows = await db
    .select()
    .from(schema.supportMessages)
    .where(eq(schema.supportMessages.ticketId, ticketId))
    .orderBy(schema.supportMessages.createdAt);

  if (includeInternalNotes) {
    return rows;
  }
  return rows.filter((m) => !m.isInternalNote);
}

export async function addSupportMessage({
  ticketId,
  senderRole,
  senderEmail,
  senderName,
  text,
  isInternalNote = false,
  attachments = [],
}: {
  ticketId: string;
  senderRole: 'customer' | 'support';
  senderEmail: string;
  senderName: string;
  text: string;
  isInternalNote?: boolean;
  attachments?: Array<{ name: string; url: string; size: number; mimeType: string }>;
}) {
  if (!db) throw new Error('Database is not initialized');

  const now = new Date();
  const [msg] = await db
    .insert(schema.supportMessages)
    .values({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ticketId,
      senderRole,
      senderEmail,
      senderName,
      text,
      isInternalNote,
      attachments,
      createdAt: now,
    })
    .returning();

  // Update ticket unread states and updatedAt
  const updates: Partial<schema.SupportTicket> = {
    updatedAt: now,
  };

  if (!isInternalNote) {
    if (senderRole === 'support') {
      updates.unreadByCustomer = true;
      updates.status = 'waiting_user';
    } else {
      updates.unreadBySupport = true;
      updates.status = 'in_progress';
    }
  }

  await db
    .update(schema.supportTickets)
    .set(updates)
    .where(eq(schema.supportTickets.id, ticketId));

  return msg;
}

export async function updateTicketStatus(
  ticketId: string,
  status: 'new' | 'in_progress' | 'waiting_user' | 'resolved',
  assignedTo?: string
) {
  if (!db) throw new Error('Database is not initialized');

  const updates: any = { status, updatedAt: new Date() };
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;

  const [ticket] = await db
    .update(schema.supportTickets)
    .set(updates)
    .where(eq(schema.supportTickets.id, ticketId))
    .returning();

  return ticket;
}

export async function markTicketAsReadByCustomer(ticketId: string) {
  if (!db) return;
  await db
    .update(schema.supportTickets)
    .set({ unreadByCustomer: false })
    .where(eq(schema.supportTickets.id, ticketId));
}

export async function markTicketAsReadBySupport(ticketId: string) {
  if (!db) return;
  await db
    .update(schema.supportTickets)
    .set({ unreadBySupport: false })
    .where(eq(schema.supportTickets.id, ticketId));
}
