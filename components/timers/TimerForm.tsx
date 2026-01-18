/**
 * TimerForm Component
 * 
 * Form for creating and editing timers.
 */

import React, { useState, useEffect } from 'react';
import { X, Info, Clock, MessageSquare, Hash, FolderOpen } from 'lucide-react';
import type { Timer, TimerGroup, TimerFormData } from '../../types/timers';
import { useI18n } from '../../i18n';
import { TimerFormSchema } from '../../src/domain/schemas/formSchemas';
import { safeValidateInput } from '../../src/domain/schemas/securitySchemas';

interface TimerFormProps {
  timer?: Timer;
  groups: TimerGroup[];
  onSave: (data: TimerFormData) => void;
  onCancel: () => void;
}

export const TimerForm: React.FC<TimerFormProps> = ({
  timer,
  groups,
  onSave,
  onCancel
}) => {
  const { t } = useI18n();
  const [name, setName] = useState(timer?.name || '');
  const [message, setMessage] = useState(timer?.message || '');
  const [intervalMinutes, setIntervalMinutes] = useState(timer?.intervalMinutes || 15);
  const [minChatLines, setMinChatLines] = useState(timer?.minChatLines || 5);
  const [groupId, setGroupId] = useState<string | null>(timer?.groupId || null);
  const [enabled, setEnabled] = useState(timer?.enabled ?? true);
  const [showVariables, setShowVariables] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!timer;

  const VARIABLES = [
    { name: '$(channel)', description: t.misc.timers.variables.channel },
    { name: '$(game)', description: t.misc.timers.variables.game },
    { name: '$(uptime)', description: t.misc.timers.variables.uptime },
    { name: '$(viewers)', description: t.misc.timers.variables.viewers },
    { name: '$(followers)', description: t.misc.timers.variables.followers },
    { name: '$(date)', description: t.misc.timers.variables.date },
    { name: '$(time)', description: t.misc.timers.variables.time },
  ];

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t.misc.timers.nameRequired;
    }

    if (!message.trim()) {
      newErrors.message = t.misc.timers.messageRequired;
    }

    if (intervalMinutes < 1) {
      newErrors.interval = t.misc.timers.intervalMin;
    } else if (intervalMinutes > 120) {
      newErrors.interval = t.misc.timers.intervalMax;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit with Zod validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare form data
    const formData = {
      name: name.trim(),
      message: message.trim(),
      interval: intervalMinutes * 60, // Convert to seconds for schema
      enabled,
    };

    // Validate with Zod schema
    const result = safeValidateInput(TimerFormSchema, formData);
    
    if (!result.success) {
      // Extract errors by field
      const newErrors: Record<string, string> = {};
      result.errors.issues.forEach((issue) => {
        const field = issue.path[0]?.toString();
        if (field) {
          newErrors[field] = issue.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    // Clear errors and save with validated data
    setErrors({});
    onSave({
      name: result.data.name,
      message: result.data.message,
      intervalMinutes,
      minChatLines,
      groupId,
      enabled: result.data.enabled
    });
  };

  // Insert variable at cursor
  const insertVariable = (variable: string) => {
    setMessage(prev => prev + variable);
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">
          {isEditing ? t.misc.timers.editTimer : t.misc.timers.createTimer}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 text-zinc-400 hover:text-white transition-colors"
          aria-label={t.common.close}
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
            <Hash size={14} />
            {t.misc.timers.timerName}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.misc.timers.timerNamePlaceholder}
            maxLength={50}
            className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              errors.name ? 'border-red-500' : 'border-zinc-700'
            }`}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-xs text-red-400 mt-1">{errors.name}</p>
          )}
        </div>

        {/* Message */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <MessageSquare size={14} />
              {t.misc.timers.timerMessage}
            </label>
            <button
              type="button"
              onClick={() => setShowVariables(!showVariables)}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            >
              <Info size={12} />
              {t.misc.timers.variablesTitle}
            </button>
          </div>
          
          {showVariables && (
            <div className="mb-2 p-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <p className="text-xs text-zinc-400 mb-2">{t.misc.timers.variablesHelp}</p>
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map(v => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertVariable(v.name)}
                    className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-emerald-400 rounded transition-colors"
                    title={v.description}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.misc.timers.timerMessagePlaceholder}
            maxLength={500}
            rows={3}
            className={`w-full px-3 py-2 bg-zinc-800 border rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${
              errors.message ? 'border-red-500' : 'border-zinc-700'
            }`}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'message-error' : undefined}
          />
          <div className="flex justify-between mt-1">
            {errors.message ? (
              <p id="message-error" className="text-xs text-red-400">{errors.message}</p>
            ) : (
              <span />
            )}
            <span className="text-xs text-zinc-500">{message.length}/500</span>
          </div>
        </div>

        {/* Interval */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
            <Clock size={14} />
            {t.misc.timers.timerInterval}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={120}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <input
              type="number"
              min={1}
              max={120}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Math.min(120, Math.max(1, Number(e.target.value))))}
              className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {errors.interval && (
            <p className="text-xs text-red-400 mt-1">{errors.interval}</p>
          )}
        </div>

        {/* Min Chat Lines */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
            <MessageSquare size={14} />
            {t.misc.timers.timerMinLines}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={minChatLines}
              onChange={(e) => setMinChatLines(Number(e.target.value))}
              className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={minChatLines}
              onChange={(e) => setMinChatLines(Math.min(100, Math.max(0, Number(e.target.value))))}
              className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {t.misc.timers.timerMinLinesHelp}
          </p>
        </div>

        {/* Group */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-1">
            <FolderOpen size={14} />
            {t.misc.timers.timerGroup}
          </label>
          <select
            value={groupId || ''}
            onChange={(e) => setGroupId(e.target.value || null)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">{t.misc.timers.timerNoGroup}</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Enabled */}
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
          <span className="text-sm text-zinc-300">{t.misc.timers.timerEnabled}</span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? 'bg-emerald-500' : 'bg-zinc-600'
            }`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            {t.misc.timers.cancel}
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
          >
            {t.misc.timers.save}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TimerForm;
