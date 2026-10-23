'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SandboxDrawer } from '@/components/sandbox/SandboxDrawer';
import { GoogleCalendarModal } from '@/components/calendar/GoogleCalendarModal';
import { ToastContainer } from '@/components/ui/Toast';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [supportReason, setSupportReason] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/workspace/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.isImpersonating) {
          setIsImpersonating(true);
          setSupportReason(data.supportSessionReason || 'Техническая поддержка');
        }
      })
      .catch(() => {});
  }, []);

  const handleExitSupport = async () => {
    try {
      await fetch('/api/admin/support-session', { method: 'DELETE' });
      router.push('/admin');
    } catch {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--background)] text-[var(--text-primary)] font-sans antialiased">
      {/* Sidebar (Desktop left rail + Mobile Slide-over Drawer) */}
      <Sidebar
        mobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Support Session Warning Banner */}
        {isImpersonating && (
          <div className="bg-amber-600 text-white px-4 sm:px-6 py-2.5 text-xs flex items-center justify-between font-medium shadow-xs z-40 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-200" />
              <span>
                <strong>Режим аудита (Support Session)</strong>: Причина: <em>{supportReason}</em>
              </span>
            </div>
            <button
              onClick={handleExitSupport}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Завершить</span>
            </button>
          </div>
        )}

        <Header onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

        <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>

      {/* Interactive Global Sandbox Drawer */}
      <SandboxDrawer />

      {/* Google Calendar Connection Modal */}
      <GoogleCalendarModal />

      {/* Animated Toast Alerts */}
      <ToastContainer />
    </div>
  );
}
