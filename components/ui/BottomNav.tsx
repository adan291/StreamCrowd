import React from 'react';

/**
 * BottomNav - Mobile bottom navigation bar
 * @requirements Task 5.3 - Crear layout móvil
 * @requirements Task 5.4 - Touch targets 44x44px
 */

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}

export interface BottomNavProps {
  items: BottomNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  items,
  activeId,
  onSelect,
  className = '',
}) => {
  return (
    <nav
      className={`
        fixed bottom-0 left-0 right-0 z-[200]
        bg-zinc-900 border-t border-zinc-800
        flex justify-around items-center
        px-2 py-1
        pb-[max(0.5rem,env(safe-area-inset-bottom))]
        md:hidden
        ${className}
      `}
      role="navigation"
      aria-label="Main navigation"
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`
              flex flex-col items-center justify-center
              min-w-[64px] min-h-[44px] px-2 py-1
              rounded-lg transition-colors duration-150
              ${isActive 
                ? 'text-purple-400 bg-purple-500/10' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }
            `}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="relative">
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
            <span className="text-[10px] font-medium mt-0.5 uppercase tracking-wide">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
