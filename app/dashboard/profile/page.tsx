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
import { Sun, Moon, Monitor, LogOut, Globe } from 'lucide-react';

type Session = {
  id: string;
  token: string;
  userAgent?: string | null;
  createdAt: Date | string;
  expiresAt: Date | string;
};

export default function ProfilePage() {
  const { user, emailVerified, refreshWorkspace, showToast, logout, locale, setLocale, t } =
    useApp();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useUnsavedChanges(
    name !== (user?.name || '') || Boolean(currentPassword || password || confirmation)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.profile.title}
        description={
          locale === 'uz'
            ? 'Shaxsiy ma\'lumotlar, mavzu va hisob xavfsizligi.'
            : 'Личные данные, оформление и безопасность аккаунта.'
        }
      />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Personal Details Card */}
        <Card>
          <CardBody>
            <form
              className="space-y-5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (saving) return;
                setSaving(true);
                try {
                  const result = await authClient.updateUser({ name: name.trim() });
                  if (result.error) throw new Error(result.error.message);
                  const res = await fetch('/api/workspace/settings', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ownerName: name.trim() }),
                  });
                  if (!res.ok)
                    throw new Error(
                      locale === 'uz'
                        ? 'Kompaniyada ismni yangilab bo‘lmadi'
                        : 'Не удалось обновить имя в компании'
                    );
                  await refreshWorkspace();
                  showToast(
                    locale === 'uz'
                      ? 'Shaxsiy ma\'lumotlar saqlandi'
                      : 'Личные данные сохранены'
                  );
                } catch (failure) {
                  showToast(
                    locale === 'uz' ? 'Saqlab bo‘lmadi' : 'Не удалось сохранить',
                    failure instanceof Error ? failure.message : 'Ошибка сети',
                    'error'
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {locale === 'uz' ? 'Shaxsiy ma\'lumotlar' : 'Личные данные'}
              </h2>
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-[#FF7277] flex items-center justify-center text-2xl font-bold border border-red-500/20">
                {user?.name?.slice(0, 1) || 'A'}
              </div>
              <Input
                label={t.profile.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
              />
              <Input
                label={t.profile.email}
                value={user?.email || ''}
                readOnly
              />
              <Badge variant={emailVerified ? 'success' : 'warning'}>
                {emailVerified
                  ? (locale === 'uz' ? 'Email tasdiqlangan' : 'Email подтверждён')
                  : (locale === 'uz' ? 'Email tasdiqlanmagan' : 'Email не подтверждён')}
              </Badge>
              <p className="text-xs text-[var(--text-muted)] dark:text-[#AABAD0]/70">
                {locale === 'uz'
                  ? 'Email manzilini o‘zgartirish uchun qo‘llab-quvvatlash xizmatiga murojaat qiling.'
                  : 'Смена email пока недоступна через интерфейс.'}
              </p>
              <Button type="submit" isLoading={saving} disabled={name === user?.name}>
                {t.common.save}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Appearance & Language Card */}
        <Card>
          <CardBody className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
              {locale === 'uz' ? 'Mavzu va til sozlamalari' : 'Оформление и язык'}
            </h2>

            {/* Theme Selector */}
            <fieldset>
              <legend className="text-sm font-medium mb-3 text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {locale === 'uz' ? 'Interfeys mavzusi' : 'Тема интерфейса'}
              </legend>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    value: 'light',
                    label: locale === 'uz' ? 'Yorug‘' : 'Светлая',
                    Icon: Sun,
                  },
                  {
                    value: 'dark',
                    label: locale === 'uz' ? 'Qorong‘i' : 'Тёмная',
                    Icon: Moon,
                  },
                  {
                    value: 'system',
                    label: locale === 'uz' ? 'Tizim kabi' : 'Как в системе',
                    Icon: Monitor,
                  },
                ].map(({ value, label, Icon }) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                    className={`rounded-xl border p-3 text-xs sm:text-sm font-medium flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                      theme === value
                        ? 'border-[#FF7277] bg-red-500/10 text-[var(--text-primary)] dark:text-[#F4F7FB] font-bold'
                        : 'border-[var(--border)] dark:border-[#29374C] hover:border-[var(--border-strong)] text-[var(--text-secondary)] dark:text-[#AABAD0]'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Platform Language Selector */}
            <fieldset>
              <legend className="text-sm font-medium mb-3 text-[var(--text-primary)] dark:text-[#F4F7FB] flex items-center gap-2">
                <Globe size={16} className="text-[#FF7277]" />
                <span>{locale === 'uz' ? 'Kabinet tili (Platforma)' : 'Язык интерфейса платформы'}</span>
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { code: 'ru' as const, label: 'Русский (RU)', sub: 'Интерфейс на русском' },
                  { code: 'uz' as const, label: 'O‘zbekcha (UZ)', sub: 'Lotin yozuvida' },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.code}
                    aria-pressed={locale === item.code}
                    onClick={() => void setLocale(item.code)}
                    className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                      locale === item.code
                        ? 'border-[#FF7277] bg-red-500/10 shadow-2xs'
                        : 'border-[var(--border)] dark:border-[#29374C] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] dark:text-[#AABAD0] mt-0.5">
                      {item.sub}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-2">
                {locale === 'uz'
                  ? 'Kabinet tili alohida saqlanadi va mijozlarga javob beradigan AI qoidalarini o‘zgartirmaydi.'
                  : 'Язык платформы сохраняется отдельно и не меняет правила ответов работающих ассистентов.'}
              </p>
            </fieldset>
          </CardBody>
        </Card>

        {/* Security / Password Card */}
        <Card>
          <CardBody>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (changing) return;
                if (password !== confirmation) {
                  showToast(
                    locale === 'uz' ? 'Parollar mos kelmadi' : 'Пароли не совпадают',
                    undefined,
                    'error'
                  );
                  return;
                }
                setChanging(true);
                try {
                  const result = await authClient.changePassword({
                    currentPassword,
                    newPassword: password,
                    revokeOtherSessions: true,
                  });
                  if (result.error) throw new Error(result.error.message);
                  setCurrentPassword('');
                  setPassword('');
                  setConfirmation('');
                  setSessions(null);
                  showToast(
                    locale === 'uz' ? 'Parol o‘zgartirildi' : 'Пароль изменён',
                    locale === 'uz' ? 'Boshqa seanslar yakunlandi.' : 'Остальные сеансы завершены.'
                  );
                } catch (failure) {
                  showToast(
                    locale === 'uz' ? 'Parolni o‘zgartirib bo‘lmadi' : 'Не удалось изменить пароль',
                    failure instanceof Error ? failure.message : 'Ошибка сети',
                    'error'
                  );
                } finally {
                  setChanging(false);
                }
              }}
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {t.profile.security}
              </h2>
              <Input
                label={locale === 'uz' ? 'Joriy parol' : 'Текущий пароль'}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label={locale === 'uz' ? 'Yangi parol' : 'Новый пароль'}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label={locale === 'uz' ? 'Yangi parolni takrorlang' : 'Повторите новый пароль'}
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                required
              />
              <Button type="submit" variant="outline" isLoading={changing}>
                {locale === 'uz' ? 'Parolni o‘zgartirish' : 'Изменить пароль'}
              </Button>
            </form>
          </CardBody>
        </Card>

        {/* Sessions & Logout */}
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {locale === 'uz' ? 'Faol seanslar' : 'Активные сеансы'}
              </h2>
              <Button
                variant="outline"
                isLoading={loadingSessions}
                onClick={async () => {
                  setLoadingSessions(true);
                  try {
                    const result = await authClient.listSessions();
                    if (result.error) throw new Error(result.error.message);
                    setSessions(result.data || []);
                  } catch (failure) {
                    showToast(
                      locale === 'uz' ? 'Seanslarni yuklab bo‘lmadi' : 'Не удалось загрузить сеансы',
                      failure instanceof Error ? failure.message : 'Ошибка сети',
                      'error'
                    );
                  } finally {
                    setLoadingSessions(false);
                  }
                }}
              >
                {locale === 'uz' ? 'Seanslarni ko‘rsatish' : 'Показать сеансы'}
              </Button>
              {sessions && (
                <ul className="divide-y divide-[var(--border)] dark:divide-[#29374C]">
                  {sessions.map((session) => (
                    <li key={session.id} className="py-3 text-xs sm:text-sm">
                      <p className="break-words font-medium text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        {session.userAgent || (locale === 'uz' ? 'Noma\'lum qurilma' : 'Устройство не определено')}
                      </p>
                      <p className="text-[var(--text-secondary)] dark:text-[#AABAD0] text-xs mt-0.5">
                        {locale === 'uz' ? 'Kirish vaqti:' : 'Вход:'}{' '}
                        {new Date(session.createdAt).toLocaleString(
                          locale === 'uz' ? 'uz-UZ' : 'ru-RU'
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {locale === 'uz' ? 'Hisob' : 'Аккаунт'}
              </h2>
              <Button variant="ghost" onClick={logout} className="text-red-500 hover:text-red-600">
                <LogOut size={18} />
                <span>{t.profile.logoutButton}</span>
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
