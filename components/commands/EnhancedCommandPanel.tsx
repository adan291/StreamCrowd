/**
 * EnhancedCommandPanel Component
 * 
 * Enhanced version of CommandPanel with templates, visual editor,
 * AI generation, categories, and testing capabilities.
 * 
 * Performance optimizations:
 * - Debounced search input
 * - Virtualized command list for large datasets
 * - Lazy loaded template library
 * - Memoized filtered results
 */

import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  Terminal, 
  Plus,
  Save,
  Trash2,
  Edit2,
  Clock,
  Users,
  Hash,
  MessageSquare,
  BarChart3,
  X,
  AlertCircle,
  Download,
  Upload,
  Sparkles,
  Layers,
  Play,
  FolderOpen,
  Wand2,
  Filter,
  Loader2,
  Zap
} from 'lucide-react';
import { 
  useCommands, 
  CustomCommand, 
  UserLevel 
} from '../../src/application/hooks/useCommands';
import { useCommandsExport } from '../../src/application/hooks/useCommandsExport';
import { useDebounce } from '../../src/application/hooks/useDebounce';
import { useVirtualList, shouldVirtualize } from '../../src/application/hooks/useVirtualList';
import { VisualCommandEditor } from './VisualCommandEditor';
import { CommandTester } from './CommandTester';
import { DEFAULT_CATEGORIES, getCategoryColors } from '../../config/commandCategories';
import type { CommandCategory } from '../../types/commandEditor';
import type { ImportMode, ImportResult, ImportValidationResult } from '../../types/commandExport';

// Lazy load heavy components
const CommandTemplateLibrary = lazy(() => import('./CommandTemplateLibrary').then(m => ({ default: m.CommandTemplateLibrary })));
const AICommandGenerator = lazy(() => import('./AICommandGenerator').then(m => ({ default: m.AICommandGenerator })));
const CommandCategoryManager = lazy(() => import('./CommandCategoryManager').then(m => ({ default: m.CommandCategoryManager })));
const CommandAnalysisPanel = lazy(() => import('./CommandAnalysisPanel').then(m => ({ default: m.CommandAnalysisPanel })));
const DynamicCommandsPanel = lazy(() => import('../DynamicCommandsPanel').then(m => ({ default: m.DynamicCommandsPanel })));

// Loading fallback component
const LoadingFallback: React.FC<{ text?: string }> = ({ text = 'Cargando...' }) => (
  <div className="flex items-center justify-center py-12 text-zinc-500">
    <Loader2 size={24} className="animate-spin mr-2" />
    <span>{text}</span>
  </div>
);

// User level configuration
const USER_LEVELS: { value: UserLevel; label: string; description: string }[] = [
  { value: 'everyone', label: 'Todos', description: 'Cualquier usuario' },
  { value: 'subscriber', label: 'Suscriptor', description: 'Solo suscriptores' },
  { value: 'vip', label: 'VIP', description: 'VIPs y superiores' },
  { value: 'moderator', label: 'Moderador', description: 'Moderadores y broadcaster' },
  { value: 'broadcaster', label: 'Broadcaster', description: 'Solo el streamer' },
];

type PanelView = 'list' | 'templates' | 'ai' | 'categories' | 'analysis' | 'dynamics';

interface CommandFormData {
  name: string;
  response: string;
  cooldown: number;
  userLevel: UserLevel;
  enabled: boolean;
  categoryId?: string;
}

const defaultFormData: CommandFormData = {
  name: '',
  response: '',
  cooldown: 5,
  userLevel: 'everyone',
  enabled: true,
  categoryId: 'general',
};

interface EnhancedCommandFormProps {
  initialData?: CommandFormData;
  onSave: (data: CommandFormData) => void;
  onCancel: () => void;
  isEditing: boolean;
  categories: CommandCategory[];
}

/**
 * Enhanced form with visual editor and tester
 */
const EnhancedCommandForm: React.FC<EnhancedCommandFormProps> = ({ 
  initialData = defaultFormData, 
  onSave, 
  onCancel,
  isEditing,
  categories 
}) => {
  const [formData, setFormData] = useState<CommandFormData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof CommandFormData, string>>>({});
  const [showTester, setShowTester] = useState(false);

  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof CommandFormData, string>> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Solo letras, números y guiones bajos';
    }
    
    if (!formData.response.trim()) {
      newErrors.response = 'La respuesta es requerida';
    }
    
    if (formData.cooldown < 0) {
      newErrors.cooldown = 'El cooldown no puede ser negativo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  }, [formData, validate, onSave]);

  const handleChange = useCallback(<K extends keyof CommandFormData>(
    field: K, 
    value: CommandFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  const handleResponseChange = useCallback((value: string) => {
    handleChange('response', value);
  }, [handleChange]);

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold">
          {isEditing ? 'Editar Comando' : 'Nuevo Comando'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Command Name */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            Nombre del Comando
          </label>
          <div className="flex items-center">
            <span className="bg-zinc-700 text-purple-400 px-3 py-2 rounded-l-lg border border-r-0 border-zinc-600">
              !
            </span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value.toLowerCase())}
              placeholder="comando"
              className={`flex-1 bg-zinc-700 text-white rounded-r-lg px-3 py-2 text-sm border ${
                errors.name ? 'border-red-500' : 'border-zinc-600'
              } focus:border-purple-500 focus:outline-none`}
            />
          </div>
          {errors.name && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.name}
            </p>
          )}
        </div>

        {/* Response with Visual Editor */}
        <div>
          <label className="text-zinc-400 text-xs block mb-1">
            Respuesta
          </label>
          <VisualCommandEditor
            initialValue={formData.response}
            onChange={handleResponseChange}
            compact
          />
          {errors.response && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {errors.response}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Cooldown */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Cooldown (seg)
            </label>
            <input
              type="number"
              min="0"
              max="3600"
              value={formData.cooldown}
              onChange={(e) => handleChange('cooldown', parseInt(e.target.value) || 0)}
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* User Level */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Nivel
            </label>
            <select
              value={formData.userLevel}
              onChange={(e) => handleChange('userLevel', e.target.value as UserLevel)}
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
            >
              {USER_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Categoría
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => handleChange('categoryId', e.target.value)}
              className="w-full bg-zinc-700 text-white rounded-lg px-3 py-2 text-sm border border-zinc-600 focus:border-purple-500 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 text-sm">Comando Activo</span>
          <div 
            className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
              formData.enabled ? 'bg-green-500' : 'bg-zinc-600'
            }`}
            onClick={() => handleChange('enabled', !formData.enabled)}
          >
            <div 
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                formData.enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Test toggle */}
        <button
          type="button"
          onClick={() => setShowTester(!showTester)}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
        >
          <Play size={14} />
          {showTester ? 'Ocultar test' : 'Probar comando'}
        </button>

        {/* Tester */}
        {showTester && (
          <CommandTester
            response={formData.response}
            trigger={formData.name || 'comando'}
            compact
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-zinc-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
        >
          <Save size={16} />
          {isEditing ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

interface CommandItemProps {
  command: CustomCommand & { categoryId?: string };
  category?: CommandCategory;
  onEdit: (command: CustomCommand) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (command: CustomCommand) => void;
}

/**
 * Enhanced command item with category badge
 */
const CommandItem: React.FC<CommandItemProps> = ({ 
  command, 
  category,
  onEdit, 
  onDelete,
  onToggle,
  onTest 
}) => {
  const levelInfo = USER_LEVELS.find(l => l.value === command.userLevel);
  const categoryColors = category ? getCategoryColors(category.color) : null;

  // Keyboard handler for the item
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onEdit(command);
        break;
      case 'Delete':
      case 'Backspace':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onDelete(command.id);
        }
        break;
      case 't':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onTest(command);
        }
        break;
    }
  }, [command, onEdit, onDelete, onTest]);

  return (
    <div 
      className={`bg-zinc-800/50 rounded-xl p-4 border transition-all ${
        command.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'
      } focus-within:ring-2 focus-within:ring-purple-500/50`}
      role="listitem"
      aria-label={`Comando ${command.name}${!command.enabled ? ', desactivado' : ''}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-purple-400 font-mono font-bold" aria-label={`Trigger: exclamación ${command.name}`}>
              !{command.name}
            </span>
            {category && (
              <span 
                className={`text-xs px-2 py-0.5 rounded ${categoryColors?.bg} ${categoryColors?.text}`}
                aria-label={`Categoría: ${category.name}`}
              >
                {category.icon} {category.name}
              </span>
            )}
            {!command.enabled && (
              <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded" aria-hidden="true">
                Desactivado
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-sm line-clamp-2 mb-2" aria-label={`Respuesta: ${command.response}`}>
            {command.response}
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-500" aria-label="Detalles del comando">
            <span className="flex items-center gap-1" aria-label={`Cooldown: ${command.cooldown} segundos`}>
              <Clock size={12} aria-hidden="true" />
              {command.cooldown}s
            </span>
            <span className="flex items-center gap-1" aria-label={`Nivel requerido: ${levelInfo?.label}`}>
              <Users size={12} aria-hidden="true" />
              {levelInfo?.label}
            </span>
            <span className="flex items-center gap-1" aria-label={`Usado ${command.usageCount} veces`}>
              <BarChart3 size={12} aria-hidden="true" />
              {command.usageCount} usos
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 ml-4" role="group" aria-label="Acciones del comando">
          <button
            onClick={() => onTest(command)}
            className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            title="Probar comando (Ctrl+T)"
            aria-label={`Probar comando ${command.name}`}
          >
            <Play size={16} aria-hidden="true" />
          </button>
          <button
            onClick={() => onToggle(command.id, !command.enabled)}
            className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              command.enabled ? 'bg-green-500' : 'bg-zinc-600'
            }`}
            role="switch"
            aria-checked={command.enabled}
            aria-label={`${command.enabled ? 'Desactivar' : 'Activar'} comando ${command.name}`}
          >
            <div 
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                command.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
              aria-hidden="true"
            />
          </button>
          <button
            onClick={() => onEdit(command)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            title="Editar comando (Enter)"
            aria-label={`Editar comando ${command.name}`}
          >
            <Edit2 size={16} aria-hidden="true" />
          </button>
          <button
            onClick={() => onDelete(command.id)}
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
            title="Eliminar comando (Ctrl+Delete)"
            aria-label={`Eliminar comando ${command.name}`}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Enhanced CommandPanel component
 */
export const EnhancedCommandPanel: React.FC = () => {
  const { commands, addCommand, updateCommand, deleteCommand, prefix } = useCommands();
  const [showForm, setShowForm] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<PanelView>('list');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<CommandCategory[]>([]);
  const [testingCommand, setTestingCommand] = useState<CustomCommand | null>(null);

  // Debounce search for performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Global keyboard shortcuts
  const handleGlobalKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Only handle when not in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'n':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setShowForm(true);
          setActiveView('list');
        }
        break;
      case '/':
        e.preventDefault();
        // Focus search input
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        searchInput?.focus();
        break;
      case 'Escape':
        if (showForm || editingCommand || testingCommand) {
          e.preventDefault();
          setShowForm(false);
          setEditingCommand(null);
          setTestingCommand(null);
        }
        break;
      case '1':
        if (e.altKey) {
          e.preventDefault();
          setActiveView('list');
        }
        break;
      case '2':
        if (e.altKey) {
          e.preventDefault();
          setActiveView('templates');
        }
        break;
      case '3':
        if (e.altKey) {
          e.preventDefault();
          setActiveView('ai');
        }
        break;
      case '4':
        if (e.altKey) {
          e.preventDefault();
          setActiveView('categories');
        }
        break;
      case '5':
        if (e.altKey) {
          e.preventDefault();
          setActiveView('analysis');
        }
        break;
      case '6':
        if (e.altKey) {
          e.preventDefault();
          setActiveView('dynamics');
        }
        break;
    }
  }, [showForm, editingCommand, testingCommand]);

  const allCategories = useMemo(() => 
    [...DEFAULT_CATEGORIES, ...customCategories].sort((a, b) => a.order - b.order),
    [customCategories]
  );

  // Command counts per category
  const commandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allCategories.forEach(cat => { counts[cat.id] = 0; });
    commands.forEach(cmd => {
      const catId = (cmd as any).categoryId || 'general';
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [commands, allCategories]);

  // Import/Export hook
  const handleImportCommands = useCallback((newCommands: Omit<CustomCommand, 'id' | 'usageCount'>[]) => {
    newCommands.forEach(cmd => addCommand(cmd));
  }, [addCommand]);

  const { exportCommands } = useCommandsExport(commands, handleImportCommands);

  const handleAddCommand = useCallback((data: CommandFormData) => {
    addCommand({
      name: data.name,
      response: data.response,
      cooldown: data.cooldown,
      userLevel: data.userLevel,
      enabled: data.enabled,
    });
    setShowForm(false);
  }, [addCommand]);

  const handleAddFromTemplate = useCallback((trigger: string, response: string, userLevel: string, cooldown: number) => {
    addCommand({
      name: trigger,
      response,
      cooldown,
      userLevel: userLevel as UserLevel,
      enabled: true,
    });
    setActiveView('list');
  }, [addCommand]);

  const handleUpdateCommand = useCallback((data: CommandFormData) => {
    if (editingCommand) {
      updateCommand(editingCommand.id, {
        name: data.name,
        response: data.response,
        cooldown: data.cooldown,
        userLevel: data.userLevel,
        enabled: data.enabled,
      });
      setEditingCommand(null);
    }
  }, [editingCommand, updateCommand]);

  const handleDeleteCommand = useCallback((id: string) => {
    if (confirm('¿Eliminar este comando?')) {
      deleteCommand(id);
    }
  }, [deleteCommand]);

  const handleToggleCommand = useCallback((id: string, enabled: boolean) => {
    updateCommand(id, { enabled });
  }, [updateCommand]);

  const handleEdit = useCallback((command: CustomCommand) => {
    setEditingCommand(command);
    setShowForm(false);
    setActiveView('list');
  }, []);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setEditingCommand(null);
  }, []);

  // Filter commands (using debounced search term)
  const filteredCommands = useMemo(() => {
    let filtered = commands;
    
    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(cmd => 
        cmd.name.toLowerCase().includes(term) ||
        cmd.response.toLowerCase().includes(term)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(cmd => 
        (cmd as any).categoryId === selectedCategory || 
        (!((cmd as any).categoryId) && selectedCategory === 'general')
      );
    }
    
    return [...filtered].sort((a, b) => b.usageCount - a.usageCount);
  }, [commands, debouncedSearchTerm, selectedCategory]);

  // Virtualization for large command lists
  const useVirtualization = shouldVirtualize(filteredCommands.length, 30);
  const ITEM_HEIGHT = 120; // Approximate height of CommandItem
  const CONTAINER_HEIGHT = 480; // Max height for virtualized list
  
  const { virtualItems, totalHeight, onScroll, containerRef } = useVirtualList({
    itemCount: filteredCommands.length,
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 2,
  });

  const existingTriggers = useMemo(() => commands.map(c => c.name), [commands]);

  return (
    <div 
      className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800"
      role="region"
      aria-label="Panel de comandos personalizados"
      onKeyDown={handleGlobalKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center" aria-hidden="true">
            <Terminal size={24} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold" id="commands-panel-title">Comandos</h2>
            <p className="text-zinc-500 text-sm">
              Prefix: <span className="text-purple-400 font-mono">{prefix}</span>
            </p>
          </div>
        </div>
        
        {activeView === 'list' && !showForm && !editingCommand && (
          <div className="flex items-center gap-2" role="group" aria-label="Acciones de comandos">
            <button
              onClick={() => exportCommands()}
              disabled={commands.length === 0}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              title="Exportar comandos"
              aria-label="Exportar comandos a archivo JSON"
            >
              <Download size={16} aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-300"
              title="Nuevo comando (Ctrl+N)"
              aria-label="Crear nuevo comando"
            >
              <Plus size={16} aria-hidden="true" />
              Nuevo
            </button>
          </div>
        )}
      </div>

      {/* View tabs */}
      {!showForm && !editingCommand && (
        <div 
          className="flex items-center gap-1 mb-4 bg-zinc-800/50 rounded-lg p-1"
          role="tablist"
          aria-label="Vistas del panel de comandos"
        >
          <button
            onClick={() => setActiveView('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              activeView === 'list' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            role="tab"
            aria-selected={activeView === 'list'}
            aria-controls="commands-list-panel"
            title="Alt+1"
          >
            <MessageSquare size={14} aria-hidden="true" />
            Comandos
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              activeView === 'templates' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            role="tab"
            aria-selected={activeView === 'templates'}
            aria-controls="templates-panel"
            title="Alt+2"
          >
            <Sparkles size={14} aria-hidden="true" />
            Plantillas
          </button>
          <button
            onClick={() => setActiveView('ai')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              activeView === 'ai' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            role="tab"
            aria-selected={activeView === 'ai'}
            aria-controls="ai-panel"
            title="Alt+3"
          >
            <Wand2 size={14} aria-hidden="true" />
            IA
          </button>
          <button
            onClick={() => setActiveView('categories')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              activeView === 'categories' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            role="tab"
            aria-selected={activeView === 'categories'}
            aria-controls="categories-panel"
            title="Alt+4"
          >
            <FolderOpen size={14} aria-hidden="true" />
            Categorías
          </button>
          <button
            onClick={() => setActiveView('analysis')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              activeView === 'analysis' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            role="tab"
            aria-selected={activeView === 'analysis'}
            aria-controls="analysis-panel"
            title="Alt+5"
          >
            <BarChart3 size={14} aria-hidden="true" />
            Análisis
          </button>
          <button
            onClick={() => setActiveView('dynamics')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
              activeView === 'dynamics' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
            }`}
            role="tab"
            aria-selected={activeView === 'dynamics'}
            aria-controls="dynamics-panel"
            title="Alt+6"
          >
            <Zap size={14} aria-hidden="true" />
            Dinámicas
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <EnhancedCommandForm
          onSave={handleAddCommand}
          onCancel={handleCancelForm}
          isEditing={false}
          categories={allCategories}
        />
      )}

      {editingCommand && (
        <EnhancedCommandForm
          initialData={{
            name: editingCommand.name,
            response: editingCommand.response,
            cooldown: editingCommand.cooldown,
            userLevel: editingCommand.userLevel,
            enabled: editingCommand.enabled,
            categoryId: (editingCommand as any).categoryId || 'general',
          }}
          onSave={handleUpdateCommand}
          onCancel={handleCancelForm}
          isEditing={true}
          categories={allCategories}
        />
      )}

      {/* Views */}
      {!showForm && !editingCommand && (
        <>
          {/* List View */}
          {activeView === 'list' && (
            <div id="commands-list-panel" role="tabpanel" aria-labelledby="commands-panel-title">
              {/* Search and Filter */}
              {commands.length > 0 && (
                <div className="flex items-center gap-2 mb-4" role="search">
                  <div className="relative flex-1">
                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar comandos... (presiona / para enfocar)"
                      className="w-full bg-zinc-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                      aria-label="Buscar comandos"
                      data-search-input
                    />
                  </div>
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    aria-label="Filtrar por categoría"
                  >
                    <option value="">Todas las categorías</option>
                    {allCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name} ({commandCounts[cat.id] || 0})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Commands List */}
              {filteredCommands.length > 0 ? (
                useVirtualization ? (
                  // Virtualized list for large datasets
                  <div 
                    ref={containerRef}
                    onScroll={onScroll}
                    className="overflow-auto"
                    style={{ height: CONTAINER_HEIGHT }}
                    role="list"
                    aria-label={`Lista de comandos, ${filteredCommands.length} resultados`}
                  >
                    <div style={{ height: totalHeight, position: 'relative' }}>
                      {virtualItems.map(({ index, offsetTop }) => {
                        const command = filteredCommands[index];
                        return (
                          <div 
                            key={command.id} 
                            style={{ 
                              position: 'absolute', 
                              top: offsetTop, 
                              left: 0, 
                              right: 0,
                              height: ITEM_HEIGHT,
                              padding: '6px 0'
                            }}
                          >
                            <CommandItem
                              command={command}
                              category={allCategories.find(c => c.id === ((command as any).categoryId || 'general'))}
                              onEdit={handleEdit}
                              onDelete={handleDeleteCommand}
                              onToggle={handleToggleCommand}
                              onTest={setTestingCommand}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Regular list for small datasets
                  <div 
                    className="space-y-3" 
                    role="list" 
                    aria-label={`Lista de comandos, ${filteredCommands.length} resultados`}
                  >
                    {filteredCommands.map(command => (
                      <CommandItem
                        key={command.id}
                        command={command}
                        category={allCategories.find(c => c.id === ((command as any).categoryId || 'general'))}
                        onEdit={handleEdit}
                        onDelete={handleDeleteCommand}
                        onToggle={handleToggleCommand}
                        onTest={setTestingCommand}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
                  <p>
                    {searchTerm || selectedCategory
                      ? 'No se encontraron comandos' 
                      : 'No hay comandos configurados'}
                  </p>
                  {!searchTerm && !selectedCategory && (
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => setShowForm(true)}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        Crear comando
                      </button>
                      <span className="text-zinc-600">o</span>
                      <button
                        onClick={() => setActiveView('templates')}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        usar plantilla
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Stats Footer */}
              {commands.length > 0 && (
                <div className="mt-6 pt-4 border-t border-zinc-800" aria-label="Estadísticas de comandos">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-zinc-500">
                      <span aria-label={`${commands.filter(c => c.enabled).length} comandos activos de ${commands.length} totales`}>
                        {commands.filter(c => c.enabled).length} de {commands.length} activos
                      </span>
                    </div>
                    <div className="text-zinc-500">
                      <span aria-label={`Total de usos: ${commands.reduce((sum, c) => sum + c.usageCount, 0)}`}>
                        Total usos: {commands.reduce((sum, c) => sum + c.usageCount, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Templates View */}
          {activeView === 'templates' && (
            <div id="templates-panel" role="tabpanel" aria-label="Plantillas de comandos">
              <Suspense fallback={<LoadingFallback text="Cargando plantillas..." />}>
                <CommandTemplateLibrary
                  onAddCommand={handleAddFromTemplate}
                />
              </Suspense>
            </div>
          )}

          {/* AI View */}
          {activeView === 'ai' && (
            <div id="ai-panel" role="tabpanel" aria-label="Generador de comandos con IA">
              <Suspense fallback={<LoadingFallback text="Cargando generador IA..." />}>
                <AICommandGenerator
                  existingCommands={existingTriggers}
                  onGenerate={handleAddFromTemplate}
                />
              </Suspense>
            </div>
          )}

          {/* Categories View */}
          {activeView === 'categories' && (
            <div id="categories-panel" role="tabpanel" aria-label="Gestión de categorías">
              <Suspense fallback={<LoadingFallback text="Cargando categorías..." />}>
                <CommandCategoryManager
                  customCategories={customCategories}
                  commandCounts={commandCounts}
                  onCategoriesChange={setCustomCategories}
                />
              </Suspense>
            </div>
          )}

          {/* Analysis View */}
          {activeView === 'analysis' && (
            <div id="analysis-panel" role="tabpanel" aria-label="Análisis de comandos">
              <Suspense fallback={<LoadingFallback text="Analizando comandos..." />}>
                <CommandAnalysisPanel
                  commands={commands}
                  onAddCommand={(trigger, response) => {
                    addCommand({
                      name: trigger,
                      response: response || `Respuesta para !${trigger}`,
                      cooldown: 5,
                      userLevel: 'everyone',
                      enabled: true,
                    });
                  }}
                  onEditCommand={(commandName) => {
                    const cmd = commands.find(c => c.name === commandName);
                    if (cmd) {
                      setEditingCommand(cmd);
                      setActiveView('list');
                    }
                  }}
                />
              </Suspense>
            </div>
          )}

          {/* Dynamics View */}
          {activeView === 'dynamics' && (
            <div id="dynamics-panel" role="tabpanel" aria-label="Comandos de dinámicas">
              <Suspense fallback={<LoadingFallback text="Cargando dinámicas..." />}>
                <DynamicCommandsPanel />
              </Suspense>
            </div>
          )}
        </>
      )}

      {/* Test Modal */}
      {testingCommand && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-modal-title"
        >
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 w-full max-w-md">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 id="test-modal-title" className="text-white font-bold">Probar !{testingCommand.name}</h3>
              <button
                onClick={() => setTestingCommand(null)}
                className="text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded"
                aria-label="Cerrar modal de prueba"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="p-4">
              <CommandTester
                response={testingCommand.response}
                trigger={testingCommand.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedCommandPanel;
