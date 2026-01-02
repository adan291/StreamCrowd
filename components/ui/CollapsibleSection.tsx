import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from './Badge';

/**
 * CollapsibleSection - Reusable collapsible section component
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 * 
 * Provides a consistent pattern for expandable/collapsible sections
 * with smooth animations and optional badge display.
 */

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Optional icon displayed before the title */
  icon?: React.ReactNode;
  /** Optional badge displayed next to the title (e.g., count) */
  badge?: string | number;
  /** Whether the section is expanded by default */
  defaultExpanded?: boolean;
  /** Content to display when expanded */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Callback when expanded state changes */
  onToggle?: (expanded: boolean) => void;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  badge,
  defaultExpanded = false,
  children,
  className = '',
  onToggle,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onToggle?.(newExpanded);
  }, [expanded, onToggle]);

  return (
    <div className={`border border-zinc-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header - clickable to toggle */}
      <button
        type="button"
        id={`collapsible-header-${title.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={handleToggle}
        className="
          w-full flex items-center justify-between
          px-4 py-3
          bg-zinc-800/50 hover:bg-zinc-800
          transition-colors duration-150
          cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset
        "
        aria-expanded={expanded}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-zinc-400 shrink-0">
              {icon}
            </span>
          )}
          <span className="font-medium text-zinc-100">
            {title}
          </span>
          {badge !== undefined && badge !== null && (
            <Badge variant="primary" size="sm" rounded>
              {badge}
            </Badge>
          )}
        </div>
        
        {/* Chevron icon - rotates based on state */}
        <span className={`
          text-zinc-400 transition-transform duration-200
          ${expanded ? 'rotate-180' : 'rotate-0'}
        `}>
          <ChevronDown size={18} />
        </span>
      </button>

      {/* Content - animated expand/collapse */}
      <div
        id={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        role="region"
        aria-labelledby={`collapsible-header-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`
          transition-all duration-200 ease-in-out
          ${expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
        `}
        hidden={!expanded}
      >
        <div className="p-4 border-t border-zinc-700">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
