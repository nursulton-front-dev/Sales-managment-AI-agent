'use client';

import React, { useState, useEffect } from 'react';
import { useApp, PlanType } from '@/context/AppContext';
import { PLANS, PLANS_LIST, TOKEN_PACKAGES, PlanId, TokenPackage } from '@/lib/pricing';
import { PricingSelector } from '@/components/pricing/PricingSelector';
import {
  CreditCard,
  Check,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Coins,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function BillingPage() {
  const { plan, setPlan, tokenBalance, showToast, user } = useApp();

  // Plan change confirmation modal
  const [targetPlanId, setTargetPlanId] = useState<PlanId | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'direct' | 'invoice'>('direct');
  const [isProcessing, setIsProcessing] = useState(false);

  // TopUp modal
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);

  // Transactions
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const loadTransactions = async () => {
    try {
      const res = await fetch('/api/billing/transactions');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const currentPlanNormalized: PlanId | 'trial' =
    plan?.toLowerCase() === 'start'
      ? 'start'
      : plan?.toLowerCase() === 'business'
      ? 'business'
      : plan?.toLowerCase() === 'pro'
      ? 'pro'
      : 'trial';

  const handlePlanClick = (chosenPlan: any) => {
    if (chosenPlan === 'trial') return;
    if (chosenPlan === currentPlanNormalized) return;
    setTargetPlanId(chosenPlan as PlanId);
  };

  const handleConfirmPlanChange = async () => {
    if (!targetPlanId) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: targetPlanId,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPlan(targetPlanId.toUpperCase() as PlanType);
        showToast('Тариф активирован', data.message, 'success');
        setTargetPlanId(null);
        loadTransactions();
      } else {
        showToast('Ошибка смены тарифа', data.error || 'Сбой запроса', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmTopUp = async () => {
    if (!selectedPackage) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Баланс пополнен', data.message, 'success');
        setSelectedPackage(null);
        loadTransactions();
      } else {
        showToast('Ошибка пополнения', data.error || 'Сбой платежа', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка сети', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedBalance =
    typeof tokenBalance === 'number'
      ? tokenBalance.toLocaleString('ru-RU')
      : '0';

  const targetPlanData = targetPlanId ? PLANS[targetPlanId] : null;
  const currentPlanData = currentPlanNormalized !== 'trial' ? PLANS[currentPlanNormalized] : null;

  const isUpgrade =
    targetPlanData && currentPlanData
      ? targetPlanData.usdPrice > currentPlanData.usdPrice
      : true;

  const hasPaidPlan = currentPlanNormalized !== 'trial';

  return (
    <div className="space-y-8 text-left max-w-6xl">
      {/* Top Compact Current Status Block */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[var(--text-secondary)]">Текущий тариф:</span>
            <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] font-mono uppercase">
              {plan === 'TRIAL' ? 'TRIAL (Пробный период)' : plan}
            </span>
            <span className="text-[10px] font-semibold text-[var(--success-text)] bg-[var(--success-bg)] border border-[var(--success-border)] px-2 py-0.5 rounded-[4px]">
              Активен
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Остаток на балансе:{' '}
            <strong className="text-[var(--text-primary)] font-mono font-semibold">
              {formattedBalance} токенов
            </strong>
          </p>
        </div>

        {hasPaidPlan ? (
          <button
            type="button"
            onClick={() => setSelectedPackage(TOKEN_PACKAGES[0])}
            className="self-start sm:self-center h-10 px-4 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Докупить токены</span>
          </button>
        ) : (
          <a
            href="#pricing-plans"
            className="self-start sm:self-center h-10 px-4 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-[6px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <span>Выбрать платный тариф</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Main Heading Matching Mockup 1 */}
      <div className="space-y-1 pt-1">
        <div className="text-xs font-semibold text-[var(--text-muted)] tracking-wider">
          Тарифы и баланс
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
          Выберите план для роста
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)]">
          От первого ИИ-сотрудника до команды продаж
        </p>
      </div>

      {/* Pricing Plans Section */}
      <section id="pricing-plans" className="space-y-4">
        <PricingSelector
          mode="billing"
          selectedPlan={targetPlanId || currentPlanNormalized}
          currentPlan={currentPlanNormalized}
          onSelectPlan={handlePlanClick}
          isProcessing={isProcessing}
          showTrialBanner={!hasPaidPlan}
        />
      </section>

      {/* Google Calendar Teaser Card Matching Mockup 1 */}
      <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 relative shrink-0">
            <img
              src="/images/brands/google-calendar.png"
              alt="Google Calendar"
              className="w-11 h-11 object-contain"
            />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Google Календарь
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Подключите расписание для записи клиентов
            </p>
          </div>
        </div>

        <a
          href="/dashboard/integrations"
          className="h-10 px-5 rounded-[6px] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors shrink-0 self-start sm:self-center"
        >
          <span>Настроить</span>
        </a>
      </div>

      {/* Top-up Packages Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
              Пакеты докупки токенов
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Для непрерывной работы при повышенном потоке клиентов
            </p>
          </div>
        </div>

        {!hasPaidPlan && (
          <div className="p-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[8px] text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
            <span>
              Докупка дополнительных пакетов токенов доступна при наличии активной платной подписки
              (START, BUSINESS или PRO). Пожалуйста, выберите тариф выше.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TOKEN_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-4 flex flex-col justify-between ${
                !hasPaidPlan ? 'opacity-70' : 'hover:border-[var(--border-strong)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {pkg.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
                    +{pkg.tokensFormatted}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {pkg.usdPriceFormatted} · ~{pkg.uzsPriceFormatted}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-2 leading-relaxed">
                  {pkg.description}
                </p>
              </div>

              <button
                type="button"
                disabled={!hasPaidPlan || isProcessing}
                onClick={() => setSelectedPackage(pkg)}
                className="mt-4 w-full h-10 text-xs font-medium text-[var(--text-primary)] bg-[var(--surface-secondary)] hover:bg-[var(--border)] border border-[var(--border)] rounded-[6px] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasPaidPlan ? 'Пополнить баланс' : 'Требуется подписка'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Transaction History Section */}
      <section className="space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
          История операций
        </h2>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] overflow-hidden">
          {isLoadingTx ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Загрузка истории операций...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              История операций пока пуста. Начисления токенов и оплаты подписки будут отображаться здесь.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-medium">
                      <th className="py-2.5 px-4">Дата</th>
                      <th className="py-2.5 px-3">Операция</th>
                      <th className="py-2.5 px-3">Токены</th>
                      <th className="py-2.5 px-3">Сумма</th>
                      <th className="py-2.5 px-3">Способ</th>
                      <th className="py-2.5 px-4">Описание</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                        <td className="py-2.5 px-4 text-[var(--text-muted)] font-mono text-[11px] whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              tx.actionType === 'subscription'
                                ? 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : tx.actionType === 'topup'
                                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {tx.actionType === 'subscription'
                              ? 'Подписка'
                              : tx.actionType === 'topup'
                              ? 'Пополнение'
                              : tx.actionType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-[var(--text-primary)] whitespace-nowrap">
                          {tx.tokensDelta > 0 ? `+${tx.tokensDelta.toLocaleString('ru-RU')}` : tx.tokensDelta}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[var(--text-secondary)] whitespace-nowrap">
                          {tx.amountUsd ? `$${tx.amountUsd}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 uppercase text-[11px] text-[var(--text-secondary)] font-mono whitespace-nowrap">
                          {tx.paymentMethod || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-[var(--text-secondary)] text-xs max-w-xs truncate">
                          {tx.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="sm:hidden divide-y divide-[var(--border)]">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {tx.actionType === 'subscription'
                          ? 'Подписка'
                          : tx.actionType === 'topup'
                          ? 'Пополнение'
                          : tx.actionType}
                      </span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">
                        {tx.tokensDelta > 0 ? `+${tx.tokensDelta.toLocaleString('ru-RU')}` : tx.tokensDelta} ток.
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{new Date(tx.createdAt).toLocaleDateString('ru-RU')}</span>
                      <span>{tx.amountUsd ? `$${tx.amountUsd}` : '—'} · {tx.paymentMethod?.toUpperCase() || 'DIRECT'}</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {tx.description}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Token Accounting Rules Spoiler */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setIsRulesOpen(!isRulesOpen)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
        >
          {isRulesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>Правила расхода токенов и перехвата диалогов</span>
        </button>

        {isRulesOpen && (
          <div className="mt-3 p-4 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[8px] text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <p>
              • <strong>1 токен</strong> — ответ ИИ-сотрудника клиенту в диалоге Telegram.
            </p>
            <p>
              • <strong>5 токенов</strong> — успешная запись клиента и бронирование слота в Google Календаре.
            </p>
            <p>
              • <strong>1 токен</strong> — отправленное автоматическое напоминание о предстоящей встрече.
            </p>
            <p>
              • <strong>0 токенов</strong> — перехват диалога живым оператором или администратором.
            </p>
            <p className="pt-1 text-[var(--text-muted)] border-t border-[var(--border)]">
              При смене тарифа неиспользованные токены не сгорают и автоматически переносятся в новый расчётный период.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal: Plan Change */}
      {targetPlanId && targetPlanData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-change-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[8px] shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="plan-change-modal-title" className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  Подтверждение смены тарифа
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {isUpgrade
                    ? `Повышение плана: переход на ${targetPlanData.name}`
                    : `Смена плана: переход на ${targetPlanData.name}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetPlanId(null)}
                aria-label="Закрыть окно"
                className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Текущий тариф:</span>
                <span className="font-semibold text-[var(--text-primary)] font-mono">
                  {currentPlanNormalized.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Новый тариф:</span>
                <span className="font-bold text-[var(--accent-text)] bg-[var(--accent)] px-2 py-0.5 rounded-[4px] font-mono">
                  {targetPlanData.name}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-2">
                <span className="text-[var(--text-secondary)]">К оплате:</span>
                <span className="font-bold text-sm text-[var(--text-primary)] font-mono">
                  {targetPlanData.usdPriceFormatted} / мес (~{targetPlanData.uzsPriceFormatted})
                </span>
              </div>
            </div>

            {/* Расчёт и подтверждение */}
            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)]">Форма расчёта: Корпоративный счёт</div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Тариф активируется немедленно. Счёт на оплату и закрывающие документы формируются по реквизитам организации.
              </p>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Момент изменения: тариф и баланс обновляются немедленно после подтверждения. Неиспользованный
              остаток токенов суммируется с новым пакетом.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTargetPlanId(null)}
                className="h-10 px-4 rounded-[6px] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPlanChange}
                className="h-10 px-5 rounded-[6px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Активация...' : `Подтвердить и перейти на ${targetPlanData.name}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: TopUp */}
      {selectedPackage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="topup-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[8px] shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="topup-modal-title" className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  Покупка токенов: {selectedPackage.name}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Начисление +{selectedPackage.tokensFormatted} на баланс
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPackage(null)}
                aria-label="Закрыть окно"
                className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Пакет:</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {selectedPackage.name} (+{selectedPackage.tokensFormatted})
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5">
                <span className="text-[var(--text-secondary)]">Сумма к оплате:</span>
                <span className="font-bold text-sm text-[var(--text-primary)] font-mono">
                  {selectedPackage.usdPriceFormatted} (~{selectedPackage.uzsPriceFormatted})
                </span>
              </div>
            </div>

            {/* Расчёт и подтверждение */}
            <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-1">
              <div className="font-semibold text-[var(--text-primary)]">Форма расчёта: Корпоративный счёт</div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Тариф активируется немедленно. Счёт на оплату и закрывающие документы формируются по реквизитам организации.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedPackage(null)}
                className="h-10 px-4 rounded-[6px] border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmTopUp}
                className="h-10 px-5 rounded-[6px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? 'Обработка...' : 'Оплатить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
