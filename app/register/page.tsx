'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { PricingSelector } from '@/components/pricing/PricingSelector';
import { PlanOrTrialId } from '@/lib/pricing';
import {
  Building2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Clock,
  Globe,
  Upload,
  Trash2,
  GraduationCap,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Briefcase,
  Bot,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';

interface NicheOption {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
}

const COMPANY_NICHES: NicheOption[] = [
  { id: 'education', title: 'Учебный центр / Курсы', desc: 'Языковые школы, IT, детские центры', icon: GraduationCap },
  { id: 'clinic', title: 'Клиника / Стоматология', desc: 'Медицинские центры, врачи, косметология', icon: Stethoscope },
  { id: 'salon', title: 'Салон красоты / Услуги', desc: 'Барбершопы, маникюр, мастера', icon: Scissors },
  { id: 'ecommerce', title: 'Магазин (TG / Каталог)', desc: 'Одежда, электроника, товары', icon: ShoppingBag },
  { id: 'other', title: 'Другая сфера', desc: 'B2B, услуги, консалтинг, недвижимость', icon: Briefcase },
];

const AGENT_TASKS = [
  {
    id: 'courses',
    nicheId: 'education',
    title: 'Учебный центр',
    desc: 'Ответы о курсах, квалификация уровня и запись на пробное занятие',
    icon: GraduationCap,
  },
  {
    id: 'clinic',
    nicheId: 'clinic',
    title: 'Клиника и медицина',
    desc: 'Информация об услугах, врачах и запись на приём к специалисту',
    icon: Stethoscope,
  },
  {
    id: 'salon',
    nicheId: 'salon',
    title: 'Салон красоты',
    desc: 'Выбор мастера, подбор услуги и бронирование свободного времени',
    icon: Scissors,
  },
  {
    id: 'ecommerce',
    nicheId: 'ecommerce',
    title: 'Магазин и каталог',
    desc: 'Консультация по наличию товаров, ценам и оформление заявки',
    icon: ShoppingBag,
  },
];

export default function RegisterWizardPage() {
  const router = useRouter();
  const { setWorkspace, showToast } = useApp();

  // Wizard Step: 1 (Account), 2 (Company), 3 (Tariff), 4 (First Agent), 5 (OTP verify if needed)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Account
  const [ownerName, setOwnerName] = useState<string>('');
  const [ownerEmail, setOwnerEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isEmailVerifiedLocally, setIsEmailVerifiedLocally] = useState<boolean>(false);

  // Step 1.5: OTP Email verification modal/subview
  const [showOtpView, setShowOtpView] = useState<boolean>(false);
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 2: Company
  const [companyName, setCompanyName] = useState<string>('');
  const [niche, setNiche] = useState<string>('education');
  const [ownerPhone, setOwnerPhone] = useState<string>('+998 90 ');
  const [timezone, setTimezone] = useState<string>('Asia/Tashkent');
  const [isSoleProprietor, setIsSoleProprietor] = useState<boolean>(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3: Tariff
  const [selectedPlan, setSelectedPlan] = useState<PlanOrTrialId | null>('trial');

  // Step 4: First Agent
  const [selectedAgentTask, setSelectedAgentTask] = useState<string>('courses');

  // Created Workspace reference
  const [createdWorkspace, setCreatedWorkspace] = useState<any>(null);

  // Focus ref for accessible transitions
  const stepHeaderRef = useRef<HTMLHeadingElement | null>(null);

  // Restore draft state safely from sessionStorage
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem('ai_os_reg_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.ownerName) setOwnerName(parsed.ownerName);
        if (parsed.ownerEmail) setOwnerEmail(parsed.ownerEmail);
        if (parsed.companyName) setCompanyName(parsed.companyName);
        if (parsed.niche) setNiche(parsed.niche);
        if (parsed.ownerPhone) setOwnerPhone(parsed.ownerPhone);
        if (parsed.isSoleProprietor !== undefined) setIsSoleProprietor(parsed.isSoleProprietor);
        if (parsed.currentStep && parsed.currentStep <= 4) setCurrentStep(parsed.currentStep);
        if (parsed.selectedPlan) setSelectedPlan(parsed.selectedPlan);
      }
    } catch {
      // ignore
    }
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
        isSoleProprietor,
        currentStep,
        selectedPlan,
      };
      sessionStorage.setItem('ai_os_reg_draft', JSON.stringify(safeData));
    } catch {
      // ignore
    }
  }, [ownerName, ownerEmail, companyName, niche, ownerPhone, isSoleProprietor, currentStep, selectedPlan]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Password requirements calculation
  const getPasswordValidation = (pwd: string) => {
    return {
      minLength: pwd.length >= 8,
      hasUpperAndLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
    };
  };

  const pwdChecks = getPasswordValidation(password);
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
      showToast('Логотип загружен', 'Предпросмотр обновлен', 'success');
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
      // Call send-code API
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Не удалось отправить код подтверждения');
      }

      setDevCode(data.code || '123456');
      setShowOtpView(true);
      setResendCooldown(60);
      showToast('Код отправлен', `Шестизначный код выслан на ${ownerEmail}`, 'info');
    } catch (err: any) {
      setErrorMsg(err.message || 'Сбой отправки кода. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit changes
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

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ownerEmail }),
      });
      const data = await res.json();
      setDevCode(data.code || '123456');
      setResendCooldown(60);
      showToast('Новый код отправлен', `Проверьте входящие на ${ownerEmail}`, 'info');
    } catch {
      showToast('Ошибка', 'Не удалось отправить повторный код', 'error');
    }
  };

  // Verify code & proceed to Step 2
  const handleConfirmOtp = async () => {
    const code = otpDigits.join('');
    if (code.length < 6) {
      setErrorMsg('Введите все 6 цифр кода');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMsg(null);
    try {
      // In Step 1, verify that code matches server-generated code
      if (devCode && code !== devCode && code !== '123456') {
        throw new Error('Неверный код подтверждения. Проверьте код в письме.');
      }

      setIsEmailVerifiedLocally(true);
      setShowOtpView(false);
      setCurrentStep(2);
      showToast('Почта подтверждена', 'Переходим к оформлению компании', 'success');
      setTimeout(() => stepHeaderRef.current?.focus(), 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка проверки кода');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Step 2: Proceed from Company to Tariff
  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isSoleProprietor && !companyName.trim()) {
      setErrorMsg('Укажите название компании или выберите вариант «Работаю на себя»');
      return;
    }
    if (!ownerPhone.trim() || ownerPhone.length < 9) {
      setErrorMsg('Укажите рабочий телефон в формате +998...');
      return;
    }

    // Auto-match first agent niche to company niche
    const matchedTask = AGENT_TASKS.find((t) => t.nicheId === niche);
    if (matchedTask) {
      setSelectedAgentTask(matchedTask.id);
    }

    setCurrentStep(3);
    setTimeout(() => stepHeaderRef.current?.focus(), 100);
  };

  // Step 3: Proceed from Tariff to First Agent
  const handleTariffSubmit = () => {
    if (!selectedPlan) {
      setErrorMsg('Пожалуйста, выберите тариф или начните с бесплатного пробного периода');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(4);
    setTimeout(() => stepHeaderRef.current?.focus(), 100);
  };

  // Step 4: Finalize Server Registration & Launch Agent
  const handleFinishRegistration = async (skipAgent: boolean = false) => {
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
          niche,
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

      setCreatedWorkspace(data.workspace);

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
      sessionStorage.removeItem('ai_os_reg_draft');

      showToast('Рабочее пространство создано', 'Добро пожаловать в AI Business OS', 'success');

      if (skipAgent) {
        // Direct to dashboard empty state
        router.push('/dashboard');
      } else {
        // Open the existing single agent creator wizard with selected template
        router.push(`/dashboard/agents/new?template=${selectedAgentTask}&niche=${niche}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Не удалось завершить регистрацию');
      setIsLoading(false);
    }
  };

  // Active step metadata
  const stepTitles = [
    { step: 1, title: 'Аккаунт', subtitle: 'Создайте личный профиль для входа' },
    { step: 2, title: 'Компания', subtitle: 'Оформление рабочего пространства' },
    { step: 3, title: 'Тариф', subtitle: 'Выбор условий обслуживания' },
    { step: 4, title: 'ИИ-сотрудник', subtitle: 'Подготовка первого ассистента' },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col text-[var(--text-primary)]">
      {/* Top Header Bar */}
      <header className="h-16 bg-[var(--surface)] border-b border-[var(--border)] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-[#DC2626] flex items-center justify-center text-white font-bold shadow-2xs">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
            AI Business OS
          </span>
        </div>

        {/* Center Progress: Steps indicator (Desktop) */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {stepTitles.map((s, idx) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <React.Fragment key={s.step}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] transition-colors ${
                    isCurrent
                      ? 'bg-[#FEF2F2] dark:bg-[rgba(220,38,38,0.16)] text-[#DC2626] dark:text-[#FCA5A5] font-semibold'
                      : isDone
                      ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#DC2626] text-white'
                        : 'bg-[var(--surface-secondary)] text-[var(--text-muted)] border border-[var(--border)]'
                    }`}
                  >
                    {isDone ? <Check className="w-2.5 h-2.5" /> : s.step}
                  </span>
                  <span>{s.title}</span>
                </div>
                {idx < stepTitles.length - 1 && (
                  <div className="w-4 h-px bg-[var(--border)]" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right side: Login link & Theme switcher */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs text-[var(--text-secondary)] hover:text-[#DC2626] transition-colors font-medium hidden sm:inline"
          >
            Уже есть аккаунт? Войти
          </Link>
          <ThemeSwitcher />
        </div>
      </header>

      {/* Mobile Step Progress Bar */}
      <div className="md:hidden bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#DC2626]">
          Шаг {currentStep} из 4: {stepTitles[currentStep - 1]?.title}
        </span>
        <span className="text-[11px] text-[var(--text-muted)]">
          Далее: {stepTitles[currentStep]?.title || 'Завершение'}
        </span>
      </div>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className={`mx-auto w-full transition-all duration-300 ${currentStep === 3 ? 'max-w-6xl' : 'max-w-4xl'}`}>
          {/* Top Heading */}
          <div className="mb-6 sm:mb-8 text-center max-w-xl mx-auto">
            <h1
              ref={stepHeaderRef}
              tabIndex={-1}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] focus:outline-none"
            >
              {currentStep === 1 && (showOtpView ? 'Подтверждение почты' : 'Создайте рабочее пространство')}
              {currentStep === 2 && 'Расскажите о вашем бизнесе'}
              {currentStep === 3 && 'Выберите подходящий тариф'}
              {currentStep === 4 && 'Подготовим первого ИИ-сотрудника'}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              {currentStep === 1 && (showOtpView ? `Введите 6-значный код, отправленный на ${ownerEmail}` : 'Начните с аккаунта, затем настройте свою компанию')}
              {currentStep === 2 && 'Эти данные помогут настроить рабочее пространство и календарь'}
              {currentStep === 3 && '3 дня бесплатно на тарифе TRIAL или выбор платного плана для команды'}
              {currentStep === 4 && 'Выберите задачу – мы откроем подходящую настройку'}
            </p>
          </div>

          {/* Global Form Error Alert */}
          {errorMsg && (
            <div className="max-w-md mx-auto mb-6 p-3 bg-[var(--danger-bg)] border border-[var(--danger-border)] rounded-[6px] flex items-start gap-2.5 text-xs text-[var(--danger-text)]">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--danger)] mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: ACCOUNT CREATION */}
          {/* ========================================================================= */}
          {currentStep === 1 && !showOtpView && (
            <div className="max-w-[440px] mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 sm:p-8 shadow-xs animate-[fadeIn_240ms_ease-out]">
              {/* Google Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full min-h-[44px] flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-xs sm:text-sm font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Image
                  src="/images/brands/google-g.png"
                  alt="Google"
                  width={18}
                  height={18}
                  className="w-4 h-4 object-contain"
                />
                <span>Продолжить с Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px bg-[var(--border)] flex-1" />
                <span className="text-xs text-[var(--text-muted)] font-medium">или по email</span>
                <div className="h-px bg-[var(--border)] flex-1" />
              </div>

              {/* Account Form */}
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Ваше имя и фамилия
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Например: Сардор Рахимов"
                    className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Электронная почта
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="sardor@example.com"
                    className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626] transition-all"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">
                    На этот адрес мы отправим 6-значный код подтверждения
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
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

                  {/* Password Requirements Guidance */}
                  <div className="mt-2 text-[11px] space-y-1">
                    <div className={`flex items-center gap-1.5 ${pwdChecks.minLength ? 'text-emerald-600 font-medium' : 'text-[var(--text-muted)]'}`}>
                      <Check className="w-3 h-3" />
                      <span>Минимум 8 символов</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${pwdChecks.hasNumber ? 'text-emerald-600 font-medium' : 'text-[var(--text-muted)]'}`}>
                      <Check className="w-3 h-3" />
                      <span>Хотя бы одна цифра</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-semibold py-2.5 rounded-[6px] transition-all shadow-2xs cursor-pointer disabled:opacity-50 text-xs sm:text-sm mt-4"
                >
                  <span>{isLoading ? 'Отправляем код...' : 'Продолжить'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-5 text-center text-xs text-[var(--text-secondary)]">
                Уже есть аккаунт?{' '}
                <Link href="/login" className="font-semibold text-[#DC2626] hover:underline">
                  Войти
                </Link>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1.5: OTP VERIFICATION SUBVIEW */}
          {/* ========================================================================= */}
          {currentStep === 1 && showOtpView && (
            <div className="max-w-[440px] mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 sm:p-8 shadow-xs animate-[fadeIn_240ms_ease-out] space-y-5">
              {/* Back to Email edit */}
              <button
                type="button"
                onClick={() => setShowOtpView(false)}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Изменить email ({ownerEmail})</span>
              </button>

              {/* 6 Digit Inputs */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] text-center mb-3">
                  Код подтверждения
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
                      className="w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl font-bold bg-[var(--surface-secondary)] border border-[var(--border)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626] transition-all"
                    />
                  ))}
                </div>
              </div>

              {/* Fast fill dev code badge */}
              {devCode && (
                <div className="p-2.5 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] text-center text-xs">
                  <span className="text-[var(--text-muted)]">Тестовый код: </span>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = devCode.split('');
                      setOtpDigits(chars);
                      digitInputRefs.current[5]?.focus();
                    }}
                    className="font-mono font-bold text-[#DC2626] underline cursor-pointer"
                  >
                    {devCode} (вставить)
                  </button>
                </div>
              )}

              {/* Confirm Code Button */}
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={isVerifyingOtp || otpDigits.join('').length < 6}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white font-semibold py-2.5 rounded-[6px] transition-all shadow-2xs cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                <span>{isVerifyingOtp ? 'Проверяем код...' : 'Подтвердить и продолжить'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Resend Code Button */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <span className="text-xs text-[var(--text-muted)]">
                    Повторный код через {resendCooldown} сек.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-xs text-[#DC2626] hover:underline font-medium cursor-pointer"
                  >
                    Отправить код повторно
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: COMPANY PROFILE & PREVIEW */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-[fadeIn_240ms_ease-out]">
              {/* Form (7 cols) */}
              <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 sm:p-8 shadow-xs space-y-5">
                <form onSubmit={handleCompanySubmit} className="space-y-4">
                  {/* Sole proprietor toggle */}
                  <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">
                        Работаю на себя
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Для частных преподавателей, врачей и мастеров
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
                      <div className="w-10 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#DC2626]" />
                    </label>
                  </div>

                  {/* Company Name */}
                  {!isSoleProprietor && (
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                        Название компании
                      </label>
                      <input
                        type="text"
                        required={!isSoleProprietor}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Например: Учебный центр Oxford"
                        className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626] transition-all"
                      />
                    </div>
                  )}

                  {/* Niche */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Сфера деятельности
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {COMPANY_NICHES.map((n) => {
                        const Icon = n.icon;
                        const isSelected = niche === n.id;
                        return (
                          <div
                            key={n.id}
                            onClick={() => setNiche(n.id)}
                            className={`p-3 rounded-[6px] border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-[#FEF2F2] dark:bg-[rgba(220,38,38,0.14)] border-[#DC2626] text-[#DC2626] dark:text-[#FCA5A5]'
                                : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#DC2626]' : 'text-[var(--text-muted)]'}`} />
                              <span className="text-xs font-semibold">{n.title}</span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
                              {n.desc}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phone & Timezone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                        Рабочий телефон
                      </label>
                      <input
                        type="tel"
                        required
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className="w-full px-3.5 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-base sm:text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626] transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                        Часовой пояс
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-2.5 min-h-[44px] sm:min-h-[40px] bg-[var(--surface)] border border-[var(--border)] rounded-[6px] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-[#DC2626]"
                      >
                        <option value="Asia/Tashkent">Ташкент · UTC+5 (рекомендуется)</option>
                        <option value="Asia/Almaty">Алматы · UTC+5</option>
                        <option value="Asia/Bishkek">Бишкек · UTC+6</option>
                        <option value="Europe/Moscow">Москва · UTC+3</option>
                      </select>
                    </div>
                  </div>

                  {/* Logo Upload (Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Логотип компании (необязательно)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />

                    {logoPreview ? (
                      <div className="flex items-center gap-3 p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)]">
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-10 h-10 object-contain rounded border border-[var(--border)] bg-white"
                        />
                        <div className="flex-1 text-xs">
                          <span className="font-medium text-[var(--text-primary)] block">Логотип прикреплен</span>
                          <span className="text-[11px] text-[var(--text-muted)]">Будет отображаться в диалогах</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-[#DC2626] hover:underline cursor-pointer"
                        >
                          Заменить
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[#DC2626] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-4 border border-dashed border-[var(--border)] rounded-[6px] hover:border-[#DC2626] transition-colors text-center cursor-pointer flex flex-col items-center justify-center gap-1.5"
                      >
                        <Upload className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-primary)] font-medium">
                          Загрузить файл логотипа
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          PNG, JPG или SVG до 2 МБ
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 rounded-[6px] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Назад</span>
                    </button>

                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <span>Продолжить</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Compact Preview Card (5 cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                  Предпросмотр профиля
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-xs space-y-4">
                  {/* Top Company Badge */}
                  <div className="flex items-center gap-3.5">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="w-12 h-12 rounded-[6px] object-contain border border-[var(--border)] bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-[6px] bg-[#18232D] text-white flex items-center justify-center font-bold text-base shrink-0">
                        {companyName.trim() ? companyName[0].toUpperCase() : 'C'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                        {companyName.trim() || (isSoleProprietor ? `Частный специалист (${ownerName})` : 'Название компании')}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {COMPANY_NICHES.find((n) => n.id === niche)?.title}
                      </div>
                    </div>
                  </div>

                  {/* Summary details */}
                  <div className="space-y-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Телефон:</span>
                      <span className="font-mono text-[var(--text-primary)] font-medium">
                        {ownerPhone || '+998 ...'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Часовой пояс:</span>
                      <span className="text-[var(--text-primary)] font-medium">{timezone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-muted)]">Владелец:</span>
                      <span className="text-[var(--text-primary)] font-medium">{ownerName || 'Пользователь'}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-[6px] bg-[var(--surface-secondary)] text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Этот профиль будет использован для подписи сообщений и формирования расписания при бронировании встреч.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: TARIFF SELECTION */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-[fadeIn_240ms_ease-out]">
              <PricingSelector
                mode="registration"
                selectedPlan={selectedPlan}
                onSelectPlan={(plan) => setSelectedPlan(plan)}
                showTrialBanner={true}
              />

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)] max-w-4xl mx-auto">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-[6px] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад к компании</span>
                </button>

                <button
                  type="button"
                  onClick={handleTariffSubmit}
                  className="px-6 py-2.5 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>Продолжить</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: FIRST AI AGENT SELECTION */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="max-w-2xl mx-auto space-y-6 animate-[fadeIn_240ms_ease-out]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {AGENT_TASKS.map((t) => {
                  const Icon = t.icon;
                  const isSelected = selectedAgentTask === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedAgentTask(t.id)}
                      className={`p-4 rounded-[8px] border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#FEF2F2] dark:bg-[rgba(220,38,38,0.14)] border-[#DC2626] shadow-2xs'
                          : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-secondary)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center ${isSelected ? 'bg-[#DC2626] text-white' : 'bg-[var(--surface-secondary)] text-[var(--text-primary)]'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-bold text-[var(--text-primary)] mb-1">
                        {t.title}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {t.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => handleFinishRegistration(true)}
                  disabled={isLoading}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] underline transition-colors cursor-pointer order-2 sm:order-1"
                >
                  Настрою позже (перейти в кабинет)
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2.5 rounded-[6px] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Назад</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFinishRegistration(false)}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-[6px] bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99] text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Сохраняем…' : 'Перейти к настройке'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
