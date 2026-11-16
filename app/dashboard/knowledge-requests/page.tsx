'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
interface Item { id: string; question: string; answer: string; status: string }
export default function KnowledgeRequests() {
  const { locale } = useApp();
  const uz = locale === 'uz';
  const [items, setItems] = useState<Item[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const r = await fetch('/api/knowledge-requests');
    if (!r.ok) throw new Error('unavailable');
    setItems((await r.json()).requests);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/knowledge-requests', { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error('unavailable'); return r.json(); })
      .then((data) => setItems(data.requests))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  async function resolve(id: string, action: string) {
    setBusy(true); setError(false);
    try {
      const r = await fetch('/api/knowledge-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, answer: answers[id] || '' }) });
      if (!r.ok) throw new Error('unavailable');
      await load();
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <main className="p-4 md:p-8 space-y-4 text-[var(--text-primary)]">
    <h1 className="text-2xl font-semibold">{uz ? 'AI uchun javob kerak' : 'ИИ нужен ответ'}</h1>
    <p>{uz ? 'Faqat tasdiqlangan javob bilimlar bazasiga qoʻshiladi. Mijozning shaxsiy maʼlumotlarini kiritmang.' : 'В базу знаний попадёт только подтверждённый ответ. Не включайте персональные данные клиента.'}</p>
    {error && <p role="alert">{uz ? 'Amal bajarilmadi. Keyinroq qayta urinib koʻring.' : 'Не удалось выполнить действие. Повторите позже.'}</p>}
    {!items.length && !error && <p>{uz ? 'Soʻrovlar yoʻq' : 'Запросов нет'}</p>}
    {items.map((item) => <section key={item.id} className="p-4 border border-[var(--border)] rounded-xl space-y-3">
      <h2 className="font-semibold break-words">{item.question}</h2>
      <p>{item.status === 'pending' ? (uz ? 'Javob kutilmoqda' : 'Ожидает ответа') : item.status === 'approved' ? (uz ? 'Tasdiqlangan' : 'Подтверждено') : (uz ? 'Rad etilgan' : 'Отклонено')}</p>
      {item.status === 'pending' && <><label className="block">{uz ? 'Tahrirlangan javob' : 'Отредактированный ответ'}<textarea className="block w-full border rounded-lg p-3 bg-[var(--surface)]" maxLength={5000} value={answers[item.id] || ''} onChange={(e) => setAnswers((a) => ({ ...a, [item.id]: e.target.value }))} /></label>
        <div className="flex flex-wrap gap-3"><button className="border rounded-lg p-2 disabled:opacity-50" disabled={busy || !answers[item.id]?.trim()} onClick={() => void resolve(item.id, 'approve')}>{uz ? 'Tasdiqlash va bazaga qoʻshish' : 'Подтвердить и добавить в базу'}</button>
        <button className="border rounded-lg p-2 disabled:opacity-50" disabled={busy} onClick={() => void resolve(item.id, 'reject')}>{uz ? 'Rad etish' : 'Отклонить'}</button></div></>}
    </section>)}
  </main>;
}
