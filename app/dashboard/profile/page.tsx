'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { authClient } from '@/lib/auth-client';
import { useApp } from '@/context/AppContext';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sun, Moon, Monitor, LogOut } from 'lucide-react';

type Session = { id: string; token: string; userAgent?: string | null; createdAt: Date | string; expiresAt: Date | string };
export default function ProfilePage() {
  const { user, emailVerified, refreshWorkspace, showToast, logout } = useApp();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  useUnsavedChanges(name !== (user?.name || '') || Boolean(currentPassword || password || confirmation));
  return <div className="space-y-6">
    <PageHeader title="Мой профиль" description="Личные данные, оформление и безопасность аккаунта." />
    <div className="grid lg:grid-cols-2 gap-5">
      <Card><CardBody><form className="space-y-5" onSubmit={async (event) => { event.preventDefault(); if (saving) return; setSaving(true); try { const result = await authClient.updateUser({ name: name.trim() }); if (result.error) throw new Error(result.error.message); const res = await fetch('/api/workspace/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerName: name.trim() }) }); if (!res.ok) throw new Error('Не удалось обновить имя в компании'); await refreshWorkspace(); showToast('Личные данные сохранены'); } catch (failure) { showToast('Не удалось сохранить', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); } finally { setSaving(false); } }}>
        <h2 className="text-lg font-semibold">Личные данные</h2><div className="w-16 h-16 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center text-2xl font-semibold">{user?.name?.slice(0, 1)}</div><Input label="Имя" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} /><Input label="Электронная почта" value={user?.email || ''} readOnly /><Badge variant={emailVerified ? 'success' : 'warning'}>{emailVerified ? 'Email подтверждён' : 'Email не подтверждён'}</Badge><p className="text-xs text-[var(--text-muted)]">Смена email пока недоступна.</p><Button type="submit" isLoading={saving} disabled={name === user?.name}>Сохранить изменения</Button>
      </form></CardBody></Card>
      <Card><CardBody className="space-y-5"><h2 className="text-lg font-semibold">Оформление</h2><fieldset><legend className="text-sm font-medium mb-3">Тема интерфейса</legend><div className="grid grid-cols-3 gap-3">{[{ value: 'light', label: 'Светлая', Icon: Sun }, { value: 'dark', label: 'Тёмная', Icon: Moon }, { value: 'system', label: 'Как в системе', Icon: Monitor }].map(({ value, label, Icon }) => <button type="button" key={value} aria-pressed={theme === value} onClick={() => setTheme(value)} className={`rounded-md border p-3 text-sm flex flex-col items-center gap-3 ${theme === value ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : ''}`}><Icon size={22} />{label}</button>)}</div></fieldset><Input label="Язык интерфейса" value="Русский" readOnly /><p className="text-xs text-[var(--text-muted)]">Сейчас доступен русский язык.</p></CardBody></Card>
      <Card><CardBody><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (changing) return; if (password !== confirmation) { showToast('Пароли не совпадают', undefined, 'error'); return; } setChanging(true); try { const result = await authClient.changePassword({ currentPassword, newPassword: password, revokeOtherSessions: true }); if (result.error) throw new Error(result.error.message); setCurrentPassword(''); setPassword(''); setConfirmation(''); setSessions(null); showToast('Пароль изменён', 'Остальные сеансы завершены.'); } catch (failure) { showToast('Не удалось изменить пароль', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); } finally { setChanging(false); } }}><h2 className="text-lg font-semibold">Безопасность</h2><Input label="Текущий пароль" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /><Input label="Новый пароль" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /><Input label="Повторите новый пароль" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /><Button type="submit" variant="outline" isLoading={changing}>Изменить пароль</Button></form></CardBody></Card>
      <div className="space-y-5"><Card><CardBody className="space-y-4"><h2 className="text-lg font-semibold">Активные сеансы</h2><Button variant="outline" isLoading={loadingSessions} onClick={async () => { setLoadingSessions(true); try { const result = await authClient.listSessions(); if (result.error) throw new Error(result.error.message); setSessions(result.data || []); } catch (failure) { showToast('Не удалось загрузить сеансы', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); } finally { setLoadingSessions(false); } }}>Показать сеансы</Button>{sessions && <ul className="divide-y">{sessions.map((session) => <li key={session.id} className="py-3 text-sm"><p className="break-words">{session.userAgent || 'Устройство не определено'}</p><p className="text-[var(--text-secondary)]">Вход: {new Date(session.createdAt).toLocaleString('ru-RU')}</p></li>)}</ul>}</CardBody></Card><Card><CardBody className="space-y-4"><h2 className="text-lg font-semibold">Аккаунт</h2><Button variant="ghost" onClick={logout}><LogOut size={18} />Выйти из аккаунта</Button></CardBody></Card></div>
    </div>
  </div>;
}
