'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  Building2,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCcw,
  Check,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { setWorkspace, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // Sequential Demo Animation (~4.2s sequence)
  // Stages:
  // 0: Initial container visible
  // 1 (600ms): Client message 1 appears
  // 2 (1100ms): Employee typing indicator appears
  // 3 (1800ms): Employee typing replaced by response
  // 4 (2700ms): Client confirmation appears
  // 5 (3500ms): Google Calendar card appears
  // 6 (4200ms): Confirmation checkmark displays
  // --------------------------------------------------------------------------
  const [demoStage, setDemoStage] = useState<number>(6); // Default 6 for SSR / instant
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearDemoTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startDemoSequence = () => {
    clearDemoTimers();

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPrefersReducedMotion(true);
      setDemoStage(6);
      return;
    }

    setDemoStage(0);

    const t1 = setTimeout(() => setDemoStage(1), 600);
    const t2 = setTimeout(() => setDemoStage(2), 1100);
    const t3 = setTimeout(() => setDemoStage(3), 1800);
    const t4 = setTimeout(() => setDemoStage(4), 2700);
    const t5 = setTimeout(() => setDemoStage(5), 3500);
    const t6 = setTimeout(() => setDemoStage(6), 4200);

    timersRef.current = [t1, t2, t3, t4, t5, t6];
  };

  useEffect(() => {
    startDemoSequence();
    return () => clearDemoTimers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Неверный адрес электронной почты или пароль');
      }

      if (data.workspace) {
        setWorkspace(data.workspace);
      }

      showToast('Вход выполнен', 'Добро пожаловать в рабочее пространство', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка подключения к серверу авторизации');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          callbackURL: '/dashboard',
        }),
      });

      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error(data?.message || 'Не удалось сформировать OAuth-ссылку');
    } catch (err: any) {
      console.warn('Google OAuth error:', err);
      setErrorMsg(
        'Авторизация через Google временно настраивается. Войдите по Email или зарегистрируйте рабочее пространство.'
      );
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row bg-[#FAFAFA] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 selection:bg-rose-500/20 selection:text-rose-900">
      {/* ------------------------------------------------------------------ */}
      {/* 1. LEFT PRESENTATION PANEL (~52% on desktop, hidden on <1024px)   */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-label="Презентация возможностей AI Business OS"
        className="hidden lg:flex lg:w-[52%] bg-[#15191F] text-slate-100 flex-col justify-between p-8 xl:p-14 relative overflow-y-auto"
      >
        <div className="w-full max-w-[540px] mx-auto flex-1 flex flex-col justify-between my-auto py-6">
          {/* Logo header: authentic red mark + AI Business OS */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-white tracking-tight">
              AI Business OS
            </span>
          </div>

          {/* Main content block: Title, Subtitle, Demo */}
          <div className="my-auto py-8 space-y-7">
            {/* Title & Subtitle */}
            <div className="space-y-3">
              <h1 className="text-[40px] xl:text-[46px] font-semibold text-white leading-[1.12] tracking-tight">
                Ваш следующий клиент<br />уже написал.
              </h1>
              <p className="text-[16px] text-[#B7BEC8] leading-[1.6]">
                Ответьте вовремя. Помогите выбрать услугу.<br />
                Доведите разговор до записи.
              </p>
            </div>

            {/* Accessible screenreader description */}
            <div className="sr-only">
              Пример работы ИИ-сотрудника: клиент в Telegram спрашивает о пробном уроке в субботу.
              ИИ-сотрудник мгновенно отвечает, что есть время в 14:30 и предлагает записаться.
              После согласия клиента слот автоматически бронируется в Google Календаре.
            </div>

            {/* WHITE DEMO WINDOW (width max 540px, fixed min-height to prevent layout shifts) */}
            <div
              aria-hidden="true"
              className="w-full rounded-[8px] bg-white text-slate-900 shadow-xl overflow-hidden transition-opacity duration-300"
            >
              {/* Window Header */}
              <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
                <span className="text-[13px] font-semibold text-[#20242B]">
                  Диалог с клиентом
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 relative shrink-0">
                    <Image
                      src="/images/brands/telegram.svg"
                      alt="Telegram"
                      width={16}
                      height={16}
                      className="w-4 h-4 object-contain"
                    />
                  </div>
                  <span className="text-[12px] font-medium text-slate-500">
                    Курсы английского · Онлайн
                  </span>
                </div>
              </div>

              {/* Chat body with reserved height (260px) to prevent layout shifts */}
              <div className="p-5 space-y-3 min-h-[260px] flex flex-col justify-start bg-white">
                {/* 1. Client message */}
                <div
                  className={`flex justify-start transition-all duration-200 ${
                    demoStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
                  }`}
                >
                  <div className="max-w-[85%] rounded-[8px] bg-[#F1F3F5] px-3.5 py-2.5 text-[#20242B] text-[14px] leading-snug">
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Клиент
                    </span>
                    Здравствуйте! Есть пробный урок в субботу?
                  </div>
                </div>

                {/* 2. Employee AI typing indicator OR response */}
                {demoStage === 2 && (
                  <div className="flex justify-end transition-opacity duration-150">
                    <div className="rounded-[8px] bg-[#FFF1F2] px-3.5 py-2 flex items-center gap-1.5 text-xs text-[#DC2626]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse [animation-delay:300ms]" />
                      <span className="text-[11px] ml-1 text-slate-400">печатает ответ…</span>
                    </div>
                  </div>
                )}

                {demoStage >= 3 && (
                  <div
                    className={`flex justify-end transition-all duration-200 ${
                      demoStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                    }`}
                  >
                    <div className="max-w-[88%] rounded-[8px] bg-[#FFF1F2] px-3.5 py-2.5 text-[#20242B] text-[14px] leading-snug">
                      <div className="flex items-center justify-between gap-3 text-[11px] text-[#DC2626] font-medium mb-0.5">
                        <span>ИИ-сотрудник</span>
                        <span className="text-[10px] text-slate-400 font-mono">10:14</span>
                      </div>
                      Да, в 14:30 есть свободное время. Записать вас?
                    </div>
                  </div>
                )}

                {/* 3. Client agreement */}
                <div
                  className={`flex justify-start transition-all duration-200 ${
                    demoStage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
                  }`}
                >
                  <div className="max-w-[85%] rounded-[8px] bg-[#F1F3F5] px-3.5 py-2.5 text-[#20242B] text-[14px] leading-snug">
                    <span className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Клиент
                    </span>
                    Да, спасибо.
                  </div>
                </div>

                {/* 4. Google Calendar Booking Card */}
                <div
                  className={`mt-2 pt-1 transition-all duration-240 ${
                    demoStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
                  }`}
                >
                  <div className="rounded-[6px] bg-[#FAFAFA] border border-[#E5E7EB] p-3 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[4px] bg-white border border-[#E5E7EB] flex items-center justify-center p-1.5 shrink-0">
                        <Image
                          src="/images/brands/google-calendar.png"
                          alt="Google Calendar"
                          width={20}
                          height={20}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-[#20242B] leading-tight truncate">
                          Пробный урок
                        </div>
                        <div className="text-[12px] text-slate-500">
                          Суббота · 14:30–15:15
                        </div>
                      </div>
                    </div>

                    {/* Result indicator: Green checkmark only for result */}
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-[#DCFCE7] text-[#15803D] text-[12px] font-medium transition-opacity duration-200 shrink-0 ${
                        demoStage >= 6 ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                      <span>Записан</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Outside Demo: Explicit disclaimer & Replay button */}
            <div className="flex items-center justify-between text-xs text-[#B7BEC8]">
              <span className="text-[12px]">
                Пример работы – реальная запись не создаётся
              </span>
              <button
                type="button"
                onClick={startDemoSequence}
                className="inline-flex items-center gap-1.5 text-[12px] text-slate-300 hover:text-white transition-colors duration-150 cursor-pointer focus:outline-none focus:underline"
                title="Повторить демонстрацию"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Повторить</span>
              </button>
            </div>
          </div>

          {/* Reserved bottom area for aesthetic balance without repeated title */}
          <div className="h-4" />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. RIGHT LOGIN FORM PANEL (~48% on desktop)                         */}
      {/* ------------------------------------------------------------------ */}
      <main
        aria-label="Форма входа в AI Business OS"
        className="flex-1 lg:w-[48%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto"
      >
        {/* Top bar with Mobile Brand & Theme Switcher */}
        <div className="w-full max-w-[420px] mx-auto flex items-center justify-between mb-6 lg:mb-0">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">
              AI Business OS
            </span>
          </div>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Center Form Container (400-420px max-width, no heavy outer card) */}
        <div
          className="w-full max-w-[420px] mx-auto my-auto py-4 space-y-6 animate-fade-in"
          style={{ animationDuration: '240ms' }}
        >
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-[30px] sm:text-[32px] font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
              С возвращением
            </h2>
            <p className="text-[15px] sm:text-[16px] text-slate-500 dark:text-slate-400">
              Войдите в своё рабочее пространство
            </p>
          </div>

          {/* Server / Auth Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 rounded-[6px] flex items-start gap-2.5 text-xs text-red-700 dark:text-rose-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Google Continue Button (Height 48px, thin neutral border, authentic logo) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full h-[48px] flex items-center justify-center gap-3 px-4 rounded-[6px] border border-[#DCE0E5] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-[15px] font-medium text-slate-800 dark:text-slate-200 transition-colors duration-150 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <div className="w-[18px] h-[18px] relative shrink-0">
              <Image
                src="/images/brands/google-g.png"
                alt="Google"
                width={18}
                height={18}
                className="w-full h-full object-contain"
              />
            </div>
            <span>{isGoogleLoading ? 'Переход в Google…' : 'Продолжить с Google'}</span>
          </button>

          {/* Divider "или по электронной почте" */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            <span className="text-[13px] text-slate-400 dark:text-slate-500 font-normal">
              или по электронной почте
            </span>
            <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate={false}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5"
              >
                Электронная почта
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-[50px] px-3.5 bg-white dark:bg-slate-800 border border-[#DCE0E5] dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors duration-150"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-[14px] font-medium text-slate-800 dark:text-slate-200"
                >
                  Пароль
                </label>
                <Link
                  href="/dashboard/support"
                  className="text-[13px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors duration-150"
                >
                  Забыли пароль?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full h-[50px] pl-3.5 pr-11 bg-white dark:bg-slate-800 border border-[#DCE0E5] dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors duration-150 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button (Height 50px, radius 6px, #DC2626 hover #B91C1C, active:scale-[0.99]) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[50px] mt-2 flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-medium text-[15px] rounded-[6px] transition-transform duration-120 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span>{isLoading ? 'Входим…' : 'Войти'}</span>
            </button>
          </form>

          {/* Under form: Create account link */}
          <div className="pt-2 text-center">
            <p className="text-[14px] text-slate-500 dark:text-slate-400">
              Впервые здесь?{' '}
              <Link
                href="/register"
                className="font-medium text-[#DC2626] hover:underline transition-colors duration-150"
              >
                Создать аккаунт
              </Link>
            </p>
          </div>
        </div>

        {/* Footer: Quiet copyright info */}
        <div className="w-full max-w-[420px] mx-auto pt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          © 2026 AI Business OS
        </div>
      </main>
    </div>
  );
}
