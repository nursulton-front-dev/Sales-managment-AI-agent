import React, { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  actionHref,
  children,
}: EmptyStateProps) {
  return (
    <div className="p-8 sm:p-12 text-center bg-[var(--surface)] border border-[var(--border)] rounded-[8px] flex flex-col items-center justify-center space-y-3">
      {Icon && (
        <div className="w-12 h-12 rounded-[8px] bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="max-w-md space-y-1">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>

      {actionText && (
        <div className="pt-2">
          {actionHref ? (
            <Link href={actionHref}>
              <Button size="sm">{actionText}</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={onAction}>
              {actionText}
            </Button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
