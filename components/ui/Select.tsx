import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helper?: string;
  size?: 'sm' | 'md' | 'lg';
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: 'h-8 text-sm px-3 pr-8',
  md: 'h-10 text-sm px-3 pr-8',
  lg: 'h-12 text-base px-4 pr-10',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helper,
  size = 'md',
  options,
  placeholder,
  fullWidth = false,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;

  const baseStyles = `
    w-full bg-gray-900 border rounded-lg
    text-gray-100 appearance-none cursor-pointer
    transition-all duration-150
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
  `.trim().replace(/\s+/g, ' ');

  const stateStyles = hasError
    ? 'border-red-500 focus:ring-red-500/40 focus:border-red-500'
    : 'border-gray-700 focus:ring-primary-500/40 focus:border-primary-500';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={error ? `${selectId}-error` : helper ? `${selectId}-helper` : undefined}
          className={`${baseStyles} ${sizeStyles[size]} ${stateStyles}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Chevron icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {error && (
        <p id={`${selectId}-error`} className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p id={`${selectId}-helper`} className="mt-1.5 text-sm text-gray-500">
          {helper}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
