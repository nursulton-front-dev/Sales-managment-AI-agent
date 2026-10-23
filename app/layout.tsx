import type { Metadata } from 'next';
import './globals.css';
import { AppContextProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

export const metadata: Metadata = {
  title: 'AI Business OS — Ядро SaaS-платформы ИИ-агентов продаж',
  description: 'Автоматическая квалификация лидов, интеграция с Telegram и бронирование слотов в Google Календарь',
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
