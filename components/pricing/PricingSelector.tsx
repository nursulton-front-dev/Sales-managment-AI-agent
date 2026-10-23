'use client';

import React from 'react';
import { PLANS_LIST, TRIAL_PLAN, PlanId, PlanOrTrialId } from '@/lib/pricing';
import { PricingCard } from './PricingCard';
import { Clock, ArrowRight, Info, Check } from 'lucide-react';

interface PricingSelectorProps {
  mode: 'registration' | 'billing';
  selectedPlan: PlanOrTrialId | null;
  onSelectPlan: (plan: PlanOrTrialId) => void;
  onContinue?: () => void;
  onSelectTrial?: () => void;
  currentPlan?: PlanOrTrialId;
  isProcessing?: boolean;
  className?: string;
  showTrialBanner?: boolean;
}

export function PricingSelector({
  mode,
  selectedPlan,
  onSelectPlan,
  onContinue,
  onSelectTrial,
  currentPlan,
  isProcessing = false,
  className = '',
  showTrialBanner = true,
}: PricingSelectorProps) {
  const selectedPlanData =
    selectedPlan && selectedPlan !== 'trial'
      ? PLANS_LIST.find((p) => p.id === selectedPlan)
      : null;

  const isTrialSelected = selectedPlan === 'trial';

  // Label for transitions
  const getTransitionLabel = () => {
    if (!selectedPlanData) return null;
    if (!currentPlan || currentPlan === 'trial') {
      return `Активация тарифа ${selectedPlanData.name}`;
    }
    const currentData = PLANS_LIST.find((p) => p.id === currentPlan);
    if (!currentData) return `Переход на ${selectedPlanData.name}`;
    if (selectedPlanData.usdPrice > currentData.usdPrice) {
      return `Повышение тарифа: переход с ${currentData.name} на ${selectedPlanData.name}`;
    }
    return `Смена тарифа: переход с ${currentData.name} на ${selectedPlanData.name}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 3-column Grid for Paid Plans (START, BUSINESS in graphite, PRO) */}
      <div
        role="radiogroup"
        aria-label="Выбор тарифного плана"
        className="grid grid-cols-1 lg:grid-cols-3 gap-5"
      >
        {PLANS_LIST.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          const isCurrent = currentPlan === plan.id;

          return (
            <PricingCard
              key={plan.id}
              plan={plan}
              isSelected={isSelected}
              isCurrent={isCurrent}
              mode={mode}
              disabled={isProcessing}
              onSelect={(planId) => onSelectPlan(planId)}
            />
          );
        })}
      </div>

      {/* Free Trial Banner - Calm horizontal bar matching the mockup */}
      {showTrialBanner && (
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
            <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            <span>
              Сначала попробуйте: <span className="font-bold">3 дня и 100 токенов</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectPlan('trial');
              if (onSelectTrial) {
                onSelectTrial();
              } else if (onContinue) {
                onContinue();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] hover:text-[#B91C1C] transition-colors cursor-pointer self-start sm:self-auto"
          >
            <span>{isTrialSelected ? 'Выбран бесплатный старт' : 'Начать бесплатно'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Selection Summary and Continue Actions */}
      <div className="p-4 sm:p-5 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          {selectedPlanData ? (
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <span>
                  {mode === 'billing'
                    ? getTransitionLabel()
                    : `Вы выбрали ${selectedPlanData.name} · ${selectedPlanData.usdPriceFormatted}/месяц`}
                </span>
                <span className="text-[11px] font-normal text-[var(--text-muted)] font-mono">
                  (~{selectedPlanData.uzsPriceFormatted})
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {mode === 'registration'
                  ? 'Оплата не списывается сейчас. Вы подтверждаете выбор для активации в кабинете.'
                  : `Включает ${selectedPlanData.tokensFormatted} и до ${selectedPlanData.maxAgents} сотрудников.`}
              </p>
            </div>
          ) : isTrialSelected ? (
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Выбран пробный период TRIAL · 3 дня бесплатно
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                100 токенов будут начислены после завершения регистрации и подтверждения почты.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <span>
                  {mode === 'registration'
                    ? 'Выберите тариф выше или начните бесплатно с пробным периодом.'
                    : 'Выберите тариф выше для перехода.'}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Для перехода к следующему шагу требуется сделать выбор.
              </p>
            </div>
          )}
        </div>

        {/* Continue Button */}
        {onContinue && (
          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              disabled={!selectedPlan || isProcessing || (mode === 'billing' && selectedPlan === currentPlan)}
              onClick={onContinue}
              className="w-full sm:w-auto h-11 px-6 rounded-[6px] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer bg-[#DC2626] text-white hover:bg-[#B91C1C] disabled:bg-[var(--surface-secondary)] disabled:text-[var(--text-muted)] disabled:border disabled:border-[var(--border)] disabled:cursor-not-allowed shadow-xs"
            >
              <span>
                {isProcessing
                  ? 'Обработка...'
                  : selectedPlanData
                  ? `Продолжить с ${selectedPlanData.name}`
                  : isTrialSelected
                  ? 'Продолжить с TRIAL'
                  : 'Выберите тариф'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Sticky Action Bar: Only shows when a plan is selected */}
      {onContinue && selectedPlan && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] shadow-xl z-40 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[var(--text-primary)] truncate">
                {selectedPlanData ? selectedPlanData.name : 'TRIAL'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] font-mono truncate">
                {selectedPlanData ? `${selectedPlanData.usdPriceFormatted}/мес` : 'Бесплатно 3 дня'}
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={onContinue}
              className="h-10 px-4 rounded-[6px] text-xs font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <span>Продолжить</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
