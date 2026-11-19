export interface PendingBookingContext {
  serviceName?: string;
  startTime?: string;
  timeZone?: string;
  proposedAt?: string;
  workspaceId?: string;
  conversationId?: string;
}

export interface BookingConfirmationResult {
  confirmed: boolean;
  ru: string;
  uz: string;
  en: string;
  reason?: string;
}

const NATURAL_CONSENT_PATTERNS = [
  // Russian
  /да,\s*записывайте/i,
  /да\s+записывайте/i,
  /записывайте\s+меня/i,
  /^записывайте[.!]?$/i,
  /запишите\s+меня/i,
  /^запишите[.!]?$/i,
  /хорошо,\s*давайте/i,
  /хорошо\s+давайте/i,
  /^подтверждаю[.!]?$/i,
  /подтверждаю\s+запись/i,
  /да,\s*подходит/i,
  /да\s+подходит/i,
  /давайте\s+на\s+это\s+время/i,

  // Uzbek Latin
  /ha,\s*yozing/i,
  /ha\s+yozing/i,
  /xa\s+yozib\s+qoy(ing)?/i,
  /xa\s+yozing/i,
  /^mayli[.!]?$/i,
  /^roziman[.!]?$/i,
  /yozib\s+qo['ʻ`]?ying/i,
  /yozib\s+qoying/i,
  /^yozing[.!]?$/i,
  /ha,\s*ma['ʻ`]?qul/i,
  /ha\s+ma['ʻ`]?qul/i,

  // Uzbek Cyrillic
  /ҳа,\s*ёзинг/i,
  /ҳа\s+ёзинг/i,
  /майли,\s*ёзиб\s*қўйинг/i,
  /майли\s+ёзиб\s*қўйинг/i,
  /^розиман[.!]?$/i,
  /^маъқул[.!]?$/i,
  /ёзиб\s*қўйинг/i,
  /^ёзинг[.!]?$/i,

  // English
  /yes,\s*book\s+it/i,
  /yes\s+book\s+it/i,
  /sounds\s+good/i,
  /please\s+confirm/i,
  /yes,\s*please/i,
  /yes\s+please/i,
  /^confirm[.!]?$/i,
  /book\s+me\s+in/i,
];

const QUESTION_OR_ALTERNATIVE_PATTERN = /(\?|а\s+есть\s+другое|другое\s+время|позже|раньше|перенести|boshqa\s+vaqt|keyinroq|ertaroq|different\s+time|later|earlier|reschedule)/i;
const NEGATION_OR_DOUBT_PATTERN = /(^|\s)(нет|не\s+надо|не\s+подходит|не\s+смогу|отмена|отмените|yo['ʻ`]?q|kerakmas|kelolmayman|bekor|no|not|cancel|don'?t|дорого|сомневаюсь|qimmat)(\s|[.,!?]|$)/i;
const ISOLATED_YES_PATTERN = /^(да|yes|ha|xa|ok|ок)[.!]?$/i;

/**
 * Checks whether the customer provided unambiguous consent for the active slot.
 * Backward-compatible with the legacy exact confirmation phrase format.
 */
export function bookingConfirmation(
  startIso: string,
  timeZone: string,
  message: string,
  pendingBooking?: PendingBookingContext | null
): BookingConfirmationResult {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(startIso))
      .map((part) => [part.type, part.value])
  );
  const when = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  const ru = `Подтверждаю запись ${when}`;
  const uz = `Yozilishni tasdiqlayman ${when}`;
  const en = `Confirm booking ${when}`;

  const raw = (message || '').trim();
  const normalized = raw.replace(/\s+/g, ' ').toLowerCase();

  // 1. Strict rejection of questions, alternatives, doubts, or explicit negations
  if (QUESTION_OR_ALTERNATIVE_PATTERN.test(raw)) {
    return { confirmed: false, ru, uz, en, reason: 'question_or_alternative_requested' };
  }
  if (NEGATION_OR_DOUBT_PATTERN.test(raw)) {
    return { confirmed: false, ru, uz, en, reason: 'negation_or_doubt' };
  }

  // 2. Exact legacy formula match (ensures 100% backward compatibility)
  if (normalized === ru.toLowerCase() || normalized === uz.toLowerCase() || normalized === en.toLowerCase()) {
    return { confirmed: true, ru, uz, en };
  }

  // If there's an explicit date-time in the message that contradicts the requested slot, reject it
  const dateMentionMatch = normalized.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (dateMentionMatch && !normalized.includes(`${parts.year}-${parts.month}-${parts.day}`)) {
    return { confirmed: false, ru, uz, en, reason: 'date_mismatch' };
  }
  const timeMentionMatch = normalized.match(/\b\d{2}:\d{2}\b/);
  if (timeMentionMatch && !normalized.includes(`${parts.hour}:${parts.minute}`)) {
    return { confirmed: false, ru, uz, en, reason: 'time_mismatch' };
  }

  // 3. Reject isolated "да" without an active pending booking context
  if (ISOLATED_YES_PATTERN.test(normalized)) {
    if (!pendingBooking || !pendingBooking.startTime) {
      return { confirmed: false, ru, uz, en, reason: 'isolated_yes_without_pending_booking' };
    }
    // If pendingBooking matches startIso, confirm
    const pendingStart = new Date(pendingBooking.startTime).getTime();
    const targetStart = new Date(startIso).getTime();
    if (pendingStart === targetStart) {
      return { confirmed: true, ru, uz, en };
    }
    return { confirmed: false, ru, uz, en, reason: 'pending_slot_mismatch' };
  }

  // 4. Natural consent phrases
  const matchesNaturalPattern = NATURAL_CONSENT_PATTERNS.some((pattern) => pattern.test(normalized));

  if (matchesNaturalPattern) {
    // If pendingBooking context is passed, ensure the time matches
    if (pendingBooking && pendingBooking.startTime) {
      const pendingStart = new Date(pendingBooking.startTime).getTime();
      const targetStart = new Date(startIso).getTime();
      if (pendingStart !== targetStart) {
        return { confirmed: false, ru, uz, en, reason: 'pending_slot_mismatch' };
      }
    }
    return { confirmed: true, ru, uz, en };
  }

  return { confirmed: false, ru, uz, en, reason: 'not_confirmed' };
}
