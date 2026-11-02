export class DeliveryRejectedError extends Error {
  constructor(public readonly retryable: boolean, public readonly code = 'delivery_rejected') {
    super(eventErrors[code] || 'Канал отклонил отправку. Проверьте подключение.');
  }
}

export const eventErrors: Record<string, string> = {
  temporary_failure: 'Временный сбой. Запланирована повторная попытка.',
  model_unavailable: 'Сервис ответов временно недоступен. Запланирована повторная попытка.',
  insufficient_balance: 'Недостаточно токенов на балансе компании. Пополните баланс.',
  auth_error: 'Ошибка авторизации у провайдера ИИ. Проверьте настройки.',
  rate_limit: 'Превышен лимит запросов к ИИ. Запланирована повторная попытка.',
  timeout: 'Время ожидания ответа ИИ истекло. Запланирована повторная попытка.',
  empty_reply: 'ИИ вернул пустой ответ.',
  inactive: 'Канал или сотрудник отключён.',
  human_takeover: 'Автоответ остановлен: диалог передан человеку.',
  handled_by_operator: 'Диалог обработан оператором.',
  outcome_unknown: 'Результат операции неизвестен. Проверьте историю перед повторной отправкой вручную.',
  delivery_rejected: 'Канал отклонил отправку. Проверьте подключение.',
  needs_reconnect: 'Нужно переподключить Instagram.',
  window_expired: 'Окно ответа Instagram закрыто. Дождитесь нового сообщения клиента.',
  attempts_exhausted: 'Повторные попытки исчерпаны. Требуется проверка.',
};
