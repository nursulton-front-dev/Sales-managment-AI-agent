'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  MessageSquare,
  Bot,
  CalendarCheck2,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
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

  // Demo playback animation state
  const [demoKey, setDemoKey] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
        throw new Error(data.error || 'Ошибка входа. Проверьте логин и пароль.');
      }

      if (data.workspace) {
        setWorkspace(data.workspace);
      }

      showToast('Вход выполнен', 'Добро пожаловать в рабочее пространство', 'success');
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка подключения к серверу авторизации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMsg(null);
    try {
      // Trigger Better Auth Google social login
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
      // Fallback: If Google OAuth client not configured in production, inform user cleanly
      setErrorMsg(
        'Авторизация через Google временно настраивается. Войдите по Email или зарегистрируйте рабочее пространство.'
      );
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col lg:flex-row text-[var(--text-primary)]">
      {/* LEFT PANEL: Graphite Brand & Workflow Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#18232D] text-slate-100 flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Subtle decorative grid/glow behind content */}
        <div className="absolute inset-0 bg-[radial-gradient(#223344_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg text-white block leading-none">
              AI Business OS
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Платформа ИИ-ассистентов для продаж
            </span>
          </div>
        </div>

        {/* Value Proposition & 3-Step Demo Animation */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto py-8">
          <div className="space-y-2">
            <h1 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-tight">
              Каждое обращение – следующий шаг к продаже
            </h1>
            <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
              Ответы клиентам, запись и диалоги в одном рабочем пространстве.
            </p>
          </div>

          {/* Demonstration: 3 Sequential Step Cards */}
          <div key={demoKey} className="space-y-3 pt-2">
            {/* Step 1: Client incoming inquiry */}
            <div className="p-3.5 rounded-[8px] bg-white/5 border border-white/10 flex items-start gap-3 transform transition-all duration-300 animate-[fadeIn_260ms_ease-out]">
              <div className="w-7 h-7 rounded-full bg-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-200">Клиент (Telegram)</span>
                  <span className="font-mono text-[10px]">10:14</span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  «Здравствуйте! Есть ли места на курс английского для подростка с субботы?»
                </p>
              </div>
            </div>

            {/* Step 2: AI Agent reply */}
            <div className="p-3.5 rounded-[8px] bg-[#DC2626]/10 border border-[#DC2626]/30 flex items-start gap-3 transform transition-all duration-300 animate-[fadeIn_260ms_ease-out_180ms_both]">
              <div className="w-7 h-7 rounded-full bg-[#DC2626] flex items-center justify-center shrink-0 mt-0.5 text-white">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-rose-300">ИИ-сотрудник</span>
                  <span className="font-mono text-[10px]">10:14 · моментально</span>
                </div>
                <p className="text-xs text-slate-200 leading-snug">
                  «Добрый день! Да, в субботу в 14:30 есть 2 свободных места. Записать вас на бесплатное тестирование уровня?»
                </p>
              </div>
            </div>

            {/* Step 3: Google Calendar Booking */}
            <div className="p-3.5 rounded-[8px] bg-white/5 border border-white/10 flex items-start gap-3 transform transition-all duration-300 animate-[fadeIn_260ms_ease-out_360ms_both]">
              <div className="w-7 h-7 rounded-[6px] bg-slate-700/80 flex items-center justify-center shrink-0 mt-0.5 text-white overflow-hidden p-1">
                <Image
                  src="/images/brands/google-calendar.png"
                  alt="Google Calendar"
                  width={20}
                  height={20}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-200">Google Календарь</span>
                  <span className="text-[10px] text-emerald-400 font-medium">Подтверждено</span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  Слот забронирован: Суббота, 14:30 – 15:15 · Преподаватель уведомлен
                </p>
              </div>
            </div>
          </div>

          {/* Replay action & honest disclaimer */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Пример работы агента · без реальных данных клиентов
            </span>
            <button
              type="button"
              onClick={() => setDemoKey((k) => k + 1)}
              className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Повторить</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4">
          <span>AI Business OS · Корпоративное пространство</span>
          <span>Ташкент · UTC+5</span>
        </div>
      </div>

      {/* RIGHT PANEL: Clean White / Graphite Login Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
        {/* Top bar with Mobile Brand & Theme Switcher */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-6 lg:mb-0">
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm tracking-tight">AI Business OS</span>
          </div>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Center Card */}
        <div className="w-full max-w-[420px] mx-auto my-auto space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              С возвращением
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Войдите в рабочее пространство
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-[6px] flex items-start gap-2.5 text-xs text-[var(--danger-text)]">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--danger)] mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Google Continue Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="w-full min-h-[44px] flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs sm:text-sm font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Image
              src="/images/brands/google-g.png"
              alt="Google"
              width={18}
              height={18}
              className="w-4 h-4 object-contain"
            />
            <span>{isGoogleLoading ? 'Переход в Google...' : 'Продолжить с Google'}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-[var(--border)] flex-1" />
            <span className="text-xs text-[var(--text-muted)] font-medium">или по email</span>
            <div className="h-px bg-[var(--border)] flex-1" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5"
              >
                Электронная почта
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Пароль
                </label>
                <Link
                  href="/dashboard/support"
                  className="text-xs text-[#DC2626] hover:underline"
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
                  placeholder="••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute right-3 top-3 sm:top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-semibold py-2.5 rounded-[6px] transition-all shadow-2xs cursor-pointer disabled:opacity-50 text-xs sm:text-sm mt-2"
            >
              <span>{isLoading ? 'Входим...' : 'Войти'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch to Registration */}
          <div className="pt-2 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              Нет аккаунта?{' '}
              <Link
                href="/register"
                className="font-semibold text-[#DC2626] hover:underline transition-colors"
              >
                Создать аккаунт
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom security assurance */}
        <div className="w-full max-w-[420px] mx-auto pt-6 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Изолированное рабочее пространство организации</span>
        </div>
      </div>
    </div>
  );
}
