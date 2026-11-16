'use client';

import React from 'react';
import Image from 'next/image';
import styles from './SparrowMascot.module.css';

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

const THREE_D_POSES: Record<SparrowMascotVariant, 'hello' | 'success' | 'support' | 'avatar'> = {
  loading: 'support',
  hello: 'hello',
  success: 'success',
  idle: 'support',
  look: 'support',
  thinking: 'support',
  hint: 'support',
  help: 'support',
  flying: 'hello',
  avatar: 'avatar',
};

const MOTION_CLASS: Partial<Record<SparrowMascotVariant, string>> = {
  hello: styles.hello,
  flying: styles.hello,
  loading: styles.loading,
  thinking: styles.loading,
  success: styles.success,
  help: styles.support,
};

export function SparrowMascot({
  variant = 'idle',
  size = 'md',
  animate = true,
  alt = '',
  className = '',
  priority = false,
  onAnimationEnd,
  'aria-hidden': ariaHidden,
}: SparrowMascotProps) {
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 48;
  const pose = pixelSize < 40 && variant !== 'avatar' ? 'avatar' : THREE_D_POSES[variant];
  const src = `/illustrations/gapcha/elder-3d/${pose}.webp`;
  const motionClass = animate ? MOTION_CLASS[variant] : undefined;

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-visible ${motionClass ?? ''} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
      aria-hidden={ariaHidden ?? !alt}
      onAnimationEnd={onAnimationEnd}
    >
      <Image
        src={src}
        alt={alt}
        width={pixelSize}
        height={pixelSize}
        sizes={`${pixelSize}px`}
        priority={priority}
        className={styles.image}
      />
    </span>
  );
}
