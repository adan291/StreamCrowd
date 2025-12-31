import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * MobileDrawer - Slide-out navigation drawer for mobile devices
 * @requirements Task 6.5 - Versión móvil (drawer)
 * @requirements Task 5.4 - Touch targets 44x44px
 */

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  position?: 'left' | 'right';
  className?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  title,
  position = 'left',
  className = '',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const currentXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;

    const focusableElements = drawerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Swipe to close gesture
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    currentXRef.current = e.touches[0].clientX;
    
    const diff = position === 'left' 
      ? startXRef.current - currentXRef.current
      : currentXRef.current - startXRef.current;
    
    if (diff > 0 && drawerRef.current) {
      const translateX = position === 'left' ? -diff : diff;
      drawerRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, [position]);

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    const diff = position === 'left'
      ? startXRef.current - currentXRef.current
      : currentXRef.current - startXRef.current;
    
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
    
    // Close if swiped more than 100px
    if (diff > 100) {
      onClose();
    }
  }, [position, onClose]);

  const positionClasses = position === 'left'
    ? 'left-0 -translate-x-full'
    : 'right-0 translate-x-full';

  const openPositionClasses = position === 'left'
    ? 'translate-x-0'
    : 'translate-x-0';

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-[299] transition-opacity duration-300
          ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Navigation menu'}
        className={`
          fixed top-0 bottom-0 ${position === 'left' ? 'left-0' : 'right-0'}
          w-[280px] max-w-[85vw] bg-zinc-900 z-[300]
          transform transition-transform duration-300 ease-out
          ${isOpen ? openPositionClasses : positionClasses}
          flex flex-col
          ${className}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          {title && (
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-2 rounded-lg hover:bg-zinc-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Safe area padding for devices with notch */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
};

export default MobileDrawer;
