/**
 * AI Agent Setup Wizard — Prompt & Knowledge Base Compiler
 * Transforms structured AgentDraft into production-grade agent parameters
 */

import { AgentDraft } from './types';
import { getUniversalConversationalRules, NICHE_SCENARIOS } from '@/lib/ai/prompts/niche-scenarios';

export interface CompiledAgentParams {
  name: string;
  nicheTemplate: string;
  systemPrompt: string;
  knowledgeBase: string;
  qualificationQuestions: string[];
  googleCalendarConnected: boolean;
  isActive: boolean;
}

export function compileAgentDraft(draft: AgentDraft): CompiledAgentParams {
  const nicheConfig = NICHE_SCENARIOS[draft.nicheTemplate] || NICHE_SCENARIOS.courses;

  const toneInstruction = {
    friendly: 'Тон общения: дружелюбный, тёплый, поддерживающий, но без панибратства.',
    professional: 'Тон общения: деловой, сдержанный, точный и структурированный.',
    consultative: 'Тон общения: экспертный, консультативный, ориентированный на помощь в выборе оптимального решения.',
    persuasive: 'Тон общения: уверенный, убедительный, фокусирующийся на ценности и выгоде клиента.',
  }[draft.tone] || 'Тон общения: консультативный, доброжелательный и профессиональный.';

  const restrictionsList = draft.restrictions && draft.restrictions.length > 0
    ? draft.restrictions.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : '1. Не придумывать несуществующие скидки или гарантии.\n2. Не давать юридических или медицинских гарантий без осмотра.';

  const handoverList = draft.handoverConditions && draft.handoverConditions.length > 0
    ? draft.handoverConditions.map((h, i) => `${i + 1}. ${h}`).join('\n')
    : '1. Клиент просит связать с живым менеджером или руководством.\n2. Возникла нестандартная жалоба или претензия.';

  const qualificationList = draft.qualificationQuestions && draft.qualificationQuestions.length > 0
    ? draft.qualificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : '1. Какой продукт или услуга вас интересует?\n2. В какой день вам удобно получить консультацию?\n3. Контактный номер телефона для связи.';

  const systemPrompt = `ВЫ — ${draft.name.toUpperCase()}, ОФИЦИАЛЬНЫЙ ИИ-СОТРУДНИК КОМПАНИИ.
ЦЕЛЬ ВАШЕЙ РАБОТЫ:
${draft.targetGoal}

${toneInstruction}

ЯЗЫКИ ОБСЛУЖИВАНИЯ:
- Русский и Узбекский (lotin).
- Автоматически отвечай на том языке, на котором обратился клиент. Не смешивай языки.

УСЛУГИ И ПОДТВЕРЖДЁННЫЙ ПРАЙС-ЛИСТ (СТРОГО ИЗ БАЗЫ ЗНАНИЙ):
${draft.servicesAndPricing}

ВОПРОСЫ ДЛЯ КВАЛИФИКАЦИИ КЛИЕНТА (ЗАДАВАЙ СТРОГО ПО ОДНОМУ ЗА РАЗ):
${qualificationList}

СТРОГИЕ ЗАПРЕТЫ И ОГРАНИЧЕНИЯ:
${restrictionsList}

УСЛОВИЯ ПЕРЕДАЧИ ДИАЛОГА ЧЕЛОВЕКУ (HUMAN TAKEOVER):
${handoverList}

${nicheConfig.systemPromptGuidance}

${getUniversalConversationalRules()}`;

  const knowledgeBase = `БАЗА ЗНАНИЙ СОТРУДНИКА: ${draft.name}
СФЕРА ДЕЯТЕЛЬНОСТИ: ${draft.nicheTemplate}

1. ПОДТВЕРЖДЕННЫЙ ПРАЙС И УСЛУГИ:
${draft.servicesAndPricing}

2. ВОПРОСЫ КВАЛИФИКАЦИИ:
${qualificationList}

3. ПРАВИЛА И ОГРАНИЧЕНИЯ:
${restrictionsList}

4. ПЕРЕДАЧА ОПЕРАТОРУ:
${handoverList}`;

  return {
    name: draft.name.trim() || 'ИИ-Сотрудник gapcha AI',
    nicheTemplate: draft.nicheTemplate,
    systemPrompt: systemPrompt.slice(0, 30000),
    knowledgeBase: knowledgeBase.slice(0, 50000),
    qualificationQuestions: draft.qualificationQuestions.slice(0, 20),
    googleCalendarConnected: Boolean(draft.googleCalendarConnected),
    isActive: true,
  };
}
