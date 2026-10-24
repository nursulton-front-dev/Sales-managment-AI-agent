'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SettingsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'company' || tab === 'team') {
      router.replace('/dashboard/company');
    } else if (tab === 'integrations') {
      router.replace('/dashboard/integrations');
    } else {
      router.replace('/dashboard/profile');
    }
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
        <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[#DC2626] rounded-full animate-spin" />
        <span>Перенаправление в профиль...</span>
      </div>
    </div>
  );
}

export default function SettingsRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <div className="w-4 h-4 border-2 border-[var(--border)] border-t-[#DC2626] rounded-full animate-spin" />
            <span>Загрузка...</span>
          </div>
        </div>
      }
    >
      <SettingsRedirectContent />
    </Suspense>
  );
}
