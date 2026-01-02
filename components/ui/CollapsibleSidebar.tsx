import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * CollapsibleSidebar - Responsive sidebar that collapses on tablet
 * @requirements Task 5.2 - Optimizar sidebar para tablet
 * @requirements Task 6.2 - Implementar grupos colapsables
 */

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

export interface SidebarGroup {
  id: string;
  label: string;
  items: SidebarItem[];
  defaultExpanded?: boolean;
}

export interface CollapsibleSidebarProps {
  groups: SidebarGroup[];
  activeId: string;
  onSelect: (id: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  groups,
  activeId,
  onSelect,
  collapsed = false,
  onCollapsedChange,
  header,
  footer,
  className = '',
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    groups.forEach(g => {
      if (g.defaultExpanded !== false) initial.add(g.id);
    });
    return initial;
  });

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const toggleCollapsed = useCallback(() => {
    onCollapsedChange?.(!collapsed);
  }, [collapsed, onCollapsedChange]);

  return (
    <aside
      className={`
        hidden md:flex flex-col
        bg-zinc-900 border-r border-zinc-800
        transition-all duration-200 ease-out
        ${collapsed ? 'w-16' : 'w-[280px]'}
        ${className}
      `}
      aria-label="Sidebar navigation"
    >
      {/* Header */}
      {header && (
        <div className={`p-4 border-b border-zinc-800 ${collapsed ? 'px-2' : ''}`}>
          {header}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          
          return (
            <div key={group.id} className="mb-2">
              {/* Group Header - only show when not collapsed */}
              {!collapsed && groups.length > 1 && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="
                    w-full flex items-center justify-between
                    px-4 py-2 text-xs font-semibold uppercase tracking-wider
                    text-zinc-400 hover:text-zinc-300 transition-colors
                  "
                  aria-expanded={isExpanded}
                >
                  <span>{group.label}</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform duration-150 ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              )}

              {/* Group Items */}
              <div
                className={`
                  overflow-hidden transition-all duration-150 ease-out
                  ${!collapsed && !isExpanded ? 'max-h-0' : 'max-h-[500px]'}
                `}
              >
                {group.items.map((item) => {
                  const isActive = item.id === activeId;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => !item.disabled && onSelect(item.id)}
                      disabled={item.disabled}
                      title={collapsed ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3
                        ${collapsed ? 'justify-center px-2' : 'px-4'}
                        py-3 min-h-[44px]
                        transition-colors duration-150
                        ${isActive
                          ? 'bg-purple-500/20 text-purple-400 border-r-2 border-purple-500'
                          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        }
                        ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="relative flex-shrink-0">
                        {item.icon}
                        {item.badge !== undefined && (
                          <span
                            className={`
                              absolute -top-1 -right-1 min-w-[16px] h-4
                              flex items-center justify-center
                              text-[10px] font-bold rounded-full
                              ${typeof item.badge === 'number' && item.badge > 0
                                ? 'bg-red-500 text-white'
                                : 'bg-zinc-600 text-zinc-300'
                              }
                            `}
                          >
                            {typeof item.badge === 'number' && item.badge > 99
                              ? '99+'
                              : item.badge
                            }
                          </span>
                        )}
                      </span>
                      {!collapsed && (
                        <span className="truncate text-sm font-medium">
                          {item.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className={`p-4 border-t border-zinc-800 ${collapsed ? 'px-2' : ''}`}>
          {footer}
        </div>
      )}

      {/* Collapse Toggle */}
      {onCollapsedChange && (
        <button
          onClick={toggleCollapsed}
          className="
            hidden lg:flex items-center justify-center
            p-2 m-2 rounded-lg
            bg-zinc-800 hover:bg-zinc-700
            text-zinc-400 hover:text-zinc-200
            transition-colors duration-150
          "
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      )}
    </aside>
  );
};

export default CollapsibleSidebar;
