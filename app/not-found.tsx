'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, ArrowRight, LifeBuoy, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';

export default function NotFound() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Public support modal form state
  const [supportEmail, setSupportEmail] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Check client-side authentication on mount
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
      window.location.href = '/dashboard/support';
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
    <div className="min-h-[100dvh] w-full flex flex-col justify-between bg-[#F8FAFC] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 px-4 py-6 sm:py-10 transition-colors duration-150">
      {/* Top bar with Logo & Theme switcher */}
      <div className="w-full max-w-[520px] mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group transition-opacity duration-150 hover:opacity-90"
        >
          <div className="w-7 h-7 rounded-[6px] bg-[#1E293B] dark:bg-white text-white dark:text-[#0B1220] flex items-center justify-center font-bold text-xs tracking-tight shadow-xs">
            AI
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white">
            AI Business OS
          </span>
        </Link>
        <ThemeSwitcher />
      </div>

      {/* Main Centered 404 Block */}
      <main className="w-full max-w-[520px] mx-auto my-auto py-6">
        <div
          className="bg-white dark:bg-[#111C2E] border border-slate-200 dark:border-slate-800 rounded-[8px] p-6 sm:p-10 shadow-xs text-center transition-all animate-fade-in-up"
          style={{ animationDuration: '220ms' }}
        >
          {/* Compass Icon */}
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center mb-4">
            <Compass className="w-6 h-6 stroke-[1.75]" />
          </div>

          {/* Large calm 404 */}
          <div className="text-[56px] sm:text-[64px] font-bold tracking-tight text-slate-300 dark:text-slate-700 leading-none select-none mb-3 font-mono">
            404
          </div>

          {/* Title 28-32px */}
          <h1 className="text-[26px] sm:text-[30px] font-bold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
            Кажется, вы заблудились
          </h1>

          {/* Subtitle 16px with comfortable line-height */}
          <p className="text-[15px] sm:text-[16px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-[420px] mx-auto mb-8">
            Мы не нашли эту страницу. Возможно, ссылка устарела или в адресе есть опечатка.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Primary Action Button (State dependent) */}
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto min-w-[190px] h-[46px] px-5 flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-medium text-[15px] rounded-[6px] transition-transform duration-120 shadow-xs cursor-pointer"
              >
                <span>Вернуться в кабинет</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto min-w-[190px] h-[46px] px-5 flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-medium text-[15px] rounded-[6px] transition-transform duration-120 shadow-xs cursor-pointer"
              >
                <span>На страницу входа</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {/* Support Action Button */}
            <button
              type="button"
              onClick={handleSupportClick}
              className="w-full sm:w-auto min-w-[190px] h-[46px] px-5 flex items-center justify-center gap-2 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-[15px] rounded-[6px] transition-colors duration-150 cursor-pointer"
            >
              <LifeBuoy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Связаться с поддержкой</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="w-full max-w-[520px] mx-auto text-center text-xs text-slate-400 dark:text-slate-600">
        AI Business OS · Платформа автономных ИИ-агентов продаж
      </footer>

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
                <LifeBuoy className="w-4 h-4" />
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
