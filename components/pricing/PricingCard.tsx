'use client';

import type { PlanDefinition, PlanId } from '@/lib/pricing';
import { Check, Sparkles, Clock, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface PricingCardProps {
  plan: PlanDefinition;
  isSelected: boolean;
  isCurrent?: boolean;
  mode: 'registration' | 'billing';
  onSelect: (id: PlanId) => void;
  disabled?: boolean;
}

export function PricingCard({
  plan,
  isSelected,
  isCurrent = false,
  mode,
  onSelect,
  disabled,
}: PricingCardProps) {
  const isBusiness = plan.id === 'business';

  return (
    <article
      className={`rounded-2xl border bg-[var(--surface)] dark:bg-[#142137] p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 relative ${
        isBusiness
          ? 'border-[#FF7277] shadow-md dark:border-[#FF7277] ring-1 ring-[#FF7277]/20'
          : 'border-[var(--border)] dark:border-[#29374C] hover:border-[var(--border-strong)] dark:hover:border-slate-500'
      } ${isSelected ? 'ring-2 ring-[#FF7277]' : ''}`}
    >
      <div>
        {/* Badge / Header row */}
        <div className="flex items-center justify-between gap-2 min-h-6 mb-3">
          <span className="text-xs font-bold tracking-wider uppercase text-[var(--text-muted)] dark:text-[#AABAD0]/70">
            {plan.id === 'start' ? 'Старт' : plan.id === 'business' ? 'Бизнес' : 'Про'}
          </span>
          {plan.badge && (
            <span className="text-[11px] font-semibold rounded-full bg-red-500/10 text-[#FF7277] border border-red-500/25 px-2.5 py-0.5 shadow-2xs">
              {plan.badge}
            </span>
          )}
          {isCurrent && (
            <span className="text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5">
              Текущий тариф
            </span>
          )}
        </div>

        {/* Title & Audience */}
        <h3 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
          {plan.name}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1 min-h-[34px] leading-relaxed">
          {plan.audience}
        </p>

        {/* Price Row */}
        <div className="mt-5 pb-5 border-b border-[var(--border)] dark:border-[#29374C]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] dark:text-[#F4F7FB]">
              {plan.usdPriceFormatted}
            </span>
            <span className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
              / месяц
            </span>
          </div>
          <p className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1">
            {plan.uzsPriceFormatted} / мес
          </p>
        </div>

        {/* Main Quotas Highlights */}
        <div className="py-4 border-b border-[var(--border)] dark:border-[#29374C] space-y-2">
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
            <div className="size-6 rounded-lg bg-red-500/10 dark:bg-red-500/20 text-[#FF7277] flex items-center justify-center shrink-0">
              <MessageSquare size={13} />
            </div>
            <span>
              <strong>{plan.responsesFormatted}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-[var(--text-primary)] dark:text-[#F4F7FB]">
            <div className="size-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-[#229ED9] flex items-center justify-center shrink-0">
              <Users size={13} />
            </div>
            <span>
              {plan.maxAgents === 1
                ? '1 ИИ-сотрудник'
                : `До ${plan.maxAgents} ИИ-сотрудников`}
            </span>
          </div>
        </div>

        {/* Confirmed Real Capabilities */}
        <div className="pt-4 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[#AABAD0]/70 mb-3">
            В тариф входит:
          </p>
          <ul className="space-y-2.5 text-xs">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-[var(--text-secondary)] dark:text-[#AABAD0] leading-snug"
              >
                <div className="size-4.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check size={11} strokeWidth={2.5} />
                </div>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Planned / Roadmap Features */}
        {plan.roadmapFeatures && plan.roadmapFeatures.length > 0 && (
          <div className="pt-3 pb-1 border-t border-[var(--border)] dark:border-[#29374C]/60 mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[#AABAD0]/60 mb-2 flex items-center gap-1.5">
              <Clock size={11} />
              <span>В плане развития (скоро):</span>
            </p>
            <ul className="space-y-1.5 text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
              {plan.roadmapFeatures.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-[#FF7277] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Button at bottom */}
      <div className="pt-6 mt-6 border-t border-[var(--border)] dark:border-[#29374C]">
        <Button
          type="button"
          variant={isBusiness ? 'primary' : 'outline'}
          disabled={disabled || isCurrent}
          aria-pressed={isSelected}
          onClick={() => onSelect(plan.id)}
          className={`w-full text-xs font-semibold py-2.5 ${
            isBusiness
              ? 'bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] border-[#FF7277]'
              : ''
          }`}
        >
          {isCurrent
            ? 'Текущий тариф'
            : isSelected
            ? `Выбран ${plan.name}`
            : `Выбрать ${plan.name}`}
        </Button>
      </div>
    </article>
  );
}
