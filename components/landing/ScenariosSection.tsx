'use client';

import React from 'react';
import { LandingContent } from '@/lib/landing/content';
import { GraduationCap, Megaphone, Briefcase, CheckCircle2 } from 'lucide-react';

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
    <section id="scenarios" className="py-20 sm:py-28 bg-[var(--surface)] border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[var(--accent)] px-3 py-1 bg-[var(--accent-soft)] rounded-full border border-[var(--accent)]/20">
            {scenarios.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {scenarios.title}
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
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
                className="rounded-2xl bg-[var(--surface)] border border-[var(--border)]/90 p-7 sm:p-8 flex flex-col justify-between space-y-6 shadow-xs hover:shadow-md transition-shadow"
              >
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)]/20 px-2.5 py-1 rounded-md">
                      {item.badge}
                    </span>
                    <div className="size-10 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)]">
                      <Icon size={20} />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
                    {item.niche}
                  </h3>

                  {/* Problem */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Проблема:
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                      {item.problem}
                    </p>
                  </div>

                  {/* Solution */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Решение gapcha AI:
                    </span>
                    <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium leading-relaxed">
                      {item.solution}
                    </p>
                  </div>

                  {/* Example dialogue snippet */}
                  <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]/70 space-y-2 text-xs">
                    <p className="italic text-[var(--text-secondary)]">{item.example.query}</p>
                    <p className="font-semibold text-[var(--text-primary)] text-[11px] sm:text-xs">
                      {item.example.reply}
                    </p>
                  </div>
                </div>

                {/* Tangible Benefit */}
                <div className="pt-4 border-t border-[var(--border)] flex items-center gap-2 text-xs font-semibold text-emerald-700">
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
