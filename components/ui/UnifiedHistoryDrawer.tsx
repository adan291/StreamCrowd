/**
 * UnifiedHistoryDrawer Component
 * Drawer that shows the unified history of all dynamics
 */

import React from 'react';
import { X, History } from 'lucide-react';
import { UnifiedHistoryPanel } from './UnifiedHistoryPanel';

// ============================================
// TYPES
// ============================================

export interface UnifiedHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export const UnifiedHistoryDrawer: React.FC<UnifiedHistoryDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <History size={20} className="text-purple-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Historial
              </h2>
              <p className="text-xs text-zinc-500">
                Todas las dinámicas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={20} className="text-zinc-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-4">
          <UnifiedHistoryPanel maxHeight="calc(100vh - 120px)" />
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default UnifiedHistoryDrawer;
