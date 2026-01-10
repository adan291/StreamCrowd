/**
 * WizardButton Component
 * Unified button for wizard/assistant mode across the app
 */

import React from 'react';
import { Wand2 } from 'lucide-react';

export interface WizardButtonProps {
  /** Whether wizard mode is active */
  isActive: boolean;
  /** Toggle wizard mode */
  onClick: () => void;
  /** Disable the button */
  disabled?: boolean;
  /** Show text label */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Custom class name */
  className?: string;
}

export const WizardButton: React.FC<WizardButtonProps> = ({
  isActive,
  onClick,
  disabled = false,
  showLabel = true,
  label = 'Asistente',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs gap-1.5',
      icon: 12,
    },
    md: {
      button: 'px-2.5 py-1.5 text-xs gap-1.5',
      icon: 14,
    },
  };

  const sizes = sizeClasses[size];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center ${sizes.button} rounded-lg font-medium transition-all
        ${isActive 
          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md' 
          : 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/30'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
      title="Modo Asistente"
    >
      <Wand2 size={sizes.icon} />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
};

export default WizardButton;
