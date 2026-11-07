import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LandingPageClient } from '@/components/landing/LandingPageClient';

export const metadata: Metadata = {
  title: 'gapcha AI — ИИ-сотрудники для продаж и клиентского сервиса',
  description:
    'Отвечайте клиентам вовремя — даже когда вы заняты. Автоответы в Telegram, Instagram Direct и на сайте, квалификация обращений и сбор лидов из одного кабинета.',
  alternates: {
    canonical: 'https://chorla-ai.vercel.app',
    languages: {
      'ru-RU': 'https://chorla-ai.vercel.app/?lang=ru',
      'uz-UZ': 'https://chorla-ai.vercel.app/?lang=uz',
    },
  },
  openGraph: {
    title: 'gapcha AI — Платформа умных ответов для бизнеса в Узбекистане',
    description:
      'Мгновенные ответы клиентам 24/7 в Telegram, Instagram и на сайте. Квалификация потребностей и сбор лидов по вашей базе знаний.',
    url: 'https://chorla-ai.vercel.app',
    siteName: 'gapcha AI',
    images: [
      {
        url: 'https://chorla-ai.vercel.app/brand/og-image.png',
        width: 1200,
        height: 630,
        alt: 'gapcha AI Platform',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
};

export default function RootPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <LandingPageClient />
    </Suspense>
  );
}
