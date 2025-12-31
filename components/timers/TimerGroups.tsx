/**
 * TimerGroups Component
 * 
 * Manage timer groups for organization.
 */

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, FolderOpen, X } from 'lucide-react';
import type { Timer, TimerGroup, TimerGroupFormData } from '../../types/timers';
import { useI18n, interpolate } from '../../i18n';

const GROUP_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

interface TimerGroupsProps {
  groups: TimerGroup[];
  timers: Timer[];
  onCreateGroup: (data: TimerGroupFormData) => void;
  onUpdateGroup: (id: string, updates: Partial<TimerGroup>) => void;
  onDeleteGroup: (id: string) => void;
  onToggleGroup: (id: string) => void;
}

export const TimerGroups: React.FC<TimerGroupsProps> = ({
  groups,
  timers,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onToggleGroup
}) => {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TimerGroup | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(GROUP_COLORS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Get timer count for a group
  const getTimerCount = (groupId: string): number => {
    return timers.filter(t => t.groupId === groupId).length;
  };

  // Get ungrouped timer count
  const ungroupedCount = timers.filter(t => !t.groupId).length;

  // Open create form
  const openCreateForm = () => {
    setEditingGroup(null);
    setName('');
    setColor(GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]);
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (group: TimerGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setColor(group.color);
    setShowForm(true);
  };

  // Close form
  const closeForm = () => {
    setShowForm(false);
    setEditingGroup(null);
    setName('');
  };

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingGroup) {
      onUpdateGroup(editingGroup.id, { name: name.trim(), color });
    } else {
      onCreateGroup({ name: name.trim(), color, enabled: true });
    }
    closeForm();
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDeleteGroup(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          {t.timers.groupsDescription}
        </p>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors"
        >
          <Plus size={16} />
          {t.timers.createGroup}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-white">
              {editingGroup ? t.timers.editGroup : t.timers.createGroup}
            </h4>
            <button
              onClick={closeForm}
              className="p-1 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-1">{t.timers.groupName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.timers.timerNamePlaceholder}
                maxLength={30}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-300 mb-2">{t.timers.groupColor}</label>
              <div className="flex flex-wrap gap-2">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                {t.timers.cancel}
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
              >
                {t.timers.save}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups list */}
      <div className="space-y-2">
        {/* General (ungrouped) */}
        <div className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center">
              <FolderOpen size={16} className="text-zinc-400" />
            </div>
            <div>
              <span className="font-medium text-white">{t.timers.generalGroup}</span>
              <span className="text-xs text-zinc-500 ml-2">
                {interpolate(t.timers.groupTimerCount, { count: ungroupedCount })}
              </span>
            </div>
          </div>
          <span className="text-xs text-zinc-500">{t.timers.timerNoGroup}</span>
        </div>

        {/* Custom groups */}
        {groups.map(group => (
          <div
            key={group.id}
            className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
              group.enabled 
                ? 'bg-zinc-800/50 border-zinc-800' 
                : 'bg-zinc-900/50 border-zinc-800/50 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Toggle */}
              <button
                onClick={() => onToggleGroup(group.id)}
                className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                  group.enabled ? 'bg-emerald-500' : 'bg-zinc-600'
                }`}
                role="switch"
                aria-checked={group.enabled}
                aria-label={t.timers.toggleGroup}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    group.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Color & name */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: group.color }}
              />
              <div>
                <span className="font-medium text-white">{group.name}</span>
                <span className="text-xs text-zinc-500 ml-2">
                  {interpolate(t.timers.groupTimerCount, { count: getTimerCount(group.id) })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => openEditForm(group)}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded"
                aria-label={t.timers.edit}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(group.id)}
                className={`p-1.5 transition-colors rounded ${
                  deleteConfirm === group.id
                    ? 'text-red-400 bg-red-500/10'
                    : 'text-zinc-400 hover:text-red-400'
                }`}
                aria-label={deleteConfirm === group.id ? t.timers.deleteGroupConfirm : t.timers.delete}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Empty state */}
        {groups.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t.timers.noGroups}</p>
            <p className="text-xs">{t.timers.noGroupsDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimerGroups;
