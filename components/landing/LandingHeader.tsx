'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { LandingContent, LandingLocale } from '@/lib/landing/content';
import { Menu, X, ArrowRight, Globe } from 'lucide-react';

interface LandingHeaderProps {
  content: LandingContent;
  locale: LandingLocale;
  onLocaleChange: (newLocale: LandingLocale) => void;
  isLoggedIn?: boolean;
}

export function LandingHeader({
  content,
  locale,
  onLocaleChange,
  isLoggedIn = false,
}: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard accessibility: Escape closes mobile drawer and returns focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: '#how-it-works', label: content.nav.howItWorks },
    { href: '#demo', label: content.nav.demo },
    { href: '#scenarios', label: content.nav.scenarios },
    { href: '#features', label: content.nav.features },
    { href: '#integrations', label: content.nav.integrations },
    { href: '#pricing', label: content.nav.pricing },
    { href: '#faq', label: content.nav.faq },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)]/80 shadow-xs'
          : 'bg-[var(--surface)]/80 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <BrandLogo variant="full" width={145} href="/" ariaLabel="gapcha AI" />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Основная навигация">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-2.5 py-1.5 text-xs xl:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)]/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Controls & Language */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Language Switcher */}
          <div
            className="inline-flex items-center p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]/70 text-xs font-semibold"
            role="group"
            aria-label="Выбор языка"
          >
            <button
              type="button"
              onClick={() => onLocaleChange('ru')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                locale === 'ru'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              aria-pressed={locale === 'ru'}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => onLocaleChange('uz')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                locale === 'uz'
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              aria-pressed={locale === 'uz'}
            >
              UZ
            </button>
          </div>

          {/* Auth Actions */}
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--accent-text)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-hover)] rounded-xl transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
            >
              <span>{content.nav.dashboard}</span>
              <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-secondary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                {content.nav.login}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--accent-text)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-hover)] rounded-xl transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <span>{content.nav.register}</span>
                <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>

        <ThemeSwitcher locale={locale} />
        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Mobile Language Switcher */}
          <button
            type="button"
            onClick={() => onLocaleChange(locale === 'ru' ? 'uz' : 'ru')}
            className="p-2 text-xs font-bold text-[var(--text-secondary)] bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl sm:hidden flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label={`Переключить язык на ${locale === 'ru' ? 'узбекский' : 'русский'}`}
          >
            <Globe size={14} className="text-[var(--text-muted)]" />
            <span className="uppercase">{locale}</span>
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню навигации'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          ref={drawerRef}
          className="lg:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)] px-6 py-6 overflow-y-auto flex flex-col justify-between"
          role="dialog"
          aria-modal="true"
          aria-label="Мобильное меню"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Навигация
              </span>
              <div className="flex items-center gap-1 bg-[var(--surface-secondary)] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => onLocaleChange('ru')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    locale === 'ru' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-muted)]'
                  }`}
                >
                  RU
                </button>
                <button
                  type="button"
                  onClick={() => onLocaleChange('uz')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    locale === 'uz' ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-muted)]'
                  }`}
                >
                  UZ
                </button>
              </div>
            </div>

            <nav className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-base font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] rounded-xl hover:bg-[var(--background)] transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Mobile Footer CTAs */}
          <div className="pt-6 border-t border-[var(--border)]/80 space-y-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[var(--accent-text)] bg-[var(--accent)] rounded-xl shadow-xs"
              >
                <span>{content.nav.dashboard}</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-[var(--accent-text)] bg-[var(--accent)] rounded-xl shadow-xs"
                >
                  <span>{content.nav.register}</span>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center py-3 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--surface-secondary)] rounded-xl"
                >
                  {content.nav.login}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
