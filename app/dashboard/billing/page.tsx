'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useApp, PlanType } from '@/context/AppContext';
import { PLANS, PLANS_LIST, TOKEN_PACKAGES, PlanId, TokenPackage } from '@/lib/pricing';
import {
  CreditCard,
  Check,
  Clock,
  X,
  AlertCircle,
  FileText,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
        showToast(
          'Тариф активирован',
          `Вы успешно перешли на тариф ${targetPlanId.toUpperCase()}`,
          'success'
        );
        setTargetPlanId(null);
        await loadTransactions();
      } else {
        showToast('Ошибка смены тарифа', data.error || 'Сбой запроса', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message, 'error');
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
          tokens: selectedPackage.tokens,
          amountUsd: selectedPackage.usdPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          'Баланс пополнен',
          `Начислено ${selectedPackage.tokensFormatted}`,
          'success'
        );
        setSelectedPackage(null);
        await loadTransactions();
      } else {
        showToast('Ошибка пополнения', data.error || 'Сбой запроса', 'error');
      }
    } catch (err: any) {
      showToast('Ошибка', err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 text-left max-w-6xl">
      {/* Page Header */}
      <div className="pb-3 border-b border-[var(--border)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          Тарифы и баланс
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Выберите подходящий тариф, управляйте балансом токенов и следите за историей операций.
        </p>
      </div>

      {/* Top Section: Ваш тариф & Баланс токенов & История операций link */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 sm:p-6 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Col 1: Ваш тариф */}
          <div className="md:col-span-5 space-y-2 border-b md:border-b-0 md:border-r border-[var(--border)] pb-4 md:pb-0 md:pr-6">
            <span className="text-xs font-semibold text-[var(--text-primary)] block">
              Ваш тариф
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-[6px] text-base font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                {(plan || 'START').toUpperCase()}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Активен
              </span>
            </div>
          </div>

          {/* Col 2: Баланс токенов */}
          <div className="md:col-span-4 space-y-1">
            <span className="text-xs text-[var(--text-secondary)] block">
              Баланс токенов
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] font-mono">
                {tokenBalance.toLocaleString('ru-RU')}
              </span>
              <span className="text-xs font-medium text-[var(--text-muted)]">
                токенов
              </span>
            </div>
          </div>

          {/* Col 3: История операций link */}
          <div className="md:col-span-3 flex justify-start md:justify-end">
            <a
              href="#transactions"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              <FileText className="w-4 h-4 text-[var(--accent)]" />
              <span>История операций</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Section 2: Выберите тариф (START, BUSINESS, PRO) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Выберите тариф
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Все тарифы включают подключение каналов для общения с клиентами.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS_LIST.map((p) => {
            const isCurrent = currentPlanNormalized === p.id;
            const isBusiness = p.id === 'business';

            return (
              <div
                key={p.id}
                className={`bg-[var(--surface)] rounded-[8px] p-6 shadow-2xs flex flex-col justify-between transition-all relative ${
                  isBusiness
                    ? 'border-2 border-[var(--accent)]'
                    : 'border border-[var(--border)] hover:border-[var(--border-strong)]'
                }`}
              >
                {/* Badge if present */}
                {p.badge && (
                  <div className="absolute -top-3 left-6">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-red-50 dark:bg-red-950/60 text-[var(--accent)] border border-red-200 dark:border-red-900/50">
                      {p.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Plan Name */}
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    {p.name}
                  </h3>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-[var(--text-primary)]">
                        {p.usdPriceFormatted}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] font-medium">
                        / мес
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">
                      {p.uzsPriceFormatted} / мес
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <Check className="w-4 h-4 text-[var(--accent)] stroke-[2.5]" />
                      <span>{p.tokensFormatted}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                      <Check className="w-4 h-4 text-[var(--accent)] stroke-[2.5]" />
                      <span>{p.maxAgents} {p.maxAgents === 1 ? 'ИИ-сотрудник' : 'ИИ-сотрудника'}</span>
                    </div>
                  </div>

                  {/* Integrations breakdown */}
                  <div className="pt-3 border-t border-[var(--border)] space-y-2">
                    <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      Доступные интеграции
                    </div>
                    <div className="space-y-2 text-xs text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <Image src="/integrations/telegram.svg" alt="TG" width={16} height={16} />
                        <span>Telegram</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image src="/integrations/instagram.svg" alt="IG" width={16} height={16} />
                        <span>Instagram</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image src="/integrations/whatsapp.svg" alt="WA" width={16} height={16} />
                        <span>WhatsApp</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image src="/integrations/google-calendar.png" alt="GCal" width={16} height={16} />
                        <span>Google Календарь</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] pt-1 leading-tight">
                      Доступность каналов зависит от подключения.
                    </p>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 rounded-[6px] text-xs font-semibold bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)] cursor-default"
                    >
                      Текущий тариф
                    </button>
                  ) : isBusiness ? (
                    <button
                      type="button"
                      onClick={() => handlePlanClick(p.id)}
                      className="w-full py-2.5 rounded-[6px] text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] transition-colors cursor-pointer shadow-2xs"
                    >
                      Выбрать BUSINESS
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePlanClick(p.id)}
                      className="w-full py-2.5 rounded-[6px] text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                    >
                      Выбрать {p.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Докупка токенов (3 пакета) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Докупка токенов
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Дополнительные токены доступны при активной подписке на любой тариф.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TOKEN_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 shadow-2xs flex flex-col justify-between hover:border-[var(--border-strong)] transition-all"
            >
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {pkg.tokensFormatted}
                </h3>
                <div>
                  <span className="text-2xl font-extrabold text-[var(--text-primary)]">
                    {pkg.usdPriceFormatted}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] ml-2 font-medium">
                    {pkg.uzsPriceFormatted}
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  onClick={() => setSelectedPackage(pkg)}
                  className="w-full py-2 rounded-[6px] text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
                >
                  Купить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: История операций */}
      <div id="transactions" className="space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            История операций
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Здесь отображаются списания и пополнения токенов.
          </p>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] shadow-2xs overflow-hidden">
          {isLoadingTx ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Загрузка истории операций...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Операций пока нет
              </h4>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1 leading-relaxed">
                Пополните баланс или начните использовать токены, чтобы здесь появились записи.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border)] text-[var(--text-secondary)] font-semibold text-xs">
                    <th className="py-3 px-4">Дата</th>
                    <th className="py-3 px-4">Операция</th>
                    <th className="py-3 px-4 text-right">Токены</th>
                    <th className="py-3 px-4 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[var(--surface-secondary)]/50 transition-colors">
                      <td className="py-3 px-4 text-[var(--text-muted)] font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                        {tx.description || tx.action}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        tx.amount > 0 ? 'text-[var(--success-text)]' : 'text-[var(--text-primary)]'
                      }`}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--text-muted)] font-mono">
                        {tx.usdPrice ? `$${tx.usdPrice}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Confirm Plan Change */}
      {targetPlanId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Подтверждение смены тарифа
              </h3>
              <button
                type="button"
                onClick={() => setTargetPlanId(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Вы переходите на тариф <strong>{PLANS[targetPlanId]?.name}</strong> ({PLANS[targetPlanId]?.usdPriceFormatted} / мес, {PLANS[targetPlanId]?.tokensFormatted}).
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Способ оплаты
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('direct')}
                  className={`p-3 rounded-[6px] border text-left cursor-pointer transition-all ${
                    paymentMethod === 'direct'
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent-text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  Банковская карта
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('invoice')}
                  className={`p-3 rounded-[6px] border text-left cursor-pointer transition-all ${
                    paymentMethod === 'invoice'
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent-text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  Счёт на юр. лицо
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTargetPlanId(null)}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                isLoading={isProcessing}
                onClick={handleConfirmPlanChange}
              >
                Подтвердить переход
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm TopUp */}
      {selectedPackage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Покупка пакета токенов
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPackage(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Вы покупаете <strong>{selectedPackage.tokensFormatted}</strong> за <strong>{selectedPackage.usdPriceFormatted}</strong> ({selectedPackage.uzsPriceFormatted}). Токены поступят на баланс моментально.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPackage(null)}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                isLoading={isProcessing}
                onClick={handleConfirmTopUp}
              >
                Оплатить и пополнить
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
