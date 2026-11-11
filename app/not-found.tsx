'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Headphones,
  Home,
  LayoutDashboard,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { SparrowMascot } from '@/components/ui/SparrowMascot';

export default function NotFound() {
  const router = useRouter();

  // Language state
  const [locale, setLocale] = useState<'ru' | 'uz'>('ru');

  // Authentication state: null = checking, true = authenticated, false = guest
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Public support modal state for unauthenticated guests
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    try {
      const match = document.cookie.match(/(?:^|;\s*)gapcha_locale=(ru|uz)(?:;|$)/);
      if (match && (match[1] === 'ru' || match[1] === 'uz')) {
        setLocale(match[1]);
      } else {
        const local = localStorage.getItem('gapcha_locale');
        if (local === 'ru' || local === 'uz') setLocale(local);
      }
      const hasCookie = document.cookie
        .split('; ')
        .some((row) => row.startsWith('ai_os_workspace_id=') && row.split('=')[1]?.length > 0);
      const hasLocalStorage = !!localStorage.getItem('ai_os_user');
      setIsAuthenticated(hasCookie || hasLocalStorage);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLocaleChange = (newLocale: 'ru' | 'uz') => {
    setLocale(newLocale);
    try {
      document.cookie = `gapcha_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      localStorage.setItem('gapcha_locale', newLocale);
      document.documentElement.lang = newLocale;
    } catch {}
  };

  const handleSupportClick = () => {
    if (isAuthenticated) {
      router.push('/dashboard/support');
    } else {
      setIsModalOpen(true);
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  };

  const handlePublicSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!supportEmail.trim() || !supportEmail.includes('@')) {
      setSubmitError('Пожалуйста, укажите корректный email адрес');
      return;
    }
    if (!supportMessage.trim() || supportMessage.trim().length < 5) {
      setSubmitError('Сообщение должно содержать не менее 5 символов');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: supportEmail.trim(),
          message: supportMessage.trim(),
          subject: 'Вопрос с несуществующей страницы (404)',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при отправке обращения');
      }

      setSubmitSuccess(data.message || 'Ваше обращение принято! Мы ответим на ваш email.');
      setSupportMessage('');
    } catch (err: any) {
      setSubmitError(err.message || 'Не удалось отправить обращение. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-150 overflow-x-hidden">
      {/* 1. Header: BrandLogo left, Language toggle + Theme right */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between shrink-0">
        <BrandLogo variant="full" width={140} href="/" ariaLabel="gapcha AI" />
        <div className="flex items-center gap-2.5">
          <div
            role="group"
            aria-label="Tilni tanlash / Выбор языка"
            className="inline-flex items-center p-0.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]"
          >
            <button
              type="button"
              onClick={() => handleLocaleChange('ru')}
              aria-pressed={locale === 'ru'}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                locale === 'ru'
                  ? 'bg-[#ED262A] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => handleLocaleChange('uz')}
              aria-pressed={locale === 'uz'}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                locale === 'uz'
                  ? 'bg-[#ED262A] text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              UZ
            </button>
          </div>
          <ThemeSwitcher compact={true} />
        </div>
      </header>

      {/* 2. Compact Composition: "404", Sparrow near pointer, and "Такой страницы нет" */}
      <main className="w-full max-w-lg mx-auto px-4 py-8 sm:py-12 my-auto flex-1 flex flex-col items-center justify-center text-center">
        {/* Large Crisp 404 Accent Badge */}
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-[#ED262A] dark:text-[#FF7277] font-mono text-sm sm:text-base font-bold tracking-widest uppercase mb-4">
          {locale === 'uz' ? '404-xatolik' : 'Ошибка 404'}
        </div>

        {/* Mascot with signpost: one short head-tilt gesture, then calm */}
        <div className="w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center mb-4">
          <SparrowMascot variant="look" size={140} priority />
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mb-2">
          {locale === 'uz' ? 'Bunday sahifa mavjud emas' : 'Такой страницы нет'}
        </h1>

        {/* Subhead */}
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-sm mb-6">
          {locale === 'uz'
            ? 'Ehtimol, havola eskirgan yoki manzilda xatolik bor. Keling, ishga qaytamiz.'
            : 'Возможно, ссылка устарела или в адресе есть опечатка. Давайте вернёмся к работе.'}
        </p>

        {/* Action Buttons: На главную + В кабинет / Войти */}
        <div className="w-full max-w-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 mb-4">
          <Link
            href="/"
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-[var(--surface-secondary)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] transition-colors inline-flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            <Home className="w-4 h-4 text-[var(--text-muted)]" />
            <span>{locale === 'uz' ? 'Bosh sahifaga' : 'На главную'}</span>
          </Link>

          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-[#ED262A] hover:bg-[#d91e22] text-white transition-colors inline-flex items-center justify-center gap-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{locale === 'uz' ? 'Kabinetga' : 'В кабинет'}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-[#ED262A] hover:bg-[#d91e22] text-white transition-colors inline-flex items-center justify-center gap-2 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#ED262A]"
            >
              <span>{locale === 'uz' ? 'Kirish' : 'Войти'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Support Link */}
        <button
          type="button"
          onClick={handleSupportClick}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-1 cursor-pointer focus:outline-none focus:underline"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>{locale === 'uz' ? 'Qo‘llab-quvvatlash xizmati' : 'Написать в поддержку'}</span>
        </button>
      </main>

      {/* 3. Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 py-4 text-center text-[11px] text-[var(--text-muted)] shrink-0">
        gapcha AI · {locale === 'uz' ? 'Savdo va xizmatlar uchun AI-xodimlar platformasi' : 'Платформа ИИ-сотрудников'}
      </footer>

      {/* Public Support Modal for Guests */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          style={{ animationDuration: '180ms' }}
        >
          <div
            className="w-full max-w-[460px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xl relative text-left"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 text-[#ED262A] flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <h2 id="modal-title" className="text-base font-bold text-[var(--text-primary)]">
                Служба поддержки gapcha AI
              </h2>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Опишите, какую страницу вы искали, и мы поможем сориентироваться.
            </p>

            {submitSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{submitSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handlePublicSupportSubmit} className="space-y-3.5">
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="support-email" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Ваш Email
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2 text-xs bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                  />
                </div>

                <div>
                  <label htmlFor="support-message" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Сообщение
                  </label>
                  <textarea
                    id="support-message"
                    rows={3}
                    required
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Какую страницу или раздел вы искали?"
                    className="w-full px-3.5 py-2 text-xs bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#ED262A] hover:bg-[#d91e22] disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Отправить</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
