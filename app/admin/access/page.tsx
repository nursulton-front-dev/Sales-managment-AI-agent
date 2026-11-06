'use client';
import { useEffect, useState } from 'react';
import { STAFF_ROLES, type StaffRole } from '@/src/server/admin/policy';
const labels = { support: 'Поддержка — обращения', finance: 'Финансы — просмотр компаний и баланса', operator: 'Оператор — каналы и диагностика' };
type Member = { email: string; role: StaffRole; status: string };
type Event = { actor_email: string; target_email: string; action: string; role: string; created_at: string };
export default function AdminAccessPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('support');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const res = await fetch('/api/admin/access', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Не удалось загрузить доступы');
    setMembers(data.members); setEvents(data.events);
  }
  useEffect(() => {
    let active = true;
    fetch('/api/admin/access', { cache: 'no-store' }).then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить доступы');
      if (active) { setMembers(data.members); setEvents(data.events); }
    }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, []);
  async function act(action: string, target: string, nextRole?: StaffRole) {
    setBusy(true); setMessage(''); setLink('');
    try {
      const res = await fetch('/api/admin/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, email: target, role: nextRole }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.invitationPath) setLink(new URL(data.invitationPath, location.origin).href);
      setMessage(action === 'invite' ? 'Приглашение создано на 24 часа. Передайте ссылку сотруднику лично.' : 'Доступ обновлён');
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setBusy(false); }
  }
  return <div className="space-y-6 max-w-5xl">
    <div><h1 className="text-2xl font-bold">Доступ сотрудников</h1><p className="mt-2 text-sm">Только главный администратор приглашает сотрудников и назначает роли. Финансы доступны только для просмотра. Повторная отправка сообщений и изменение компаний остаются у владельца.</p></div>
    <form onSubmit={e => { e.preventDefault(); void act('invite', email, role); }} className="flex flex-wrap items-end gap-3 rounded-lg border p-5">
      <label className="grid gap-2">Email сотрудника<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="border rounded p-2 bg-[var(--surface)]" /></label>
      <label className="grid gap-2">Роль<select value={role} onChange={e => setRole(e.target.value as StaffRole)} className="border rounded p-2 bg-[var(--surface)]">{STAFF_ROLES.map(r => <option key={r} value={r}>{labels[r]}</option>)}</select></label>
      <button disabled={busy} className="rounded bg-red-600 text-white px-4 py-2 disabled:opacity-50">Создать приглашение</button>
    </form>
    <p role="status">{message}</p>
    {link && <label className="grid gap-2">Одноразовая ссылка — письмо автоматически не отправляется<input readOnly value={link} onFocus={e => e.target.select()} className="border rounded p-3 w-full bg-[var(--surface)]" /></label>}
    <div className="space-y-3">{members.map(m => <div key={m.email} className="flex flex-wrap gap-3 items-center border rounded p-4">
      <span className="flex-1 break-all">{m.email} · {m.status === 'active' ? 'Активен' : m.status === 'pending' ? 'Ожидает принятия' : 'Отозван'}</span>
      <select aria-label={`Роль ${m.email}`} disabled={busy || m.status !== 'active'} value={m.role} onChange={e => void act('change_role', m.email, e.target.value as StaffRole)} className="border p-2 rounded bg-[var(--surface)]">{STAFF_ROLES.map(r => <option key={r} value={r}>{labels[r]}</option>)}</select>
      <button disabled={busy || m.status === 'revoked'} onClick={() => void act('revoke', m.email)} className="border rounded p-2 disabled:opacity-50">Отозвать</button>
    </div>)}</div>
    <h2 className="text-lg font-semibold">История доступа</h2>
    {events.map((e, i) => <p key={i} className="text-sm border-b pb-2">{new Date(e.created_at).toLocaleString('ru-RU')} · {e.actor_email} · {e.action} · {e.target_email} · {e.role}</p>)}
  </div>;
}
