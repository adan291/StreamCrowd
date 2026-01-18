/**
 * PredictionForm - Form component for creating Twitch predictions
 * 
 * Provides a form interface for creating predictions with:
 * - Title input (max 45 characters)
 * - 2-10 outcome options (max 25 characters each)
 * - Duration selection (30-1800 seconds)
 * 
 * @requirements 1.1 - Display form to create predictions with title and 2-10 outcomes
 */

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';
import { useI18n } from '../i18n';
import type { PredictionFormData, ValidationResult } from '../types/twitch';
import { PREDICTION_CONSTRAINTS } from '../types/twitch';
import { PredictionFormSchema } from '../src/domain/schemas/formSchemas';
import { safeValidateInput } from '../src/domain/schemas/securitySchemas';

// ============================================
// Types
// ============================================

export interface PredictionFormProps {
  onSubmit: (data: PredictionFormData) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

// ============================================
// Validation
// ============================================

/**
 * Validate prediction form data
 * @requirements 1.1 - Validate title, outcomes (2-10), duration (30-1800)
 */
export function validatePredictionForm(data: PredictionFormData): ValidationResult {
  const errors: string[] = [];
  
  // Title validation
  if (!data.title.trim()) {
    errors.push('El título es requerido');
  } else if (data.title.length > PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH) {
    errors.push(`El título no puede exceder ${PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH} caracteres`);
  }
  
  // Outcomes count validation
  if (data.outcomes.length < PREDICTION_CONSTRAINTS.MIN_OUTCOMES) {
    errors.push(`Se requieren al menos ${PREDICTION_CONSTRAINTS.MIN_OUTCOMES} opciones`);
  }
  if (data.outcomes.length > PREDICTION_CONSTRAINTS.MAX_OUTCOMES) {
    errors.push(`Máximo ${PREDICTION_CONSTRAINTS.MAX_OUTCOMES} opciones permitidas`);
  }
  
  // Outcomes content validation
  const emptyOutcomes = data.outcomes.filter(o => !o.trim());
  if (emptyOutcomes.length > 0) {
    errors.push('Todas las opciones deben tener texto');
  }
  
  const longOutcomes = data.outcomes.filter(o => o.length > PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH);
  if (longOutcomes.length > 0) {
    errors.push(`Las opciones no pueden exceder ${PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH} caracteres`);
  }
  
  // Check for duplicate outcomes
  const uniqueOutcomes = new Set(data.outcomes.map(o => o.toLowerCase().trim()));
  if (uniqueOutcomes.size !== data.outcomes.length) {
    errors.push('Las opciones deben ser únicas');
  }
  
  // Duration validation
  if (data.duration < PREDICTION_CONSTRAINTS.MIN_DURATION) {
    errors.push(`La duración mínima es ${PREDICTION_CONSTRAINTS.MIN_DURATION} segundos`);
  }
  if (data.duration > PREDICTION_CONSTRAINTS.MAX_DURATION) {
    errors.push(`La duración máxima es ${PREDICTION_CONSTRAINTS.MAX_DURATION / 60} minutos`);
  }
  
  return { valid: errors.length === 0, errors };
}

// ============================================
// Component
// ============================================

export const PredictionForm: React.FC<PredictionFormProps> = ({
  onSubmit,
  isLoading,
  disabled = false,
}) => {
  const { t } = useI18n();
  
  // Form state
  const [title, setTitle] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>(['', '']);
  const [duration, setDuration] = useState(120); // Default 2 minutes
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Duration presets in seconds
  const durationPresets = [
    { label: '1 min', value: 60 },
    { label: '2 min', value: 120 },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
  ];

  /**
   * Add a new outcome option
   */
  const addOutcome = useCallback(() => {
    if (outcomes.length < PREDICTION_CONSTRAINTS.MAX_OUTCOMES) {
      setOutcomes([...outcomes, '']);
    }
  }, [outcomes]);

  /**
   * Remove an outcome option
   */
  const removeOutcome = useCallback((index: number) => {
    if (outcomes.length > PREDICTION_CONSTRAINTS.MIN_OUTCOMES) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  }, [outcomes]);

  /**
   * Update an outcome option
   */
  const updateOutcome = useCallback((index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value.slice(0, PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH);
    setOutcomes(newOutcomes);
  }, [outcomes]);

  /**
   * Handle form submission with Zod validation
   * @requirements 5.1, 5.2 - Validate with Zod before submission
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: PredictionFormData = {
      title: title.trim(),
      outcomes: outcomes.map(o => o.trim()),
      duration,
    };
    
    // Validate with Zod schema
    const result = safeValidateInput(PredictionFormSchema, formData);
    
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
  }, [title, outcomes, duration, onSubmit]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    setTitle('');
    setOutcomes(['', '']);
    setDuration(120);
    setValidationErrors([]);
  }, []);

  const isFormDisabled = disabled || isLoading;

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
          htmlFor="prediction-title" 
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          Título de la predicción
        </label>
        <input
          type="text"
          id="prediction-title"
          name="prediction-title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH))}
          placeholder="¿Quién ganará?"
          disabled={isFormDisabled}
          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-twitch-brand focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby="title-char-count"
        />
        <p id="title-char-count" className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 text-right">
          {title.length}/{PREDICTION_CONSTRAINTS.MAX_TITLE_LENGTH}
        </p>
      </div>

      {/* Outcomes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Opciones ({outcomes.length}/{PREDICTION_CONSTRAINTS.MAX_OUTCOMES})
          </label>
          <Tooltip text={`Añadir opción (máx ${PREDICTION_CONSTRAINTS.MAX_OUTCOMES})`}>
            <button
              type="button"
              onClick={addOutcome}
              disabled={isFormDisabled || outcomes.length >= PREDICTION_CONSTRAINTS.MAX_OUTCOMES}
              className="text-twitch-brand hover:text-twitch-light disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-lg hover:bg-twitch-brand/10 transition-colors"
              aria-label="Añadir opción"
            >
              <Plus size={18} />
            </button>
          </Tooltip>
        </div>
        
        <div className="space-y-2">
          {outcomes.map((outcome, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className={`w-3 h-3 rounded-full shrink-0 ${index === 0 ? 'bg-blue-500' : 'bg-pink-500'}`}
                aria-hidden="true"
              />
              <input
                type="text"
                id={`prediction-outcome-${index}`}
                name={`prediction-outcome-${index}`}
                value={outcome}
                onChange={(e) => updateOutcome(index, e.target.value)}
                placeholder={`Opción ${index + 1}`}
                disabled={isFormDisabled}
                className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:ring-2 focus:ring-twitch-brand focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                aria-label={`Opción ${index + 1}`}
              />
              <span className="text-xs text-zinc-400 w-10 text-right shrink-0">
                {outcome.length}/{PREDICTION_CONSTRAINTS.MAX_OUTCOME_LENGTH}
              </span>
              {outcomes.length > PREDICTION_CONSTRAINTS.MIN_OUTCOMES && (
                <Tooltip text="Eliminar opción">
                  <button
                    type="button"
                    onClick={() => removeOutcome(index)}
                    disabled={isFormDisabled}
                    className="text-zinc-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-lg hover:bg-red-500/10 transition-colors"
                    aria-label={`Eliminar opción ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </Tooltip>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label 
          htmlFor="prediction-duration" 
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
        >
          <Clock size={14} className="inline mr-1" />
          Duración para votar
        </label>
        
        {/* Duration Presets */}
        <div className="flex flex-wrap gap-2 mb-2">
          {durationPresets.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setDuration(preset.value)}
              disabled={isFormDisabled}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                duration === preset.value
                  ? 'bg-twitch-brand text-white border-twitch-brand'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-twitch-brand'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        
        {/* Custom Duration Input */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            id="prediction-duration"
            name="prediction-duration"
            min={PREDICTION_CONSTRAINTS.MIN_DURATION}
            max={PREDICTION_CONSTRAINTS.MAX_DURATION}
            step={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isFormDisabled}
            className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-twitch-brand disabled:opacity-50 disabled:cursor-not-allowed"
            aria-describedby="duration-display"
          />
          <span 
            id="duration-display" 
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-16 text-right"
          >
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {PREDICTION_CONSTRAINTS.MIN_DURATION}s - {PREDICTION_CONSTRAINTS.MAX_DURATION / 60} min
        </p>
      </div>

      {/* Submit Button */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={resetForm}
          disabled={isFormDisabled}
          className="flex-1"
        >
          Limpiar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isFormDisabled}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Creando...
            </>
          ) : (
            'Crear Predicción'
          )}
        </Button>
      </div>
    </form>
  );
};

export default PredictionForm;
