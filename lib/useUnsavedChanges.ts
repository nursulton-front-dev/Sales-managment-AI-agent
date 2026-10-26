'use client';

import { useEffect } from 'react';

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a[href]');
      if (link && link.getAttribute('href') !== window.location.pathname && !window.confirm('Изменения не сохранены. Покинуть страницу?')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', onClick, true);
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', onClick, true); };
  }, [dirty]);
}
