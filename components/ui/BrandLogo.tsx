'use client';

import React from 'react';
import Link from 'next/link';
import { BRAND_ASSETS } from './brandAssets';

export interface BrandLogoProps {
  /**
   * 'full' renders the mark + 'gapcha AI' wordmark.
   * 'mark' renders the standalone 2-shape directional icon.
   */
  variant?: 'full' | 'mark';
  /**
   * 'auto': adapts automatically based on CSS dark-mode (uses dark asset when .dark class is active)
   * 'light': optimized for light backgrounds (Red mark, Graphite gapcha, Red AI)
   * 'dark': optimized for dark backgrounds (White/Red mark, White gapcha, Red AI)
   * 'white': monochromatic white version of the logo
   */
  theme?: 'auto' | 'light' | 'dark' | 'white';
  /**
   * Width in pixels or CSS string (e.g. 180, '180px').
   */
  width?: number | string;
  /**
   * Height in pixels or CSS string.
   */
  height?: number | string;
  /** Optional link destination. If provided, renders an accessible <Link> with visible focus ring. */
  href?: string;
  /** Additional CSS class names */
  className?: string;
  /** Accessible label (defaults to 'gapcha AI') */
  ariaLabel?: string;
}

/**
 * BrandLogo — Universal gapcha AI Logo Component
 * Guaranteed zero-latency, zero-404 layout shift proof rendering.
 */
export function BrandLogo({
  variant = 'full',
  theme = 'auto',
  width,
  height,
  href,
  className = '',
  ariaLabel = 'gapcha AI',
}: BrandLogoProps) {
  const numericWidth = typeof width === 'number' ? width : width ? parseInt(String(width), 10) : undefined;
  const baseScale = numericWidth ? numericWidth / 160 : 1;
  const markHeight = Math.round(24 * baseScale);
  const markWidth = Math.round(markHeight * (210 / 177));
  const fontSize = Math.max(15, Math.round(21 * baseScale));

  const markElement = (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: `${markWidth}px`,
        height: `${markHeight}px`,
        aspectRatio: `${210 / 177}`,
      }}
    >
      {theme === 'white' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND_ASSETS.MARK_WHITE}
          alt=""
          className="w-full h-full object-contain pointer-events-none select-none"
          loading="eager"
        />
      ) : theme === 'light' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND_ASSETS.MARK_RED}
          alt=""
          className="w-full h-full object-contain pointer-events-none select-none"
          loading="eager"
        />
      ) : theme === 'dark' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={BRAND_ASSETS.MARK_WHITE}
          alt=""
          className="w-full h-full object-contain pointer-events-none select-none"
          loading="eager"
        />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_ASSETS.MARK_RED}
            alt=""
            className="w-full h-full object-contain pointer-events-none select-none dark:hidden"
            loading="eager"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_ASSETS.MARK_WHITE}
            alt=""
            className="w-full h-full object-contain pointer-events-none select-none hidden dark:block"
            loading="eager"
          />
        </>
      )}
    </span>
  );

  let content: React.ReactNode;

  if (variant === 'mark') {
    content = markElement;
  } else {
    // Full variant: Mark + Wordmark 'gapcha AI'
    const wordmarkThemeClass =
      theme === 'white'
        ? 'text-white'
        : theme === 'light'
        ? 'text-[#0F172A]'
        : theme === 'dark'
        ? 'text-white'
        : 'text-slate-900 dark:text-white';

    const aiThemeClass = theme === 'white' ? 'text-white' : 'text-[#DC2626]';

    content = (
      <span className="inline-flex items-center gap-2 select-none">
        {markElement}
        <span
          className={`font-bold tracking-tight leading-none ${wordmarkThemeClass}`}
          style={{ fontSize: `${fontSize}px`, fontFamily: 'inherit' }}
        >
          gapcha <span className={aiThemeClass}>AI</span>
        </span>
      </span>
    );
  }

  const container = (
    <span
      className={`inline-flex items-center shrink-0 ${className}`}
      aria-label={ariaLabel}
      role="img"
    >
      {content}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center shrink-0 rounded-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 transition-opacity hover:opacity-90 cursor-pointer"
        aria-label={ariaLabel}
      >
        {container}
      </Link>
    );
  }

  return container;
}
