/**
 * i18n Utility Functions
 * 
 * This file contains helper functions for the i18n system including:
 * - Variable interpolation in translation strings
 * - Locale-aware formatters for dates, numbers, etc.
 * - Pluralization helpers
 * 
 * @see REQ-5.2: Función helper para interpolación de variables mejorada
 * @see Design P3: Interpolación Válida
 */

import { Locale, InterpolationValues, DEFAULT_LOCALE } from './types';

// ============================================================================
// Interpolation
// ============================================================================

/**
 * Regular expression to match {{variable}} placeholders in translation strings
 */
const INTERPOLATION_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Interpolates variables into a translation string.
 * Replaces {{variable}} placeholders with corresponding values.
 * 
 * @param template - The translation string with {{variable}} placeholders
 * @param values - Object containing variable names and their values
 * @returns The interpolated string with all placeholders replaced
 * 
 * @example
 * interpolate("Hello, {{name}}!", { name: "World" })
 * // Returns: "Hello, World!"
 * 
 * @example
 * interpolate("You have {{count}} messages", { count: 5 })
 * // Returns: "You have 5 messages"
 * 
 * @example
 * interpolate("{{greeting}}, {{name}}!", { greeting: "Hi", name: "User" })
 * // Returns: "Hi, User!"
 */
export function interpolate(
  template: string,
  values: InterpolationValues = {}
): string {
  if (!template) return '';
  
  return template.replace(INTERPOLATION_REGEX, (match, key) => {
    const value = values[key];
    if (value === undefined || value === null) {
      // Return the original placeholder if no value is provided
      return match;
    }
    return String(value);
  });
}

/**
 * Extracts all variable names from a translation string.
 * Useful for validation to ensure all required variables are provided.
 * 
 * @param template - The translation string with {{variable}} placeholders
 * @returns Array of variable names found in the template
 * 
 * @example
 * extractVariables("Hello, {{name}}! You have {{count}} messages.")
 * // Returns: ["name", "count"]
 */
export function extractVariables(template: string): string[] {
  if (!template) return [];
  
  const variables: string[] = [];
  let match: RegExpExecArray | null;
  
  // Reset regex lastIndex for global regex
  INTERPOLATION_REGEX.lastIndex = 0;
  
  while ((match = INTERPOLATION_REGEX.exec(template)) !== null) {
    const varName = match[1];
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  
  return variables;
}

/**
 * Validates that all required variables in a template have corresponding values.
 * 
 * @param template - The translation string with {{variable}} placeholders
 * @param values - Object containing variable names and their values
 * @returns Object with validation result and any missing variables
 * 
 * @example
 * validateInterpolation("Hello, {{name}}!", { name: "World" })
 * // Returns: { isValid: true, missingVariables: [] }
 * 
 * @example
 * validateInterpolation("{{greeting}}, {{name}}!", { greeting: "Hi" })
 * // Returns: { isValid: false, missingVariables: ["name"] }
 */
export function validateInterpolation(
  template: string,
  values: InterpolationValues = {}
): { isValid: boolean; missingVariables: string[] } {
  const requiredVariables = extractVariables(template);
  const providedKeys = Object.keys(values);
  
  const missingVariables = requiredVariables.filter(
    (varName) => !providedKeys.includes(varName)
  );
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Formats a number according to the specified locale.
 * Uses the Intl.NumberFormat API for locale-aware formatting.
 * 
 * @param value - The number to format
 * @param locale - The locale to use for formatting
 * @param options - Optional Intl.NumberFormatOptions for customization
 * @returns The formatted number string
 * 
 * @example
 * formatNumber(1234567.89, 'es')
 * // Returns: "1.234.567,89" (Spanish format)
 * 
 * @example
 * formatNumber(1234567.89, 'en')
 * // Returns: "1,234,567.89" (English format)
 */
export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  const localeMap: Record<Locale, string> = {
    es: 'es-ES',
    en: 'en-US',
  };
  
  try {
    return new Intl.NumberFormat(localeMap[locale], options).format(value);
  } catch {
    // Fallback to basic string conversion if Intl is not available
    return String(value);
  }
}

/**
 * Formats a number as currency according to the specified locale.
 * 
 * @param value - The number to format
 * @param locale - The locale to use for formatting
 * @param currency - The currency code (default: EUR for es, USD for en)
 * @returns The formatted currency string
 * 
 * @example
 * formatCurrency(1234.56, 'es')
 * // Returns: "1.234,56 €"
 * 
 * @example
 * formatCurrency(1234.56, 'en')
 * // Returns: "$1,234.56"
 */
export function formatCurrency(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  currency?: string
): string {
  const currencyMap: Record<Locale, string> = {
    es: 'EUR',
    en: 'USD',
  };
  
  return formatNumber(value, locale, {
    style: 'currency',
    currency: currency || currencyMap[locale],
  });
}

/**
 * Formats a number as a percentage.
 * 
 * @param value - The number to format (0.5 = 50%)
 * @param locale - The locale to use for formatting
 * @param decimals - Number of decimal places (default: 0)
 * @returns The formatted percentage string
 * 
 * @example
 * formatPercent(0.756, 'es', 1)
 * // Returns: "75,6 %"
 * 
 * @example
 * formatPercent(0.756, 'en', 1)
 * // Returns: "75.6%"
 */
export function formatPercent(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  decimals: number = 0
): string {
  return formatNumber(value, locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formats a number in compact notation (e.g., 1K, 1M).
 * 
 * @param value - The number to format
 * @param locale - The locale to use for formatting
 * @returns The formatted compact number string
 * 
 * @example
 * formatCompactNumber(1500, 'es')
 * // Returns: "1,5 mil" or "1,5K" depending on locale
 * 
 * @example
 * formatCompactNumber(1500000, 'en')
 * // Returns: "1.5M"
 */
export function formatCompactNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE
): string {
  return formatNumber(value, locale, {
    notation: 'compact',
    compactDisplay: 'short',
  });
}

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Date format presets for common use cases
 */
export type DateFormatPreset = 
  | 'short'      // 12/31/2024 or 31/12/2024
  | 'medium'     // Dec 31, 2024 or 31 dic 2024
  | 'long'       // December 31, 2024 or 31 de diciembre de 2024
  | 'full'       // Tuesday, December 31, 2024 or martes, 31 de diciembre de 2024
  | 'time'       // 2:30 PM or 14:30
  | 'datetime'   // Dec 31, 2024, 2:30 PM or 31 dic 2024, 14:30
  | 'relative';  // 2 hours ago, in 3 days

/**
 * Formats a date according to the specified locale and format.
 * 
 * @param date - The date to format
 * @param locale - The locale to use for formatting
 * @param format - The format preset or custom Intl.DateTimeFormatOptions
 * @returns The formatted date string
 * 
 * @example
 * formatDate(new Date('2024-12-31'), 'es', 'medium')
 * // Returns: "31 dic 2024"
 * 
 * @example
 * formatDate(new Date('2024-12-31'), 'en', 'long')
 * // Returns: "December 31, 2024"
 */
export function formatDate(
  date: Date,
  locale: Locale = DEFAULT_LOCALE,
  format: DateFormatPreset | Intl.DateTimeFormatOptions = 'medium'
): string {
  const localeMap: Record<Locale, string> = {
    es: 'es-ES',
    en: 'en-US',
  };
  
  // Handle relative format separately
  if (format === 'relative') {
    return formatRelativeTime(date, locale);
  }
  
  // Map preset formats to Intl options
  const formatOptions: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
    short: { dateStyle: 'short' },
    medium: { dateStyle: 'medium' },
    long: { dateStyle: 'long' },
    full: { dateStyle: 'full' },
    time: { timeStyle: 'short' },
    datetime: { dateStyle: 'medium', timeStyle: 'short' },
    relative: {}, // Handled above
  };
  
  const options = typeof format === 'string' 
    ? formatOptions[format] 
    : format;
  
  try {
    return new Intl.DateTimeFormat(localeMap[locale], options).format(date);
  } catch {
    // Fallback to ISO string if Intl is not available
    return date.toISOString();
  }
}

/**
 * Formats a date as a relative time string (e.g., "2 hours ago", "in 3 days").
 * 
 * @param date - The date to format
 * @param locale - The locale to use for formatting
 * @returns The relative time string
 * 
 * @example
 * // If current time is 2024-01-01 12:00:00
 * formatRelativeTime(new Date('2024-01-01 10:00:00'), 'es')
 * // Returns: "hace 2 horas"
 * 
 * @example
 * formatRelativeTime(new Date('2024-01-04 12:00:00'), 'en')
 * // Returns: "in 3 days"
 */
export function formatRelativeTime(
  date: Date,
  locale: Locale = DEFAULT_LOCALE
): string {
  const localeMap: Record<Locale, string> = {
    es: 'es-ES',
    en: 'en-US',
  };
  
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);
  
  try {
    const rtf = new Intl.RelativeTimeFormat(localeMap[locale], { 
      numeric: 'auto' 
    });
    
    if (Math.abs(diffSeconds) < 60) {
      return rtf.format(diffSeconds, 'second');
    } else if (Math.abs(diffMinutes) < 60) {
      return rtf.format(diffMinutes, 'minute');
    } else if (Math.abs(diffHours) < 24) {
      return rtf.format(diffHours, 'hour');
    } else if (Math.abs(diffDays) < 7) {
      return rtf.format(diffDays, 'day');
    } else if (Math.abs(diffWeeks) < 4) {
      return rtf.format(diffWeeks, 'week');
    } else if (Math.abs(diffMonths) < 12) {
      return rtf.format(diffMonths, 'month');
    } else {
      return rtf.format(diffYears, 'year');
    }
  } catch {
    // Fallback for environments without Intl.RelativeTimeFormat
    const absSeconds = Math.abs(diffSeconds);
    const isPast = diffMs < 0;
    
    let value: number;
    let unit: string;
    
    if (absSeconds < 60) {
      value = Math.abs(diffSeconds);
      unit = locale === 'es' ? 'segundos' : 'seconds';
    } else if (Math.abs(diffMinutes) < 60) {
      value = Math.abs(diffMinutes);
      unit = locale === 'es' ? 'minutos' : 'minutes';
    } else if (Math.abs(diffHours) < 24) {
      value = Math.abs(diffHours);
      unit = locale === 'es' ? 'horas' : 'hours';
    } else {
      value = Math.abs(diffDays);
      unit = locale === 'es' ? 'días' : 'days';
    }
    
    if (locale === 'es') {
      return isPast ? `hace ${value} ${unit}` : `en ${value} ${unit}`;
    } else {
      return isPast ? `${value} ${unit} ago` : `in ${value} ${unit}`;
    }
  }
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * 
 * @param ms - Duration in milliseconds
 * @param locale - The locale to use for formatting
 * @returns The formatted duration string
 * 
 * @example
 * formatDuration(3661000, 'es')
 * // Returns: "1h 1m 1s"
 * 
 * @example
 * formatDuration(90000, 'en')
 * // Returns: "1m 30s"
 */
export function formatDuration(
  ms: number,
  locale: Locale = DEFAULT_LOCALE
): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  
  const parts: string[] = [];
  
  const labels: Record<Locale, { d: string; h: string; m: string; s: string }> = {
    es: { d: 'd', h: 'h', m: 'm', s: 's' },
    en: { d: 'd', h: 'h', m: 'm', s: 's' },
  };
  
  const l = labels[locale];
  
  if (days > 0) parts.push(`${days}${l.d}`);
  if (hours > 0) parts.push(`${hours}${l.h}`);
  if (minutes > 0) parts.push(`${minutes}${l.m}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}${l.s}`);
  
  return parts.join(' ');
}

// ============================================================================
// Pluralization
// ============================================================================

/**
 * Simple pluralization helper for basic singular/plural cases.
 * 
 * @param count - The count to determine singular or plural
 * @param singular - The singular form of the word
 * @param plural - The plural form of the word
 * @returns The appropriate form based on count
 * 
 * @example
 * pluralize(1, "message", "messages")
 * // Returns: "message"
 * 
 * @example
 * pluralize(5, "message", "messages")
 * // Returns: "messages"
 */
export function pluralize(
  count: number,
  singular: string,
  plural: string
): string {
  return count === 1 ? singular : plural;
}

/**
 * Pluralization with count included in the result.
 * 
 * @param count - The count to determine singular or plural
 * @param singular - The singular form of the word
 * @param plural - The plural form of the word
 * @param locale - The locale for number formatting
 * @returns The count followed by the appropriate form
 * 
 * @example
 * pluralizeWithCount(1, "message", "messages", 'en')
 * // Returns: "1 message"
 * 
 * @example
 * pluralizeWithCount(1000, "usuario", "usuarios", 'es')
 * // Returns: "1.000 usuarios"
 */
export function pluralizeWithCount(
  count: number,
  singular: string,
  plural: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  const formattedCount = formatNumber(count, locale);
  const word = pluralize(count, singular, plural);
  return `${formattedCount} ${word}`;
}

/**
 * Advanced pluralization supporting zero, one, and many forms.
 * Useful for languages that have special forms for zero.
 * 
 * @param count - The count to determine the form
 * @param forms - Object with zero, one, and many forms
 * @returns The appropriate form based on count
 * 
 * @example
 * pluralizeAdvanced(0, { zero: "No messages", one: "1 message", many: "{{count}} messages" })
 * // Returns: "No messages"
 */
export function pluralizeAdvanced(
  count: number,
  forms: { zero?: string; one: string; many: string }
): string {
  if (count === 0 && forms.zero !== undefined) {
    return forms.zero;
  }
  if (count === 1) {
    return forms.one;
  }
  return forms.many;
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Capitalizes the first letter of a string.
 * 
 * @param str - The string to capitalize
 * @returns The string with the first letter capitalized
 * 
 * @example
 * capitalize("hello world")
 * // Returns: "Hello world"
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a maximum length, adding ellipsis if truncated.
 * 
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - The ellipsis string to append (default: "...")
 * @returns The truncated string
 * 
 * @example
 * truncate("Hello, this is a long message", 15)
 * // Returns: "Hello, this is..."
 */
export function truncate(
  str: string,
  maxLength: number,
  ellipsis: string = '...'
): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}

// ============================================================================
// List Formatting
// ============================================================================

/**
 * Formats a list of items according to the locale.
 * 
 * @param items - Array of items to format
 * @param locale - The locale to use for formatting
 * @param type - The type of list (conjunction "and", disjunction "or", unit)
 * @returns The formatted list string
 * 
 * @example
 * formatList(["apples", "oranges", "bananas"], 'en', 'conjunction')
 * // Returns: "apples, oranges, and bananas"
 * 
 * @example
 * formatList(["manzanas", "naranjas", "plátanos"], 'es', 'conjunction')
 * // Returns: "manzanas, naranjas y plátanos"
 */
export function formatList(
  items: string[],
  locale: Locale = DEFAULT_LOCALE,
  type: 'conjunction' | 'disjunction' | 'unit' = 'conjunction'
): string {
  const localeMap: Record<Locale, string> = {
    es: 'es-ES',
    en: 'en-US',
  };
  
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  
  try {
    return new Intl.ListFormat(localeMap[locale], { 
      style: 'long', 
      type 
    }).format(items);
  } catch {
    // Fallback for environments without Intl.ListFormat
    const conjunction = locale === 'es' 
      ? (type === 'disjunction' ? ' o ' : ' y ')
      : (type === 'disjunction' ? ' or ' : ' and ');
    
    if (items.length === 2) {
      return items.join(conjunction);
    }
    
    const lastItem = items[items.length - 1];
    const otherItems = items.slice(0, -1);
    return otherItems.join(', ') + conjunction + lastItem;
  }
}

// ============================================================================
// Ordinal Formatting
// ============================================================================

/**
 * Formats a number as an ordinal (1st, 2nd, 3rd, etc.).
 * 
 * @param num - The number to format as ordinal
 * @param locale - The locale to use for formatting
 * @returns The ordinal string
 * 
 * @example
 * formatOrdinal(1, 'en')
 * // Returns: "1st"
 * 
 * @example
 * formatOrdinal(2, 'es')
 * // Returns: "2º"
 */
export function formatOrdinal(
  num: number,
  locale: Locale = DEFAULT_LOCALE
): string {
  if (locale === 'es') {
    // Spanish uses º for masculine ordinals
    return `${num}º`;
  }
  
  // English ordinal rules
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  return `${num}${suffix}`;
}
