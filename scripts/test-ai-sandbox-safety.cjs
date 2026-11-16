const assert = require('node:assert/strict');
const loader = require('./helpers/load-typescript.cjs');
let toolName = 'book_appointment';
let leadWrites = 0;
let calendarCreates = 0;
let charges = 0;
let busyMode = 'occupied';
const ws = { id: 'test-workspace', tokenBalance: 10, settings: {}, googleCalendarConnected: false };
const agent = { id: 'test-agent', workspaceId: ws.id, name: 'Test', nicheTemplate: 'courses', qualificationQuestions: [] };
const load = loader({ DEEPSEEK_API_KEY: 'isolated-key' }, {
  '@/src/db': {
    getAllAgents: async () => [agent], getWorkspaceById: async () => ws,
    recordTokenTransaction: async () => { charges++; return { success: true }; },
    upsertLead: async () => { leadWrites++; return { id: 'lead-test' }; },
  },
  '@/lib/calendar/reservations': {
    bookReservedInterval: async () => {
      if (busyMode === 'error') throw new Error('Unavailable');
      return { status: 'busy' };
    },
  },
  '@/lib/calendar/google': {
    findExistingGoogleCalendarEvent: async () => null,
    getGoogleCalendarFreeBusy: async () => {
      if (busyMode === 'error') throw new Error('Unavailable');
      return [{ start: '2030-01-14T05:00:00.000Z', end: '2030-01-14T06:00:00.000Z' }];
    },
    createGoogleCalendarEvent: async () => { calendarCreates++; return { id: 'event-test' }; },
  },
  '@/lib/server/security/entitlements': { isWorkspaceEntitled: () => ({ entitled: true }) },
  '@/lib/server/ai/providers/deepseek': {
    DeepSeekProvider: class {
      defaultModel = 'test';
      async complete() { return { toolCalls: [{ function: { name: toolName, arguments: JSON.stringify({ clientName: 'Test', clientPhone: '998900000000', startTime: '2030-01-14T10:00:00+05:00', date: '2030-01-14' }) } }] }; }
    },
  },
});
async function main() {
  const { processAgentMessage } = load('lib/ai/gateway.ts');
  for (toolName of ['book_appointment', 'save_lead_qualification', 'check_calendar_slots']) {
    const r = await processAgentMessage({ message: 'Тест', workspaceId: ws.id, agentId: agent.id, isSandbox: true });
    assert.match(r.reply, /тестовый диалог/i);
    assert.equal(r.isBooking, false);
    assert.equal(r.tokensCost, 0);
  }
  assert.equal(leadWrites, 0);
  assert.equal(charges, 0);
  toolName = 'check_calendar_slots';
  const r = await processAgentMessage({ message: 'Когда свободно?', workspaceId: ws.id, agentId: agent.id });
  assert.match(r.reply, /не подключён/i);
  assert.equal(leadWrites, 0);
  ws.googleCalendarConnected = true; ws.googleRefreshToken = 'test-token';
  toolName = 'book_appointment';
  const occupied = await processAgentMessage({ bookingRequestKey: 'test-event', message: 'Подтверждаю запись 2030-01-14 10:00', workspaceId: ws.id, agentId: agent.id });
  assert.match(occupied.reply, /занято/i);
  assert.equal(calendarCreates, 0);
  assert.equal(leadWrites, 0);
  busyMode = 'error';
  const pending = await processAgentMessage({ bookingRequestKey: 'test-event', message: 'Подтверждаю запись 2030-01-14 10:00', workspaceId: ws.id, agentId: agent.id });
  assert.match(pending.reply, /не удалось подтвердить/i);
  assert.equal(pending.isBooking, false);
  assert.equal(calendarCreates, 0);
  assert.equal(leadWrites, 0);
  console.log('PASS: occupied slot is rejected and failed calendar checks do not create events');
  console.log('PASS: sandbox tools do not create leads, bookings, or check live calendar');
  console.log('PASS: unavailable calendar does not report free slots');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
