'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
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
          ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
          : 'bg-white/80 backdrop-blur-sm border-b border-transparent'
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
              className="px-2.5 py-1.5 text-xs xl:text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Controls & Language */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Language Switcher */}
          <div
            className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/70 text-xs font-semibold"
            role="group"
            aria-label="Выбор языка"
          >
            <button
              type="button"
              onClick={() => onLocaleChange('ru')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                locale === 'ru'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
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
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] rounded-xl transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2"
            >
              <span>{content.nav.dashboard}</span>
              <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
              >
                {content.nav.login}
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] rounded-xl transition-all shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2"
              >
                <span>{content.nav.register}</span>
                <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Mobile Language Switcher */}
          <button
            type="button"
            onClick={() => onLocaleChange(locale === 'ru' ? 'uz' : 'ru')}
            className="p-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl sm:hidden flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
            aria-label={`Переключить язык на ${locale === 'ru' ? 'узбекский' : 'русский'}`}
          >
            <Globe size={14} className="text-slate-500" />
            <span className="uppercase">{locale}</span>
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
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
          className="lg:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-6 py-6 overflow-y-auto flex flex-col justify-between"
          role="dialog"
          aria-modal="true"
          aria-label="Мобильное меню"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Навигация
              </span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => onLocaleChange('ru')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    locale === 'ru' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  RU
                </button>
                <button
                  type="button"
                  onClick={() => onLocaleChange('uz')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    locale === 'uz' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
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
                  className="px-3 py-2.5 text-base font-semibold text-slate-800 hover:text-[#DC2626] rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Mobile Footer CTAs */}
          <div className="pt-6 border-t border-slate-200/80 space-y-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-[#DC2626] rounded-xl shadow-xs"
              >
                <span>{content.nav.dashboard}</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-white bg-[#DC2626] rounded-xl shadow-xs"
                >
                  <span>{content.nav.register}</span>
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center py-3 text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
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
