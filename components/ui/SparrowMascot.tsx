'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export type SparrowMascotVariant =
  | 'loading'
  | 'hello'
  | 'success'
  | 'idle'
  | 'look'
  | 'thinking'
  | 'hint'
  | 'help'
  | 'flying'
  | 'avatar';

export interface SparrowMascotProps {
  variant?: SparrowMascotVariant;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  alt?: string;
  className?: string;
  format?: 'svg' | 'png';
  priority?: boolean;
  onAnimationEnd?: () => void;
  'aria-hidden'?: boolean | 'true' | 'false';
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 112,
};

const VARIANT_PATHS: Record<SparrowMascotVariant, { animated: string; static: string }> = {
  loading: {
    animated: '/illustrations/gapcha/sparrow/sparrow-loading',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  hello: {
    animated: '/illustrations/gapcha/sparrow/sparrow-hello',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  success: {
    animated: '/illustrations/gapcha/sparrow/sparrow-success',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  idle: {
    animated: '/illustrations/gapcha/sparrow/sparrow-idle',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  look: {
    animated: '/illustrations/gapcha/sparrow/sparrow-look',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  thinking: {
    animated: '/illustrations/gapcha/sparrow/thinking',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  hint: {
    animated: '/illustrations/gapcha/sparrow/hint',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  help: {
    animated: '/illustrations/gapcha/sparrow/help',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  flying: {
    animated: '/illustrations/gapcha/sparrow/flying',
    static: '/illustrations/gapcha/sparrow/sparrow-idle',
  },
  avatar: {
    animated: '/illustrations/gapcha/sparrow/avatar',
    static: '/illustrations/gapcha/sparrow/avatar',
  },
};

export function SparrowMascot({
  variant = 'idle',
  size = 'md',
  animate = true,
  alt = '',
  className = '',
  format = 'svg',
  priority = false,
  onAnimationEnd,
  'aria-hidden': ariaHidden,
}: SparrowMascotProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 48;
  const isDecorative = !alt;

  // Reduced motion preference detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', handler);
    return () => mediaQuery.removeEventListener?.('change', handler);
  }, []);

  const shouldAnimate = animate && !prefersReducedMotion;
  const paths = VARIANT_PATHS[variant] || VARIANT_PATHS.idle;
  const basePath = shouldAnimate ? paths.animated : paths.static;

  let src = `${basePath}.${format}`;
  if (format === 'png' && variant === 'avatar') {
    if (pixelSize <= 24) src = '/illustrations/gapcha/sparrow/avatar-24.png';
    else if (pixelSize <= 32) src = '/illustrations/gapcha/sparrow/avatar-32.png';
    else if (pixelSize <= 64) src = '/illustrations/gapcha/sparrow/avatar-64.png';
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-visible ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      aria-hidden={ariaHidden ?? isDecorative}
      onAnimationEnd={onAnimationEnd}
    >
      <Image
        src={src}
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        priority={priority}
        className="w-full h-full object-contain pointer-events-none transition-transform duration-200"
      />
    </div>
  );
}
