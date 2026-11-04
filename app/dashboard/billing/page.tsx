'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PLANS_LIST, TOKEN_PACKAGES, ROADMAP_MODULES, type PlanId } from '@/lib/pricing';
import { PricingCard } from '@/components/pricing/PricingCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DataState } from '@/components/ui/DataState';
import {
  FileText,
  X,
  CreditCard,
  MessageSquare,
  Sparkles,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

type Transaction = {
  id: string;
  createdAt: string;
  description: string;
  tokensDelta: number;
  amountUsd: string;
};

export default function BillingPage() {
  const { plan, tokenBalance, workspace } = useApp();
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [paymentNotice, setPaymentNotice] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/billing/transactions');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось загрузить историю операций');
      }
      setTransactions(data.logs || []);
      setError(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const active = Boolean(workspace?.subscriptionActive);
  const normalizedPlan = (plan || 'trial').toLowerCase() as PlanId | 'trial';

  return (
    <div className="space-y-8 w-full pb-10">
      <PageHeader
        title="Тарифы и баланс"
        description="Управляйте подпиской, лимитами ИИ-сотрудников и объёмом ответов."
      />

      {/* ========================================================================= */}
      {/* 1. CURRENT SUBSCRIPTION & RESPONSES BALANCE HERO */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] p-6 sm:p-7 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Current Plan */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[#AABAD0]/70">
              Ваш тариф
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-[var(--text-primary)] dark:text-[#F4F7FB]">
                {plan}
              </span>
              <Badge variant={active ? 'success' : 'warning'}>
                {active ? '● Активен' : '○ Пробный период'}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
              {active
                ? 'Подписка оплачена и активна'
                : '100 бонусных ИИ-ответов на 3 дня после регистрации'}
            </p>
          </div>

          {/* AI Responses Balance */}
          <div className="space-y-1 md:border-x md:border-[var(--border)] md:dark:border-[#29374C] md:px-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] dark:text-[#AABAD0]/70">
              Баланс ИИ-ответов
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] dark:text-[#F4F7FB] tabular-nums">
                {tokenBalance.toLocaleString('ru-RU')}
              </span>
              <span className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                ответов (токенов)
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70">
              1 ответ ИИ = 1 токен. При обращении клиента списывается 1 единица.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 justify-center md:items-end">
            <a
              href="#pricing-plans"
              className="px-4 py-2 rounded-xl bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold text-xs text-center transition-all shadow-xs"
            >
              Сменить тариф
            </a>
            <a
              href="#transactions"
              className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[#AABAD0] hover:text-[#FF7277] flex items-center justify-center gap-1 transition-colors"
            >
              <span>История операций</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PRICING PLANS COMPARISON */}
      {/* ========================================================================= */}
      <section id="pricing-plans" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
            Тарифные планы
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1">
            Выберите масштаб для вашей компании: от одного ассистента до распределённой команды отделов продаж.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {PLANS_LIST.map((item) => (
            <PricingCard
              key={item.id}
              plan={item}
              mode="billing"
              isSelected={selected === item.id}
              isCurrent={normalizedPlan === item.id}
              onSelect={(id) => {
                setSelected(id);
                setPaymentNotice(true);
              }}
            />
          ))}
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface-secondary)]/50 dark:bg-[#101B2E] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] flex items-center justify-between gap-4">
          <p>
            Онлайн-оплата находится в процессе интеграции. Выбор тарифа фиксирует заявку, но не списывает средства автоматически.
          </p>
          <span className="shrink-0 text-[11px] font-semibold text-[#FF7277]">
            Честный расчёт
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FUTURE ROADMAP (ПЛАН РАЗВИТИЯ ТАРИФОВ) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
              План развития возможностей (Roadmap)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Скоро
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1">
            Эти функции находятся в активной разработке и появятся в тарифах без дополнительной платы после релиза.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ROADMAP_MODULES.map((module) => (
            <div
              key={module.title}
              className="p-5 rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  {module.title}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#101B2E] text-[var(--text-muted)] dark:text-[#AABAD0] border border-[var(--border)] dark:border-[#29374C]">
                  {module.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
                {module.description}
              </p>
              <span className="inline-block text-[10px] font-semibold text-[#FF7277] pt-1">
                Тариф: {module.tier}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. TOP-UP RESPONSE PACKAGES */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
            Докупка пакетов ИИ-ответов
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1">
            Если основной лимит тарифа подходит к концу при активном трафике, пополните баланс в один клик.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TOKEN_PACKAGES.map((pack) => (
            <div
              key={pack.id}
              className="p-6 rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-all"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[var(--text-muted)] dark:text-[#AABAD0]/70 uppercase">
                  {pack.name}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                    {pack.usdPriceFormatted}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                    · {pack.uzsPriceFormatted}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-[#FF7277]">
                  <MessageSquare size={13} />
                  <span>{pack.responsesFormatted}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed pt-1">
                  {pack.description}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full text-xs font-semibold"
                disabled
              >
                Оплата подключается
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. TRANSACTIONS HISTORY */}
      {/* ========================================================================= */}
      <section id="transactions" className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)] dark:text-[#F4F7FB]">
          История операций
        </h2>
        <DataState loading={loading} error={error} retry={load} />
        {!loading && !error && (
          <div className="rounded-2xl border border-[var(--border)] dark:border-[#29374C] bg-[var(--surface)] dark:bg-[#142137] overflow-hidden shadow-xs">
            {!transactions.length ? (
              <div className="py-14 px-4 text-center">
                <FileText
                  size={40}
                  className="mx-auto text-[var(--text-muted)] dark:text-[#AABAD0]/60 mb-3"
                />
                <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  Операций пока нет
                </h3>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0] mt-1 max-w-sm mx-auto">
                  Здесь будут отображаться списания за ИИ-ответы и начисления токенов.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)] dark:divide-[#29374C]">
                {transactions.map((item) => (
                  <li
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[var(--text-primary)] dark:text-[#F4F7FB]">
                        {item.description}
                      </p>
                      <time className="text-[11px] text-[var(--text-muted)] dark:text-[#AABAD0]/70 mt-0.5 block">
                        {new Date(item.createdAt).toLocaleString('ru-RU')}
                      </time>
                    </div>
                    <div className="flex items-center gap-4">
                      <strong
                        className={`tabular-nums font-bold ${
                          item.tokensDelta > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[var(--text-primary)] dark:text-[#F4F7FB]'
                        }`}
                      >
                        {item.tokensDelta > 0 ? '+' : ''}
                        {item.tokensDelta} отв.
                      </strong>
                      <span className="text-[var(--text-secondary)] dark:text-[#AABAD0]">
                        ${item.amountUsd}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* Honest Payment Notice Dialog */}
      <Dialog
        open={paymentNotice}
        onClose={() => setPaymentNotice(false)}
        label="Выбор тарифа"
        className="w-[calc(100vw-32px)] sm:w-[460px] max-w-[460px] p-0 rounded-2xl overflow-hidden border border-[var(--border)] dark:border-[#29374C] shadow-2xl bg-[var(--surface)] dark:bg-[#142137]"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border)] dark:border-[#29374C] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="size-10 rounded-xl bg-red-500/10 text-[#FF7277] flex items-center justify-center font-bold text-sm">
                AI
              </div>
              <div>
                <h3 className="font-semibold text-base text-[var(--text-primary)] dark:text-[#F4F7FB]">
                  Тариф {selected?.toUpperCase()}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
                  Подтверждение выбора
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPaymentNotice(false)}
              aria-label="Закрыть"
            >
              <X size={18} />
            </Button>
          </div>

          <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[#AABAD0] leading-relaxed">
            Модуль онлайн-оплаты через Payme / Click / банковские карты находится на этапе юридического согласования.
            Ваша подписка и текущий баланс не изменяются автоматически.
          </p>

          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)]/60 dark:bg-[#101B2E] border border-[var(--border)] dark:border-[#29374C] text-xs text-[var(--text-secondary)] dark:text-[#AABAD0]">
            Для подключения расширенного тарифа или персонального тестирования обратитесь в нашу службу поддержки.
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="primary"
              className="bg-[#FF7277] hover:bg-[#ff5d63] text-[#0B1220] font-semibold"
              onClick={() => setPaymentNotice(false)}
            >
              Понятно
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
