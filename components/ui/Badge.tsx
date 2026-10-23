import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral' | 'purple';
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  ...props
}: BadgeProps) {
  const variants = {
    success: 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]',
    warning: 'bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning-border)]',
    info: 'bg-[var(--accent-soft)] text-[var(--accent-soft-text)] border-[var(--border)]',
    danger: 'bg-[var(--danger-bg)] text-[var(--danger-text)] border-[var(--danger-border)]',
    neutral: 'bg-[var(--surface-secondary)] text-[var(--text-secondary)] border-[var(--border)]',
    purple: 'bg-[var(--surface-secondary)] text-[var(--text-primary)] border-[var(--border)]',
  };

  const dotColors = {
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    info: 'bg-[var(--accent)]',
    danger: 'bg-[var(--danger)]',
    neutral: 'bg-[var(--text-muted)]',
    purple: 'bg-[var(--accent)]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-medium border ${variants[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}
