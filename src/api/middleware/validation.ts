// Validation Middleware - Validación y sanitización de input
import { APIException } from '../../../types/api';

// ============================================
// Validation Types
// ============================================

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  items?: ValidationRule;
  properties?: Record<string, ValidationRule>;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: Record<string, any>;
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a value against a rule
 */
export function validateValue(value: any, rule: ValidationRule, fieldName: string): string | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }

  // Skip validation if not required and not provided
  if (value === undefined || value === null) {
    return null;
  }

  // Type validation
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `${fieldName} must be a string`;
      }
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `${fieldName} must be at least ${rule.minLength} characters`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `${fieldName} must be at most ${rule.maxLength} characters`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return `${fieldName} has invalid format`;
      }
      break;

    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) {
        return `${fieldName} must be a number`;
      }
      if (rule.min !== undefined && num < rule.min) {
        return `${fieldName} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && num > rule.max) {
        return `${fieldName} must be at most ${rule.max}`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
        return `${fieldName} must be a boolean`;
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        return `${fieldName} must be an array`;
      }
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `${fieldName} must have at least ${rule.minLength} items`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `${fieldName} must have at most ${rule.maxLength} items`;
      }
      if (rule.items) {
        for (let i = 0; i < value.length; i++) {
          const itemError = validateValue(value[i], rule.items, `${fieldName}[${i}]`);
          if (itemError) return itemError;
        }
      }
      break;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `${fieldName} must be an object`;
      }
      if (rule.properties) {
        for (const [propName, propRule] of Object.entries(rule.properties)) {
          const propError = validateValue(value[propName], propRule, `${fieldName}.${propName}`);
          if (propError) return propError;
        }
      }
      break;
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(value)) {
    return `${fieldName} must be one of: ${rule.enum.join(', ')}`;
  }

  // Custom validation
  if (rule.custom) {
    const customResult = rule.custom(value);
    if (customResult !== true) {
      return typeof customResult === 'string' ? customResult : `${fieldName} is invalid`;
    }
  }

  return null;
}

/**
 * Validate an object against a schema
 */
export function validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, any> = {};

  for (const [fieldName, rule] of Object.entries(schema)) {
    const value = data[fieldName];
    const error = validateValue(value, rule, fieldName);

    if (error) {
      errors[fieldName] = error;
    } else if (value !== undefined) {
      sanitized[fieldName] = sanitizeValue(value, rule);
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate and throw if invalid
 */
export function validateOrThrow(data: Record<string, any>, schema: ValidationSchema): Record<string, any> {
  const result = validate(data, schema);

  if (!result.valid) {
    throw APIException.validationError(result.errors);
  }

  return result.sanitized;
}

// ============================================
// Sanitization Functions
// ============================================

/**
 * Sanitize a value based on its type
 */
export function sanitizeValue(value: any, rule: ValidationRule): any {
  if (value === undefined || value === null) {
    return value;
  }

  switch (rule.type) {
    case 'string':
      return sanitizeString(String(value));

    case 'number':
      return typeof value === 'number' ? value : parseFloat(value);

    case 'boolean':
      if (typeof value === 'boolean') return value;
      return value === 'true' || value === '1';

    case 'array':
      if (!Array.isArray(value)) return [];
      if (rule.items) {
        return value.map(item => sanitizeValue(item, rule.items!));
      }
      return value;

    case 'object':
      if (typeof value !== 'object') return {};
      if (rule.properties) {
        const sanitized: Record<string, any> = {};
        for (const [propName, propRule] of Object.entries(rule.properties)) {
          if (value[propName] !== undefined) {
            sanitized[propName] = sanitizeValue(value[propName], propRule);
          }
        }
        return sanitized;
      }
      return value;

    default:
      return value;
  }
}

/**
 * Sanitize a string to prevent XSS and injection
 */
export function sanitizeString(value: string): string {
  return value
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitize for safe display (less aggressive)
 */
export function sanitizeForDisplay(value: string): string {
  return value
    .trim()
    .replace(/\0/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ============================================
// Common Schemas
// ============================================

export const COMMON_SCHEMAS = {
  pagination: {
    page: { type: 'number' as const, min: 1, required: false },
    perPage: { type: 'number' as const, min: 1, max: 100, required: false },
    sortBy: { type: 'string' as const, maxLength: 50, required: false },
    sortOrder: { type: 'string' as const, enum: ['asc', 'desc'], required: false }
  },

  id: {
    id: { type: 'string' as const, required: true, minLength: 1, maxLength: 100 }
  },

  createPoll: {
    question: { type: 'string' as const, required: true, minLength: 1, maxLength: 500 },
    options: { 
      type: 'array' as const, 
      required: true, 
      minLength: 2, 
      maxLength: 10,
      items: { type: 'string' as const, minLength: 1, maxLength: 100 }
    },
    duration: { type: 'number' as const, min: 0, max: 86400, required: false }
  },

  createPrediction: {
    title: { type: 'string' as const, required: true, minLength: 1, maxLength: 200 },
    outcomes: {
      type: 'array' as const,
      required: true,
      minLength: 2,
      maxLength: 10,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' as const, required: true, minLength: 1, maxLength: 100 }
        }
      }
    },
    duration: { type: 'number' as const, min: 0, max: 86400, required: false }
  },

  createGiveaway: {
    name: { type: 'string' as const, required: true, minLength: 1, maxLength: 200 },
    keyword: { type: 'string' as const, maxLength: 50, required: false },
    mode: { type: 'string' as const, enum: ['viewers', 'keyword', 'subs'], required: true },
    duration: { type: 'number' as const, min: 0, max: 86400, required: false }
  },

  createTimer: {
    name: { type: 'string' as const, required: true, minLength: 1, maxLength: 100 },
    duration: { type: 'number' as const, required: true, min: 1, max: 86400 },
    autoStart: { type: 'boolean' as const, required: false },
    sound: { type: 'string' as const, maxLength: 100, required: false }
  },

  switchScene: {
    sceneName: { type: 'string' as const, required: true, minLength: 1, maxLength: 200 }
  },

  setVisibility: {
    visible: { type: 'boolean' as const, required: true },
    sceneName: { type: 'string' as const, maxLength: 200, required: false }
  }
};

// ============================================
// Query Parameter Parsing
// ============================================

export function parseQueryParams(query: Record<string, string>): Record<string, any> {
  const parsed: Record<string, any> = {};

  for (const [key, value] of Object.entries(query)) {
    // Try to parse as number
    const num = parseFloat(value);
    if (!isNaN(num) && value === num.toString()) {
      parsed[key] = num;
      continue;
    }

    // Try to parse as boolean
    if (value === 'true') {
      parsed[key] = true;
      continue;
    }
    if (value === 'false') {
      parsed[key] = false;
      continue;
    }

    // Try to parse as JSON array/object
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        parsed[key] = JSON.parse(value);
        continue;
      } catch {
        // Not valid JSON, keep as string
      }
    }

    // Keep as string
    parsed[key] = value;
  }

  return parsed;
}
