'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LANDING_CONTENT, LandingLocale } from '@/lib/landing/content';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { ProductDemoSection } from '@/components/landing/ProductDemoSection';
import { ScenariosSection } from '@/components/landing/ScenariosSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { IntegrationsSection } from '@/components/landing/IntegrationsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { FaqSection } from '@/components/landing/FaqSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { useApp } from '@/context/AppContext';

export function LandingPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useApp();

  // Detect locale from query params, localStorage, or default to 'ru'
  const [locale, setLocale] = useState<LandingLocale>('ru');

  useEffect(() => {
    const queryLang = searchParams?.get('lang');
    if (queryLang === 'uz' || queryLang === 'ru') {
      setLocale(queryLang);
      try {
        localStorage.setItem('gapcha_landing_locale', queryLang);
      } catch {}
      return;
    }

    try {
      const saved = localStorage.getItem('gapcha_landing_locale') as LandingLocale | null;
      if (saved === 'uz' || saved === 'ru') {
        setLocale(saved);
      }
    } catch {}
  }, [searchParams]);

  const handleLocaleChange = useCallback((newLocale: LandingLocale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('gapcha_landing_locale', newLocale);
      document.cookie = `gapcha_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}

    // Optionally update URL query param without refreshing page or losing scroll position
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('lang', newLocale);
    window.history.replaceState({}, '', currentUrl.toString());
  }, []);

  const content = LANDING_CONTENT[locale] || LANDING_CONTENT['ru'];
  const isLoggedIn = Boolean(user?.id);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#DC2626] selection:text-white">
      {/* 1. Header */}
      <LandingHeader
        content={content}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        isLoggedIn={isLoggedIn}
      />

      {/* 2. Main Content Sections */}
      <main id="main-content">
        <HeroSection content={content} />
        <HowItWorksSection content={content} />
        <ProductDemoSection content={content} />
        <ScenariosSection content={content} />
        <FeaturesSection content={content} />
        <IntegrationsSection content={content} />
        <PricingSection content={content} />
        <FaqSection content={content} />
        <FinalCtaSection content={content} />
      </main>

      {/* 3. Footer */}
      <LandingFooter
        content={content}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />
    </div>
  );
}
