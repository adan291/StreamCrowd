/**
 * CommandCategoryManager Component
 * 
 * Manages command categories - create, edit, delete custom categories.
 */

import React, { useState, useCallback } from 'react';
import { 
  FolderPlus, 
  Trash2, 
  Edit2, 
  Check, 
  X,
  GripVertical
} from 'lucide-react';
import { 
  DEFAULT_CATEGORIES, 
  CATEGORY_COLORS, 
  getCategoryColors,
  validateCategoryName,
  generateCategoryId 
} from '../../config/commandCategories';
import type { CommandCategory } from '../../types/commandEditor';

const AVAILABLE_COLORS = Object.keys(CATEGORY_COLORS);
const AVAILABLE_ICONS = ['📋', '📁', '⭐', '🎯', '💡', '🔥', '💬', '🎪', '🎨', '🎵'];

interface CategoryItemProps {
  category: CommandCategory;
  commandCount: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (updates: Partial<CommandCategory>) => void;
  onCancel: () => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({
  category,
  commandCount,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}) => {
  const [editName, setEditName] = useState(category.name);
  const [editIcon, setEditIcon] = useState(category.icon);
  const [editColor, setEditColor] = useState(category.color);

  const colors = getCategoryColors(category.color);

  const handleSave = useCallback(() => {
    onSave({
      name: editName,
      icon: editIcon,
      color: editColor,
    });
  }, [editName, editIcon, editColor, onSave]);

  if (isEditing) {
    return (
      <div className="bg-zinc-800 rounded-lg p-3 border border-purple-500/50">
        <div className="space-y-3">
          {/* Name */}
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Nombre de categoría"
            className="w-full bg-zinc-700 text-white rounded px-3 py-1.5 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
          />

          {/* Icon selector */}
          <div>
            <label className="text-zinc-500 text-xs block mb-1">Icono</label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setEditIcon(icon)}
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                    editIcon === icon 
                      ? 'bg-purple-500 ring-2 ring-purple-400' 
                      : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color selector */}
          <div>
            <label className="text-zinc-500 text-xs block mb-1">Color</label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_COLORS.map(color => {
                const colorClasses = getCategoryColors(color);
                return (
                  <button
                    key={color}
                    onClick={() => setEditColor(color)}
                    className={`w-8 h-8 rounded ${colorClasses.bg} ${
                      editColor === color ? 'ring-2 ring-white' : ''
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <button
              onClick={handleSave}
              className="p-2 text-green-400 hover:text-green-300 transition-colors"
            >
              <Check size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
      <GripVertical size={16} className="text-zinc-600 cursor-grab" />
      <span className="text-lg">{category.icon}</span>
      <div className="flex-1">
        <span className={`font-medium text-sm ${colors.text}`}>{category.name}</span>
        <span className="text-zinc-600 text-xs ml-2">({commandCount})</span>
      </div>
      {!category.isDefault && (
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

interface CommandCategoryManagerProps {
  /** Custom categories (in addition to defaults) */
  customCategories: CommandCategory[];
  /** Command counts per category */
  commandCounts: Record<string, number>;
  /** Callback when categories change */
  onCategoriesChange: (categories: CommandCategory[]) => void;
}

/**
 * Category manager component
 */
export const CommandCategoryManager: React.FC<CommandCategoryManagerProps> = ({
  customCategories,
  commandCounts,
  onCategoriesChange,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📁');
  const [newColor, setNewColor] = useState('gray');
  const [error, setError] = useState<string | null>(null);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories].sort((a, b) => a.order - b.order);

  const handleCreate = useCallback(() => {
    const validation = validateCategoryName(newName, allCategories);
    if (!validation.valid) {
      setError(validation.error || 'Error de validación');
      return;
    }

    const newCategory: CommandCategory = {
      id: generateCategoryId(newName),
      name: newName,
      icon: newIcon,
      color: newColor,
      isDefault: false,
      order: allCategories.length,
    };

    onCategoriesChange([...customCategories, newCategory]);
    setIsCreating(false);
    setNewName('');
    setNewIcon('📁');
    setNewColor('gray');
    setError(null);
  }, [newName, newIcon, newColor, allCategories, customCategories, onCategoriesChange]);

  const handleUpdate = useCallback((id: string, updates: Partial<CommandCategory>) => {
    const updated = customCategories.map(cat => 
      cat.id === id ? { ...cat, ...updates } : cat
    );
    onCategoriesChange(updated);
    setEditingId(null);
  }, [customCategories, onCategoriesChange]);

  const handleDelete = useCallback((id: string) => {
    if (confirm('¿Eliminar esta categoría? Los comandos se moverán a "General".')) {
      onCategoriesChange(customCategories.filter(cat => cat.id !== id));
    }
  }, [customCategories, onCategoriesChange]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium text-sm">Categorías</h4>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            <FolderPlus size={14} />
            Nueva
          </button>
        )}
      </div>

      {/* Create form */}
      {isCreating && (
        <div className="bg-zinc-800 rounded-lg p-3 border border-purple-500/50 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError(null);
            }}
            placeholder="Nombre de categoría"
            className="w-full bg-zinc-700 text-white rounded px-3 py-1.5 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
          />

          {/* Icon selector */}
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_ICONS.map(icon => (
              <button
                key={icon}
                onClick={() => setNewIcon(icon)}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                  newIcon === icon 
                    ? 'bg-purple-500 ring-2 ring-purple-400' 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Color selector */}
          <div className="flex flex-wrap gap-1">
            {AVAILABLE_COLORS.map(color => {
              const colorClasses = getCategoryColors(color);
              return (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-8 h-8 rounded ${colorClasses.bg} ${
                    newColor === color ? 'ring-2 ring-white' : ''
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                setIsCreating(false);
                setError(null);
              }}
              className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded text-sm transition-colors"
            >
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      <div className="space-y-2">
        {allCategories.map(category => (
          <CategoryItem
            key={category.id}
            category={category}
            commandCount={commandCounts[category.id] || 0}
            isEditing={editingId === category.id}
            onEdit={() => setEditingId(category.id)}
            onDelete={() => handleDelete(category.id)}
            onSave={(updates) => handleUpdate(category.id, updates)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </div>
    </div>
  );
};

export default CommandCategoryManager;
