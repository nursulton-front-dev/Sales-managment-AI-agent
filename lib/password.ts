import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as en from '@zxcvbn-ts/language-en';

// Initialize singleton evaluator with common graphs and English dictionary
const evaluator = new ZxcvbnFactory({
  translations: en.translations,
  graphs: common.adjacencyGraphs,
  dictionary: {
    ...common.dictionary,
    ...en.dictionary,
  },
});

export type PasswordStrengthLevel = 'empty' | 'weak' | 'medium' | 'good' | 'strong';

export interface PasswordStrengthResult {
  score: number; // 0..4
  level: PasswordStrengthLevel;
  percent: number; // 0, 25, 50, 75, 100
  label: string;
  hint: string;
  widthClass: string;
  colorClass: string;
  textColorClass: string;
  isValid: boolean;
  error?: string;
}

const RUSSIAN_WARNINGS: Record<string, string> = {
  'This is a top-10 common password': 'Это один из самых частых паролей',
  'This is a top-100 common password': 'Это очень распространённый пароль',
  'This is a very common password': 'Это очень частый пароль',
  'This is similar to a commonly used password': 'Похоже на распространённый пароль',
  'A word by itself is easy to guess': 'Одно слово слишком легко угадать',
  'Names and surnames by themselves are easy to guess': 'Имена и фамилии легко угадать',
  'Common names and surnames are easy to guess': 'Популярные имена легко угадать',
  'Straight rows of keys are easy to guess': 'Последовательности клавиш легко угадать',
  'Short keyboard patterns are easy to guess': 'Простые клавиатурные шаблоны легко подобрать',
  'Repeats like "aaa" are easy to guess': 'Повторяющиеся символы легко подобрать',
  'Repeats like "abcabcabc" are only slightly harder to guess than "abc"': 'Повторы фраз легко подобрать',
  'Sequences like abc or 6543 are easy to guess': 'Числовые или буквенные ряды легко угадать',
  'Recent years are easy to guess': 'Год в пароле легко угадать',
  'Dates are often easy to guess': 'Даты легко подобрать',
};

const RUSSIAN_SUGGESTIONS: Record<string, string> = {
  'Use a few words, avoid common phrases': 'Используйте несколько несвязанных слов',
  'No need for symbols, digits, or uppercase letters': 'Сделайте пароль длиннее из нескольких слов',
  'Add another word or two. Uncommon words are better.': 'Добавьте ещё одно-два редких слова',
  'Avoid repeated words and characters': 'Избегайте повторения одинаковых букв или цифр',
  'Avoid sequences': 'Избегайте простых последовательностей (1234, abcd)',
  'Avoid recent years': 'Не используйте текущие или недавние годы',
  'Avoid years that are associated with you': 'Не используйте памятные годы',
  'Avoid dates and years that are associated with you': 'Не используйте даты рождения',
  'Capitalization doesn\'t help very much': 'Одной заглавной буквы недостаточно',
  'All-uppercase is almost as easy to guess as all-lowercase': 'Пароль из одних заглавных букв не становится надёжнее',
  'Reversed words aren\'t much harder to guess': 'Слова задом наперёд легко разгадать',
  'Predictable substitutions like "@" for "a" don\'t help very much': 'Простые замены вроде @ вместо a легко предсказуемы',
};

function translateFeedback(warning?: string | null, suggestions?: string[]): string {
  if (warning && RUSSIAN_WARNINGS[warning]) {
    return RUSSIAN_WARNINGS[warning];
  }
  if (suggestions && suggestions.length > 0) {
    const first = suggestions[0];
    if (RUSSIAN_SUGGESTIONS[first]) {
      return RUSSIAN_SUGGESTIONS[first];
    }
  }
  return '';
}

/**
 * Evaluates password strength locally using zxcvbn-ts.
 * Returns level, percentage, color classes, and improvement hints.
 */
export function evaluatePassword(password: string): PasswordStrengthResult {
  if (!password || password.length === 0) {
    return {
      score: 0,
      level: 'empty',
      percent: 0,
      label: '',
      hint: '',
      widthClass: 'w-0',
      colorClass: 'bg-transparent',
      textColorClass: 'text-slate-400',
      isValid: false,
    };
  }

  const result = evaluator.check(password);
  const rawScore = result.score; // 0, 1, 2, 3, 4
  const feedbackHint = translateFeedback(result.feedback.warning, result.feedback.suggestions);

  // Level 1: Weak (0 or 1) -> 25%, Red
  if (rawScore <= 1) {
    const hint = feedbackHint || (password.length < 8 ? 'Минимум 8 символов' : 'Добавьте редкие слова, цифры или символы');
    return {
      score: rawScore,
      level: 'weak',
      percent: 25,
      label: 'Слабый',
      hint,
      widthClass: 'w-1/4',
      colorClass: 'bg-rose-500',
      textColorClass: 'text-rose-600 dark:text-rose-400',
      isValid: false,
      error: 'Пароль слишком слабый. Добавьте уникальные слова или символы.',
    };
  }

  // Level 2: Medium (2) -> 50%, Orange
  if (rawScore === 2) {
    const hint = feedbackHint || 'Сделайте пароль длиннее или добавьте спецсимволы';
    const isLengthOk = password.length >= 8;
    return {
      score: 2,
      level: 'medium',
      percent: 50,
      label: 'Средний',
      hint,
      widthClass: 'w-2/4',
      colorClass: 'bg-amber-500',
      textColorClass: 'text-amber-600 dark:text-amber-400',
      isValid: isLengthOk,
      error: isLengthOk ? undefined : 'Пароль должен содержать не менее 8 символов',
    };
  }

  // Level 3: Good (3) -> 75%, Blue / Teal
  if (rawScore === 3) {
    const isLengthOk = password.length >= 8;
    return {
      score: 3,
      level: 'good',
      percent: 75,
      label: 'Хороший',
      hint: 'Хороший пароль, подходит для защиты аккаунта',
      widthClass: 'w-3/4',
      colorClass: 'bg-blue-500',
      textColorClass: 'text-blue-600 dark:text-blue-400',
      isValid: isLengthOk,
      error: isLengthOk ? undefined : 'Пароль должен содержать не менее 8 символов',
    };
  }

  // Level 4: Strong (4) -> 100%, Green
  const isLengthOk = password.length >= 8;
  return {
    score: 4,
    level: 'strong',
    percent: 100,
    label: 'Надёжный',
    hint: 'Отличный сложный пароль',
    widthClass: 'w-full',
    colorClass: 'bg-emerald-500',
    textColorClass: 'text-emerald-600 dark:text-emerald-400',
    isValid: isLengthOk,
    error: isLengthOk ? undefined : 'Пароль должен содержать не менее 8 символов',
  };
}

/**
 * Shared password policy validation for client and server.
 * Applies to new account creation and password resets.
 * Does not block legacy logins.
 */
export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Введите пароль' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Пароль должен содержать минимум 8 символов' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Пароль не должен превышать 128 символов' };
  }

  const evaluation = evaluatePassword(password);
  if (!evaluation.isValid) {
    return {
      valid: false,
      error: evaluation.error || 'Пароль слишком слабый. Добавьте уникальные слова или символы.',
    };
  }

  return { valid: true };
}
