import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/src/db';

export async function requestOwnerInput(workspaceId: string, agentId: string, question: string) {
  if (!db) throw new Error('Knowledge request storage unavailable');
  const text = question.trim().slice(0, 2000);
  if (!text) throw new Error('Question required');
  const key = createHash('sha256').update(text.toLocaleLowerCase().replace(/\s+/g, ' ')).digest('hex');
  const result = await db.execute(sql`INSERT INTO knowledge_requests (id, workspace_id, agent_id, question, dedupe_key)
    SELECT ${randomUUID()}, ${workspaceId}, id, ${text}, ${key} FROM agents WHERE id = ${agentId} AND workspace_id = ${workspaceId}
    ON CONFLICT (workspace_id, agent_id, dedupe_key) DO UPDATE SET updated_at = now() RETURNING id`);
  if (!result.rows.length) throw new Error('Agent unavailable');
}

/** Approval and publication are one SQL statement. Question/client text is never copied into KB. */
export async function resolveKnowledgeRequest(workspaceId: string, id: string, action: 'approve' | 'reject', answer: string) {
  if (!db) throw new Error('Knowledge request storage unavailable');
  if (action === 'approve' && (!answer.trim() || answer.length > 5000)) throw new Error('Invalid answer');
  if (action === 'reject') {
    const result = await db.execute(sql`UPDATE knowledge_requests SET status = 'rejected', updated_at = now()
      WHERE id = ${id} AND workspace_id = ${workspaceId} AND status = 'pending' RETURNING id`);
    return result.rows.length === 1;
  }
  const result = await db.execute(sql`WITH approved AS (
    UPDATE knowledge_requests SET status = 'approved', answer = ${answer.trim()}, updated_at = now()
      WHERE id = ${id} AND workspace_id = ${workspaceId} AND status = 'pending'
      AND EXISTS (SELECT 1 FROM agents WHERE agents.id = knowledge_requests.agent_id AND agents.workspace_id = ${workspaceId})
      RETURNING agent_id, answer
    ) UPDATE agents SET knowledge_base = concat_ws(E'\n\n', knowledge_base, approved.answer)
      FROM approved WHERE agents.id = approved.agent_id AND agents.workspace_id = ${workspaceId} RETURNING agents.id`);
  return result.rows.length === 1;
}
