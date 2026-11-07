'use client';

import React from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { LandingContent, LandingLocale } from '@/lib/landing/content';
import { Globe } from 'lucide-react';

interface LandingFooterProps {
  content: LandingContent;
  locale: LandingLocale;
  onLocaleChange: (newLocale: LandingLocale) => void;
}

export function LandingFooter({ content, locale, onLocaleChange }: LandingFooterProps) {
  const { footer, nav } = content;

  return (
    <footer className="bg-slate-950 text-slate-400 py-14 sm:py-16 border-t border-slate-800 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10">
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-4">
            <BrandLogo variant="full" width={150} theme="white" href="/" ariaLabel="gapcha AI" />
            <p className="text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed">
              {footer.tagline}
            </p>
            <div className="pt-2 space-y-1 text-xs text-slate-400">
              <p>{footer.support}</p>
              <p>{footer.telegramBot}</p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Навигация
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  {nav.howItWorks}
                </a>
              </li>
              <li>
                <a href="#demo" className="hover:text-white transition-colors">
                  {nav.demo}
                </a>
              </li>
              <li>
                <a href="#scenarios" className="hover:text-white transition-colors">
                  {nav.scenarios}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  {nav.features}
                </a>
              </li>
              <li>
                <a href="#integrations" className="hover:text-white transition-colors">
                  {nav.integrations}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  {nav.pricing}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white transition-colors">
                  {nav.faq}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Language Switch */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Юридическая информация
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {footer.privacy}
                </Link>
              </li>
              <li>
                <Link href="/data-deletion" className="hover:text-white transition-colors">
                  {footer.dataDeletion}
                </Link>
              </li>
            </ul>

            <div className="pt-4 space-y-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                <Globe size={13} />
                {footer.language}:
              </span>
              <div className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => onLocaleChange('ru')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    locale === 'ru' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-pressed={locale === 'ru'}
                >
                  Русский (RU)
                </button>
                <button
                  type="button"
                  onClick={() => onLocaleChange('uz')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    locale === 'uz' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  aria-pressed={locale === 'uz'}
                >
                  O&apos;zbekcha (UZ)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>{footer.rights}</p>
          <p className="text-[11px] text-slate-400">
            Платформа gapcha AI не аффилирована с Telegram FZ-LLC и Meta Platforms, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
