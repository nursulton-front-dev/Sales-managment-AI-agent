'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { BrandLogo } from '@/components/ui/BrandLogo';
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
  // Sequential Controlled Demo Animation:
  // 0–250ms: demo window appears
  // 600ms: client message 1 appears
  // 1100ms: employee typing indicator appears
  // 1800ms: indicator replaced with employee response
  // 2700ms: client confirmation appears
  // 3500ms: booking card appears (opacity + translateY 6px за 220ms)
  // Up to 4200ms: green checkmark appears and "Запись" step active
  // --------------------------------------------------------------------------
  const [demoStage, setDemoStage] = useState<number>(6); // Default 6 for initial render/SSR
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearDemoTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const startDemoSequence = () => {
    clearDemoTimers();

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
      {/* ------------------------------------------------------------- */}
      {/* 1. LEFT PRESENTATION PANEL (~53% on desktop, hidden < 1024px)  */}
      {/* ------------------------------------------------------------- */}
      <section
        aria-label="Демонстрация Chorla AI"
        className="hidden lg:flex lg:w-[53%] bg-[#15191F] text-slate-100 flex-col justify-between p-8 xl:p-14 relative overflow-y-auto"
      >
        <div className="w-full max-w-[560px] mx-auto flex-1 flex flex-col justify-between my-auto py-6">
          {/* Logo header: Chorla AI brand logo for dark presentation background */}
          <BrandLogo variant="full" width={180} theme="dark" href="/" ariaLabel="Chorla AI" />

          {/* Central content block */}
          <div className="my-auto py-7 space-y-6">
            {/* Title & Subtitle */}
            <div className="space-y-2.5">
              <h1 className="text-[36px] xl:text-[46px] font-semibold text-white leading-[1.12] tracking-tight">
                Ваш следующий клиент<br />уже написал.
              </h1>
              <p className="text-[15px] sm:text-[16px] text-[#AAB3C0] leading-[1.5]">
                От первого сообщения до записи – в одном месте
              </p>
            </div>

            {/* Static description for screen readers */}
            <div className="sr-only">
              Демонстрация работы диалога: клиент в Telegram интересуется пробным уроком в субботу.
              ИИ-сотрудник предлагает время в 14:30. После подтверждения клиента автоматически формируется запись
              в Google Календаре.
            </div>

            {/* MAIN DEMO CONTAINER */}
            <div
              aria-hidden="true"
              className="space-y-3 transition-opacity duration-250"
            >
              {/* 3.1 CHAT WINDOW: surface #20262E, border #343D48 1px, radius 8px */}
              <div
                style={{ backgroundColor: '#20262E', borderColor: '#343D48' }}
                className="rounded-[8px] border overflow-hidden"
              >
                {/* Header with border #303842 */}
                <div
                  style={{ backgroundColor: '#20262E', borderColor: '#303842' }}
                  className="px-4 py-3 border-b flex items-center justify-between"
                >
                  <span className="text-[13px] font-semibold text-[#F3F4F6]">
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
                    <span className="text-[12px] font-medium text-[#AAB3C0]">
                      Курсы английского
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-slate-300">
                      ДЕМО
                    </span>
                  </div>
                </div>

                {/* Messages Body (fixed min-height to reserve space and prevent shifts) */}
                <div className="p-4 sm:p-5 space-y-3 min-h-[195px] flex flex-col justify-start">
                  {/* 1. Client message: bg #2A313B, no border */}
                  <div
                    className={`flex justify-start transition-all duration-200 ${
                      demoStage >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: '#2A313B' }}
                      className="max-w-[85%] rounded-[6px] px-3.5 py-2.5 text-[#F3F4F6] text-[14px] leading-snug"
                    >
                      <span className="block text-[12px] font-medium text-[#AAB3C0] mb-0.5">
                        Клиент
                      </span>
                      Есть пробный урок в субботу?
                    </div>
                  </div>

                  {/* 2. Employee typing indicator or reply */}
                  {demoStage === 2 && (
                    <div className="flex justify-end transition-opacity duration-150">
                      <div
                        style={{ backgroundColor: '#48272D' }}
                        className="rounded-[6px] px-3.5 py-2 flex items-center gap-1.5 text-xs text-rose-200"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse [animation-delay:300ms]" />
                        <span className="text-[11px] ml-1 text-rose-200/80">печатает ответ…</span>
                      </div>
                    </div>
                  )}

                  {demoStage >= 3 && (
                    <div
                      className={`flex justify-end transition-all duration-200 ${
                        demoStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5'
                      }`}
                    >
                      {/* Employee message: bg #48272D, no border */}
                      <div
                        style={{ backgroundColor: '#48272D' }}
                        className="max-w-[88%] rounded-[6px] px-3.5 py-2.5 text-[#F3F4F6] text-[14px] leading-snug"
                      >
                        <div className="flex items-center justify-between gap-3 text-[12px] text-rose-300 font-medium mb-0.5">
                          <span>ИИ-сотрудник</span>
                          <span className="text-[11px] text-rose-300/70 font-mono">10:14</span>
                        </div>
                        Да, в 14:30. Записать вас?
                      </div>
                    </div>
                  )}

                  {/* 3. Client confirmation: bg #2A313B, no border */}
                  <div
                    className={`flex justify-start transition-all duration-200 ${
                      demoStage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: '#2A313B' }}
                      className="max-w-[85%] rounded-[6px] px-3.5 py-2.5 text-[#F3F4F6] text-[14px] leading-snug"
                    >
                      <span className="block text-[12px] font-medium text-[#AAB3C0] mb-0.5">
                        Клиент
                      </span>
                      Да, спасибо.
                    </div>
                  </div>
                </div>
              </div>

              {/* 3.2 SEPARATE BOOKING CARD (gap 12px, bg #252D38, border #343D48 1px, radius 8px, padding 16px) */}
              <div
                style={{ backgroundColor: '#252D38', borderColor: '#343D48' }}
                className={`rounded-[8px] border p-4 transition-all duration-220 ${
                  demoStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-[14px] min-w-0">
                    {/* Google Calendar Logo Container: 48x48px, light neutral background, radius 8px */}
                    <div
                      style={{ backgroundColor: '#FFFFFF' }}
                      className="w-[48px] h-[48px] rounded-[8px] flex items-center justify-center shrink-0 shadow-2xs overflow-hidden"
                    >
                      <Image
                        src="/brands/google-calendar.webp"
                        alt="Google Calendar"
                        width={40}
                        height={40}
                        className="w-[40px] h-[40px] object-contain shrink-0"
                        priority
                      />
                    </div>

                    {/* Information column:
                        - Google Calendar: secondary text 12-13px
                        - Пробный урок: primary text 16px font-semibold
                        - Время: secondary text 14px
                    */}
                    <div className="min-w-0">
                      <div className="text-[12px] sm:text-[13px] font-medium text-[#AAB3C0] leading-none mb-1">
                        Google Calendar
                      </div>
                      <div className="text-[16px] font-semibold text-[#F3F4F6] leading-tight truncate mb-0.5">
                        Пробный урок
                      </div>
                      <div className="text-[14px] text-[#AAB3C0] leading-normal">
                        Суббота · 14:30–15:15
                      </div>
                    </div>
                  </div>

                  {/* Status indicator: Small green checkmark + text, NO heavy box border, NO button styling */}
                  <div
                    className={`flex items-center gap-1.5 pt-0.5 text-emerald-400 text-[13px] font-medium transition-opacity duration-200 shrink-0 ${
                      demoStage >= 6 ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[2.5] text-emerald-400" />
                    <span>Запись создана</span>
                  </div>
                </div>
              </div>

              {/* 3.3 COMPACT STAGES: «Обращение» → «Ответ» → «Запись» */}
              {/* Completed stages: neutral (#AAB3C0 / white), current stage: red #DC2626 */}
              <div className="pt-1 flex items-center justify-center gap-2 text-xs">
                {/* Stage 1: Обращение */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    demoStage === 1 || demoStage === 2
                      ? 'text-white font-medium'
                      : demoStage >= 3
                      ? 'text-[#AAB3C0]'
                      : 'text-slate-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      demoStage === 1 || demoStage === 2
                        ? 'bg-[#DC2626]'
                        : demoStage >= 3
                        ? 'bg-slate-400'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span>Обращение</span>
                </div>

                <span className="text-slate-600">→</span>

                {/* Stage 2: Ответ */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    demoStage === 3 || demoStage === 4
                      ? 'text-white font-medium'
                      : demoStage >= 5
                      ? 'text-[#AAB3C0]'
                      : 'text-slate-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      demoStage === 3 || demoStage === 4
                        ? 'bg-[#DC2626]'
                        : demoStage >= 5
                        ? 'bg-slate-400'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span>Ответ</span>
                </div>

                <span className="text-slate-600">→</span>

                {/* Stage 3: Запись */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    demoStage >= 5
                      ? 'text-white font-medium'
                      : 'text-slate-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      demoStage >= 5
                        ? 'bg-[#DC2626]'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span>Запись</span>
                </div>
              </div>

              {/* 3.4 FOOTER: Disclaimer & Replay */}
              <div className="pt-2 flex items-center justify-between text-xs text-[#AAB3C0]">
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
          </div>

          {/* Reserved bottom area for aesthetic balance without repeated title */}
          <div className="h-4" />
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. RIGHT LOGIN FORM PANEL (~47% on desktop)                    */}
      {/* ------------------------------------------------------------- */}
      <main
        aria-label="Авторизация в рабочем пространстве"
        className="flex-1 lg:w-[47%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto"
      >
        {/* Top bar with Mobile Brand & Theme Switcher */}
        <div className="w-full max-w-[420px] mx-auto flex items-center justify-between mb-6 lg:mb-0">
          <div className="lg:hidden">
            <BrandLogo variant="full" width={140} href="/" ariaLabel="Chorla AI" />
          </div>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Center Form Container (max-width: 420px) */}
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

          {/* Google Continue Button (Height 48px, thin neutral border, authentic multi-color logo) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full h-[48px] flex items-center justify-center gap-3 px-4 rounded-[6px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-700/60 text-[15px] font-medium text-slate-800 dark:text-slate-200 transition-colors duration-150 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <div className="w-[18px] h-[18px] relative shrink-0">
              <Image
                src="/images/brands/google-g.svg"
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
                className="w-full h-[50px] px-3.5 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors duration-150"
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
                  className="w-full h-[50px] pl-3.5 pr-11 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors duration-150"
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
          © 2026 Chorla AI
        </div>
      </main>
    </div>
  );
}
