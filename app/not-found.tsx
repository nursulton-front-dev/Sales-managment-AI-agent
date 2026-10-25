'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Headphones,
  ArrowLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { NotFoundIllustration } from '@/components/ui/NotFoundIllustration';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function NotFound() {
  const router = useRouter();

  // Authentication state: null = unknown/loading, true = logged in, false = guest
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Public support modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    try {
      const hasCookie = document.cookie
        .split('; ')
        .some((row) => row.startsWith('ai_os_workspace_id=') && row.split('=')[1]?.length > 0);
      const hasLocalStorage = !!localStorage.getItem('ai_os_user');
      setIsAuthenticated(hasCookie || hasLocalStorage);
    } catch {
      setIsAuthenticated(false);
    }
  }, []);

  const handleSupportClick = () => {
    if (isAuthenticated) {
      router.push('/dashboard/support');
    } else {
      setIsModalOpen(true);
      setSubmitError(null);
      setSubmitSuccess(null);
    }
  };

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      // Check if there is valid internal referrer history
      if (window.history.length > 2 && document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
      } else {
        router.push(isAuthenticated ? '/dashboard' : '/login');
      }
    }
  };

  const handlePublicSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!supportEmail.trim() || !supportEmail.includes('@')) {
      setSubmitError('Пожалуйста, укажите корректный адрес электронной почты');
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

      setSubmitSuccess(data.message || 'Ваше обращение зарегистрировано!');
      setSupportMessage('');
    } catch (err: any) {
      setSubmitError(err.message || 'Не удалось отправить обращение. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0B1220] text-[#171A21] dark:text-[#F1F5F9] transition-colors duration-150">
      {/* 1. Header (Logo left, ThemeSwitcher right directly on background) */}
      <header className="w-full max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-16 pt-6 sm:pt-8 flex items-center justify-between shrink-0">
        <BrandLogo
          variant="full"
          width={150}
          href="/"
          ariaLabel="Chorla AI"
        />

        <div>
          <ThemeSwitcher />
        </div>
      </header>

      {/* 2. Main Open Composition (Two columns on desktop, stacked on mobile) */}
      <main className="w-full max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12 my-auto flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          
          {/* Mobile Illustration (shown above text on < lg screens) */}
          <div className="block lg:hidden w-full max-w-[420px] mx-auto pt-2 pb-4">
            <NotFoundIllustration />
          </div>

          {/* Left Column: Text & Actions (Desktop 6-7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {/* Small uppercase eyebrow */}
            <div className="text-[12px] sm:text-[13px] font-bold tracking-[0.14em] text-[#DC2626] uppercase mb-4 sm:mb-5 select-none">
              СТРАНИЦА НЕ НАЙДЕНА
            </div>

            {/* Huge Headline: "Кажется, вы заблудились" */}
            <h1 className="text-[34px] sm:text-[46px] md:text-[56px] lg:text-[68px] xl:text-[74px] font-extrabold text-[#171A21] dark:text-[#F1F5F9] tracking-[-0.035em] leading-[1.04] mb-5 sm:mb-6">
              Кажется, вы <br className="hidden sm:inline" />
              заблудились
            </h1>

            {/* Description */}
            <p className="text-[16px] sm:text-[18px] lg:text-[19px] text-[#526079] dark:text-[#A5B4C8] font-normal leading-[1.5] max-w-[540px] mb-8 sm:mb-10">
              Возможно, ссылка устарела или в адресе есть опечатка. Давайте вернёмся к работе.
            </p>

            {/* Action Buttons Row */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-6">
              {/* Primary Button */}
              {isAuthenticated === null ? (
                // Clean skeleton placeholder to avoid button flash
                <div className="w-full sm:w-[170px] h-[48px] sm:h-[50px] bg-slate-200 dark:bg-slate-800 rounded-[6px] animate-pulse" />
              ) : isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto min-w-[160px] h-[48px] sm:h-[50px] px-6 inline-flex items-center justify-center gap-2.5 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-medium text-[15px] rounded-[6px] transition-all duration-150 shadow-xs cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2"
                >
                  <span>В кабинет</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="w-full sm:w-auto min-w-[160px] h-[48px] sm:h-[50px] px-6 inline-flex items-center justify-center gap-2.5 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-medium text-[15px] rounded-[6px] transition-all duration-150 shadow-xs cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2"
                >
                  <span>Войти</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </Link>
              )}

              {/* Support Secondary Button */}
              <button
                type="button"
                onClick={handleSupportClick}
                className="w-full sm:w-auto min-w-[160px] h-[48px] sm:h-[50px] px-6 inline-flex items-center justify-center gap-2.5 bg-transparent hover:bg-slate-100/70 dark:hover:bg-slate-800/60 active:scale-[0.99] border border-[#D8DFE8] dark:border-slate-700 text-[#171A21] dark:text-[#F1F5F9] font-medium text-[15px] rounded-[6px] transition-all duration-150 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                <Headphones className="w-4 h-4 text-[#526079] dark:text-[#A5B4C8] stroke-[2]" />
                <span>Поддержка</span>
              </button>
            </div>

            {/* Back link */}
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-[#526079] dark:text-[#A5B4C8] hover:text-[#171A21] dark:hover:text-white transition-colors duration-150 cursor-pointer py-1 group focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 rounded"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2] transition-transform duration-150 group-hover:-translate-x-0.5" />
              <span>Вернуться назад</span>
            </button>
          </div>

          {/* Right Column: Desktop Illustration (Desktop 5 cols) */}
          <div className="hidden lg:flex lg:col-span-5 items-center justify-center pl-4">
            <NotFoundIllustration />
          </div>

        </div>
      </main>

      {/* 3. Subtle bottom spacing / empty minimal footer without advertising */}
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-12 lg:px-16 py-4 shrink-0" />

      {/* Public Support Modal for Guests */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          style={{ animationDuration: '180ms' }}
        >
          <div
            className="w-full max-w-[460px] bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-[8px] p-6 shadow-xl relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-[4px] cursor-pointer"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-[6px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Headphones className="w-4 h-4" />
              </div>
              <h2 id="modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
                Служба поддержки
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              Опишите возникшую сложность или вопрос. Наша дежурная команда ответит на ваш email в ближайшее время.
            </p>

            {submitSuccess ? (
              <div className="py-4 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  {submitSuccess}
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mt-2 w-full h-[42px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-sm rounded-[6px] hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={handlePublicSupportSubmit} className="space-y-4">
                {submitError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-[6px] flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ваш Email
                  </label>
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full h-[42px] px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Сообщение
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Какая страница не открылась или какой у вас возник вопрос?"
                    className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 h-[42px] text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-[6px] cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 h-[42px] bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium text-xs rounded-[6px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Отправка…</span>
                      </>
                    ) : (
                      <span>Отправить обращение</span>
                    )}
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
