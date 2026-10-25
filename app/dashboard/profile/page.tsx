'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useTheme } from 'next-themes';
import {
  User,
  Mail,
  ShieldCheck,
  Building2,
  Clock,
  Globe,
  ArrowRight,
  Lock,
  Laptop,
  LogOut,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const { user, showToast, logout } = useApp();
  const { theme, setTheme } = useTheme();

  // Personal data
  const [firstName, setFirstName] = useState(user?.name ? user.name.split(' ')[0] : 'Нурсултон');
  const [lastName, setLastName] = useState(user?.name && user.name.split(' ').length > 1 ? user.name.split(' ')[1] : 'Махрамов');
  const [email, setEmail] = useState(user?.email || 'n•••@gmail.com');
  const [phone, setPhone] = useState('+998 90 123 45 67');
  const [isSaving, setIsSaving] = useState(false);

  // Appearance
  const [language, setLanguage] = useState('Русский');
  const [timezone, setTimezone] = useState('Asia/Tashkent');

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      showToast('Изменения сохранены', 'Личные данные успешно обновлены', 'success');
    } catch (err: any) {
      showToast('Ошибка', err.message || 'Сбой сохранения', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Ошибка', 'Введите текущий пароль', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Ошибка', 'Новый пароль должен быть не менее 8 символов', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Ошибка', 'Пароли не совпадают', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      showToast('Пароль обновлен', 'Новый пароль успешно установлен', 'success');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('Ошибка', err.message || 'Сбой обновления пароля', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Header */}
      <div className="pb-3 border-b border-[var(--border)]">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] leading-tight">
          Мой профиль
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Личные данные, оформление и безопасность аккаунта.
        </p>
      </div>

      {/* Top 2 Cards: Личные данные & Оформление */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card 1: Личные данные (6-7 cols) */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 shadow-2xs space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Личные данные
          </h2>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center font-bold text-2xl text-[var(--text-primary)]">
              {firstName.charAt(0).toUpperCase() || 'N'}
            </div>
            <button
              type="button"
              onClick={() => showToast('Загрузка фото', 'Выберите файл изображения до 5 МБ', 'info')}
              className="inline-flex items-center px-3.5 py-1.5 border border-[var(--border)] rounded-[6px] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              Загрузить фото
            </button>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Имя
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--text-primary)]">
                  Фамилия
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Электронная почта
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  value={email}
                  disabled
                  className="flex-1 h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-secondary)] text-xs font-medium"
                />
                <span className="inline-flex items-center px-2.5 py-2 rounded-[6px] text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                  Подтверждён
                </span>
                <button
                  type="button"
                  onClick={() => showToast('Смена email', 'Функция изменения email доступна через запрос в поддержку', 'info')}
                  className="text-xs text-[var(--accent)] hover:underline font-semibold shrink-0"
                >
                  Изменить почту
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                Номер телефона
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] text-xs font-semibold px-6 py-2.5 rounded-[6px] transition-colors cursor-pointer shadow-2xs"
              >
                {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Оформление (5 cols) */}
        <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 shadow-2xs space-y-5">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Оформление
          </h2>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Тема интерфейса
            </label>

            {/* 3 Theme Cards according to 10-profile.png */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Светлая */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`p-2.5 rounded-[8px] border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between min-h-[90px] ${
                  theme === 'light'
                    ? 'border-[var(--accent)] bg-red-50/20 shadow-2xs'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                {theme === 'light' && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-full h-10 bg-slate-100 rounded border border-slate-200 mt-1" />
                <span className="text-xs font-semibold text-[var(--text-primary)] mt-2">
                  Светлая
                </span>
              </button>

              {/* Тёмная */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`p-2.5 rounded-[8px] border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between min-h-[90px] ${
                  theme === 'dark'
                    ? 'border-[var(--accent)] bg-red-50/20 shadow-2xs'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                {theme === 'dark' && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-full h-10 bg-slate-900 rounded border border-slate-800 mt-1" />
                <span className="text-xs font-semibold text-[var(--text-primary)] mt-2">
                  Тёмная
                </span>
              </button>

              {/* Как в системе */}
              <button
                type="button"
                onClick={() => setTheme('system')}
                className={`p-2.5 rounded-[8px] border text-center transition-all cursor-pointer relative flex flex-col items-center justify-between min-h-[90px] ${
                  theme === 'system'
                    ? 'border-[var(--accent)] bg-red-50/20 shadow-2xs'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                {theme === 'system' && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
                <div className="w-full h-10 bg-gradient-to-r from-slate-100 to-slate-900 rounded border border-slate-300 mt-1" />
                <span className="text-xs font-semibold text-[var(--text-primary)] mt-2">
                  Как в системе
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Язык интерфейса
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="Русский">Русский</option>
              <option value="O'zbekcha">O&apos;zbekcha</option>
              <option value="English">English</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-primary)]">
              Часовой пояс
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-10 px-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="Asia/Tashkent">Asia/Tashkent (UTC+5)</option>
              <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
              <option value="Asia/Almaty">Asia/Almaty (UTC+5)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom 2 Cards: Безопасность & Аккаунт */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card 3: Безопасность (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Безопасность
          </h2>

          <div className="divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {/* Пароль */}
            <div className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    Пароль
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Измените пароль для защиты аккаунта.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer shrink-0"
              >
                Изменить пароль
              </button>
            </div>

            {/* Активные сеансы */}
            <div className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Laptop className="w-4 h-4 text-[var(--text-muted)] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    Активные сеансы
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Управляйте активными сеансами входа.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSessionsModalOpen(true)}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-[var(--accent)] border border-[var(--accent)] rounded-[6px] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer shrink-0"
              >
                Посмотреть
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Аккаунт (5 cols) */}
        <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-[8px] p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Аккаунт
          </h2>

          <div className="border-t border-[var(--border)] pt-2">
            <button
              type="button"
              onClick={logout}
              className="w-full py-3 flex items-center justify-between text-left text-red-600 hover:text-red-700 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold">Выйти из аккаунта</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Изменение пароля
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--text-primary)]">
                  Текущий пароль
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--text-primary)]">
                  Новый пароль
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[var(--text-primary)]">
                  Повторите новый пароль
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 text-xs rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Отмена
                </Button>
                <Button type="submit" size="sm" isLoading={isChangingPassword}>
                  Сохранить пароль
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sessions Modal */}
      {isSessionsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[8px] max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">
                Активные сеансы
              </h3>
              <button
                type="button"
                onClick={() => setIsSessionsModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-[6px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-2">
                    <span>Текущий сеанс (Chrome на Linux)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      Этот браузер
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Последняя активность: только что
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <Button size="sm" variant="ghost" onClick={() => setIsSessionsModalOpen(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
