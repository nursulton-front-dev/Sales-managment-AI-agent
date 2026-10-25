import type { Metadata } from 'next';
import './globals.css';
import { AppContextProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'Chorla AI — Ядро SaaS-платформы ИИ-агентов продаж',
  description: 'Автоматическая квалификация лидов, интеграция с Telegram и бронирование слотов в Google Календарь',
  icons: {
    icon: [
      { url: '/brand/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    title: 'Chorla AI — Платформа автономных ИИ-агентов продаж',
    description: 'Интеллектуальные продажи, автоворонка и синхронизация с календарём',
    url: 'https://chorla-ai.vercel.app',
    siteName: 'Chorla AI',
    images: [
      {
        url: 'https://chorla-ai.vercel.app/brand/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Chorla AI Platform',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chorla AI — Платформа ИИ-агентов продаж',
    description: 'Автономные ИИ-сотрудники для вашего бизнеса',
    images: ['https://chorla-ai.vercel.app/brand/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--text-primary)] transition-colors duration-150">
        <ThemeProvider>
          <AppContextProvider>
            {children}
          </AppContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
