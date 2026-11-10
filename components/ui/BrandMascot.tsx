'use client';

import React from 'react';
import Image from 'next/image';

export type SparrowPose =
  | 'idle'
  | 'hello'
  | 'thinking'
  | 'success'
  | 'hint'
  | 'help'
  | 'flying'
  | 'avatar';

export interface BrandMascotProps {
  pose?: SparrowPose;
  size?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
  format?: 'svg' | 'png';
  'aria-hidden'?: boolean | 'true' | 'false';
}

const POSE_FILES: Record<SparrowPose, string> = {
  idle: '/illustrations/gapcha/sparrow/idle',
  hello: '/illustrations/gapcha/sparrow/hello',
  thinking: '/illustrations/gapcha/sparrow/thinking',
  success: '/illustrations/gapcha/sparrow/success',
  hint: '/illustrations/gapcha/sparrow/hint',
  help: '/illustrations/gapcha/sparrow/help',
  flying: '/illustrations/gapcha/sparrow/flying',
  avatar: '/illustrations/gapcha/sparrow/avatar',
};

export function BrandMascot({
  pose = 'idle',
  size = 48,
  alt = '',
  className = '',
  priority = false,
  format = 'svg',
  'aria-hidden': ariaHidden,
}: BrandMascotProps) {
  const basePath = POSE_FILES[pose] || POSE_FILES.idle;
  const isDecorative = !alt;

  // For avatar, if using PNG and size <= 64, use optimized pre-rendered PNG
  let src = `${basePath}.${format}`;
  if (format === 'png' && pose === 'avatar') {
    if (size <= 24) src = '/illustrations/gapcha/sparrow/avatar-24.png';
    else if (size <= 32) src = '/illustrations/gapcha/sparrow/avatar-32.png';
    else if (size <= 64) src = '/illustrations/gapcha/sparrow/avatar-64.png';
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={ariaHidden ?? isDecorative}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        priority={priority}
        className="w-full h-full object-contain pointer-events-none transition-transform duration-200"
      />
    </div>
  );
}
