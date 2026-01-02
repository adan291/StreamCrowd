import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helper?: string;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: 'h-8 text-sm px-3',
  md: 'h-10 text-sm px-3',
  lg: 'h-12 text-base px-4',
};

// Focus ring color for consistency (violet-400 for WCAG AA compliance)
const focusRingColor = 'focus:ring-violet-400/40 focus:border-violet-400';

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  size = 'md',
  leftIcon,
  rightIcon,
  leftElement,
  rightElement,
  fullWidth = false,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  const baseInputStyles = `
    w-full bg-gray-900 border rounded-lg
    text-gray-100 placeholder-gray-500
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-60 disabled:cursor-not-allowed
  `.trim().replace(/\s+/g, ' ');

  const stateStyles = hasError
    ? 'border-red-500 focus:ring-red-500/40 focus:border-red-500'
    : `border-zinc-600 ${focusRingColor}`;

  const paddingLeft = leftIcon || leftElement ? 'pl-10' : '';
  const paddingRight = rightIcon || rightElement ? 'pr-10' : '';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {(leftIcon || leftElement) && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon || leftElement}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
          className={`${baseInputStyles} ${sizeStyles[size]} ${stateStyles} ${paddingLeft} ${paddingRight}`}
          {...props}
        />
        
        {(rightIcon || rightElement) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon || rightElement}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500">
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea variant
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helper,
  fullWidth = false,
  className = '',
  id,
  disabled,
  rows = 3,
  ...props
}, ref) => {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  const baseStyles = `
    w-full bg-gray-900 border rounded-lg p-3
    text-gray-100 placeholder-gray-500 text-sm
    transition-all duration-150 resize-y
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-60 disabled:cursor-not-allowed
  `.trim().replace(/\s+/g, ' ');

  const stateStyles = hasError
    ? 'border-red-500 focus:ring-red-500/40 focus:border-red-500'
    : `border-zinc-600 ${focusRingColor}`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={error ? `${inputId}-error` : helper ? `${inputId}-helper` : undefined}
        className={`${baseStyles} ${stateStyles}`}
        {...props}
      />

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-gray-500">
          {helper}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Input;
