'use client';

import React from 'react';
import Link from 'next/link';

export interface BrandLogoProps {
  /**
   * 'full' renders the full mark + 'Chorla AI' wordmark (aspect ratio ~6.46:1).
   * 'mark' renders the standalone 2-shape directional icon (aspect ratio ~1.19:1).
   */
  variant?: 'full' | 'mark';
  /**
   * 'auto': adapts automatically based on CSS dark-mode (uses dark asset when .dark class is active)
   * 'light': optimized for light backgrounds (Red mark, Graphite Chorla, Red AI)
   * 'dark': optimized for dark backgrounds (White mark, White Chorla, Red AI)
   * 'white': monochromatic white version of the mark
   */
  theme?: 'auto' | 'light' | 'dark' | 'white';
  /**
   * Width in pixels or CSS string (e.g. 180, '180px').
   * Height is automatically calculated to strictly prevent distortion.
   */
  width?: number | string;
  /**
   * Height in pixels or CSS string.
   * If provided without width, width is automatically calculated.
   */
  height?: number | string;
  /** Optional link destination. If provided, renders an accessible <Link> with visible focus ring. */
  href?: string;
  /** Additional CSS class names */
  className?: string;
  /** Accessible label (defaults to 'Chorla AI') */
  ariaLabel?: string;
  /** Priority loading for above-the-fold brand headers */
  priority?: boolean;
}

/**
 * BrandLogo — Universal Chorla AI Logo Component
 * Ensures exact brand geometry, prevents layout shifts, and handles light/dark transitions.
 */
export function BrandLogo({
  variant = 'full',
  theme = 'auto',
  width,
  height,
  href,
  className = '',
  ariaLabel = 'Chorla AI',
}: BrandLogoProps) {
  // Full logo aspect ratio: 1156 x 179 (~6.458:1)
  // Mark icon aspect ratio: 210 x 177 (~1.186:1)
  const aspectRatio = variant === 'full' ? 1156 / 179 : 210 / 177;

  // Compute dimensions maintaining strict aspect ratio
  let styleWidth: string | undefined = undefined;
  let styleHeight: string | undefined = undefined;

  if (width !== undefined) {
    styleWidth = typeof width === 'number' ? `${width}px` : width;
    styleHeight = 'auto';
  } else if (height !== undefined) {
    styleHeight = typeof height === 'number' ? `${height}px` : height;
    styleWidth = 'auto';
  } else {
    // Default sensible sizes according to brand guidelines:
    // Full: ~160px width; Mark: ~32px width
    styleWidth = variant === 'full' ? '160px' : '32px';
    styleHeight = 'auto';
  }

  const imageElement = (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: styleWidth,
        height: styleHeight,
        aspectRatio: `${aspectRatio}`,
      }}
      aria-label={ariaLabel}
      role="img"
    >
      {variant === 'full' ? (
        theme === 'light' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/chorla-ai-logo-light.png"
            alt={ariaLabel}
            className="w-full h-full object-contain pointer-events-none select-none"
            loading="eager"
          />
        ) : theme === 'dark' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/chorla-ai-logo-dark.png"
            alt={ariaLabel}
            className="w-full h-full object-contain pointer-events-none select-none"
            loading="eager"
          />
        ) : (
          // Auto theme: show light asset on light, dark asset on dark
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/chorla-ai-logo-light.png"
              alt={ariaLabel}
              className="w-full h-full object-contain pointer-events-none select-none dark:hidden"
              loading="eager"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/chorla-ai-logo-dark.png"
              alt={ariaLabel}
              className="w-full h-full object-contain pointer-events-none select-none hidden dark:block"
              loading="eager"
            />
          </>
        )
      ) : theme === 'white' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/chorla-ai-mark-white.png"
          alt={ariaLabel}
          className="w-full h-full object-contain pointer-events-none select-none"
          loading="eager"
        />
      ) : theme === 'light' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/chorla-ai-mark-red.png"
          alt={ariaLabel}
          className="w-full h-full object-contain pointer-events-none select-none"
          loading="eager"
        />
      ) : theme === 'dark' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/brand/chorla-ai-mark-white.png"
          alt={ariaLabel}
          className="w-full h-full object-contain pointer-events-none select-none"
          loading="eager"
        />
      ) : (
        // Auto theme for mark: red on light, white on dark
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/chorla-ai-mark-red.png"
            alt={ariaLabel}
            className="w-full h-full object-contain pointer-events-none select-none dark:hidden"
            loading="eager"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/chorla-ai-mark-white.png"
            alt={ariaLabel}
            className="w-full h-full object-contain pointer-events-none select-none hidden dark:block"
            loading="eager"
          />
        </>
      )}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center shrink-0 rounded-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2 transition-opacity hover:opacity-90 cursor-pointer"
        aria-label={ariaLabel}
      >
        {imageElement}
      </Link>
    );
  }

  return imageElement;
}
