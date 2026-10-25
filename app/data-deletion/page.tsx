import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Trash2, ArrowLeft, ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Удаление данных пользователей — Chorla AI',
  description: 'Инструкции и URL обратного вызова для удаления данных пользователей Meta/Instagram в Chorla AI',
};

export default function DataDeletionPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-700 dark:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Meta Data Deletion Request Callback Instructions</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Удаление пользовательских данных (User Data Deletion)
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Соответствие требованиям Meta Platform Terms и разделу Data Protection
          </p>
        </div>

        <section className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">1. Автоматическое удаление через кабинет</h2>
          <p>
            Если вы хотите удалить подключение Instagram и все связанные токены доступа:
          </p>
          <ol className="list-decimal pl-6 space-y-1.5">
            <li>Войдите в личный кабинет Chorla AI: <code className="text-[#DC2626]">https://chorla-ai.vercel.app/dashboard</code></li>
            <li>Перейдите в раздел <strong className="text-[var(--text-primary)]">«Интеграции»</strong>.</li>
            <li>В блоке <strong className="text-[var(--text-primary)]">«Instagram Direct»</strong> нажмите кнопку <strong className="text-red-600">«Отключить интеграцию»</strong>.</li>
          </ol>
          <p>
            Вся авторизационная информация и зашифрованные токены немедленно удаляются из рабочей базы данных.
          </p>
        </section>

        <section className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">2. Удаление приложения из настроек Facebook/Instagram</h2>
          <p>
            Вы также можете отозвать доступ непосредственно в Meta:
          </p>
          <ol className="list-decimal pl-6 space-y-1.5">
            <li>Перейдите в <strong>Настройки и конфиденциальность</strong> вашего Facebook/Instagram аккаунта.</li>
            <li>Откройте <strong>Приложения и сайты</strong> (Apps and Websites).</li>
            <li>Найдите <strong>Chorla AI</strong> и нажмите <strong>Удалить (Remove)</strong>.</li>
          </ol>
        </section>

        <section className="space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">3. Запрос на полное удаление всех диалогов</h2>
          <p>
            Для полного стирания истории переписки и лидов, полученных через Instagram Direct:
          </p>
          <div className="p-4 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-xs space-y-2">
            <p><strong>Контакт:</strong> privacy@chorla.ai или support@chorla.ai</p>
            <p><strong>Срок обработки:</strong> до 48 рабочих часов с направлением отчёта о подтверждении стирания.</p>
            <p><strong>Callback endpoint для Meta:</strong> <code className="text-[#DC2626]">https://chorla-ai.vercel.app/api/meta/data-deletion</code></p>
          </div>
        </section>

        <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Chorla AI Security Team</span>
          <span>© 2026 Chorla AI</span>
        </div>
      </main>
    </div>
  );
}
