/**
 * RequirementsConfig Component
 * Configuration for participation requirements
 */

import React from 'react';
import { Shield, Clock, MessageSquare, Coins, CheckCircle } from 'lucide-react';
import type { ParticipationRequirements } from './types';

interface RequirementsConfigProps {
  requirements: ParticipationRequirements;
  onChange: (requirements: ParticipationRequirements) => void;
  disabled?: boolean;
}

export const RequirementsConfig: React.FC<RequirementsConfigProps> = ({
  requirements,
  onChange,
  disabled = false,
}) => {
  const updateField = <K extends keyof ParticipationRequirements>(
    field: K,
    value: ParticipationRequirements[K]
  ) => {
    onChange({ ...requirements, [field]: value });
  };

  const hasAnyRequirement = 
    requirements.minFollowTime !== undefined ||
    requirements.minMessages !== undefined ||
    requirements.minChannelPoints !== undefined ||
    requirements.requireVerified ||
    requirements.minAccountAge !== undefined;

  return (
    <div className="space-y-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-blue-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Requisitos de participación
        </span>
        {hasAnyRequirement && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
            Activo
          </span>
        )}
      </div>

      {/* Min follow time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-zinc-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Tiempo mínimo de follow</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={requirements.minFollowTime || ''}
            onChange={e => updateField('minFollowTime', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={disabled}
            placeholder="0"
            className="w-16 px-2 py-1 text-sm text-right rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 disabled:opacity-50"
          />
          <span className="text-xs text-zinc-500">min</span>
        </div>
      </div>

      {/* Min messages */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-zinc-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Mensajes mínimos (sesión)</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={requirements.minMessages || ''}
          onChange={e => updateField('minMessages', e.target.value ? parseInt(e.target.value) : undefined)}
          disabled={disabled}
          placeholder="0"
          className="w-16 px-2 py-1 text-sm text-right rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 disabled:opacity-50"
        />
      </div>

      {/* Min channel points */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins size={14} className="text-zinc-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Puntos de canal mínimos</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={requirements.minChannelPoints || ''}
          onChange={e => updateField('minChannelPoints', e.target.value ? parseInt(e.target.value) : undefined)}
          disabled={disabled}
          placeholder="0"
          className="w-20 px-2 py-1 text-sm text-right rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 disabled:opacity-50"
        />
      </div>

      {/* Min account age */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-zinc-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Antigüedad mínima cuenta</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={requirements.minAccountAge || ''}
            onChange={e => updateField('minAccountAge', e.target.value ? parseInt(e.target.value) : undefined)}
            disabled={disabled}
            placeholder="0"
            className="w-16 px-2 py-1 text-sm text-right rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 disabled:opacity-50"
          />
          <span className="text-xs text-zinc-500">días</span>
        </div>
      </div>

      {/* Require verified */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle size={14} className="text-zinc-400" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Requiere email verificado</span>
        </div>
        <button
          onClick={() => updateField('requireVerified', !requirements.requireVerified)}
          disabled={disabled}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            requirements.requireVerified ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
          } disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            requirements.requireVerified ? 'left-5' : 'left-0.5'
          }`} />
        </button>
      </div>

      {/* Summary */}
      {hasAnyRequirement && (
        <div className="pt-2 border-t border-blue-500/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            ⚠️ Los usuarios que no cumplan estos requisitos no podrán participar
          </p>
        </div>
      )}
    </div>
  );
};

export default RequirementsConfig;
