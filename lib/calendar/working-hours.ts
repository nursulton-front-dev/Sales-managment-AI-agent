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
