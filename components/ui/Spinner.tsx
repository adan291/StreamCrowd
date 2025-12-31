import React from 'react';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'white' | 'gray' | 'current';
  className?: string;
  label?: string;
}

const sizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorMap = {
  primary: 'text-primary-500',
  white: 'text-white',
  gray: 'text-gray-400',
  current: 'text-current',
};

export function Spinner({
  size = 'md',
  color = 'primary',
  className = '',
  label = 'Cargando...',
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`inline-flex items-center justify-center ${className}`}
    >
      <svg
        className={`animate-spin ${sizeMap[size]} ${colorMap[color]}`}
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
      <span className="sr-only">{label}</span>
    </div>
  );
}

// Spinner with text
export function SpinnerWithText({
  size = 'md',
  color = 'primary',
  text = 'Cargando...',
  className = '',
}: SpinnerProps & { text?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} role="status">
      <Spinner size={size} color={color} label={text} />
      <span className="text-sm text-gray-400">{text}</span>
    </div>
  );
}

// Full page spinner
export function PageSpinner({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950/80 z-50">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" color="primary" label={text} />
        <span className="text-gray-300">{text}</span>
      </div>
    </div>
  );
}

export default Spinner;
