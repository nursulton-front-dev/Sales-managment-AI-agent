'use client';

import React from 'react';
import { SparrowMascot, SparrowMascotVariant } from './SparrowMascot';

export type SparrowPose = SparrowMascotVariant;

export interface BrandMascotProps {
  pose?: SparrowPose;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  alt?: string;
  className?: string;
  priority?: boolean;
  format?: 'svg' | 'png';
  'aria-hidden'?: boolean | 'true' | 'false';
}

export function BrandMascot({
  pose = 'idle',
  size = 48,
  animate = true,
  alt = '',
  className = '',
  priority = false,
  format = 'svg',
  'aria-hidden': ariaHidden,
}: BrandMascotProps) {
  return (
    <SparrowMascot
      variant={pose}
      size={size}
      animate={animate}
      alt={alt}
      className={className}
      priority={priority}
      format={format}
      aria-hidden={ariaHidden}
    />
  );
}

export { SparrowMascot };
