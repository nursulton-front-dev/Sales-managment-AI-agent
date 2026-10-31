'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PLANS_LIST, TOKEN_PACKAGES, type PlanId } from '@/lib/pricing';
import { PricingCard } from '@/components/pricing/PricingCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DataState } from '@/components/ui/DataState';
import { FileText, X } from 'lucide-react';

type Transaction = { id: string; createdAt: string; description: string; tokensDelta: number; amountUsd: string; };
export default function BillingPage() {
  const { plan, tokenBalance, workspace } = useApp();
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [paymentNotice, setPaymentNotice] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { try { const res = await fetch('/api/billing/transactions'); const data = await res.json(); if (!res.ok || !data.success) throw new Error('Не удалось загрузить историю операций'); setTransactions(data.logs || []); setError(null); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Ошибка сети'); } finally { setLoading(false); } };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async API request; state is updated after the response.
  useEffect(() => { void load(); }, []);
  const active = Boolean(workspace?.subscriptionActive);
  return <div className="space-y-6">
    <PageHeader title="Тарифы и баланс" description="Выберите подходящий тариф, управляйте балансом токенов и следите за историей операций." />
    <Card><CardBody className="flex flex-wrap items-center justify-between gap-6"><div><h2 className="font-semibold mb-3">Ваш тариф</h2><div className="flex gap-3 items-center"><span className="text-lg font-semibold px-3 py-2 rounded-md bg-[var(--surface-secondary)]">{plan}</span><Badge variant={active ? 'success' : 'warning'}>{active ? 'Активен' : 'Неактивен'}</Badge></div></div><div><p className="text-sm text-[var(--text-secondary)]">Баланс токенов</p><p className="text-3xl font-semibold mt-2 tabular-nums">{tokenBalance.toLocaleString('ru-RU')} <span className="text-sm font-normal text-[var(--text-secondary)]">токенов</span></p></div><a href="#transactions" className="text-sm text-[var(--accent-link)]">История операций →</a></CardBody></Card>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Выберите тариф</h2><div className="grid lg:grid-cols-3 gap-4">{PLANS_LIST.map((item) => <PricingCard key={item.id} plan={item} mode="billing" isSelected={selected === item.id} isCurrent={plan.toLowerCase() === item.id} onSelect={(id) => { setSelected(id); setPaymentNotice(true); }} />)}</div><p className="text-sm text-[var(--text-secondary)]">Онлайн-оплата пока недоступна. Выбор тарифа не меняет подписку и баланс.</p></section>
    <section className="space-y-4"><h2 className="text-lg font-semibold">Докупка токенов</h2><p className="text-sm text-[var(--text-secondary)]">Дополнительные токены доступны при активной платной подписке.</p><div className="grid md:grid-cols-3 gap-4">{TOKEN_PACKAGES.map((pack) => <Card key={pack.id}><CardBody className="space-y-4"><h3 className="font-semibold">{pack.tokensFormatted}</h3><p><strong className="text-2xl font-semibold">{pack.usdPriceFormatted}</strong><span className="ml-2 text-sm text-[var(--text-secondary)]">{pack.uzsPriceFormatted}</span></p><Button variant="outline" className="w-full" disabled>Оплата пока недоступна</Button></CardBody></Card>)}</div></section>
    <section id="transactions" className="space-y-4"><h2 className="text-lg font-semibold">История операций</h2><DataState loading={loading} error={error} retry={load} />{!loading && !error && <Card>{!transactions.length ? <CardBody className="py-12 text-center"><FileText size={34} className="mx-auto text-[var(--text-muted)] mb-4" /><h3 className="font-medium">Операций пока нет</h3><p className="text-sm text-[var(--text-secondary)] mt-2">Здесь отображаются списания и пополнения токенов.</p></CardBody> : <ul className="divide-y">{transactions.map((item) => <li key={item.id} className="p-5 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-sm">{item.description}</p><time className="text-xs text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString('ru-RU')}</time></div><strong className="text-sm tabular-nums">{item.tokensDelta > 0 ? '+' : ''}{item.tokensDelta} ток.</strong><span className="text-sm">${item.amountUsd}</span></li>)}</ul>}</Card>}</section>
    <Dialog open={paymentNotice} onClose={() => setPaymentNotice(false)} label="Выбор тарифа" className="w-md"><div className="p-6 space-y-4"><div className="flex justify-between items-center"><h2 className="font-semibold text-lg">Тариф {selected?.toUpperCase()}</h2><Button variant="ghost" onClick={() => setPaymentNotice(false)} aria-label="Закрыть"><X size={20} /></Button></div><p className="text-[var(--text-secondary)]">Онлайн-оплата пока недоступна. Подписка и баланс останутся прежними.</p><Button onClick={() => setPaymentNotice(false)}>Понятно</Button></div></Dialog>
  </div>;
}
