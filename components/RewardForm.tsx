/**
 * RewardForm - Form component for creating/editing Twitch Channel Point Rewards
 * 
 * Provides a form interface for creating rewards with:
 * - Title input (max 45 characters)
 * - Cost input (1-999,999,999 points)
 * - Description/prompt (max 200 characters)
 * - Cooldown settings
 * - Limits (per stream, per user)
 * 
 * @requirements 4.4 - Reward form with title, cost, description, cooldown, limits
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  AlertCircle, 
  Loader2, 
  Clock, 
  Users, 
  Hash,
  Palette,
  MessageSquare,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n';
import type { RewardFormData, ValidationResult, TwitchReward } from '../types/twitch';
import { REWARD_CONSTRAINTS } from '../types/twitch';
import { RewardFormSchema } from '../src/domain/schemas/formSchemas';
import { safeValidateInput } from '../src/domain/schemas/securitySchemas';

// ============================================
// Types
// ============================================

export interface RewardFormProps {
  onSubmit: (data: RewardFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  /** Initial data for editing an existing reward */
  initialData?: Partial<RewardFormData>;
  /** Whether this is an edit form */
  isEditing?: boolean;
  /** Callback when form is cancelled */
  onCancel?: () => void;
}

// ============================================
// Validation
// ============================================

/**
 * Validate reward form data
 * @requirements 4.4 - Validate title, cost, description, cooldown, limits
 */
export function validateRewardForm(data: RewardFormData): ValidationResult {
  const errors: string[] = [];
  
  // Title validation
  if (!data.title.trim()) {
    errors.push('El título es requerido');
  } else if (data.title.length > REWARD_CONSTRAINTS.MAX_TITLE_LENGTH) {
    errors.push(`El título no puede exceder ${REWARD_CONSTRAINTS.MAX_TITLE_LENGTH} caracteres`);
  }
  
  // Cost validation
  if (data.cost < REWARD_CONSTRAINTS.MIN_COST) {
    errors.push(`El costo mínimo es ${REWARD_CONSTRAINTS.MIN_COST} punto`);
  }
  if (data.cost > REWARD_CONSTRAINTS.MAX_COST) {
    errors.push(`El costo máximo es ${REWARD_CONSTRAINTS.MAX_COST.toLocaleString()} puntos`);
  }
  
  // Prompt validation (optional but has max length)
  if (data.prompt && data.prompt.length > REWARD_CONSTRAINTS.MAX_PROMPT_LENGTH) {
    errors.push(`La descripción no puede exceder ${REWARD_CONSTRAINTS.MAX_PROMPT_LENGTH} caracteres`);
  }
  
  // Cooldown validation
  if (data.globalCooldownEnabled && data.globalCooldownSeconds !== undefined) {
    if (data.globalCooldownSeconds < REWARD_CONSTRAINTS.MIN_COOLDOWN) {
      errors.push(`El cooldown mínimo es ${REWARD_CONSTRAINTS.MIN_COOLDOWN} segundos`);
    }
    if (data.globalCooldownSeconds > REWARD_CONSTRAINTS.MAX_COOLDOWN) {
      errors.push(`El cooldown máximo es ${Math.floor(REWARD_CONSTRAINTS.MAX_COOLDOWN / 86400)} días`);
    }
  }
  
  // Max per stream validation
  if (data.maxPerStreamEnabled && data.maxPerStream !== undefined) {
    if (data.maxPerStream < 1) {
      errors.push('El límite por stream debe ser al menos 1');
    }
  }
  
  // Max per user validation
  if (data.maxPerUserPerStreamEnabled && data.maxPerUserPerStream !== undefined) {
    if (data.maxPerUserPerStream < 1) {
      errors.push('El límite por usuario debe ser al menos 1');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================
// Color Presets
// ============================================

const COLOR_PRESETS = [
  '#9147FF', // Twitch Purple
  '#1E90FF', // Blue
  '#00C853', // Green
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#FF9F43', // Orange
  '#A29BFE', // Light Purple
  '#00CEC9', // Teal
];

// ============================================
// Component
// ============================================

export const RewardForm: React.FC<RewardFormProps> = ({
  onSubmit,
  isLoading,
  disabled = false,
  initialData,
  isEditing = false,
  onCancel,
}) => {
  const { t } = useI18n();
  
  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [cost, setCost] = useState(initialData?.cost || 100);
  const [prompt, setPrompt] = useState(initialData?.prompt || '');
  const [backgroundColor, setBackgroundColor] = useState(initialData?.backgroundColor || '#9147FF');
  const [isUserInputRequired, setIsUserInputRequired] = useState(initialData?.isUserInputRequired || false);
  const [isEnabled, setIsEnabled] = useState(initialData?.isEnabled ?? true);
  
  // Cooldown settings
  const [globalCooldownEnabled, setGlobalCooldownEnabled] = useState(initialData?.globalCooldownEnabled || false);
  const [globalCooldownSeconds, setGlobalCooldownSeconds] = useState(initialData?.globalCooldownSeconds || 60);
  
  // Limit settings
  const [maxPerStreamEnabled, setMaxPerStreamEnabled] = useState(initialData?.maxPerStreamEnabled || false);
  const [maxPerStream, setMaxPerStream] = useState(initialData?.maxPerStream || 10);
  const [maxPerUserPerStreamEnabled, setMaxPerUserPerStreamEnabled] = useState(initialData?.maxPerUserPerStreamEnabled || false);
  const [maxPerUserPerStream, setMaxPerUserPerStream] = useState(initialData?.maxPerUserPerStream || 1);
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Update form when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCost(initialData.cost || 100);
      setPrompt(initialData.prompt || '');
      setBackgroundColor(initialData.backgroundColor || '#9147FF');
      setIsUserInputRequired(initialData.isUserInputRequired || false);
      setIsEnabled(initialData.isEnabled ?? true);
      setGlobalCooldownEnabled(initialData.globalCooldownEnabled || false);
      setGlobalCooldownSeconds(initialData.globalCooldownSeconds || 60);
      setMaxPerStreamEnabled(initialData.maxPerStreamEnabled || false);
      setMaxPerStream(initialData.maxPerStream || 10);
      setMaxPerUserPerStreamEnabled(initialData.maxPerUserPerStreamEnabled || false);
      setMaxPerUserPerStream(initialData.maxPerUserPerStream || 1);
    }
  }, [initialData]);

  /**
   * Handle form submission with Zod validation
   * @requirements 5.1, 5.2 - Validate with Zod before submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: RewardFormData = {
      title: title.trim(),
      cost,
      prompt: prompt.trim() || undefined,
      backgroundColor,
      isUserInputRequired,
      isEnabled,
      globalCooldownEnabled,
      globalCooldownSeconds: globalCooldownEnabled ? globalCooldownSeconds : undefined,
      maxPerStreamEnabled,
      maxPerStream: maxPerStreamEnabled ? maxPerStream : undefined,
      maxPerUserPerStreamEnabled,
      maxPerUserPerStream: maxPerUserPerStreamEnabled ? maxPerUserPerStream : undefined,
    };
    
    // Validate with Zod schema
    const result = safeValidateInput(RewardFormSchema, formData);
    
    if (!result.success) {
      // Extract user-friendly error messages from Zod errors
      const errors = result.errors.issues.map((issue) => {
        const field = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${field}${issue.message}`;
      });
      setValidationErrors(errors);
      return;
    }
    
    // Clear errors and submit validated data
    setValidationErrors([]);
    await onSubmit(result.data);
  }, [
    title, cost, prompt, backgroundColor, isUserInputRequired, isEnabled,
    globalCooldownEnabled, globalCooldownSeconds,
    maxPerStreamEnabled, maxPerStream,
    maxPerUserPerStreamEnabled, maxPerUserPerStream,
    onSubmit
  ]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setTitle('');
    setCost(100);
    setPrompt('');
    setBackgroundColor('#9147FF');
    setIsUserInputRequired(false);
    setIsEnabled(true);
    setGlobalCooldownEnabled(false);
    setGlobalCooldownSeconds(60);
    setMaxPerStreamEnabled(false);
    setMaxPerStream(10);
    setMaxPerUserPerStreamEnabled(false);
    setMaxPerUserPerStream(1);
    setValidationErrors([]);
  }, []);

  const isFormDisabled = disabled || isLoading;

  /**
   * Format cooldown for display
   */
  const formatCooldown = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2 text-red-500 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              {validationErrors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Title Input */}
      <div>
        <label 
          htmlFor="reward-title" 
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          Nombre de la recompensa *
        </label>
        <input
          type="text"
          id="reward-title"
          name="reward-title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, REWARD_CONSTRAINTS.MAX_TITLE_LENGTH))}
          placeholder="Ej: Destacar mi mensaje"
          disabled={isFormDisabled}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-twitch-brand focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby="title-char-count"
        />
        <p id="title-char-count" className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-right">
          {title.length}/{REWARD_CONSTRAINTS.MAX_TITLE_LENGTH}
        </p>
      </div>

      {/* Cost Input */}
      <div>
        <label 
          htmlFor="reward-cost" 
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          <Hash size={14} className="inline mr-1" />
          Costo (Channel Points) *
        </label>
        <input
          type="number"
          id="reward-cost"
          name="reward-cost"
          value={cost}
          onChange={(e) => setCost(Math.max(1, Math.min(REWARD_CONSTRAINTS.MAX_COST, parseInt(e.target.value) || 1)))}
          min={REWARD_CONSTRAINTS.MIN_COST}
          max={REWARD_CONSTRAINTS.MAX_COST}
          disabled={isFormDisabled}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-2 focus:ring-twitch-brand focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {REWARD_CONSTRAINTS.MIN_COST.toLocaleString()} - {REWARD_CONSTRAINTS.MAX_COST.toLocaleString()} puntos
        </p>
      </div>

      {/* Description/Prompt Input */}
      <div>
        <label 
          htmlFor="reward-prompt" 
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          <MessageSquare size={14} className="inline mr-1" />
          Descripción (opcional)
        </label>
        <textarea
          id="reward-prompt"
          name="reward-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, REWARD_CONSTRAINTS.MAX_PROMPT_LENGTH))}
          placeholder="Describe qué hace esta recompensa..."
          disabled={isFormDisabled}
          rows={2}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-twitch-brand focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
          aria-describedby="prompt-char-count"
        />
        <p id="prompt-char-count" className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-right">
          {prompt.length}/{REWARD_CONSTRAINTS.MAX_PROMPT_LENGTH}
        </p>
      </div>

      {/* Background Color */}
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          <Palette size={14} className="inline mr-1" />
          Color de fondo
        </label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setBackgroundColor(color)}
              disabled={isFormDisabled}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                backgroundColor === color 
                  ? 'border-white ring-2 ring-twitch-brand scale-110' 
                  : 'border-transparent hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ backgroundColor: color }}
              aria-label={`Color ${color}`}
            />
          ))}
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            disabled={isFormDisabled}
            className="w-8 h-8 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Color personalizado"
          />
        </div>
      </div>

      {/* User Input Required Toggle */}
      <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Requiere texto del usuario
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            El usuario debe escribir un mensaje al canjear
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsUserInputRequired(!isUserInputRequired)}
          disabled={isFormDisabled}
          className="text-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={isUserInputRequired ? 'Desactivar texto requerido' : 'Activar texto requerido'}
        >
          {isUserInputRequired ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </button>
      </div>

      {/* Cooldown Settings */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <Clock size={14} className="inline mr-1" />
              Cooldown global
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Tiempo de espera entre canjes
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalCooldownEnabled(!globalCooldownEnabled)}
            disabled={isFormDisabled}
            className="text-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={globalCooldownEnabled ? 'Desactivar cooldown' : 'Activar cooldown'}
          >
            {globalCooldownEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
        
        {globalCooldownEnabled && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={3600}
              step={30}
              value={globalCooldownSeconds}
              onChange={(e) => setGlobalCooldownSeconds(Number(e.target.value))}
              disabled={isFormDisabled}
              className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-twitch-brand disabled:opacity-50"
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-12 text-right">
              {formatCooldown(globalCooldownSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Limits Settings */}
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Users size={14} className="inline mr-1" />
          Límites
        </p>
        
        {/* Max per stream */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Máximo por stream
            </p>
          </div>
          <div className="flex items-center gap-2">
            {maxPerStreamEnabled && (
              <input
                type="number"
                min={1}
                max={1000}
                value={maxPerStream}
                onChange={(e) => setMaxPerStream(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isFormDisabled}
                className="w-16 px-2 py-1 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-center disabled:opacity-50"
              />
            )}
            <button
              type="button"
              onClick={() => setMaxPerStreamEnabled(!maxPerStreamEnabled)}
              disabled={isFormDisabled}
              className="text-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {maxPerStreamEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>
        </div>
        
        {/* Max per user per stream */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Máximo por usuario
            </p>
          </div>
          <div className="flex items-center gap-2">
            {maxPerUserPerStreamEnabled && (
              <input
                type="number"
                min={1}
                max={100}
                value={maxPerUserPerStream}
                onChange={(e) => setMaxPerUserPerStream(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isFormDisabled}
                className="w-16 px-2 py-1 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-center disabled:opacity-50"
              />
            )}
            <button
              type="button"
              onClick={() => setMaxPerUserPerStreamEnabled(!maxPerUserPerStreamEnabled)}
              disabled={isFormDisabled}
              className="text-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {maxPerUserPerStreamEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-2 pt-2">
        {isEditing && onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isFormDisabled}
            className="flex-1"
          >
            Cancelar
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={resetForm}
            disabled={isFormDisabled}
            className="flex-1"
          >
            Limpiar
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isFormDisabled}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              {isEditing ? 'Guardando...' : 'Creando...'}
            </>
          ) : (
            isEditing ? 'Guardar Cambios' : 'Crear Recompensa'
          )}
        </Button>
      </div>
    </form>
  );
};

export default RewardForm;
