/**
 * Working hours & calendar slot calculation utility
 * Handles timezone-aware boundary checks, slot duration constraints, and busy slot exclusion.
 */

/** Accept common time-range input and store one unambiguous HH:mm-HH:mm format. */
export function normalizeWorkingHours(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)\s*[-–—−]\s*(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const startHour = Number(match[1]);
  const endHour = Number(match[3]);
  if (startHour > 23 || endHour > 23) return null;
  const start = startHour * 60 + Number(match[2]);
  const end = endHour * 60 + Number(match[4]);
  if (start >= end) return null;
  return `${String(startHour).padStart(2, '0')}:${match[2]}-${String(endHour).padStart(2, '0')}:${match[4]}`;
}

export interface WorkingHoursRange {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  startTotalMinutes: number;
  endTotalMinutes: number;
}

export function parseWorkingHours(rangeStr = '10:00-18:00'): WorkingHoursRange {
  const normalized = normalizeWorkingHours(rangeStr) || '10:00-18:00';
  const [startPart, endPart] = normalized.split('-');
  const [startH, startM] = startPart.split(':').map(Number);
  const [endH, endM] = endPart.split(':').map(Number);

  return {
    startHour: startH,
    startMinute: startM,
    endHour: endH,
    endMinute: endM,
    startTotalMinutes: startH * 60 + startM,
    endTotalMinutes: endH * 60 + endM,
  };
}

/**
 * Validates that an appointment start time and duration fit strictly inside working hours and business days.
 * E.g., if working hours are 09:00-19:00 with 30m duration, a slot starting at 18:30 ends at 19:00 (valid),
 * but a slot starting at 19:00 ends at 19:30 (invalid).
 */
export function isSlotWithinWorkingHours(
  startTime: Date | string,
  durationMinutes = 30,
  workingHoursRange = '10:00-18:00',
  timeZone = 'Asia/Tashkent',
  allowedDaysOfWeek = [1, 2, 3, 4, 5, 6] // 0=Sun, 1=Mon, ..., 6=Sat (Mon-Sat by default)
): { valid: boolean; reason?: string; startIso?: string; endIso?: string } {
  const dateObj = typeof startTime === 'string' ? new Date(startTime) : startTime;
  if (isNaN(dateObj.getTime())) {
    return { valid: false, reason: 'Некорректная дата или время записи' };
  }

  // Format in company timezone to extract weekday, hour, and minute
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateObj);
  let hour = 0;
  let minute = 0;
  let weekdayStr = '';

  for (const p of parts) {
    if (p.type === 'hour') hour = Number(p.value);
    if (p.type === 'minute') minute = Number(p.value);
    if (p.type === 'weekday') weekdayStr = p.value;
  }

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayIndex = weekdayMap[weekdayStr] ?? dateObj.getUTCDay();

  if (!allowedDaysOfWeek.includes(dayIndex)) {
    return { valid: false, reason: 'Выбранный день является нерабочим' };
  }

  const range = parseWorkingHours(workingHoursRange);
  const slotStartMinutes = hour * 60 + minute;
  const slotEndMinutes = slotStartMinutes + durationMinutes;

  if (slotStartMinutes < range.startTotalMinutes) {
    return {
      valid: false,
      reason: `Время ${formatMinutes(slotStartMinutes)} раньше начала рабочего дня (${formatMinutes(range.startTotalMinutes)})`,
    };
  }

  if (slotEndMinutes > range.endTotalMinutes) {
    return {
      valid: false,
      reason: `Запись длительностью ${durationMinutes} мин. закончится в ${formatMinutes(slotEndMinutes)}, позже окончания рабочего дня (${formatMinutes(range.endTotalMinutes)})`,
    };
  }

  const endObj = new Date(dateObj.getTime() + durationMinutes * 60000);
  return {
    valid: true,
    startIso: dateObj.toISOString(),
    endIso: endObj.toISOString(),
  };
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Computes list of available time slots for a given day, excluding busy intervals from Google Calendar
 */
export function getAvailableDaySlots(
  dateStr: string, // YYYY-MM-DD
  workingHoursRange = '10:00-18:00',
  slotDuration = 30,
  busySlots: Array<{ start: string; end: string }> = [],
  timeZone = 'Asia/Tashkent'
): string[] {
  const range = parseWorkingHours(workingHoursRange);
  const availableSlots: string[] = [];

  const parsedBusy = busySlots.map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  for (let m = range.startTotalMinutes; m + slotDuration <= range.endTotalMinutes; m += slotDuration) {
    const timeStr = formatMinutes(m);
    // Construct slot start in ISO format for the date
    const slotStartIso = `${dateStr}T${timeStr}:00`;
    const slotStartDate = new Date(`${slotStartIso}+05:00`); // Assuming Asia/Tashkent UTC+5 or local
    const slotStartMs = slotStartDate.getTime();
    const slotEndMs = slotStartMs + slotDuration * 60000;

    // Check if slot overlaps with any busy interval
    const overlaps = parsedBusy.some(
      (busy) => slotStartMs < busy.end && slotEndMs > busy.start
    );

    if (!overlaps) {
      availableSlots.push(timeStr);
    }
  }

  return availableSlots;
}
