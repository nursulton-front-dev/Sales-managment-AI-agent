import { NextRequest, NextResponse } from 'next/server';
import { getServerSessionContext } from '@/src/server/auth/session';
import { getSupportTicketById, getTicketMessages } from '@/lib/server/support';
import { validateAttachments } from '@/lib/server/support/attachments';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string; index: string }> }) {
  const { id, messageId, index } = await params;
  const session = await getServerSessionContext();
  if (!session.workspaceId) return new NextResponse(null, { status: 401 });
  const ticket = await getSupportTicketById(id);
  if (!ticket || (!session.isSuperAdmin && (ticket.workspaceId !== session.workspaceId || ticket.authorEmail !== session.userEmail))) return new NextResponse(null, { status: 404 });
  const message = (await getTicketMessages(id, session.isSuperAdmin)).find((item) => item.id === messageId);
  const attachment = message?.attachments?.[Number(index)];
  if (!/^\d+$/.test(index) || !attachment) return new NextResponse(null, { status: 404 });
  try {
    const [file] = validateAttachments([attachment]);
    return new NextResponse(new Uint8Array(Buffer.from(file.url.split(',')[1], 'base64')), { headers: { 'Content-Type': file.mimeType, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
