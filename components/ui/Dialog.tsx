'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** Native modal semantics provide focus containment, Escape and an inert background. */
export function Dialog({ open, onClose, label, children, className = '' }: {
  open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  return <dialog ref={ref} aria-label={label} className={`chorla-dialog ${className}`}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    } }}>
    {open ? children : null}
  </dialog>;
}
