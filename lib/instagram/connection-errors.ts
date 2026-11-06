export const instagramConnectionMessages: Record<string, string> = {
  missing_code_or_state: 'Meta не вернула код подключения. Запустите подключение заново с этой страницы.',
  invalid_state_signature: 'Срок подключения истёк. Запустите подключение Instagram заново.',
  unauthorized_workspace: 'Компания или сессия изменилась во время подключения. Войдите в нужную компанию и повторите попытку.',
  workspace_not_found: 'Компания для подключения не найдена.',
  access_denied: 'Доступ к Instagram не предоставлен. Повторите подключение и подтвердите разрешения.',
  token_exchange_failed: 'Не удалось обменять код Meta на доступ. Проверьте App ID, секрет приложения и адрес возврата в настройках сервера.',
  profile_unavailable: 'Meta не предоставила доступный Instagram-профиль. Проверьте выбранный профиль, бизнес-портфолио и разрешения, затем подключите его заново.',
  subscription_failed: 'Meta не подтвердила подписку на сообщения Instagram. Проверьте разрешение на сообщения и настройки webhook.',
  save_failed: 'Не удалось сохранить подключение Instagram. Повторите попытку; если ошибка сохранится, обратитесь в поддержку.',
};

export function instagramConnectionMessage(code: string): string {
  return Object.hasOwn(instagramConnectionMessages, code)
    ? instagramConnectionMessages[code]
    : 'Не удалось подключить Instagram. Повторите попытку или обратитесь в поддержку.';
}
