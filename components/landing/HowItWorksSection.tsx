'use client';

import React from 'react';
import { LandingContent } from '@/lib/landing/content';
import { BookOpen, Plug, PlayCircle } from 'lucide-react';

interface HowItWorksSectionProps {
  content: LandingContent;
}

export function HowItWorksSection({ content }: HowItWorksSectionProps) {
  const { howItWorks } = content;

  const stepIcons = [BookOpen, Plug, PlayCircle];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-[var(--surface)] border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[var(--accent)] px-3 py-1 bg-[var(--accent-soft)] rounded-full border border-[var(--accent)]/20">
            {howItWorks.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {howItWorks.title}
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
            {howItWorks.subtitle}
          </p>
        </div>

        {/* 3 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {howItWorks.steps.map((step, idx) => {
            const Icon = stepIcons[idx] || BookOpen;

            return (
              <div
                key={step.number}
                className="relative rounded-2xl bg-[var(--background)]/70 border border-[var(--border)]/80 p-7 sm:p-8 flex flex-col justify-between space-y-6 hover:border-[var(--border-strong)] hover:bg-[var(--background)] transition-all duration-150"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl sm:text-4xl font-black text-[var(--text-secondary)] tracking-tighter">
                      {step.number}
                    </span>
                    <div className="size-11 rounded-xl bg-[var(--surface)] border border-[var(--border)]/80 flex items-center justify-center text-[var(--accent)] shadow-2xs">
                      <Icon size={20} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border)]/60">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface)] px-3 py-1.5 rounded-lg border border-[var(--border)] shadow-2xs">
                    <span className="size-1.5 rounded-full bg-[var(--accent)]" />
                    {step.badge}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
