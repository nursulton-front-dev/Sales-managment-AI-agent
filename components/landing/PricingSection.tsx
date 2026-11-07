'use client';

import React from 'react';
import Link from 'next/link';
import { LandingContent } from '@/lib/landing/content';
import { Check, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface PricingSectionProps {
  content: LandingContent;
}

export function PricingSection({ content }: PricingSectionProps) {
  const { pricing } = content;

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-slate-50/70 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#DC2626] px-3 py-1 bg-red-50 rounded-full border border-red-100">
            {pricing.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {pricing.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            {pricing.subtitle}
          </p>
        </div>

        {/* Free Trial Hero Banner */}
        <div className="max-w-4xl mx-auto mb-12 rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-50/50 border border-red-200/80 p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#DC2626] text-white text-[11px] font-bold">
              {pricing.trialBadge}
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              100 бесплатных ответов на 3 дня
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              {pricing.trialText}
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] transition-all shrink-0 shadow-xs"
          >
            <span>{pricing.ctaTrial}</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch mb-10">
          {pricing.plans.map((p) => {
            const isFeatured = Boolean(p.badge);

            return (
              <div
                key={p.id}
                className={`relative rounded-2xl bg-white border flex flex-col justify-between p-7 sm:p-8 transition-all duration-150 ${
                  isFeatured
                    ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20 shadow-lg'
                    : 'border-slate-200 shadow-xs hover:border-slate-300'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full bg-[#DC2626] text-white text-[11px] font-bold tracking-wide uppercase shadow-xs">
                      {p.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Title & Audience */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{p.audience}</p>
                  </div>

                  {/* Price Block */}
                  <div className="space-y-1 pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                        {p.priceUsd}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {pricing.monthPeriod}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-600">
                      ≈ {p.priceUzs}
                    </div>
                    <div className="inline-block mt-2 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-bold">
                      {p.tokens}
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
                    {p.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2.5">
                        <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Button */}
                <div className="pt-8 mt-6 border-t border-slate-100">
                  <Link
                    href="/register"
                    className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                      isFeatured
                        ? 'bg-[#DC2626] hover:bg-[#b91c1c] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    <span>{pricing.ctaSelect}</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Token Explanation & Payment Note */}
        <div className="max-w-3xl mx-auto space-y-3 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">
            {pricing.tokenExplanation}
          </p>
          <p className="leading-relaxed bg-white/80 p-4 rounded-xl border border-slate-200/80">
            {pricing.paymentStatusNote}
          </p>
        </div>
      </div>
    </section>
  );
}
