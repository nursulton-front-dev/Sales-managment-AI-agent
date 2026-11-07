/**
 * AI Agent Setup Wizard Type Definitions
 * gapcha AI · Structured Agent Drafting Architecture
 */

export type WizardNiche = 'courses' | 'marketing' | 'services' | 'other';
export type WizardTone = 'friendly' | 'professional' | 'consultative' | 'persuasive';
export type WizardLanguage = 'ru' | 'uz' | 'en';

export interface AgentDraft {
  name: string;
  nicheTemplate: WizardNiche;
  targetGoal: string;
  languages: WizardLanguage[];
  tone: WizardTone;
  servicesAndPricing: string;
  qualificationQuestions: string[];
  restrictions: string[]; // Forbidden promises, discount rules
  handoverConditions: string[]; // When to transfer to human operator
  googleCalendarConnected: boolean;
  workingHours?: string;
  channels: ('telegram' | 'instagram' | 'widget')[];
  unresolvedQuestions: string[]; // Items requiring owner clarification
  currentStep: 1 | 2 | 3 | 4; // 1: Бизнес, 2: Знания, 3: Проверка, 4: Запуск
  updatedAt: string;
}

export interface WizardMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedAnswers?: string[];
  stepBadge?: 1 | 2 | 3 | 4;
}

export interface WizardChatRequest {
  message: string;
  draft: AgentDraft;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  lang?: 'ru' | 'uz';
  attachedText?: string;
}

export interface WizardChatResponse {
  success: boolean;
  reply: string;
  updatedDraft: AgentDraft;
  suggestedAnswers?: string[];
  error?: string;
}

export interface WizardSandboxRequest {
  message: string;
  draft: AgentDraft;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  tuningInstruction?: string;
  lang?: 'ru' | 'uz';
}

export interface WizardSandboxResponse {
  success: boolean;
  reply: string;
  simulatedAction?: {
    type: 'calendar_check' | 'lead_qualified' | 'handover';
    details: string;
  };
  error?: string;
}
