'use client';

import React, { useState } from 'react';
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

  // Demo playback state
  const [demoKey, setDemoKey] = useState(0);

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
      {/* 1. LEFT PRESENTATION PANEL (~52% on desktop, hidden < 1024px) */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#15191F] text-slate-100 flex-col justify-between p-8 xl:p-14 relative overflow-y-auto">
        <div className="w-full max-w-[580px] mx-auto flex-1 flex flex-col justify-between my-auto py-6">
          {/* Logo header: clean brand icon + AI Business OS without extra subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-white tracking-tight">
              AI Business OS
            </span>
          </div>

          {/* Core Content Block */}
          <div className="my-auto py-8 space-y-7">
            {/* Title & Subtitle */}
            <div className="space-y-3">
              <h1 className="text-[38px] xl:text-[46px] font-semibold text-white leading-[1.12] tracking-tight">
                От первого сообщения<br />до записи клиента.
              </h1>
              <p className="text-[16px] text-slate-400 leading-[1.6] max-w-[500px]">
                ИИ-сотрудник отвечает на вопросы и помогает выбрать время. Вы управляете диалогами и записями в одном месте.
              </p>
            </div>

            {/* Single Solid Demo Interface (<= 540px) */}
            <div
              key={demoKey}
              className="w-full max-w-[540px] rounded-[8px] bg-white/[0.03] border border-white/10 p-5 sm:p-6 shadow-md backdrop-blur-xs transition-all duration-300"
            >
              {/* Header row: "Пример диалога" + Telegram logo */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
                    Пример диалога
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <div className="w-4 h-4 relative shrink-0">
                    <Image
                      src="/images/brands/telegram.svg"
                      alt="Telegram"
                      width={16}
                      height={16}
                      className="w-4 h-4"
                    />
                  </div>
                  <span className="text-slate-300 font-medium text-[13px]">Telegram</span>
                </div>
              </div>

              {/* Inside messages container */}
              <div className="space-y-3">
                {/* 1. Client message bubble (neutral) */}
                <div className="flex justify-start animate-fade-in" style={{ animationDuration: '240ms' }}>
                  <div className="max-w-[85%] rounded-[8px] bg-white/[0.07] px-3.5 py-2.5 text-slate-200 text-[14px] sm:text-[15px] leading-snug">
                    <span className="block text-[11px] font-medium text-slate-400 mb-0.5">Клиент</span>
                    Есть пробный урок в субботу?
                  </div>
                </div>

                {/* 2. Employee AI reply bubble (slightly highlighted) */}
                <div
                  className="flex justify-end animate-fade-in"
                  style={{ animationDuration: '240ms', animationDelay: '140ms', animationFillMode: 'both' }}
                >
                  <div className="max-w-[88%] rounded-[8px] bg-[#DC2626]/15 border border-[#DC2626]/25 px-3.5 py-2.5 text-slate-100 text-[14px] sm:text-[15px] leading-snug">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-rose-300 font-medium mb-0.5">
                      <span>ИИ-сотрудник</span>
                      <span className="text-[10px] text-rose-300/80 font-mono">10:14</span>
                    </div>
                    Да, есть время в 14:30. Записать вас?
                  </div>
                </div>

                {/* 3. Client confirmation bubble */}
                <div
                  className="flex justify-start animate-fade-in"
                  style={{ animationDuration: '240ms', animationDelay: '280ms', animationFillMode: 'both' }}
                >
                  <div className="max-w-[85%] rounded-[8px] bg-white/[0.07] px-3.5 py-2.5 text-slate-200 text-[14px] sm:text-[15px] leading-snug">
                    <span className="block text-[11px] font-medium text-slate-400 mb-0.5">Клиент</span>
                    Да, спасибо
                  </div>
                </div>

                {/* 4. Result card with original Google Calendar icon */}
                <div
                  className="mt-3.5 pt-1 animate-fade-in"
                  style={{ animationDuration: '240ms', animationDelay: '420ms', animationFillMode: 'both' }}
                >
                  <div className="rounded-[6px] bg-white/[0.05] border border-white/10 p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-[4px] bg-white/10 flex items-center justify-center p-1 shrink-0">
                        <Image
                          src="/images/brands/google-calendar.png"
                          alt="Google Calendar"
                          width={20}
                          height={20}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-medium text-slate-200 truncate">
                          Пробный урок · Суббота, 14:30
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Google Календарь · Создано автоматически
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded shrink-0">
                      Записан
                    </span>
                  </div>
                </div>
              </div>

              {/* Explicit disclaimer & replay button */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
                <span className="text-[12px] text-slate-400">
                  Демонстрация — запись не создаётся
                </span>
                <button
                  type="button"
                  onClick={() => setDemoKey((k) => k + 1)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Повторить анимацию диалога"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Повторить</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom subtle note */}
          <div className="text-xs text-slate-400">
            AI Business OS
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. RIGHT LOGIN FORM PANEL (~48% on desktop)                    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 lg:w-[48%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto">
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

        {/* Center Form Container (400-440px wide, no heavy box card) */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-4 space-y-6 animate-fade-in" style={{ animationDuration: '240ms' }}>
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-[28px] sm:text-[32px] font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
              Рады видеть вас снова
            </h2>
            <p className="text-[15px] sm:text-[16px] text-slate-500 dark:text-slate-400">
              Войдите в своё рабочее пространство
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 rounded-[6px] flex items-start gap-2.5 text-xs text-red-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Google Continue Button (Height 48px, thin neutral border, authentic logo) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full h-[48px] flex items-center justify-center gap-3 px-4 rounded-[6px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-[15px] font-medium text-slate-800 dark:text-slate-200 transition-colors duration-150 cursor-pointer shadow-2xs disabled:opacity-50"
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
            <span>{isGoogleLoading ? 'Переход в Google...' : 'Продолжить с Google'}</span>
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
          <form onSubmit={handleLogin} className="space-y-4">
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
                className="w-full h-[48px] sm:h-[50px] px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] transition-all duration-150"
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
                  className="text-[13px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
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
                  className="w-full h-[48px] sm:h-[50px] pl-3.5 pr-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626] transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button (Height 48px, radius 6px, #DC2626 hover #B91C1C) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-[48px] mt-2 flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white font-medium text-[15px] rounded-[6px] transition-colors duration-150 shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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
                className="font-medium text-[#DC2626] hover:underline transition-colors"
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
      </div>
    </div>
  );
}
