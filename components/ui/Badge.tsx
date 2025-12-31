import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-800 text-gray-300',
  primary: 'bg-primary-500/20 text-primary-400',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
};

const sizeStyles = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1',
};

const dotColors = {
  default: 'bg-gray-400',
  primary: 'bg-primary-400',
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  dot = false,
  removable = false,
  onRemove,
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1.5 font-medium';
  const radiusStyle = rounded ? 'rounded-full' : 'rounded';

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${radiusStyle} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label="Eliminar"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

// Status badge with dot
export function StatusBadge({
  status,
  label,
  className = '',
}: {
  status: 'online' | 'offline' | 'away' | 'busy';
  label?: string;
  className?: string;
}) {
  const statusConfig = {
    online: { color: 'success', text: 'En línea' },
    offline: { color: 'default', text: 'Desconectado' },
    away: { color: 'warning', text: 'Ausente' },
    busy: { color: 'error', text: 'Ocupado' },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.color as BadgeProps['variant']}
      dot
      size="sm"
      className={className}
    >
      {label || config.text}
    </Badge>
  );
}

// Count badge (for notifications, etc.)
export function CountBadge({
  count,
  max = 99,
  variant = 'error',
  className = '',
}: {
  count: number;
  max?: number;
  variant?: BadgeProps['variant'];
  className?: string;
}) {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <Badge
      variant={variant}
      size="sm"
      rounded
      className={`min-w-[1.25rem] justify-center ${className}`}
    >
      {displayCount}
    </Badge>
  );
}

export default Badge;
