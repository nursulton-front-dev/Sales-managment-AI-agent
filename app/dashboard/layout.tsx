'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { DataState } from '@/components/ui/DataState';
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
  const { user, workspace, workspaceLoading, workspaceError, refreshWorkspace, isImpersonating, supportSessionReason, showToast } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!workspaceLoading && !workspaceError) {
      if (!user) {
        router.replace('/login');
      } else if (!workspace) {
        router.replace('/register?step=2');
      }
    }
  }, [user, workspace, workspaceLoading, workspaceError, router]);

  const handleExitSupport = async () => {
    try {
      const response = await fetch('/api/admin/support-session', { method: 'DELETE' });
      if (!response.ok) throw new Error('Не удалось завершить сессию');
      await refreshWorkspace();
      router.push('/admin');
    } catch {
      showToast('Не удалось завершить сессию', 'Попробуйте ещё раз.', 'error');
    }
  };

  return (
    <div className="dashboard-shell h-[100dvh] w-full flex overflow-hidden bg-[var(--background)] text-[var(--text-primary)] font-sans antialiased">
      {/* Sidebar (Desktop fixed left rail + Mobile Slide-over Drawer) */}
      <Sidebar
        mobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area: fixed column with isolated vertical scroll */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {/* Support Session Warning Banner */}
        {isImpersonating && (
          <div className="bg-amber-600 text-white px-4 sm:px-6 py-2.5 text-xs flex items-center justify-between font-medium shadow-xs z-40 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-200" />
              <span>
                <strong>Режим аудита (Support Session)</strong>: Причина: <em>{supportSessionReason}</em>
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

        {/* Sticky/Fixed Header (shrink-0) */}
        <div className="shrink-0 z-30">
          <Header onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        </div>

        {/* Scrollable Main Area (flex-1, min-h-0, overflow-y-auto) */}
        <main className="dashboard-content flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto">
          {workspaceLoading || workspaceError ? <DataState loading={workspaceLoading} error={workspaceError} retry={refreshWorkspace} /> : user ? children : null}
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
