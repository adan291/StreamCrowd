import React from 'react';
import { Input, Textarea, InputProps, TextareaProps } from './Input';
import { Select, SelectProps } from './Select';

/**
 * FormField - Wrapper component for consistent form field styling
 * @requirements Task 10 - Aplicar mejoras a componentes existentes
 * 
 * This component provides a consistent wrapper for form fields
 * that can be used to gradually migrate existing components.
 */

export interface FormFieldProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  required,
  children,
  className = '',
  id,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{helperText}</p>
      )}
    </div>
  );
};

/**
 * FormInput - Pre-styled input with FormField wrapper
 */
export const FormInput: React.FC<InputProps & { 
  fieldClassName?: string;
  helperText?: string;
}> = ({ 
  fieldClassName,
  helperText,
  ...props 
}) => {
  return (
    <FormField
      label={props.label}
      error={props.error}
      helperText={helperText}
      required={props.required}
      className={fieldClassName}
      id={props.id}
    >
      <Input {...props} label={undefined} error={undefined} />
    </FormField>
  );
};

/**
 * FormTextarea - Pre-styled textarea with FormField wrapper
 */
export const FormTextarea: React.FC<TextareaProps & {
  fieldClassName?: string;
  helperText?: string;
}> = ({
  fieldClassName,
  helperText,
  ...props
}) => {
  return (
    <FormField
      label={props.label}
      error={props.error}
      helperText={helperText}
      required={props.required}
      className={fieldClassName}
      id={props.id}
    >
      <Textarea {...props} label={undefined} error={undefined} />
    </FormField>
  );
};

/**
 * FormSelect - Pre-styled select with FormField wrapper
 */
export const FormSelect: React.FC<SelectProps & {
  fieldClassName?: string;
  helperText?: string;
}> = ({
  fieldClassName,
  helperText,
  ...props
}) => {
  return (
    <FormField
      label={props.label}
      error={props.error}
      helperText={helperText}
      required={props.required}
      className={fieldClassName}
      id={props.id}
    >
      <Select {...props} label={undefined} error={undefined} />
    </FormField>
  );
};

/**
 * FormGroup - Group multiple form fields with consistent spacing
 */
export interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal';
  gap?: 'sm' | 'md' | 'lg';
}

export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  className = '',
  direction = 'vertical',
  gap = 'md',
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const directionClasses = {
    vertical: 'flex-col',
    horizontal: 'flex-row flex-wrap items-end',
  };

  return (
    <div className={`flex ${directionClasses[direction]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * FormActions - Container for form action buttons
 */
export interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

export const FormActions: React.FC<FormActionsProps> = ({
  children,
  className = '',
  align = 'right',
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={`flex items-center gap-3 pt-4 ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  );
};

export default FormField;
