'use client';

import React from 'react';
import { PlanDefinition, PlanId } from '@/lib/pricing';
import { Check, CheckCircle2, Bot, Coins } from 'lucide-react';

interface PricingCardProps {
  plan: PlanDefinition;
  isSelected: boolean;
  isCurrent?: boolean;
  mode: 'registration' | 'billing';
  onSelect: (planId: PlanId) => void;
  disabled?: boolean;
}

export function PricingCard({
  plan,
  isSelected,
  isCurrent = false,
  mode,
  onSelect,
  disabled = false,
}: PricingCardProps) {
  const isBusiness = plan.id === 'business';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === ' ' || e.key === 'Enter') && !disabled && !isCurrent) {
      e.preventDefault();
      onSelect(plan.id);
    }
  };

  const handleClick = () => {
    if (!disabled && !isCurrent) {
      onSelect(plan.id);
    }
  };

  // Styles depending on whether this is the standout graphite BUSINESS card or standard white/dark card
  const containerStyle = isBusiness
    ? `bg-[#18232D] text-white ${
        isSelected
          ? 'border-2 border-[#DC2626] ring-2 ring-[#DC2626] shadow-lg'
          : isCurrent
          ? 'border border-[#475569] opacity-95'
          : 'border border-[#334155] hover:border-[#475569] shadow-md'
      }`
    : `bg-[var(--surface)] text-[var(--text-primary)] ${
        isSelected
          ? 'border-2 border-[#DC2626] ring-2 ring-[#DC2626] shadow-md'
          : isCurrent
          ? 'border border-[var(--border-strong)] bg-[var(--surface-secondary)]/60'
          : 'border border-[var(--border)] hover:border-[var(--border-strong)] shadow-xs'
      }`;

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-label={`Тарифный план ${plan.name}, ${plan.usdPriceFormatted} в месяц`}
      tabIndex={disabled || isCurrent ? -1 : 0}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={`relative flex flex-col justify-between rounded-[8px] p-6 transition-all duration-150 cursor-pointer ${containerStyle} focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2`}
    >
      <div>
        {/* Header row: Plan Name, Badge & Selection check */}
        <div className="flex items-start justify-between gap-2 min-h-[32px]">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold tracking-wider uppercase ${
                  isBusiness ? 'text-white' : 'text-[var(--text-primary)]'
                }`}
              >
                {plan.name}
              </span>

              {isCurrent && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-[4px] border ${
                    isBusiness
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)]'
                  }`}
                >
                  Ваш тариф
                </span>
              )}
            </div>

            {plan.badge && !isCurrent && (
              <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#DC2626] text-white">
                {plan.badge}
              </span>
            )}
          </div>

          {/* Selection indicator pill or radio mark */}
          <div className="shrink-0">
            {isSelected ? (
              <div className="flex items-center gap-1 text-[11px] font-semibold text-white bg-[#DC2626] px-2 py-0.5 rounded-[4px]">
                <Check className="w-3 h-3 stroke-[3]" />
                <span>Выбрано</span>
              </div>
            ) : (
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                  isBusiness
                    ? 'border-slate-500 bg-transparent'
                    : 'border-[var(--border-strong)] bg-transparent'
                }`}
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        {/* Subtitle / Audience */}
        <p
          className={`text-xs mt-2 leading-relaxed min-h-[20px] ${
            isBusiness ? 'text-slate-300' : 'text-[var(--text-secondary)]'
          }`}
        >
          {plan.audience}
        </p>

        {/* Big Price Block: 40-48px on desktop, clean tabular numbers */}
        <div
          className={`mt-4 pt-4 border-t ${
            isBusiness ? 'border-slate-700/80' : 'border-[var(--border)]'
          }`}
        >
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                isBusiness ? 'text-white' : 'text-[var(--text-primary)]'
              }`}
            >
              {plan.usdPriceFormatted}
            </span>
            <span
              className={`text-xs sm:text-sm font-medium ${
                isBusiness ? 'text-slate-300' : 'text-[var(--text-secondary)]'
              }`}
            >
              / месяц
            </span>
          </div>
          <div
            className={`text-xs font-medium mt-1 ${
              isBusiness ? 'text-slate-400' : 'text-[var(--text-muted)]'
            }`}
          >
            ~{plan.uzsPriceFormatted}
          </div>
        </div>

        {/* Core Specs Line: Tokens · Employees */}
        <div
          className={`mt-4 pt-3 pb-3 px-3 rounded-[6px] border text-xs font-semibold ${
            isBusiness
              ? 'bg-[#1F2C3A] border-slate-700 text-white'
              : 'bg-[var(--surface-secondary)] border-[var(--border)] text-[var(--text-primary)]'
          }`}
        >
          <span>{plan.tokensFormatted}</span>
          <span className="mx-1.5 opacity-60">·</span>
          <span>
            {plan.maxAgents === 1 ? '1 сотрудник' : `до ${plan.maxAgents} сотрудников`}
          </span>
        </div>

        {/* Features Checklist */}
        <div className="mt-4 space-y-2 text-left">
          <ul
            className={`space-y-2 text-xs leading-snug ${
              isBusiness ? 'text-slate-200' : 'text-[var(--text-secondary)]'
            }`}
          >
            {plan.features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isBusiness ? 'bg-[#DC2626] text-white' : 'bg-emerald-600 text-white'
                  }`}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Action Button - bottom aligned */}
      <div
        className={`mt-6 pt-4 border-t ${
          isBusiness ? 'border-slate-700/80' : 'border-[var(--border)]'
        }`}
      >
        <button
          type="button"
          disabled={disabled || isCurrent}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className={`w-full h-11 px-4 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed ${
            isCurrent
              ? isBusiness
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border)] cursor-default'
              : isSelected
              ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm'
              : isBusiness
              ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-sm'
              : 'bg-[#18232D] hover:bg-[#253240] text-white shadow-2xs'
          }`}
        >
          {isCurrent ? (
            <span>Текущий тариф</span>
          ) : isSelected ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Выбран для продолжения</span>
            </>
          ) : mode === 'registration' ? (
            <span>Выбрать {plan.name}</span>
          ) : (
            <span>Перейти на {plan.name}</span>
          )}
        </button>
      </div>
    </div>
  );
}
