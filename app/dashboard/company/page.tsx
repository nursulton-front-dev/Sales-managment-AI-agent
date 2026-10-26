'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataState } from '@/components/ui/DataState';
import { useUnsavedChanges } from '@/lib/useUnsavedChanges';

type Company = { companyName: string; ownerName: string; ownerEmail: string; ownerPhone: string; niche: string };
export default function CompanyPage() {
  const { plan, showToast, refreshWorkspace } = useApp();
  const [tab, setTab] = useState('company');
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({ companyName: '', ownerPhone: '', niche: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = Boolean(company && Object.entries(form).some(([key, value]) => company[key as keyof Company] !== value));
  useUnsavedChanges(dirty);
  const load = async () => { try { const res = await fetch('/api/workspace/settings'); const data = await res.json(); if (!res.ok || !data.success) throw new Error('Не удалось загрузить компанию'); setCompany(data.workspace); setForm({ companyName: data.workspace.companyName || '', ownerPhone: data.workspace.ownerPhone || '', niche: data.workspace.niche || '' }); setError(null); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Ошибка сети'); } finally { setLoading(false); } };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- This starts an async API request; state is updated after the response.
  useEffect(() => { void load(); }, []);
  return <div className="space-y-6">
    <PageHeader title="Компания и команда" description="Данные организации и рабочие настройки." />
    <div className="flex gap-5 border-b">{[['company', 'Компания'], ['team', 'Команда']].map(([value, label]) => <button type="button" key={value} aria-pressed={tab === value} onClick={() => setTab(value)} className={`py-3 px-2 border-b-2 text-sm font-medium ${value === tab ? 'border-[var(--accent)] text-[var(--accent-link)]' : 'border-transparent text-[var(--text-secondary)]'}`}>{label}</button>)}</div>
    <DataState loading={loading} error={error} retry={load} />
    {!loading && !error && company && (tab === 'company' ? <div className="grid lg:grid-cols-[1.7fr_1fr] gap-5"><Card><CardBody><form className="space-y-5" onSubmit={async (event) => { event.preventDefault(); if (saving) return; setSaving(true); try { const res = await fetch('/api/workspace/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); const data = await res.json(); if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось сохранить компанию'); setCompany(data.workspace); await refreshWorkspace(); showToast('Данные компании сохранены'); } catch (failure) { showToast('Не удалось сохранить', failure instanceof Error ? failure.message : 'Ошибка сети', 'error'); } finally { setSaving(false); } }}>
      <h2 className="text-lg font-semibold">Информация о компании</h2>
      <div className="grid sm:grid-cols-2 gap-4"><Input label="Название компании" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required maxLength={200} /><Input label="Сфера бизнеса" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} maxLength={100} /><Input type="tel" label="Рабочий телефон" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} maxLength={40} /><Input label="Email владельца" value={company.ownerEmail} readOnly /></div>
      <Button type="submit" isLoading={saving} disabled={!dirty}>Сохранить изменения</Button>
    </form></CardBody></Card><div className="space-y-5"><Card><CardBody className="space-y-4"><h2 className="text-lg font-semibold">Рабочее пространство</h2><div className="rounded-md bg-[var(--surface-secondary)] p-4 flex flex-wrap gap-3 justify-between"><strong className="break-words min-w-0">{company.companyName}</strong><Badge>{plan}</Badge></div><Link href="/dashboard/billing" className="inline-flex text-sm text-[var(--accent-link)]">Перейти к тарифу →</Link></CardBody></Card><Card><CardBody className="space-y-4"><h2 className="text-lg font-semibold">График и запись</h2><div className="flex gap-3"><Image src="/integrations/google-calendar.png" width={48} height={48} alt="Google Календарь" className="self-start" /><p className="text-sm text-[var(--text-secondary)]">Настройте календарь и рабочие часы в интеграциях.</p></div><Link href="/dashboard/integrations" className="inline-flex text-sm text-[var(--accent-link)]">Открыть интеграции →</Link></CardBody></Card></div></div> : <div className="grid lg:grid-cols-[1.7fr_1fr] gap-5"><Card><CardBody><h2 className="text-lg font-semibold mb-5">Участники · 1</h2><div className="flex flex-wrap items-center justify-between gap-4 border-y py-5"><div className="min-w-0"><strong>{company.ownerName}</strong><p className="text-sm text-[var(--text-secondary)] break-all">{company.ownerEmail}</p></div><Badge>Владелец</Badge><Badge variant="success">Активен</Badge></div><p className="text-sm text-[var(--text-secondary)] mt-5">Приглашения участников пока недоступны. Доступ к рабочему пространству есть у владельца аккаунта.</p></CardBody></Card><Card className="self-start"><CardBody><h2 className="text-lg font-semibold mb-3">Роли и права доступа</h2><p className="font-medium">Владелец</p><p className="text-sm text-[var(--text-secondary)] mt-2">Управляет компанией, сотрудниками, диалогами и тарифом.</p></CardBody></Card></div>)}
  </div>;
}
