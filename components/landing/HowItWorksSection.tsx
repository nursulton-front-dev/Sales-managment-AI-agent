'use client';

import React from 'react';
import { LandingContent } from '@/lib/landing/content';
import { BookOpen, Plug, PlayCircle, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  content: LandingContent;
}

export function HowItWorksSection({ content }: HowItWorksSectionProps) {
  const { howItWorks } = content;

  const stepIcons = [BookOpen, Plug, PlayCircle];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#DC2626] px-3 py-1 bg-red-50 rounded-full border border-red-100">
            {howItWorks.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {howItWorks.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
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
                className="relative rounded-2xl bg-slate-50/70 border border-slate-200/80 p-7 sm:p-8 flex flex-col justify-between space-y-6 hover:border-slate-300 hover:bg-slate-50 transition-all duration-150"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl sm:text-4xl font-black text-slate-300 tracking-tighter">
                      {step.number}
                    </span>
                    <div className="size-11 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-[#DC2626] shadow-2xs">
                      <Icon size={20} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {step.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/60">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="size-1.5 rounded-full bg-[#DC2626]" />
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
