'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { Building2, ArrowRight, ShieldCheck, Mail, Lock, AlertCircle, PlayCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginDemo } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    // If Supabase is configured with real credentials
    if (isSupabaseConfigured) {
      try {
        const supabase = createClient();
        if (supabase) {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            setErrorMsg(error.message);
            setIsLoading(false);
            return;
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Ошибка подключения к серверу авторизации';
        setErrorMsg(message);
        setIsLoading(false);
        return;
      }
    }

    // Default or Fallback to demo mode
    loginDemo(email, 'Моя Компания');
    router.push('/dashboard');
  };

  const handleQuickDemo = () => {
    loginDemo('demo@company.com', 'Моя Компания');
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4 text-[var(--text-primary)]">
      {/* Top Bar with Brand & Theme Switcher */}
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[6px] bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)] font-bold shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-[var(--text-primary)] tracking-tight text-lg block leading-none">
              AI Business OS
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              Платформа ИИ-агентов продаж
            </span>
          </div>
        </div>

        <ThemeSwitcher compact={false} />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[8px] shadow-xs p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Вход в систему</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Введите учетные данные для доступа к кабинету
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-[6px] flex items-center gap-2.5 text-xs text-[var(--danger-text)]">
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--danger)]" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
              Электронная почта
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Пароль
              </label>
              <span className="text-xs text-[var(--accent)] hover:underline cursor-pointer">
                Забыли пароль?
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold py-2.5 rounded-[6px] transition-all shadow-xs cursor-pointer disabled:opacity-50 mt-2 text-xs sm:text-sm"
          >
            <span>{isLoading ? 'Вход...' : 'Войти в панель управления'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-[var(--border)] flex-1"></div>
          <span className="text-xs text-[var(--text-muted)] uppercase font-medium">или</span>
          <div className="h-px bg-[var(--border)] flex-1"></div>
        </div>

        {/* Demo Login Option */}
        <button
          onClick={handleQuickDemo}
          type="button"
          className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[var(--surface-secondary)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-primary)] font-medium py-2.5 rounded-[6px] transition-all text-xs cursor-pointer"
        >
          <PlayCircle className="w-4 h-4 text-[var(--accent)]" />
          <span>Быстрый вход в демонстрационном режиме</span>
        </button>

        <div className="mt-6 pt-5 border-t border-[var(--border)] text-center">
          <p className="text-xs text-[var(--text-secondary)]">
            Нет аккаунта?{' '}
            <Link
              href="/register"
              className="font-semibold text-[var(--accent)] hover:underline transition-colors"
            >
              Зарегистрироваться (+100 токенов)
            </Link>
          </p>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-[var(--text-muted)] flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-[var(--success)]" />
        <span>Защищенное подключение платформы</span>
      </div>
    </div>
  );
}
