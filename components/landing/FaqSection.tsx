'use client';

import React, { useState } from 'react';
import { LandingContent } from '@/lib/landing/content';
import { ChevronDown } from 'lucide-react';

interface FaqSectionProps {
  content: LandingContent;
}

export function FaqSection({ content }: FaqSectionProps) {
  const { faq } = content;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 bg-[var(--surface)] border-t border-[var(--border)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[var(--accent)] px-3 py-1 bg-[var(--accent-soft)] rounded-full border border-[var(--accent)]/20">
            {faq.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {faq.title}
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed font-normal">
            {faq.subtitle}
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faq.items.map((item, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--border)]/90 overflow-hidden bg-[var(--surface)] transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-[var(--text-primary)] text-sm sm:text-base hover:bg-[var(--background)]/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                >
                  <span className="leading-snug">{item.question}</span>
                  <ChevronDown
                    size={20}
                    className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[var(--accent)]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    className="px-5 pb-5 sm:px-6 sm:pb-6 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal border-t border-[var(--border)] pt-3"
                  >
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
