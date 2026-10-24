import { ToolDefinition } from './provider';

export const BUSINESS_AGENT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'check_slots',
      description: 'Проверить свободные слоты в Google Календаре компании для записи на прием или урок.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Дата в формате YYYY-MM-DD для проверки доступных слотов.',
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Записать клиента на конкретное время в Google Календарь после его согласия.',
      parameters: {
        type: 'object',
        properties: {
          clientName: {
            type: 'string',
            description: 'Имя клиента.',
          },
          clientPhone: {
            type: 'string',
            description: 'Номер телефона клиента в формате +998...',
          },
          startTime: {
            type: 'string',
            description: 'Точное время начала встречи в формате ISO-8601 (например: 2026-10-25T10:00:00.000Z).',
          },
          serviceName: {
            type: 'string',
            description: 'Название выбранной услуги или курса.',
          },
        },
        required: ['clientName', 'clientPhone', 'startTime'],
      },
    },
  },
];
