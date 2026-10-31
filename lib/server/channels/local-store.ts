import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ChannelEvent, WebsiteWidget, WidgetSession } from '@/src/db/schema';

type Store = {
  events: ChannelEvent[];
  widgets: WebsiteWidget[];
  sessions: WidgetSession[];
  limits: Record<string, { count: number; expiresAt: number }>;
};
const filename = path.join(process.env.CHORLA_DATA_DIR || path.join(process.cwd(), '.data'), 'integrations.json');

// Development fallback, single Node process only. A mutation never yields between read and replace.
export function localIntegrations<T>(mutate: (store: Store) => T, write = false): T {
  const store: Store = fs.existsSync(filename)
    ? JSON.parse(fs.readFileSync(filename, 'utf8'))
    : { events: [], widgets: [], sessions: [], limits: {} };
  const result = mutate(store);
  if (write) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(store), { mode: 0o600 });
    fs.renameSync(temporary, filename);
  }
  return result;
}
