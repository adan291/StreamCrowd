import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Accessible label for icon-only buttons */
  'aria-label'?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  'aria-label': ariaLabel,
  type = 'button',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-150 ease-in-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
    disabled:opacity-60 disabled:cursor-not-allowed
    active:scale-[0.98]
  `.trim().replace(/\s+/g, ' ');

  const sizeStyles = {
    sm: 'h-8 px-3 text-sm min-w-[44px]',
    md: 'h-10 px-4 text-sm min-w-[44px]',
    lg: 'h-12 px-6 text-base min-w-[44px]',
  };

  const variantStyles = {
    primary: `
      bg-[#9146ff] text-white
      hover:bg-[#772ce8]
      focus-visible:ring-violet-400
      shadow-sm hover:shadow-md
    `,
    secondary: `
      bg-gray-800 text-gray-100
      hover:bg-gray-700
      focus-visible:ring-violet-400
      border border-gray-700
    `,
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      focus-visible:ring-red-500
    `,
    ghost: `
      bg-transparent text-gray-300
      hover:bg-gray-800 hover:text-white
      focus-visible:ring-violet-400
    `,
    outline: `
      bg-transparent text-[#a970ff]
      border border-[#9146ff]
      hover:bg-[#9146ff]/10
      focus-visible:ring-violet-400
    `,
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      type={type}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`.trim().replace(/\s+/g, ' ')}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Spinner size={size as 'sm' | 'md' | 'lg'} />
      ) : (
        <>
          {leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';

// Inline Spinner component for loading state
function Spinner({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };
  
  return (
    <svg
      className={`animate-spin ${sizeMap[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default Button;
