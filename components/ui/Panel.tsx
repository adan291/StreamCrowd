import React from 'react';

/**
 * Panel - Consistent panel/section component for app layouts
 * @requirements Task 10 - Aplicar mejoras a componentes existentes
 * 
 * Provides consistent styling for panels used throughout the app.
 */

export interface PanelProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
}

export const Panel: React.FC<PanelProps> = ({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantClasses = {
    default: 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800',
    elevated: 'bg-white dark:bg-zinc-900 shadow-lg dark:shadow-zinc-900/50',
    outlined: 'border-2 border-zinc-200 dark:border-zinc-700',
    ghost: 'bg-zinc-50 dark:bg-zinc-900/50',
  };

  return (
    <div
      className={`
        rounded-xl
        ${paddingClasses[padding]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * PanelHeader - Header section for panels
 */
export interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 sm:mb-6 ${className}`}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

/**
 * PanelSection - Subsection within a panel
 */
export interface PanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const PanelSection: React.FC<PanelSectionProps> = ({
  title,
  children,
  className = '',
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  return (
    <div className={`${className}`}>
      {title && (
        <button
          type="button"
          onClick={() => collapsible && setExpanded(!expanded)}
          className={`
            flex items-center justify-between w-full
            text-sm font-semibold text-zinc-700 dark:text-zinc-300
            mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-700
            ${collapsible ? 'cursor-pointer hover:text-zinc-900 dark:hover:text-white' : 'cursor-default'}
          `}
          disabled={!collapsible}
        >
          <span>{title}</span>
          {collapsible && (
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      )}
      {(!collapsible || expanded) && children}
    </div>
  );
};

/**
 * PanelFooter - Footer section for panels
 */
export interface PanelFooterProps {
  children: React.ReactNode;
  className?: string;
  border?: boolean;
}

export const PanelFooter: React.FC<PanelFooterProps> = ({
  children,
  className = '',
  border = true,
}) => {
  return (
    <div
      className={`
        mt-4 pt-4
        ${border ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * PanelGrid - Grid layout for panel content
 */
export interface PanelGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PanelGrid: React.FC<PanelGridProps> = ({
  children,
  columns = 2,
  gap = 'md',
  className = '',
}) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-2 sm:gap-3',
    md: 'gap-3 sm:gap-4',
    lg: 'gap-4 sm:gap-6',
  };

  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

export default Panel;
