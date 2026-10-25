import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ShieldCheck, ArrowLeft, Mail } from 'lucide-react';

export const metadata = {
  title: 'Политика конфиденциальности — Chorla AI',
  description: 'Политика конфиденциальности и обработки персональных данных платформы Chorla AI',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <BrandLogo variant="full" width={140} href="/" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>На главную</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8 text-left">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GDPR & Meta Platform Compliant</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Политика конфиденциальности Chorla AI
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Редакция действует с 25 октября 2026 года
          </p>
        </div>

        <section className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Общие положения</h2>
          <p>
            Настоящая Политика определяет порядок обработки и защиты персональных данных, получаемых Chorla AI при использовании сервиса, интеграций с Meta (Instagram Graph API), Telegram и Google Calendar.
          </p>
        </section>

        <section className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">2. Данные, получаемые через Instagram API</h2>
          <p>
            При подключении профессионального или бизнес-аккаунта Instagram через Instagram Login сервис запрашивает исключительно следующие разрешения:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong className="text-[var(--text-primary)]">instagram_business_basic:</strong> чтение имени пользователя и идентификатора аккаунта для привязки к рабочей области.</li>
            <li><strong className="text-[var(--text-primary)]">instagram_business_manage_messages:</strong> приём входящих Direct-сообщений и отправка ответов от имени подключённого агента в рамках 24-часового окна.</li>
          </ul>
          <p>
            Все токены доступа шифруются по стандарту AES-256-GCM на сервере и никогда не передаются сторонним сервисам или клиентскому браузеру.
          </p>
        </section>

        <section className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">3. Изоляция данных между организациями</h2>
          <p>
            Chorla AI использует строгую мультитенантную архитектуру. Сообщения, базы знаний и токены каждой компании изолированы. Доступ к переписке имеет исключительно уполномоченный персонал соответствующей организации.
          </p>
        </section>

        <section className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">4. Удаление данных</h2>
          <p>
            Пользователь может в любой момент отозвать интеграцию в разделе «Интеграции», что влечёт мгновенное удаление сохранённых токенов. Для полного удаления всех накопленных данных переписки ознакомьтесь с инструкцией на странице{' '}
            <Link href="/data-deletion" className="text-[#DC2626] font-semibold underline">
              Удаление данных
            </Link>.
          </p>
        </section>

        <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Служба безопасности Chorla AI: privacy@chorla.ai</span>
          <span>© 2026 Chorla AI</span>
        </div>
      </main>
    </div>
  );
}
