'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { TRIAL_PLAN, PLANS, PLANS_LIST, PlanOrTrialId } from '@/lib/pricing';
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Clock,
  Upload,
  Trash2,
  GraduationCap,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const STEP_DATA = [
  { step: 1, name: 'Аккаунт', title: 'Создайте аккаунт', subtitle: 'Затем настроим пространство вашей компании' },
  { step: 2, name: 'Компания', title: 'Настроим вашу компанию', subtitle: 'Эти данные можно будет изменить позже' },
  { step: 3, name: 'Тариф', title: 'Выберите подходящий тариф', subtitle: 'Начните с 3 дней бесплатно или выберите тариф для команды' },
  { step: 4, name: 'ИИ-сотрудник', title: 'Настроим первого ИИ-сотрудника', subtitle: 'Мы подготовили подходящий сценарий под вашу нишу' },
];

const NICHE_OPTIONS = [
  { id: 'education', label: 'Учебный центр', defaultAgentTask: 'courses' },
  { id: 'clinic', label: 'Клиника', defaultAgentTask: 'clinic' },
  { id: 'salon', label: 'Салон красоты', defaultAgentTask: 'salon' },
  { id: 'ecommerce', label: 'Магазин', defaultAgentTask: 'ecommerce' },
  { id: 'other', label: 'Другая сфера', defaultAgentTask: 'other' },
];

export default function RegisterWizardPage() {
  const router = useRouter();
  const { setWorkspace, showToast } = useApp();

  // Wizard Step: 1 (Account), 2 (Company), 3 (Tariff), 4 (First Agent)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Accessible heading focus ref
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // Step 1: Account
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isEmailVerifiedLocally, setIsEmailVerifiedLocally] = useState<boolean>(false);

  // Step 1 sub-stage: OTP Verification
  const [showOtpView, setShowOtpView] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 2: Company
  const [companyName, setCompanyName] = useState<string>('');
  const [niche, setNiche] = useState<string>(''); // Default empty for "Выберите сферу бизнеса"
  const [ownerPhone, setOwnerPhone] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('Asia/Tashkent');
  const [isSoleProprietor, setIsSoleProprietor] = useState<boolean>(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3: Tariff
  const [selectedPlan, setSelectedPlan] = useState<PlanOrTrialId>('trial');
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

  // Step 4: First Agent
  const [selectedAgentTask, setSelectedAgentTask] = useState<string>('courses');
  const [isSubmittingFinal, setIsSubmittingFinal] = useState<boolean>(false);

  // Focus heading on step transitions
  const transitionToStep = (newStep: number) => {
    setCurrentStep(newStep);
    setErrorMsg(null);
    setTimeout(() => {
      headingRef.current?.focus();
    }, 120);
  };

  // Restore draft state safely from sessionStorage
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem('ai_os_reg_draft_v2');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.ownerName) setOwnerName(parsed.ownerName);
        if (parsed.ownerEmail) setOwnerEmail(parsed.ownerEmail);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.niche) setNiche(parsed.niche);
        if (parsed.ownerPhone) setOwnerPhone(parsed.ownerPhone);
        if (parsed.isSoleProprietor !== undefined) setIsSoleProprietor(parsed.isSoleProprietor);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.selectedPlan) setSelectedPlan(parsed.selectedPlan);
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 4) {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch {}
  }, []);

  // Save draft state safely (never password or OTP)
  useEffect(() => {
    try {
      const safeData = {
        ownerName,
        ownerEmail,
        companyName,
        niche,
        ownerPhone,
        timezone,
        isSoleProprietor,
        currentStep,
        selectedPlan,
      };
      sessionStorage.setItem('ai_os_reg_draft_v2', JSON.stringify(safeData));
    } catch {}
  }, [ownerName, ownerEmail, companyName, niche, ownerPhone, timezone, isSoleProprietor, currentStep, selectedPlan]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Password requirements calculation
  const pwdChecks = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
  };
  const isPasswordValid = pwdChecks.minLength && pwdChecks.hasNumber;

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Файл слишком большой', 'Максимальный размер логотипа — 2 МБ', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
      showToast('Логотип загружен', 'Файл успешно прикреплен', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Google OAuth click
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/sign-in/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          callbackURL: '/register?step=2',
        }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data?.message || 'Не удалось сформировать ссылку авторизации');
    } catch (err: any) {
      setErrorMsg('Google OAuth временно настраивается. Заполните имя и email для быстрой регистрации.');
      setIsLoading(false);
    }
  };

  // Step 1: Submit Account & Send verification code
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!ownerName.trim()) {
      setErrorMsg('Укажите ваше имя');
      return;
    }
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) {
      setErrorMsg('Укажите корректный адрес электронной почты');
      return;
    }
    if (!isPasswordValid) {
      setErrorMsg('Пароль должен содержать минимум 8 символов и хотя бы одну цифру');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Не удалось отправить проверочный код');
      }

      setShowOtpView(true);
      setDevCode(data.devCode || data.code || null);
      setResendCooldown(60);
      showToast('Код отправлен', `Проверьте входящие сообщения на ${ownerEmail}`, 'info');
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Сбой при отправке кода на почту');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP Digit Input
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = clean.slice(-1);
    setOtpDigits(newDigits);

    if (clean && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirmOtp = async () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setErrorMsg('Введите все 6 цифр проверочного кода');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: ownerEmail,
          code: fullCode,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Неверный или устаревший проверочный код');
      }

      setIsEmailVerifiedLocally(true);
      setShowOtpView(false);
      showToast('Email подтвержден', 'Переходим к оформлению компании', 'success');
      transitionToStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка проверки кода');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setDevCode(data.devCode || null);
        setResendCooldown(60);
        showToast('Код повторно отправлен', 'Проверьте почту', 'info');
      }
    } catch {
      setErrorMsg('Не удалось повторно отправить код');
    }
  };

  // Step 2: Submit Company
  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isSoleProprietor && !companyName.trim()) {
      setErrorMsg('Укажите название компании или включите «Работаю на себя»');
      return;
    }
    if (!niche) {
      setErrorMsg('Пожалуйста, выберите сферу деятельности');
      return;
    }
    if (!ownerPhone.trim() || ownerPhone.trim() === '+998') {
      setErrorMsg('Укажите контактный номер телефона');
      return;
    }

    // Auto-match default agent task from selected niche
    const matchedNiche = NICHE_OPTIONS.find((n) => n.id === niche);
    if (matchedNiche) {
      setSelectedAgentTask(matchedNiche.defaultAgentTask);
    }

    transitionToStep(3);
  };

  // Step 3: Proceed from Tariff to Step 4
  const handleTariffSubmit = () => {
    transitionToStep(4);
  };

  // Step 4: Finalize Server Registration & Launch Agent
  const handleFinishRegistration = async (skipAgent: boolean = false) => {
    if (isSubmittingFinal) return; // Prevent double submission
    setIsSubmittingFinal(true);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const finalName = isSoleProprietor
        ? `Частный специалист (${ownerName})`
        : companyName.trim() || 'Моя компания';

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: finalName,
          niche: niche || 'education',
          ownerPhone,
          plan: selectedPlan || 'trial',
          ownerName,
          ownerEmail,
          password,
          timezone,
          isSoleProprietor,
          selectedAgentNiche: selectedAgentTask,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Ошибка при сохранении организации');
      }

      // Verify email on server side if code was entered
      if (isEmailVerifiedLocally) {
        await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: ownerEmail,
            code: devCode || '123456',
            workspaceId: data.workspace.id,
          }),
        });
      }

      // Update client context
      setWorkspace({
        id: data.workspace.id,
        companyName: data.workspace.companyName,
        ownerName: data.workspace.ownerName,
        ownerEmail: data.workspace.ownerEmail,
        plan: data.workspace.plan,
        tokenBalance: data.workspace.tokenBalance || 100,
        emailVerified: true,
      });

      // Clear draft
      sessionStorage.removeItem('ai_os_reg_draft_v2');

      showToast('Рабочее пространство создано', 'Добро пожаловать в AI Business OS', 'success');

      if (skipAgent) {
        router.push('/dashboard');
      } else {
        router.push(`/dashboard/agents/new?template=${selectedAgentTask}&niche=${niche}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Не удалось завершить регистрацию');
      setIsLoading(false);
      setIsSubmittingFinal(false);
    }
  };

  const currentStepMeta = STEP_DATA[currentStep - 1] || STEP_DATA[0];

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-center p-4 sm:p-6 md:p-8 text-slate-900 dark:text-slate-100">
      {/* ========================================================================= */}
      {/* SINGLE UNIFIED REGISTRATION CARD (max-width: 640px, NO upper header)     */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[640px] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-slate-800 rounded-[8px] p-6 sm:p-10 shadow-sm transition-all duration-200">
        {/* Top Header inside Card: Compact Logo + Theme Switcher */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight text-slate-900 dark:text-white">
              AI Business OS
            </span>
          </div>
          <ThemeSwitcher />
        </div>

        {/* Step Counter & 4 Short Progress Segments */}
        <div className="pt-5 pb-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              Шаг {currentStep} из 4 · <strong className="text-slate-900 dark:text-white">{currentStepMeta.name}</strong>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {Math.round((currentStep / 4) * 100)}%
            </span>
          </div>

          {/* 4 segments */}
          <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-colors duration-200 ${
                  currentStep >= s
                    ? 'bg-[#DC2626]'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Title & Subtitle inside Card */}
        <div className="pt-1 pb-6 space-y-1">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-[28px] sm:text-[32px] font-semibold text-slate-900 dark:text-white tracking-tight leading-tight outline-none"
          >
            {showOtpView && currentStep === 1 ? 'Подтверждение почты' : currentStepMeta.title}
          </h1>
          <p className="text-[15px] sm:text-[16px] text-slate-500 dark:text-slate-400">
            {showOtpView && currentStep === 1
              ? `Введите 6-значный код, отправленный на ${ownerEmail}`
              : currentStepMeta.subtitle}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div role="alert" className="mb-5 p-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 rounded-[6px] flex items-start gap-2.5 text-xs text-red-700 dark:text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626] mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: ACCOUNT (Initial form & OTP sub-stage)                           */}
        {/* ========================================================================= */}
        {currentStep === 1 && !showOtpView && (
          <div className="space-y-5 animate-fade-in" style={{ animationDuration: '200ms' }}>
            {/* Google Continue Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full h-[48px] flex items-center justify-center gap-3 px-4 rounded-[6px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-[15px] font-medium text-slate-800 dark:text-slate-200 transition-colors duration-150 cursor-pointer shadow-2xs disabled:opacity-50"
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
              <span>Продолжить с Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
              <span className="text-[13px] text-slate-400 dark:text-slate-500 font-normal">
                или по электронной почте
              </span>
              <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
            </div>

            {/* Email Registration Form */}
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  Ваше имя
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Например: Сардор Рахимов"
                  className="w-full h-[48px] px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  Электронная почта
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full h-[48px] px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    className="w-full h-[48px] pl-3.5 pr-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-colors duration-150"
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

                {/* Compact Password Requirements */}
                <div className="mt-2 text-[12px] flex items-center gap-4 text-slate-500 dark:text-slate-400">
                  <div className={`flex items-center gap-1 ${pwdChecks.minLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                    <Check className={`w-3.5 h-3.5 ${pwdChecks.minLength ? 'opacity-100' : 'opacity-30'}`} />
                    <span>От 8 символов</span>
                  </div>
                  <div className={`flex items-center gap-1 ${pwdChecks.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                    <Check className={`w-3.5 h-3.5 ${pwdChecks.hasNumber ? 'opacity-100' : 'opacity-30'}`} />
                    <span>Минимум 1 цифра</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-[48px] mt-2 flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-medium text-[15px] rounded-[6px] transition-transform duration-120 shadow-xs cursor-pointer disabled:opacity-60"
              >
                <span>{isLoading ? 'Отправляем код…' : 'Продолжить'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Bottom link: Single instance */}
            <div className="pt-2 text-center">
              <p className="text-[14px] text-slate-500 dark:text-slate-400">
                Уже есть аккаунт?{' '}
                <Link
                  href="/login"
                  className="font-medium text-[#DC2626] hover:underline transition-colors duration-150"
                >
                  Войти
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* STEP 1.5: OTP VERIFICATION SUB-VIEW */}
        {currentStep === 1 && showOtpView && (
          <div className="space-y-5 animate-fade-in" style={{ animationDuration: '200ms' }}>
            <button
              type="button"
              onClick={() => setShowOtpView(false)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Изменить адрес ({ownerEmail})</span>
            </button>

            {/* 6 Digit Inputs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center mb-3">
                Введите 6-значный код
              </label>
              <div className="flex justify-center gap-2 sm:gap-2.5">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      digitInputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-slate-900 dark:text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Fast fill dev code badge if in local mode */}
            {devCode && (
              <div className="p-2.5 rounded-[6px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center text-xs">
                <span className="text-slate-500">Тестовый код: </span>
                <button
                  type="button"
                  onClick={() => {
                    setOtpDigits(devCode.split(''));
                    digitInputRefs.current[5]?.focus();
                  }}
                  className="font-mono font-bold text-[#DC2626] underline cursor-pointer"
                >
                  {devCode} (вставить)
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmOtp}
              disabled={isVerifyingOtp || otpDigits.join('').length < 6}
              className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-medium text-[15px] rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{isVerifyingOtp ? 'Проверяем код…' : 'Подтвердить и продолжить'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs">
              {resendCooldown > 0 ? (
                <span className="text-slate-400">Отправить повторно через {resendCooldown} сек.</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-[#DC2626] hover:underline font-medium cursor-pointer"
                >
                  Отправить код повторно
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: COMPANY (No preview column, single unified layout)               */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <form onSubmit={handleCompanySubmit} className="space-y-4 animate-fade-in" style={{ animationDuration: '200ms' }}>
            {/* 1. Company Name */}
            {!isSoleProprietor && (
              <div>
                <label className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  Название компании
                </label>
                <input
                  type="text"
                  required={!isSoleProprietor}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Например: Учебный центр Oxford"
                  className="w-full h-[48px] px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                />
              </div>
            )}

            {/* 2. Compact "Работаю на себя" Toggle */}
            <div className="p-3 rounded-[6px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 block">
                  Работаю на себя
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Для частных специалистов, врачей и мастеров
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSoleProprietor}
                  onChange={(e) => {
                    setIsSoleProprietor(e.target.checked);
                    if (e.target.checked && !companyName) {
                      setCompanyName(`Частный специалист (${ownerName})`);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DC2626]" />
              </label>
            </div>

            {/* 3. Single Accessible Select: Сфера деятельности */}
            <div>
              <label className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                Сфера деятельности
              </label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                required
                className="w-full h-[48px] px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[15px] text-slate-900 dark:text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
              >
                <option value="" disabled>
                  Выберите сферу бизнеса
                </option>
                {NICHE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Phone & Timezone in 2 columns (stacked on mobile) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  Рабочий телефон
                </label>
                <input
                  type="tel"
                  required
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full h-[48px] px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[16px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] font-mono"
                />
              </div>

              <div>
                <label className="block text-[14px] font-medium text-slate-800 dark:text-slate-200 mb-1.5">
                  Часовой пояс
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-[48px] px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] text-[14px] text-slate-900 dark:text-white focus:outline-none focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626]"
                >
                  <option value="Asia/Tashkent">Ташкент · UTC+5</option>
                  <option value="Asia/Almaty">Алматы · UTC+5</option>
                  <option value="Asia/Bishkek">Бишкек · UTC+6</option>
                  <option value="Europe/Moscow">Москва · UTC+3</option>
                </select>
              </div>
            </div>

            {/* 5. Compact Logo Row: "Логотип компании · Необязательно" + "Загрузить" */}
            <div className="pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              {logoPreview ? (
                <div className="flex items-center justify-between p-3 rounded-[6px] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                  <div className="flex items-center gap-3">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-10 h-10 object-contain rounded border border-slate-200 dark:border-slate-700 bg-white p-0.5"
                    />
                    <div>
                      <span className="text-[13px] font-medium text-slate-900 dark:text-white block">
                        Логотип прикреплен
                      </span>
                      <span className="text-[11px] text-slate-400">Файл готов к загрузке</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                    >
                      Заменить
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1 text-slate-400 hover:text-[#DC2626] transition cursor-pointer"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-[6px] border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40">
                  <div>
                    <span className="text-[13px] font-medium text-slate-800 dark:text-slate-200 block">
                      Логотип компании · <span className="text-slate-400 font-normal">Необязательно</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      PNG, JPG или SVG до 2 МБ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-[6px] hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Загрузить</span>
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Buttons: "Назад" & "Продолжить" */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => transitionToStep(1)}
                className="px-4 h-[48px] rounded-[6px] border border-slate-300 dark:border-slate-700 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="submit"
                className="px-6 h-[48px] rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white text-[15px] font-medium transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Продолжить</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: TARIFF (Compact 4-row list with Trial + Plans)                    */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDuration: '200ms' }}>
            <div
              role="radiogroup"
              aria-label="Выберите тарифный план"
              className="space-y-2.5"
            >
              {/* Row 1: TRIAL (3 days, 100 tokens free) */}
              <div
                role="radio"
                aria-checked={selectedPlan === 'trial'}
                tabIndex={0}
                onClick={() => setSelectedPlan('trial')}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') setSelectedPlan('trial');
                }}
                className={`p-3.5 sm:p-4 rounded-[8px] border transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] ${
                  selectedPlan === 'trial'
                    ? 'border-[#DC2626] bg-[#FFF5F5] dark:bg-rose-950/25 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        selectedPlan === 'trial'
                          ? 'border-[#DC2626] bg-[#DC2626]'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selectedPlan === 'trial' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                          TRIAL
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                          Бесплатно
                        </span>
                      </div>
                      <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                        3 дня и 100 токенов после подтверждения email · Без привязки карты
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[16px] font-bold text-slate-900 dark:text-white">$0</span>
                    <span className="text-[12px] text-slate-400 block">3 дня</span>
                  </div>
                </div>
              </div>

              {/* Rows 2–4: START, BUSINESS, PRO */}
              {PLANS_LIST.map((plan) => {
                const isSelected = selectedPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setSelectedPlan(plan.id)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') setSelectedPlan(plan.id);
                    }}
                    className={`p-3.5 sm:p-4 rounded-[8px] border transition-all duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] ${
                      isSelected
                        ? 'border-[#DC2626] bg-[#FFF5F5] dark:bg-rose-950/25 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#DC2626] bg-[#DC2626]'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                              {plan.name}
                            </span>
                            {plan.badge && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-[#DC2626] dark:bg-rose-950/40 dark:text-rose-300">
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {plan.tokensFormatted} · До {plan.maxAgents} ИИ-сотрудников · {plan.audience}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[16px] font-bold text-slate-900 dark:text-white">
                          {plan.usdPriceFormatted}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          / мес ({plan.uzsPriceFormatted})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compare Plans Link */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => setShowCompareModal(!showCompareModal)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                {showCompareModal ? 'Скрыть сравнение' : 'Сравнить тарифы подробно'}
              </button>
            </div>

            {/* Collapsible Comparison Summary */}
            {showCompareModal && (
              <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-3 animate-fade-in">
                <div className="font-semibold text-slate-900 dark:text-white">
                  Подробное сравнение лимитов:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                    <span className="font-bold block text-slate-900 dark:text-white">START</span>
                    <span className="text-slate-500 block">2 000 токенов</span>
                    <span className="text-slate-400 block text-[11px]">1 сотрудник, базовый календарь</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                    <span className="font-bold block text-slate-900 dark:text-white">BUSINESS</span>
                    <span className="text-slate-500 block">6 000 токенов</span>
                    <span className="text-slate-400 block text-[11px]">До 3 сотрудников, воронка лидов</span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                    <span className="font-bold block text-slate-900 dark:text-white">PRO</span>
                    <span className="text-slate-500 block">15 000 токенов</span>
                    <span className="text-slate-400 block text-[11px]">До 10 сотрудников, мульти-отделы</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons: "Назад" & "Начать бесплатно" / "Продолжить" */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => transitionToStep(2)}
                className="px-4 h-[48px] rounded-[6px] border border-slate-300 dark:border-slate-700 text-[14px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleTariffSubmit}
                className="px-6 h-[48px] rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white text-[15px] font-medium transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>{selectedPlan === 'trial' ? 'Начать бесплатно' : 'Продолжить'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: FIRST AI AGENT (Proposed scenario based on chosen niche)         */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-fade-in" style={{ animationDuration: '200ms' }}>
            {/* Context Notice with Selected Niche */}
            <div className="p-4 rounded-[8px] bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Предложенный сценарий
                </span>
                <button
                  type="button"
                  onClick={() => transitionToStep(2)}
                  className="text-xs text-[#DC2626] hover:underline cursor-pointer"
                >
                  Изменить нишу компании
                </button>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-[6px] bg-[#DC2626] text-white flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
                    {NICHE_OPTIONS.find((n) => n.id === niche)?.label || 'Учебный центр'}
                  </h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Квалификация входящих обращений, ответы по услугам и запись в Google Календарь
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Action Button: "Перейти к настройке" */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => handleFinishRegistration(false)}
                disabled={isLoading || isSubmittingFinal}
                className="w-full h-[48px] flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-medium text-[15px] rounded-[6px] transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Сохраняем рабочее пространство…' : 'Перейти к настройке'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary Action: "Настроить позже" */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleFinishRegistration(true)}
                  disabled={isLoading || isSubmittingFinal}
                  className="text-[13px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline transition-colors cursor-pointer"
                >
                  Настроить позже (перейти в кабинет)
                </button>
              </div>
            </div>

            {/* Back button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-start">
              <button
                type="button"
                onClick={() => transitionToStep(3)}
                className="px-4 h-[44px] rounded-[6px] border border-slate-300 dark:border-slate-700 text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Назад к тарифу</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
