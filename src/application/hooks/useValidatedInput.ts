/**
 * useValidatedInput Hook
 * 
 * React hook for managing form input with Zod schema validation.
 * Provides real-time validation feedback and error handling.
 * 
 * @module application/hooks/useValidatedInput
 * @requirements 5.1 - Input validation with Zod schemas
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  value: T | null;
  errors: string[];
  isValid: boolean;
}

/**
 * Hook options
 */
export interface UseValidatedInputOptions {
  /**
   * Whether to validate on every change (default: false)
   * If false, only validates when validateValue is called
   */
  validateOnChange?: boolean;
  
  /**
   * Custom error formatter
   * Converts Zod errors to user-friendly messages
   */
  formatError?: (error: z.ZodError) => string[];
}

/**
 * Hook return type
 */
export interface UseValidatedInputReturn<T> {
  /**
   * Current validated value (null if invalid)
   */
  value: T | null;
  
  /**
   * Current validation errors
   */
  errors: string[];
  
  /**
   * Whether the current value is valid
   */
  isValid: boolean;
  
  /**
   * Validate a value against the schema
   * @param input - The value to validate
   * @returns Validation result
   */
  validateValue: (input: unknown) => ValidationResult<T>;
  
  /**
   * Clear validation errors
   */
  clearErrors: () => void;
  
  /**
   * Reset to initial state
   */
  reset: () => void;
}

/**
 * Default error formatter
 * Extracts user-friendly error messages from Zod errors
 */
function defaultFormatError(error: z.ZodError): string[] {
  return error.issues.map((err) => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
}

/**
 * React hook for validated input with Zod schemas
 * 
 * @example
 * ```typescript
 * const emailSchema = z.string().email();
 * const { value, errors, isValid, validateValue } = useValidatedInput(emailSchema);
 * 
 * const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const result = validateValue(e.target.value);
 *   if (result.isValid) {
 *     // Use validated value
 *     console.log('Valid email:', result.value);
 *   }
 * };
 * ```
 * 
 * @param schema - Zod schema to validate against
 * @param options - Hook options
 * @returns Validation state and methods
 */
export function useValidatedInput<T>(
  schema: z.ZodSchema<T>,
  options: UseValidatedInputOptions = {}
): UseValidatedInputReturn<T> {
  const {
    validateOnChange = false,
    formatError = defaultFormatError,
  } = options;

  const [value, setValue] = useState<T | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState<boolean>(false);

  /**
   * Validate a value against the schema
   */
  const validateValue = useCallback(
    (input: unknown): ValidationResult<T> => {
      const result = schema.safeParse(input);

      if (result.success) {
        const validatedValue = result.data;
        setValue(validatedValue);
        setErrors([]);
        setIsValid(true);
        return {
          value: validatedValue,
          errors: [],
          isValid: true,
        };
      } else {
        const errorMessages = formatError(result.error);
        setValue(null);
        setErrors(errorMessages);
        setIsValid(false);
        return {
          value: null,
          errors: errorMessages,
          isValid: false,
        };
      }
    },
    [schema, formatError]
  );

  /**
   * Clear validation errors
   */
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setValue(null);
    setErrors([]);
    setIsValid(false);
  }, []);

  return {
    value,
    errors,
    isValid,
    validateValue,
    clearErrors,
    reset,
  };
}

/**
 * Hook for validating form fields with Zod schemas
 * Provides a more form-specific API with field-level validation
 * 
 * @example
 * ```typescript
 * const formSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 * 
 * const { values, errors, validateField, validateAll } = useValidatedForm(formSchema);
 * ```
 */
export interface UseValidatedFormReturn<T extends Record<string, any>> {
  /**
   * Current form values (only valid fields)
   */
  values: Partial<T>;
  
  /**
   * Validation errors by field name
   */
  errors: Record<string, string[]>;
  
  /**
   * Whether all fields are valid
   */
  isValid: boolean;
  
  /**
   * Validate a single field
   */
  validateField: <K extends keyof T>(field: K, value: unknown) => boolean;
  
  /**
   * Validate all fields
   */
  validateAll: (data: unknown) => boolean;
  
  /**
   * Clear errors for a specific field
   */
  clearFieldErrors: (field: keyof T) => void;
  
  /**
   * Clear all errors
   */
  clearAllErrors: () => void;
  
  /**
   * Reset form to initial state
   */
  reset: () => void;
}

/**
 * React hook for validated forms with Zod schemas
 * 
 * @param schema - Zod object schema for the form
 * @returns Form validation state and methods
 */
export function useValidatedForm<T extends Record<string, any>>(
  schema: z.ZodObject<any>
): UseValidatedFormReturn<T> {
  const [values, setValues] = useState<Partial<T>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isValid, setIsValid] = useState<boolean>(false);

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    <K extends keyof T>(field: K, value: unknown): boolean => {
      const fieldSchema = schema.shape[field as string];
      if (!fieldSchema) {
        console.warn(`No schema found for field: ${String(field)}`);
        return false;
      }

      const result = fieldSchema.safeParse(value);

      if (result.success) {
        setValues((prev) => ({ ...prev, [field]: result.data }));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field as string];
          return newErrors;
        });
        return true;
      } else {
        setErrors((prev) => ({
          ...prev,
          [field]: defaultFormatError(result.error),
        }));
        return false;
      }
    },
    [schema]
  );

  /**
   * Validate all fields
   */
  const validateAll = useCallback(
    (data: unknown): boolean => {
      const result = schema.safeParse(data);

      if (result.success) {
        setValues(result.data);
        setErrors({});
        setIsValid(true);
        return true;
      } else {
        const fieldErrors: Record<string, string[]> = {};
        result.error.issues.forEach((err) => {
          const field = err.path[0]?.toString();
          if (field) {
            if (!fieldErrors[field]) {
              fieldErrors[field] = [];
            }
            fieldErrors[field].push(err.message);
          }
        });
        setErrors(fieldErrors);
        setIsValid(false);
        return false;
      }
    },
    [schema]
  );

  /**
   * Clear errors for a specific field
   */
  const clearFieldErrors = useCallback((field: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Reset form to initial state
   */
  const reset = useCallback(() => {
    setValues({});
    setErrors({});
    setIsValid(false);
  }, []);

  return {
    values,
    errors,
    isValid,
    validateField,
    validateAll,
    clearFieldErrors,
    clearAllErrors,
    reset,
  };
}

export default useValidatedInput;
