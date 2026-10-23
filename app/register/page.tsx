'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { PricingSelector } from '@/components/pricing/PricingSelector';
import { PlanOrTrialId } from '@/lib/pricing';
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  GraduationCap,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Briefcase,
  Users,
  Check,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  RotateCcw,
  Info,
} from 'lucide-react';

interface NicheOption {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}

const NICHES: NicheOption[] = [
  { id: 'education', title: 'Учебный центр / Курсы', desc: 'Языковые школы, IT, детские центры', icon: GraduationCap },
  { id: 'clinic', title: 'Клиника / Стоматология', desc: 'Медицинские центры, врачи, косметология', icon: Stethoscope },
  { id: 'salon', title: 'Салон красоты / Услуги', desc: 'Барбершопы, маникюр, мастера', icon: Scissors },
  { id: 'ecommerce', title: 'Магазин (TG / Каталог)', desc: 'Одежда, электроника, товары', icon: ShoppingBag },
  { id: 'other', title: 'Другое направление', desc: 'B2B, недвижимость, консалтинг', icon: Briefcase },
];

const TEAM_SIZES = [
  { id: '1', title: 'Только я (1)' },
  { id: '2-5', title: '2–5 человек' },
  { id: '6-15', title: '6–15 человек' },
  { id: '15+', title: '15+ колл-центр' },
];

const LEADS_VOLUMES = [
  { id: '<20', title: 'До 20 в день', subtitle: 'Начальный поток клиентов' },
  { id: '20-100', title: '20–100 в день', subtitle: 'Оптимально для авто-воронки' },
  { id: '100+', title: '100+ в день', subtitle: 'Высокая нагрузка, нужен ИИ' },
];

export default function RegisterWizardPage() {
  const router = useRouter();
  const { setWorkspace, showToast } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  // Step 1
  const [companyName, setCompanyName] = useState<string>('');
  const [niche, setNiche] = useState<string>('education');
  const [ownerPhone, setOwnerPhone] = useState<string>('');

  // Step 2
  const [teamSize, setTeamSize] = useState<string>('2-5');
  const [dailyLeadsVolume, setDailyLeadsVolume] = useState<string>('20-100');

  // Step 3: Plan selection (starts null until explicit user choice)
  const [selectedPlan, setSelectedPlan] = useState<PlanOrTrialId | null>(null);

  // Step 4
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (!pwd) return { score: 0, label: 'Пусто', color: 'bg-slate-200 dark:bg-slate-700', textClass: 'text-slate-400' };
    if (score <= 1) return { score: 1, label: 'Слабый', color: 'bg-red-500', textClass: 'text-red-500' };
    if (score === 2) return { score: 2, label: 'Средний', color: 'bg-amber-500', textClass: 'text-amber-500' };
    if (score === 3) return { score: 3, label: 'Хороший', color: 'bg-blue-500', textClass: 'text-blue-500' };
    return { score: 4, label: 'Надежный', color: 'bg-emerald-500', textClass: 'text-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  // Step 5 (Email OTP Verification)
  const [createdWorkspace, setCreatedWorkspace] = useState<any>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleNextStep = () => {
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!companyName.trim()) {
        setErrorMsg('Пожалуйста, укажите название вашей организации');
        return;
      }
      if (!ownerPhone.trim()) {
        setErrorMsg('Пожалуйста, укажите телефон руководителя');
        return;
      }
    }
    if (currentStep === 3) {
      if (!selectedPlan) {
        setErrorMsg('Пожалуйста, выберите тарифный план или бесплатный пробный период');
        return;
      }
    }
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!ownerName.trim() || !ownerEmail.trim() || !password.trim()) {
      setErrorMsg('Заполните все поля учетной записи');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Пароль должен содержать минимум 8 символов');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMsg('Введенные пароли не совпадают. Пожалуйста, проверьте подтверждение пароля.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          niche,
          ownerPhone,
          teamSize,
          dailyLeadsVolume,
          plan: selectedPlan || 'trial',
          ownerName,
          ownerEmail,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при создании организации');
      }

      setCreatedWorkspace(data.workspace);
      setDevCode(data.verificationCode || '123456');

      // Move to Step 5: Verification Code Input
      setCurrentStep(5);
    } catch (err: any) {
      setErrorMsg(err.message || 'Произошла непредвиденная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Digits input handler
  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || '';
        }
        setOtpDigits(newDigits);
        const nextIdx = Math.min(5, pasted.length);
        digitInputRefs.current[nextIdx]?.focus();
      }
      return;
    }

    const digit = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const fillDevCode = () => {
    if (!devCode) return;
    const chars = devCode.split('');
    const newDigits = ['', '', '', '', '', ''];
    chars.slice(0, 6).forEach((c, idx) => {
      newDigits[idx] = c;
    });
    setOtpDigits(newDigits);
    digitInputRefs.current[5]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) return;

    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          code,
          workspaceId: createdWorkspace?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Неверный код подтверждения');
      }

      showToast(
        'Email успешно подтвержден!',
        `Начислен стартовый бонус: ${data.bonusTokens || 100} токенов`,
        'success'
      );

      if (createdWorkspace) {
        setWorkspace({
          ...createdWorkspace,
          emailVerified: true,
          tokenBalance: data.newBalance || 100,
        });
      }

      router.push('/dashboard');
    } catch (err: any) {
      showToast('Ошибка верификации', err.message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmLater = () => {
    if (createdWorkspace) {
      setWorkspace({
        ...createdWorkspace,
        emailVerified: false,
        tokenBalance: 0,
      });
    }
    showToast(
      'Организация создана',
      'Вы можете подтвердить Email в любое время в шапке дашборда.',
      'info'
    );
    router.push('/dashboard');
  };

  const handleResendCode = async () => {
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          workspaceId: createdWorkspace?.id,
        }),
      });
      const data = await res.json();
      if (data.code) {
        setDevCode(data.code);
        showToast('Код отправлен повторно', `Тестовый код: ${data.code}`, 'info');
      }
    } catch {
      showToast('Ошибка', 'Не удалось отправить код повторно', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4 py-8 text-[var(--text-primary)]">
      {/* Top Header with Brand & Theme Switcher */}
      <div className={`w-full ${currentStep === 3 ? 'max-w-5xl' : 'max-w-2xl'} flex items-center justify-between mb-6 transition-all duration-200`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[6px] bg-[var(--accent)] flex items-center justify-center text-[var(--accent-text)] font-bold shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-[var(--text-primary)] tracking-tight text-lg block leading-none">
              AI Business OS
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              Регистрация компании и подключение ИИ-продаж
            </span>
          </div>
        </div>

        {/* Theme Switcher available in header */}
        <ThemeSwitcher compact={false} />
      </div>

      {/* Main Wizard Card */}
      <div
        className={`w-full ${
          currentStep === 3 ? 'max-w-5xl' : 'max-w-2xl'
        } bg-[var(--surface)] border border-[var(--border)] rounded-[8px] shadow-xs overflow-hidden transition-all duration-200`}
      >
        {/* Step Indicator Header: Exactly 4 Steps */}
        <div className="bg-[var(--surface-secondary)] border-b border-[var(--border)] px-5 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-soft-text)] bg-[var(--accent-soft)] border border-[var(--border)] px-2.5 py-0.5 rounded-[4px]">
              {currentStep <= 4 ? `Шаг ${currentStep} из 4` : 'Подтверждение Email'}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {currentStep === 1 && 'О вашей компании'}
              {currentStep === 2 && 'Отдел продаж и нагрузка'}
              {currentStep === 3 && 'Тариф'}
              {currentStep === 4 && 'Аккаунт владельца'}
              {currentStep === 5 && 'Активация пробного периода'}
            </span>
          </div>

          {/* Strictly 4 Dots Indicator */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentStep === step
                    ? 'w-6 bg-[var(--accent)]'
                    : currentStep > step
                    ? 'w-2 bg-[var(--success)]'
                    : 'w-2 bg-[var(--border-strong)]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-7 md:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-[6px] flex items-center gap-2.5 text-xs text-[var(--danger-text)]">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--danger)]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= STEP 1: О КОМПАНИИ ================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Расскажите о вашей компании
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  На основе этих данных ИИ настроит базовый сценарий общения и квалификации
                </p>
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Название компании или проекта <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Например: Учебный центр Cambridge"
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all font-medium"
                  />
                </div>
              </div>

              {/* Owner Phone */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Контактный телефон руководителя <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
                  <input
                    type="tel"
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all font-mono"
                  />
                </div>
              </div>

              {/* Niche Selection Cards */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Сфера деятельности (ниша)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {NICHES.map((item) => {
                    const Icon = item.icon;
                    const isSelected = niche === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setNiche(item.id)}
                        className={`p-3.5 rounded-[6px] border transition-all cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]'
                            : 'border-[var(--border)] hover:bg-[var(--surface-secondary)] bg-[var(--surface)]'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                              : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border border-[var(--border)]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[var(--text-primary)]">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                            {item.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: ОТДЕЛ ПРОДАЖ ================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Отдел продаж и входящий поток
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Это поможет оптимизировать лимиты и сценарии перехвата диалогов оператором
                </p>
              </div>

              {/* Team Size */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Сколько сотрудников обрабатывают заявки сейчас?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {TEAM_SIZES.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setTeamSize(item.id)}
                      className={`p-3 rounded-[6px] border text-center transition-all cursor-pointer font-medium text-xs ${
                        teamSize === item.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-soft-text)] font-bold'
                          : 'border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)]'
                      }`}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>

              {/* Leads Volume */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Примерный поток входящих заявок в день
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {LEADS_VOLUMES.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setDailyLeadsVolume(item.id)}
                      className={`p-3.5 rounded-[6px] border transition-all cursor-pointer ${
                        dailyLeadsVolume === item.id
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]'
                          : 'border-[var(--border)] hover:bg-[var(--surface-secondary)] bg-[var(--surface)]'
                      }`}
                    >
                      <div className="font-bold text-xs text-[var(--text-primary)]">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: ТАРИФ (ГЛАВНЫЙ ЭКРАН РЕШЕНИЯ) ================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-soft-text)]">
                  Шаг 3 из 4 · Тариф
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">
                  Выберите план для вашего бизнеса
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                  Можно начать бесплатно. Оплата не требуется на этом шаге.
                </p>
              </div>

              {/* Reusable PricingSelector Component */}
              <PricingSelector
                mode="registration"
                selectedPlan={selectedPlan}
                onSelectPlan={(p) => setSelectedPlan(p)}
                onContinue={() => setCurrentStep(4)}
                onSelectTrial={() => {
                  setSelectedPlan('trial');
                  setCurrentStep(4);
                }}
              />
            </div>
          )}

          {/* ================= STEP 4: АККАУНТ ВЛАДЕЛЬЦА ================= */}
          {currentStep === 4 && (
            <form onSubmit={handleCompleteRegistration} className="space-y-5 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Аккаунт владельца организации
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Учетная запись для управления ИИ-агентами, лидами и настройками
                </p>
              </div>

              {/* Chosen Plan Recap Pill */}
              <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  Организация: <strong className="text-[var(--text-primary)]">{companyName}</strong>
                </span>
                <span className="font-bold text-[var(--accent-soft-text)] bg-[var(--accent-soft)] border border-[var(--border)] px-2.5 py-0.5 rounded-[4px] uppercase text-[11px]">
                  Тариф: {selectedPlan?.toUpperCase() || 'TRIAL'}
                </span>
              </div>

              {/* Owner Name */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Ваше имя и фамилия <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Ваше имя и фамилия"
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all font-medium"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Электронная почта (логин) <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all font-medium"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[var(--text-primary)]">
                    Пароль для входа <span className="text-[var(--danger)]">*</span>
                  </label>
                  {password && (
                    <span className={`text-[11px] font-bold ${strength.textClass}`}>
                      Сложность: {strength.label}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    className="w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all font-medium"
                  />
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="mt-2 space-y-1.5 bg-[var(--surface-secondary)] border border-[var(--border)] p-2.5 rounded-[6px]">
                    <div className="grid grid-cols-4 gap-1.5 h-1.5">
                      <div className={`rounded-full transition-colors ${strength.score >= 1 ? strength.color : 'bg-[var(--border)]'}`} />
                      <div className={`rounded-full transition-colors ${strength.score >= 2 ? strength.color : 'bg-[var(--border)]'}`} />
                      <div className={`rounded-full transition-colors ${strength.score >= 3 ? strength.color : 'bg-[var(--border)]'}`} />
                      <div className={`rounded-full transition-colors ${strength.score >= 4 ? strength.color : 'bg-[var(--border)]'}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Password Confirmation */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  Подтверждение пароля <span className="text-[var(--danger)]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3.5 sm:top-3" />
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Повторите введенный пароль"
                    className={`w-full pl-10 pr-4 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition-all font-medium ${
                      passwordConfirm && password !== passwordConfirm
                        ? 'border-[var(--danger)] focus:border-[var(--danger)]'
                        : 'border-[var(--border)] focus:border-[var(--accent)]'
                    }`}
                  />
                </div>
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-[11px] text-[var(--danger-text)] mt-1 font-medium">
                    Пароли не совпадают
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold py-2.5 rounded-[6px] transition-all cursor-pointer disabled:opacity-50 text-xs sm:text-sm shadow-xs mt-2"
              >
                <span>{isLoading ? 'Создание организации...' : 'Завершить регистрацию'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* ================= STEP 5: ПОДТВЕРЖДЕНИЕ EMAIL ================= */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200 text-center">
              <div className="w-12 h-12 bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--accent)] rounded-[8px] flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Подтвердите ваш Email
                </h2>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto mt-1 leading-relaxed">
                  Мы отправили проверочный код на адрес{' '}
                  <strong className="text-[var(--text-primary)]">{ownerEmail}</strong>. Введите его для активации
                  пробного периода и 100 стартовых токенов.
                </p>
              </div>

              {/* Dev mode helper badge */}
              {devCode && (
                <div className="p-3 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] flex items-center justify-between gap-3 text-left">
                  <div>
                    <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Код подтверждения (Тестовый режим)
                    </div>
                    <div className="text-xl font-bold font-mono text-[var(--text-primary)] tracking-widest mt-0.5">
                      {devCode}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fillDevCode}
                    className="px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] rounded-[6px] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Вставить код
                  </button>
                </div>
              )}

              {/* 6 OTP Cells */}
              <div className="flex items-center justify-center gap-2 my-4">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      digitInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-10 sm:w-12 h-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[var(--accent)] transition-all"
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="space-y-3 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isVerifying || otpDigits.join('').length < 6}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold py-2.5 rounded-[6px] transition-all cursor-pointer disabled:opacity-40 text-xs sm:text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isVerifying ? 'Проверка кода...' : 'Активировать пробный период'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmLater}
                  className="w-full min-h-[40px] px-4 bg-[var(--surface-secondary)] hover:bg-[var(--border)] text-[var(--text-secondary)] font-medium text-xs rounded-[6px] transition-colors cursor-pointer border border-[var(--border)]"
                >
                  Подтвердить позже и перейти в дашборд
                </button>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-xs text-[var(--accent)] hover:underline flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Отправить код повторно</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons (for steps 1-2) */}
          {currentStep < 3 && (
            <div className="mt-8 pt-5 border-t border-[var(--border)] flex items-center justify-between">
              <button
                type="button"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] border border-[var(--border)] rounded-[6px] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="inline-flex items-center gap-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] px-5 py-2 min-h-[40px] rounded-[6px] text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <span>Продолжить</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Step 3 Back Link */}
          {currentStep === 3 && (
            <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] border border-[var(--border)] rounded-[6px] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад к отделу продаж</span>
              </button>
            </div>
          )}

          {/* Step 4 Back Link */}
          {currentStep === 4 && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Вернуться к выбору тарифа</span>
              </button>
            </div>
          )}
        </div>

        {/* Card Footer: Accurate confirmation promise */}
        <div className="bg-[var(--surface-secondary)] border-t border-[var(--border)] px-5 sm:px-6 py-3.5 flex items-center justify-between text-xs text-[var(--text-secondary)] flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[var(--success)] shrink-0" />
            <span>Подтвердите почту, чтобы активировать пробный период</span>
          </div>

          <div>
            Уже есть аккаунт?{' '}
            <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">
              Войти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
