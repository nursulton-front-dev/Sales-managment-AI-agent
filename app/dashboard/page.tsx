'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataState } from '@/components/ui/DataState';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Mail, Play, Users, CalendarDays, ChartNoAxesColumn, Check, Inbox, Headphones, ArrowRight, X, UserRound } from 'lucide-react';

export default function DashboardOverviewPage() {
  const { leads, agents, workspace, activeAgent, openSandbox, emailVerified, verifyEmail, sendVerificationCode, user, leadsLoading, agentsLoading, leadsError, agentsError, refreshLeads, refreshAgents } = useApp();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const connected = agents.some((agent) => agent.telegramConnected) || Boolean(workspace?.instagramConnected);
  const booked = leads.filter((lead) => lead.status === 'Записан в календарь').length;
  const recent = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  return <div className="space-y-6">
    <PageHeader title="Обзор" description="Обращения клиентов и работа команды" actions={<Button variant="outline" onClick={() => openSandbox()}><Play size={16} />Тест-драйв</Button>} />
    {!emailVerified && <Card><CardBody className="flex flex-wrap items-center gap-4">
      <Mail className="text-[var(--warning-text)] shrink-0" size={22} />
      <div className="flex-1 min-w-0"><strong>Подтвердите email</strong><p className="text-sm text-[var(--text-secondary)]">Для защиты аккаунта и активации пробного периода.</p></div>
      <Button variant="ghost" onClick={() => setVerifyOpen(true)}>Ввести код <ArrowRight size={16} /></Button>
    </CardBody></Card>}
    <DataState loading={leadsLoading} error={leadsError} retry={refreshLeads} />
    {!leadsLoading && !leadsError && <section className="grid md:grid-cols-3 gap-4" aria-label="Показатели компании">
      {[[Users, 'Лиды', leads.length, 'Всего обращений в воронке'], [CalendarDays, 'Записи', booked, 'Лиды на этапе записи'], [ChartNoAxesColumn, 'Конверсия в запись', leads.length ? `${(booked / leads.length * 100).toFixed(1)}%` : '—', 'Доля лидов на этапе записи']].map(([Icon, label, value, caption]) => {
        const Symbol = Icon as typeof Users;
        return <Card key={String(label)}><CardBody className="flex gap-4"><div className="rounded-md border bg-[var(--surface-secondary)] p-2 self-start"><Symbol size={20} /></div><div><p className="text-sm text-[var(--text-secondary)]">{String(label)}</p><p className="text-3xl font-semibold my-2 tabular-nums">{String(value)}</p><p className="text-xs text-[var(--text-muted)]">{String(caption)}</p></div></CardBody></Card>;
      })}
    </section>}
    <div className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
      <div className="space-y-5">
        <Card><CardBody><h2 className="text-lg font-semibold mb-5">Запустите первого ИИ-сотрудника</h2>
          <DataState loading={agentsLoading} error={agentsError} retry={refreshAgents} />
          {!agentsLoading && !agentsError && <ol className="divide-y">
            {[
              { title: 'Создайте сотрудника', note: agents.length ? 'Инструкции сотрудника сохранены' : 'Добавьте задачу, услуги и вопросы клиентам', done: agents.length > 0, href: '/dashboard/agents/new', action: 'Создать' },
              { title: 'Подключите канал общения', note: connected ? 'Канал подключён' : 'Telegram или Instagram', done: connected, href: '/dashboard/integrations', action: 'Подключить канал' },
              { title: 'Проверьте ответы', note: 'Отправьте тестовое сообщение от лица клиента', done: false, action: 'Тест-драйв' },
            ].map((step, i) => <li key={step.title} className="py-5 flex gap-4 items-start">
              <span className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center ${step.done ? 'bg-[var(--success-bg)] text-[var(--success-text)]' : 'text-[var(--text-secondary)]'}`}>{step.done ? <Check size={20} /> : i + 1}</span>
              <div className="flex-1 min-w-0"><h3 className="font-semibold">{step.title}</h3><p className="text-sm text-[var(--text-secondary)] mt-1">{step.note}</p>
                {!step.done && (step.href ? <Link className="inline-flex items-center mt-3 text-sm font-medium text-[var(--accent-link)]" href={step.href}>{step.action} <ArrowRight size={16} className="ml-2" /></Link> : <Button className="mt-3" variant="outline" onClick={() => openSandbox()}>{step.action}</Button>)}
              </div>
            </li>)}
          </ol>}
        </CardBody></Card>
        {activeAgent && <Card><CardBody><h2 className="font-semibold mb-4">ИИ-сотрудник</h2><div className="flex flex-wrap items-center gap-3"><UserRound size={24} /><div className="flex-1 min-w-0"><p className="font-medium">{activeAgent.name}</p><Badge variant={connected ? 'success' : 'warning'}>{!activeAgent.isActive ? 'На паузе' : connected ? 'Канал подключён' : 'Только тестирование'}</Badge></div><Link href={`/dashboard/agents?edit=${activeAgent.id}`} className="text-sm text-[var(--accent-link)]">Настроить</Link></div></CardBody></Card>}
      </div>
      <div className="space-y-5">
        <Card><CardBody><h2 className="text-lg font-semibold">Последние обращения</h2>
          {leadsLoading || leadsError ? <p className="py-10 text-[var(--text-secondary)]">Данные пока недоступны.</p> : recent.length ? <ul className="divide-y mt-4">{recent.map((lead) => <li key={lead.id} className="py-4 flex items-center justify-between gap-3"><div className="min-w-0"><Link href="/dashboard/leads" className="font-medium">{lead.clientName}</Link><p className="text-sm text-[var(--text-secondary)]">{lead.channel}</p></div><Badge>{lead.status}</Badge></li>)}</ul> : <div className="text-center py-14 px-4"><Inbox size={48} strokeWidth={1.5} className="mx-auto text-[var(--text-muted)] mb-5" /><h3 className="font-semibold text-lg">Пока нет обращений</h3><p className="mt-3 text-[var(--text-secondary)]">Подключите канал, чтобы сообщения клиентов появлялись здесь.</p><Link href="/dashboard/integrations" className="inline-flex mt-5 text-[var(--accent-link)] items-center gap-2">Перейти к интеграциям <ArrowRight size={16} /></Link></div>}
        </CardBody></Card>
        <Link href="/dashboard/support" className="flex items-center gap-4 p-5 rounded-lg border bg-[var(--surface)]"><Headphones size={24} /><div><strong>Нужна помощь с запуском?</strong><p className="text-sm text-[var(--text-secondary)]">Напишите нам — поможем с настройкой</p></div><ArrowRight size={18} className="ml-auto shrink-0" /></Link>
      </div>
    </div>
    <Dialog open={verifyOpen} onClose={() => { if (!saving) setVerifyOpen(false); }} label="Подтверждение email" className="w-md">
      <form className="p-6 space-y-4" onSubmit={async (event) => { event.preventDefault(); if (saving) return; setSaving(true); try { if (await verifyEmail(code)) { setVerifyOpen(false); setCode(''); } } finally { setSaving(false); } }}>
        <div className="flex justify-between gap-4"><h2 className="text-lg font-semibold">Подтвердите email</h2><Button variant="ghost" aria-label="Закрыть" onClick={() => setVerifyOpen(false)} disabled={saving}><X size={18} /></Button></div>
        <p className="text-sm text-[var(--text-secondary)]">Введите код из письма для {user?.email}.</p>
        <Input label="Код подтверждения" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required />
        <Button type="submit" isLoading={saving}>Подтвердить</Button>
        <Button variant="ghost" isLoading={sending} onClick={async () => { setSending(true); try { await sendVerificationCode(); } finally { setSending(false); } }}>Отправить код ещё раз</Button>
      </form>
    </Dialog>
  </div>;
}
