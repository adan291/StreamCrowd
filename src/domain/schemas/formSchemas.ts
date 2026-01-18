/**
 * Form Validation Schemas
 * 
 * Zod validation schemas for all application forms.
 * These schemas provide type-safe validation for user input
 * before submission to APIs or database operations.
 * 
 * @module domain/schemas/formSchemas
 * @requirements 5.1, 5.2, 5.3 - Input validation with Zod schemas
 */

import { z } from 'zod';

// ============================================================================
// Reward Form Schema
// ============================================================================

/**
 * Schema for Twitch Channel Point Reward form data
 * Validates all fields according to Twitch API constraints
 */
export const RewardFormSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(45, 'El título no puede exceder 45 caracteres')
    .trim(),
  
  cost: z
    .number()
    .int('El costo debe ser un número entero')
    .min(1, 'El costo mínimo es 1 punto')
    .max(999999999, 'El costo máximo es 999,999,999 puntos'),
  
  prompt: z
    .string()
    .max(200, 'La descripción no puede exceder 200 caracteres')
    .trim()
    .optional(),
  
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser un código hexadecimal válido (#RRGGBB)'),
  
  isUserInputRequired: z.boolean(),
  
  isEnabled: z.boolean(),
  
  globalCooldownEnabled: z.boolean(),
  
  globalCooldownSeconds: z
    .number()
    .int('El cooldown debe ser un número entero')
    .min(1, 'El cooldown mínimo es 1 segundo')
    .max(2592000, 'El cooldown máximo es 30 días (2,592,000 segundos)')
    .optional(),
  
  maxPerStreamEnabled: z.boolean(),
  
  maxPerStream: z
    .number()
    .int('El límite debe ser un número entero')
    .min(1, 'El límite mínimo es 1')
    .optional(),
  
  maxPerUserPerStreamEnabled: z.boolean(),
  
  maxPerUserPerStream: z
    .number()
    .int('El límite debe ser un número entero')
    .min(1, 'El límite mínimo es 1')
    .optional(),
}).refine(
  (data) => {
    // If cooldown is enabled, cooldown seconds must be provided
    if (data.globalCooldownEnabled && !data.globalCooldownSeconds) {
      return false;
    }
    return true;
  },
  {
    message: 'El cooldown es requerido cuando está habilitado',
    path: ['globalCooldownSeconds'],
  }
).refine(
  (data) => {
    // If max per stream is enabled, value must be provided
    if (data.maxPerStreamEnabled && !data.maxPerStream) {
      return false;
    }
    return true;
  },
  {
    message: 'El límite por stream es requerido cuando está habilitado',
    path: ['maxPerStream'],
  }
).refine(
  (data) => {
    // If max per user is enabled, value must be provided
    if (data.maxPerUserPerStreamEnabled && !data.maxPerUserPerStream) {
      return false;
    }
    return true;
  },
  {
    message: 'El límite por usuario es requerido cuando está habilitado',
    path: ['maxPerUserPerStream'],
  }
);

// ============================================================================
// Prediction Form Schema
// ============================================================================

/**
 * Schema for Twitch Prediction form data
 * Validates title, outcomes, and duration according to Twitch API constraints
 */
export const PredictionFormSchema = z.object({
  title: z
    .string()
    .min(1, 'El título es requerido')
    .max(45, 'El título no puede exceder 45 caracteres')
    .trim(),
  
  outcomes: z
    .array(
      z
        .string()
        .min(1, 'La opción no puede estar vacía')
        .max(25, 'La opción no puede exceder 25 caracteres')
        .trim()
    )
    .min(2, 'Se requieren al menos 2 opciones')
    .max(10, 'Máximo 10 opciones permitidas')
    .refine(
      (outcomes) => {
        // Check for duplicate outcomes (case-insensitive)
        const uniqueOutcomes = new Set(outcomes.map(o => o.toLowerCase()));
        return uniqueOutcomes.size === outcomes.length;
      },
      {
        message: 'Las opciones deben ser únicas',
      }
    ),
  
  duration: z
    .number()
    .int('La duración debe ser un número entero')
    .min(30, 'La duración mínima es 30 segundos')
    .max(1800, 'La duración máxima es 1800 segundos (30 minutos)'),
});

// ============================================================================
// Poll Form Schema
// ============================================================================

/**
 * Schema for Twitch Poll form data
 * Validates title, choices, and duration
 */
export const PollFormSchema = z.object({
  title: z
    .string()
    .min(1, 'La pregunta es requerida')
    .max(60, 'La pregunta no puede exceder 60 caracteres')
    .trim(),
  
  choices: z
    .array(
      z
        .string()
        .min(1, 'La opción no puede estar vacía')
        .max(25, 'La opción no puede exceder 25 caracteres')
        .trim()
    )
    .min(2, 'Se requieren al menos 2 opciones')
    .max(5, 'Máximo 5 opciones permitidas')
    .refine(
      (choices) => {
        // Check for duplicate choices (case-insensitive)
        const uniqueChoices = new Set(choices.map(c => c.toLowerCase()));
        return uniqueChoices.size === choices.length;
      },
      {
        message: 'Las opciones deben ser únicas',
      }
    ),
  
  duration: z
    .number()
    .int('La duración debe ser un número entero')
    .min(15, 'La duración mínima es 15 segundos')
    .max(1800, 'La duración máxima es 1800 segundos (30 minutos)'),
});

// ============================================================================
// Connection Form Schema
// ============================================================================

/**
 * Schema for Twitch connection form data
 * Validates channel name and optional OAuth token
 */
export const ConnectionFormSchema = z.object({
  channel: z
    .string()
    .min(3, 'El nombre del canal debe tener al menos 3 caracteres')
    .max(25, 'El nombre del canal no puede exceder 25 caracteres')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'El nombre del canal solo puede contener letras, números y guiones bajos'
    )
    .trim()
    .toLowerCase(),
  
  token: z
    .string()
    .regex(
      /^(oauth:)?[a-zA-Z0-9_]{30,}$/i,
      'Token OAuth inválido'
    )
    .trim()
    .optional()
    .or(z.literal('')),
  
  userId: z
    .string()
    .optional(),
});

// ============================================================================
// Timer Form Schema
// ============================================================================

/**
 * Schema for Timer form data
 * Validates timer name, message, and interval
 */
export const TimerFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  
  message: z
    .string()
    .min(1, 'El mensaje es requerido')
    .max(500, 'El mensaje no puede exceder 500 caracteres')
    .trim(),
  
  interval: z
    .number()
    .int('El intervalo debe ser un número entero')
    .min(60, 'El intervalo mínimo es 60 segundos')
    .max(86400, 'El intervalo máximo es 86400 segundos (24 horas)'),
  
  enabled: z.boolean(),
});

// ============================================================================
// Timer Group Form Schema
// ============================================================================

/**
 * Schema for Timer Group form data
 */
export const TimerGroupFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  
  enabled: z.boolean(),
});

// ============================================================================
// Command Form Schema
// ============================================================================

/**
 * Schema for Command form data
 * Validates command name, response, and settings
 */
export const CommandFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre del comando es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'El nombre solo puede contener letras, números y guiones bajos'
    )
    .trim(),
  
  response: z
    .string()
    .min(1, 'La respuesta es requerida')
    .max(500, 'La respuesta no puede exceder 500 caracteres')
    .trim(),
  
  cooldown: z
    .number()
    .int('El cooldown debe ser un número entero')
    .min(0, 'El cooldown mínimo es 0 segundos')
    .max(3600, 'El cooldown máximo es 3600 segundos (1 hora)')
    .optional(),
  
  enabled: z.boolean(),
  
  modOnly: z.boolean().optional(),
  
  aliases: z
    .array(z.string().trim())
    .optional(),
});

// ============================================================================
// Webhook Config Form Schema
// ============================================================================

/**
 * Schema for Webhook configuration form data
 * Validates webhook name, URL, and events
 */
export const WebhookConfigFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  
  url: z
    .string()
    .url('URL inválida')
    .startsWith('https://', 'La URL debe usar HTTPS')
    .trim(),
  
  events: z
    .array(z.string())
    .min(1, 'Selecciona al menos un evento'),
  
  enabled: z.boolean(),
  
  secret: z
    .string()
    .min(16, 'El secreto debe tener al menos 16 caracteres')
    .optional(),
});

// ============================================================================
// Macro Form Schema
// ============================================================================

/**
 * Schema for Macro form data
 * Validates macro name, description, and actions
 */
export const MacroFormSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .trim(),
  
  description: z
    .string()
    .max(200, 'La descripción no puede exceder 200 caracteres')
    .trim()
    .optional(),
  
  actions: z
    .array(
      z.object({
        type: z.string(),
        config: z.record(z.unknown()),
      })
    )
    .min(1, 'Se requiere al menos una acción'),
  
  enabled: z.boolean(),
  
  hotkey: z
    .string()
    .optional(),
});

// ============================================================================
// OBS Source Form Schema
// ============================================================================

/**
 * Schema for OBS Source creation form data
 * Validates source type and URL
 */
export const OBSSourceFormSchema = z.object({
  sourceType: z.enum(['browser', 'image', 'video', 'audio'], {
    errorMap: () => ({ message: 'Tipo de fuente inválido' }),
  }),
  
  url: z
    .string()
    .url('URL inválida')
    .trim(),
  
  name: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type RewardFormData = z.infer<typeof RewardFormSchema>;
export type PredictionFormData = z.infer<typeof PredictionFormSchema>;
export type PollFormData = z.infer<typeof PollFormSchema>;
export type ConnectionFormData = z.infer<typeof ConnectionFormSchema>;
export type TimerFormData = z.infer<typeof TimerFormSchema>;
export type TimerGroupFormData = z.infer<typeof TimerGroupFormSchema>;
export type CommandFormData = z.infer<typeof CommandFormSchema>;
export type WebhookConfigFormData = z.infer<typeof WebhookConfigFormSchema>;
export type MacroFormData = z.infer<typeof MacroFormSchema>;
export type OBSSourceFormData = z.infer<typeof OBSSourceFormSchema>;

