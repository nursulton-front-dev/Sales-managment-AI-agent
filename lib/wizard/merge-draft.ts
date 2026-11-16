import type { AgentDraft } from './types';

export type DraftRevisions = Partial<Record<keyof AgentDraft, number>>;

/** Preserve any field edited after the assistant request began, even if it was changed back. */
export function mergeAssistantDraft(current: AgentDraft, response: AgentDraft, before: DraftRevisions, now: DraftRevisions): AgentDraft {
  const merged = { ...response };
  for (const key of Object.keys(current) as (keyof AgentDraft)[]) {
    if ((now[key] ?? 0) > (before[key] ?? 0)) Object.assign(merged, { [key]: current[key] });
  }
  return merged;
}
