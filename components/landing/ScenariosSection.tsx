'use client';

import React from 'react';
import { LandingContent } from '@/lib/landing/content';
import { GraduationCap, Megaphone, Briefcase, CheckCircle2, ArrowRight } from 'lucide-react';

interface ScenariosSectionProps {
  content: LandingContent;
}

export function ScenariosSection({ content }: ScenariosSectionProps) {
  const { scenarios } = content;

  const iconMap = {
    education: GraduationCap,
    marketing: Megaphone,
    services: Briefcase,
  };

  return (
    <section id="scenarios" className="py-20 sm:py-28 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#DC2626] px-3 py-1 bg-red-50 rounded-full border border-red-100">
            {scenarios.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {scenarios.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            {scenarios.subtitle}
          </p>
        </div>

        {/* 3 Scenarios Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {scenarios.items.map((item, idx) => {
            const Icon = iconMap[item.icon] || Briefcase;

            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200/90 p-7 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#DC2626] bg-red-50 border border-red-100 px-2.5 py-1 rounded-md">
                      {item.badge}
                    </span>
                    <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
                      <Icon size={20} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {item.niche}
                  </h3>

                  {/* Problem */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Проблема:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.problem}
                    </p>
                  </div>

                  {/* Solution */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Решение gapcha AI:
                    </span>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                      {item.solution}
                    </p>
                  </div>

                  {/* Example dialogue snippet */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
                    <p className="italic text-slate-600">{item.example.query}</p>
                    <p className="font-semibold text-slate-900 text-[11px] sm:text-xs">
                      {item.example.reply}
                    </p>
                  </div>
                </div>

                {/* Tangible Benefit */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                  <span>{item.benefit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
