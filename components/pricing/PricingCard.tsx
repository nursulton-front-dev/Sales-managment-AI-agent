'use client';

import type { PlanDefinition, PlanId } from '@/lib/pricing';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PricingCardProps { plan: PlanDefinition; isSelected: boolean; isCurrent?: boolean; mode: 'registration' | 'billing'; onSelect: (id: PlanId) => void; disabled?: boolean; }
export function PricingCard({ plan, isSelected, isCurrent = false, mode, onSelect, disabled }: PricingCardProps) {
  return <article className={`rounded-lg border bg-[var(--surface)] p-6 flex flex-col gap-5 ${plan.id === 'business' || isSelected ? 'border-[var(--accent)]' : 'border-[var(--border)]'} ${isSelected ? 'ring-1 ring-[var(--accent)]' : ''}`}>
    <div className="min-h-6">{plan.badge && <span className="text-xs rounded bg-[var(--accent-soft)] text-[var(--accent-soft-text)] px-2 py-1">{plan.badge}</span>}</div>
    <div><h3 className="text-xl font-semibold">{plan.name}</h3><p className="mt-3"><strong className="text-4xl font-semibold tracking-tight">{plan.usdPriceFormatted}</strong><span className="text-[var(--text-secondary)] text-sm"> / мес</span></p><p className="text-sm text-[var(--text-secondary)] mt-2">{plan.uzsPriceFormatted} / мес</p></div>
    <ul className="space-y-3 text-sm"><li className="flex gap-2 items-center"><Check size={18} className="text-[var(--accent-link)]" /><strong>{plan.tokensFormatted}</strong></li><li className="flex gap-2 items-center"><Check size={18} className="text-[var(--accent-link)]" />{plan.maxAgents} {plan.maxAgents === 1 ? 'ИИ-сотрудник' : 'ИИ-сотрудников'}</li></ul>
    <div className="border-t pt-5 flex-1"><p className="text-sm text-[var(--text-secondary)]">{plan.audience}</p><p className="text-xs text-[var(--text-muted)] mt-3">Доступность каналов зависит от их подключения. Настройки доступны в разделе «Интеграции».</p></div>
    <Button variant={plan.id === 'business' ? 'primary' : 'outline'} disabled={disabled || isCurrent} aria-pressed={isSelected} onClick={() => onSelect(plan.id)} className="w-full">{isCurrent ? 'Текущий тариф' : isSelected ? `Выбран ${plan.name}` : `${mode === 'registration' ? 'Выбрать' : 'Выбрать'} ${plan.name}`}</Button>
  </article>;
}
