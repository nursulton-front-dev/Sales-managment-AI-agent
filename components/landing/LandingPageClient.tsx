'use client';

import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const { user } = useApp();

  const queryLang = searchParams?.get('lang');
  const [prevQueryLang, setPrevQueryLang] = useState(queryLang);

  // Detect locale from query params, localStorage, or default to 'ru'
  const [locale, setLocale] = useState<LandingLocale>(() => {
    if (queryLang === 'uz' || queryLang === 'ru') return queryLang;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('gapcha_landing_locale');
        if (saved === 'uz' || saved === 'ru') return saved;
      } catch {}
    }
    return 'ru';
  });

  if (queryLang !== prevQueryLang) {
    setPrevQueryLang(queryLang);
    if (queryLang === 'uz' || queryLang === 'ru') {
      setLocale(queryLang);
    }
  }

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
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] font-sans antialiased selection:bg-[var(--accent)] selection:text-white">
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
