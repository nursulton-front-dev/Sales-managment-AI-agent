'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AcceptAdminInvite() {
  const router = useRouter();
  const [message, setMessage] = useState('Войдите в аккаунт с тем email, на который создано приглашение. Затем вернитесь к этой ссылке.');
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept', token: location.hash.slice(1) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      history.replaceState(null, '', '/admin-invite');
      router.replace('/admin'); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setBusy(false); }
  }
  return <main className="max-w-lg mx-auto p-8 space-y-6"><h1 className="text-2xl font-bold">Приглашение в команду gapcha</h1><p role="status">{message}</p><a className="underline" href="/login" target="_blank" rel="noreferrer">Войти в отдельной вкладке</a><button disabled={busy} onClick={accept} className="block px-4 py-3 rounded bg-red-600 text-white">Принять приглашение</button></main>;
}
