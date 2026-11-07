'use client';

import React from 'react';
import Link from 'next/link';
import { LandingContent } from '@/lib/landing/content';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface FinalCtaSectionProps {
  content: LandingContent;
}

export function FinalCtaSection({ content }: FinalCtaSectionProps) {
  const { finalCta } = content;

  return (
    <section className="py-20 sm:py-28 bg-slate-900 text-white relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-950/40 via-slate-900 to-slate-900 pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {finalCta.title}
        </h2>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          {finalCta.subtitle}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-sm sm:text-base text-white bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] transition-all shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <span>{finalCta.button}</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <p className="text-xs text-slate-400 font-medium pt-2">
          {finalCta.note}
        </p>
      </div>
    </section>
  );
}
