import { sql } from 'drizzle-orm';
import { db } from '@/src/db';
import { getServerSessionContext } from '@/src/server/auth/session';
import { resolveKnowledgeRequest } from '@/lib/knowledge/requests';
export async function GET() {
  const session = await getServerSessionContext();
  if (!session.workspaceId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    if (!db) throw new Error('unavailable');
    const result = await db.execute(sql`SELECT id, question, answer, status FROM knowledge_requests WHERE workspace_id = ${session.workspaceId} ORDER BY created_at DESC LIMIT 100`);
    return Response.json({ requests: result.rows });
  } catch { return Response.json({ error: 'Unavailable' }, { status: 503 }); }
}
export async function POST(request: Request) {
  const session = await getServerSessionContext();
  if (!session.workspaceId || !['owner', 'admin', 'super_admin'].includes(session.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json();
    if (typeof body.id !== 'string' || body.id.length > 100 || !['approve', 'reject'].includes(body.action) || typeof body.answer !== 'string' || body.answer.length > 5000 || (body.action === 'approve' && !body.answer.trim())) return Response.json({ error: 'Invalid input' }, { status: 400 });
    const resolved = await resolveKnowledgeRequest(session.workspaceId, body.id, body.action, body.answer);
    return Response.json({ success: resolved }, { status: resolved ? 200 : 409 });
  } catch { return Response.json({ error: 'Unavailable' }, { status: 503 }); }
}
