'use client';

import React, { useState } from 'react';
import { LandingContent } from '@/lib/landing/content';
import { SparrowMascot } from '@/components/ui/SparrowMascot';
import { MessageSquare, ShieldCheck, UserCheck, Sparkles, AlertCircle } from 'lucide-react';

interface ProductDemoSectionProps {
  content: LandingContent;
}

export function ProductDemoSection({ content }: ProductDemoSectionProps) {
  const { demo } = content;
  const [activeTabId, setActiveTabId] = useState(demo.tabs[0]?.id || 'inquiry');

  const activeTab = demo.tabs.find((t) => t.id === activeTabId) || demo.tabs[0];

  return (
    <section id="demo" className="py-20 sm:py-28 bg-slate-50/60 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-[#DC2626] px-3 py-1 bg-red-50 rounded-full border border-red-100">
            {demo.tag}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {demo.title}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
            {demo.subtitle}
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10" role="tablist">
          {demo.tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTabId(tab.id)}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Demo Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Chat Preview Canvas */}
          <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200 shadow-md overflow-hidden">
            {/* Window Header */}
            <div className="px-5 py-3.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-slate-300 inline-block" />
                <span className="size-3 rounded-full bg-slate-300 inline-block" />
                <span className="size-3 rounded-full bg-slate-300 inline-block" />
                <span className="ml-2 text-xs font-bold text-slate-700">
                  {activeTab.title}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                Живая демонстрация
              </span>
            </div>

            {/* Chat Body */}
            <div className="p-6 sm:p-8 space-y-4 bg-white min-h-[320px] flex flex-col justify-center">
              {activeTab.messages.map((msg, index) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={index} className="flex justify-center my-2">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/70 text-amber-800 text-xs font-medium">
                        <AlertCircle size={14} className="shrink-0 text-amber-600" />
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                const isClient = msg.sender === 'client';
                const isAi = msg.sender === 'ai';
                const isOperator = msg.sender === 'operator';

                return (
                  <div
                    key={index}
                    className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[11px] font-medium text-slate-400 mb-1 px-1">
                      {msg.senderName}
                    </span>
                    <div
                      className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                        isClient
                          ? 'bg-slate-100 text-slate-900 rounded-tr-xs'
                          : isAi
                          ? 'bg-[#DC2626]/5 border border-[#DC2626]/15 text-slate-900 rounded-tl-xs'
                          : 'bg-emerald-50 border border-emerald-200/70 text-emerald-950 rounded-tl-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                      <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-slate-400">
                        {msg.badge ? (
                          <span
                            className={`font-semibold ${
                              isAi
                                ? 'text-[#DC2626]'
                                : isOperator
                                ? 'text-emerald-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {msg.badge}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span>{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side Explanation & Controls */}
          <div className="lg:col-span-4 space-y-6">
            {/* Mascot Accent: Invitation to configure with AI Wizard */}
            <div className="rounded-2xl bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-200/70 p-5 space-y-2.5 shadow-xs flex items-start gap-3.5">
              <SparrowMascot variant="hello" size={48} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  {content.lang === 'uz' ? 'AI-Usta bilan tez sozlash' : 'Настройка с ИИ-мастером'}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  {content.lang === 'uz'
                    ? 'Yordamchi har qadamda bittadan savol beradi va tayyor ish ssenariysini shakllantiradi.'
                    : 'Интерактивный помощник задаст 1 вопрос за шаг и сформирует готовый сценарий.'}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold text-sm">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  {activeTab.sideNoteTitle}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {activeTab.sideNoteText}
              </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-3 shadow-xs text-xs sm:text-sm text-slate-600">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Что видит менеджер:
              </h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>Весь диалог сохраняется в реальном времени.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>Лид автоматически появляется в воронке без дублей.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span>При сообщении человека бот не спорит и замолкает.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
