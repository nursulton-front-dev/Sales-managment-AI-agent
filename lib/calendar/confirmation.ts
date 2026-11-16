/** Deliberately explicit confirmation; model-generated arguments are not consent. */
export function bookingConfirmation(startIso: string, timeZone: string, message: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(startIso)).map((part) => [part.type, part.value]));
  const when = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  const ru = `Подтверждаю запись ${when}`;
  const uz = `Yozilishni tasdiqlayman ${when}`;
  const normalized = message.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  return { confirmed: normalized === ru.toLocaleLowerCase() || normalized === uz.toLocaleLowerCase(), ru, uz };
}
