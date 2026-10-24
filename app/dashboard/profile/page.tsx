'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import {
  User,
  Mail,
  ShieldCheck,
  Building2,
  Clock,
  Globe,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, showToast } = useApp();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState('+998 90 123 45 67');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      showToast('Профиль обновлен', 'Личные данные успешно сохранены', 'success');
    } catch (err: any) {
      showToast('Ошибка', err.message || 'Не удалось обновить профиль', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('Ошибка', 'Введите текущий пароль', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Ошибка', 'Новый пароль должен содержать минимум 8 символов', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Ошибка', 'Пароли не совпадают', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Пароль изменен', 'Ваш пароль был успешно обновлен', 'success');
    } catch (err: any) {
      showToast('Ошибка', err.message || 'Сбой обновления пароля', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title="Мой профиль"
        description="Управление персональными данными, безопасностью аккаунта и предпочтениями"
      />

      {/* Top Profile Summary Banner */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#FEF2F2] dark:bg-[rgba(220,38,38,0.16)] border border-[#DC2626]/20 flex items-center justify-center text-[#DC2626] dark:text-[#FCA5A5] font-bold text-xl shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {user?.name || 'Пользователь'}
              </h2>
              <Badge variant="success">
                <ShieldCheck className="w-3 h-3 mr-1" />
                Верифицирован
              </Badge>
            </div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {user?.email || 'user@example.com'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                {user?.companyName || 'Моя компания'}
              </span>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/company"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:border-[#DC2626] transition-colors"
        >
          <span>Настройки компании</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Personal Info & Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info Card */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Личные данные</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Имя и контактные данные, используемые для уведомлений и отчетов
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    ФИО / Отображаемое имя
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: Сардор Рахимов"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Электронная почта
                    </label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="bg-[var(--surface-secondary)] cursor-not-allowed opacity-80"
                    />
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Для смены адреса обратитесь в службу поддержки
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Контактный телефон
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+998 90 000 00 00"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingProfile}
                  >
                    Сохранить изменения
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>

          {/* Password & Security Card */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Безопасность и пароль</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Регулярное обновление пароля защищает доступ к диалогам и клиентам
              </p>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                    Текущий пароль
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Новый пароль
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Минимум 8 символов"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                      Повторите новый пароль
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    isLoading={isChangingPassword}
                  >
                    Обновить пароль
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Right Column (1 col): System Preferences & Active Sessions */}
        <div className="space-y-6">
          {/* Preferences Card */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Параметры интерфейса</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Тема и региональные настройки</p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
                  Тема оформления
                </label>
                <div className="p-2 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">Режим темы</span>
                  <ThemeSwitcher />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Часовой пояс
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] text-xs text-[var(--text-primary)]">
                  <Clock className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <span className="font-mono">Asia/Tashkent (UTC+5)</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Используется для расписания и записи в календарь
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Язык интерфейса
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] text-xs text-[var(--text-primary)]">
                  <Globe className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <span>Русский (RU)</span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Active Session & Quick Help */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Сессия входа</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Текущее устройство и статус</p>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="p-3 rounded-[6px] border border-[var(--border)] bg-[var(--surface-secondary)] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--text-primary)]">Текущая веб-сессия</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#16A34A] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    Активна
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">
                  Авторизован через систему сессий Better Auth
                </div>
              </div>

              <div className="pt-2 text-xs">
                <Link
                  href="/dashboard/support"
                  className="text-[#DC2626] hover:underline inline-flex items-center gap-1 font-medium"
                >
                  Нужна помощь? Напишите в поддержку
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
