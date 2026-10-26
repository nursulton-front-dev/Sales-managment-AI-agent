import fs from 'node:fs';
import path from 'node:path';
import type { SupportTicket, SupportMessage } from '@/src/db/schema';

type Store = { tickets: SupportTicket[]; messages: SupportMessage[] };
const directory = process.env.CHORLA_DATA_DIR || path.join(process.cwd(), '.data');
const filename = path.join(directory, 'support_store.json');
export function readSupportStore(): Store {
  if (!fs.existsSync(filename)) return { tickets: [], messages: [] };
  const data = JSON.parse(fs.readFileSync(filename, 'utf8')) as Store;
  return { tickets: data.tickets.map((ticket) => ({ ...ticket, createdAt: new Date(ticket.createdAt), updatedAt: new Date(ticket.updatedAt) })), messages: data.messages.map((message) => ({ ...message, createdAt: new Date(message.createdAt) })) };
}
export function writeSupportStore(data: Store) {
  fs.mkdirSync(directory, { recursive: true });
  const temporary = `${filename}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(temporary, filename);
}
