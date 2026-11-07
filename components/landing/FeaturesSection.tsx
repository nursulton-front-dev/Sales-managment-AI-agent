'use client';

import React from 'react';
import { LandingContent } from '@/lib/landing/content';
import { Clock, BookOpen, UserCheck, Filter, Inbox, Calendar, Check } from 'lucide-react';

interface FeaturesSectionProps {
  content: LandingContent;
}

export function FeaturesSection({ content }: FeaturesSectionProps) {
  const { features } = content;

  const iconMap = {
    clock: Clock,
    book: BookOpen,
    userCheck: UserCheck,
    funnel: Filter,
    inbox: Inbox,
    calendar: Calendar,
  };

  return (
    <section id="features" className="py-20 sm:py-28 bg-slate-50/70 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#DC2626] px-3 py-1 bg-red-50 rounded-full border border-red-100">
            {features.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {features.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            {features.subtitle}
          </p>
        </div>

        {/* 6 Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {features.items.map((feat, idx) => {
            const Icon = iconMap[feat.icon] || Clock;

            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200/90 p-7 flex flex-col justify-between space-y-6 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="space-y-4">
                  <div className="size-11 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold">
                    <Icon size={22} />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    {feat.result}
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
