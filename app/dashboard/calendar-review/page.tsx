'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
interface Reservation { id: string; starts_at: string; status: string }
export default function CalendarReview() {
  const { locale } = useApp();
  const uz = locale === 'uz';
  const [rows, setRows] = useState<Reservation[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch('/api/calendar/reservations');
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    setRows(data.reservations);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/calendar/reservations', { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('unavailable'); return r.json(); })
      .then((data) => setRows(data.reservations))
      .catch(() => { if (!controller.signal.aborted) setError('unavailable'); });
    return () => controller.abort();
  }, []);
  async function act(id: string, action: string) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/calendar/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) });
      const data = await response.json();
      if (!response.ok || data.status === 'pending') setError('pending');
      await load();
    } catch { setError('unavailable'); } finally { setBusy(false); }
  }
  const labels: Record<string, string> = uz
    ? { reserved: 'Yaratish boshlanmagan', creating: 'Natija tekshirilmoqda', review: 'Tekshirish kerak', confirmed: 'Tasdiqlangan', rejected: 'Bekor qilingan' }
    : { reserved: 'Создание не начиналось', creating: 'Результат уточняется', review: 'Нужна проверка', confirmed: 'Подтверждено', rejected: 'Отклонено' };
  return <main className="p-4 md:p-8 space-y-4 text-[var(--text-primary)]">
    <h1 className="text-2xl font-semibold">{uz ? 'Taqvim yozuvlarini tekshirish' : 'Проверка записей календаря'}</h1>
    <p>{uz ? 'Nomaʼlum natijada yangi yozuv yaratilmaydi. Avval natijani tekshiring.' : 'При неизвестном результате новая запись не создаётся. Сначала проверьте результат.'}</p>
    {error && <p role="alert">{uz ? 'Natija hali tasdiqlanmagan. Keyinroq qayta tekshiring yoki yordamga murojaat qiling.' : 'Результат пока не подтверждён. Повторите проверку позже или обратитесь в поддержку.'}</p>}
    {!rows.length && !error && <p>{uz ? 'Yozuvlar yoʻq' : 'Записей нет'}</p>}
    <ul className="space-y-3">{rows.map((r) => <li key={r.id} className="rounded-xl border border-[var(--border)] p-4 flex flex-wrap items-center gap-4">
      <span>{new Date(r.starts_at).toLocaleString(uz ? 'uz-UZ' : 'ru-RU')}</span><span>{labels[r.status] || r.status}</span>
      {['creating', 'review'].includes(r.status) && <button className="border rounded-lg px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => void act(r.id, 'reconcile')}>{uz ? 'Natijani tekshirish' : 'Проверить результат'}</button>}
      {r.status === 'reserved' && <button className="border rounded-lg px-4 py-2 disabled:opacity-50" disabled={busy} onClick={() => void act(r.id, 'release')}>{uz ? 'Rezervni bekor qilish' : 'Освободить резерв'}</button>}
    </li>)}</ul>
  </main>;
}
