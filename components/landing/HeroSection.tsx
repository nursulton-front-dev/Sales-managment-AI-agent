'use client';

import React from 'react';
import Link from 'next/link';
import { LandingContent } from '@/lib/landing/content';
import { ArrowRight, CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  content: LandingContent;
}

export function HeroSection({ content }: HeroSectionProps) {
  const { hero } = content;

  return (
    <section className="relative pt-24 sm:pt-32 lg:pt-36 pb-16 sm:pb-24 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white">
      {/* Subtle background grid pattern */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a0a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a0a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200/80 text-[#DC2626] text-xs font-semibold shadow-xs">
              <span className="size-2 rounded-full bg-[#DC2626] animate-pulse" />
              <span>{hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-extrabold tracking-tight text-slate-900 leading-[1.12]">
              {hero.headline}{' '}
              <span className="text-[#DC2626] underline decoration-red-200 decoration-wavy decoration-2 underline-offset-8">
                {hero.headlineAccent}
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {hero.subhead}
            </p>

            {/* Call To Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 sm:gap-4 pt-1">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-white bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] transition-all shadow-md hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-2"
              >
                <span>{hero.ctaPrimary}</span>
                <ArrowRight size={18} />
              </Link>
              <a
                href="#demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm sm:text-base text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <span>{hero.ctaSecondary}</span>
              </a>
            </div>

            {/* Reassurance text */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs sm:text-sm text-slate-500 font-medium">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>{hero.trialNote}</span>
            </div>
          </div>

          {/* Right Column: Hero Product Preview (Crisp Dialogue Card) */}
          <div className="lg:col-span-5 max-w-lg mx-auto lg:max-w-none w-full">
            <div className="relative rounded-2xl bg-white border border-slate-200/90 shadow-xl p-5 sm:p-6 space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-red-100/70 text-[#DC2626] flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      {hero.dialogCard.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {hero.dialogCard.channelBadge}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {hero.dialogCard.statusBadge}
                </span>
              </div>

              {/* Chat Message Sequence */}
              <div className="space-y-3 text-xs sm:text-sm leading-relaxed">
                {/* 1. Client Question */}
                <div className="flex justify-end">
                  <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[88%] shadow-2xs">
                    <p>{hero.dialogCard.clientQuestion}</p>
                    <span className="block text-[10px] text-slate-400 text-right mt-1">
                      10:14
                    </span>
                  </div>
                </div>

                {/* 2. AI Assistant Answer */}
                <div className="flex justify-start">
                  <div className="bg-[#DC2626]/5 border border-[#DC2626]/15 text-slate-900 rounded-2xl rounded-tl-xs px-4 py-2.5 max-w-[92%] shadow-2xs">
                    <p className="font-normal">{hero.dialogCard.assistantAnswer}</p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                      <span className="inline-flex items-center gap-1 text-[#DC2626] font-medium">
                        <Sparkles size={11} />
                        База знаний
                      </span>
                      <span>10:14 • 1.2 сек</span>
                    </div>
                  </div>
                </div>

                {/* 3. Client Followup */}
                <div className="flex justify-end">
                  <div className="bg-slate-100 text-slate-800 rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[88%] shadow-2xs">
                    <p>{hero.dialogCard.clientFollowup}</p>
                    <span className="block text-[10px] text-slate-400 text-right mt-1">
                      10:15
                    </span>
                  </div>
                </div>

                {/* 4. AI Assistant Closing */}
                <div className="flex justify-start">
                  <div className="bg-[#DC2626]/5 border border-[#DC2626]/15 text-slate-900 rounded-2xl rounded-tl-xs px-4 py-2.5 max-w-[92%] shadow-2xs">
                    <p className="font-normal">{hero.dialogCard.assistantClosing}</p>
                    <span className="block text-[10px] text-slate-400 text-right mt-1">
                      10:15
                    </span>
                  </div>
                </div>
              </div>

              {/* CRM Lead Footnote */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] sm:text-xs text-slate-600 font-medium">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{hero.dialogCard.leadStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
