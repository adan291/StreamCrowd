/**
 * MacroManager Component
 * 
 * Main component for managing macros - displays list, allows toggling,
 * editing, duplicating, and deleting macros with search and filters.
 * 
 * @requirements 7.1 - THE Macro_Manager SHALL show list of all macros with state
 * @requirements 7.2 - THE Macro_Manager SHALL allow enabling/disabling macros individually
 * @requirements 7.3 - THE Macro_Manager SHALL allow duplicating macros
 * @requirements 7.4 - THE Macro_Manager SHALL allow deleting macros with confirmation
 * @requirements 7.6 - THE Macro_Manager SHALL allow searching and filtering macros
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  X,
  Zap,
  AlertCircle,
  RefreshCw,
  Pause,
  Play,
  Download,
  Upload,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useMacros } from '../../hooks/useMacros';
import { useMacroExecution } from '../../hooks/useMacroExecution';
import { usePredictions } from '../../src/application/hooks/usePredictions';
import { MacroCard } from './MacroCard';
import { MacroEditor } from './MacroEditor';
import { MacroImportExport } from './MacroImportExport';
import { MacroPresets } from './MacroPresets';
import { QuickCommands } from './QuickCommands';
import type { Macro, TriggerType, MacroFormData } from '../../types/macros';
import type { MacroPreset } from '../../config/macroPresets';

// ============================================
// Types
// ============================================

export interface MacroManagerProps {
  /** Callback when a macro is selected for execution */
  onExecute?: (macroId: string) => void;
  /** Whether viewing as moderator (not broadcaster) */
  isModeratorView?: boolean;
  /** Current platform */
  platform?: 'twitch' | 'youtube' | 'kick';
  /** Whether there's an active prediction */
  hasPredictionActive?: boolean;
  /** Channel ID for API calls (broadcaster's ID) */
  channelId?: string;
  /** Auth token for API calls */
  authToken?: string;
  /** User ID of the logged-in user (may differ from channelId when moderating) */
  loggedInUserId?: string;
}

type FilterType = 'all' | 'enabled' | 'disabled' | TriggerType;
type ViewMode = 'list' | 'presets' | 'quick';

interface DeleteConfirmation {
  macroId: string;
  macroName: string;
}

// ============================================
// Constants
// ============================================

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'enabled', label: 'Habilitadas' },
  { value: 'disabled', label: 'Deshabilitadas' },
  { value: 'chat_command', label: 'Comando' },
  { value: 'chat_keyword', label: 'Palabra clave' },
  { value: 'schedule', label: 'Programada' },
  { value: 'event', label: 'Evento' },
  { value: 'manual', label: 'Manual' },
];

// ============================================
// Component
// ============================================

export const MacroManager: React.FC<MacroManagerProps> = ({ 
  onExecute,
  isModeratorView = false,
  platform = 'twitch',
  hasPredictionActive: hasPredictionActiveProp,
  channelId = '',
  authToken = '',
  loggedInUserId = '',
}) => {
  // Use predictions hook to check for active prediction
  // Only enable if NOT moderator view (API doesn't work for mods)
  // Pass loggedInUserId as moderatorId for API calls
  const { currentPrediction, cancelPrediction, lockPrediction, refreshPrediction } = usePredictions(channelId, authToken, {
    enablePolling: !!channelId && !!authToken && !isModeratorView,
    pollingInterval: 10000, // Check every 10 seconds
    moderatorId: loggedInUserId || channelId, // Use logged-in user as moderator
  });
  
  // Use prop if provided, otherwise use hook result (null for moderators)
  const hasPredictionActive = hasPredictionActiveProp ?? (isModeratorView ? false : currentPrediction !== null);
  const predictionStatus = currentPrediction?.status as 'ACTIVE' | 'LOCKED' | null;
  
  const {
    macros,
    isLoading,
    error,
    createMacro,
    updateMacro,
    deleteMacro,
    toggleMacro,
    duplicateMacro,
    refresh,
    clearError,
    clearMacroError,
  } = useMacros();

  const {
    isPaused,
    pauseAll,
    resumeAll,
    execute,
  } = useMacroExecution();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('presets');
  const [showEditor, setShowEditor] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);

  /**
   * Filter and search macros
   * @requirements 7.6
   */
  const filteredMacros = useMemo(() => {
    let result = [...macros];

    // Apply filter
    if (filter === 'enabled') {
      result = result.filter(m => m.enabled);
    } else if (filter === 'disabled') {
      result = result.filter(m => !m.enabled);
    } else if (filter !== 'all') {
      result = result.filter(m => m.trigger.type === filter);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
      );
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [macros, filter, searchQuery]);

  /**
   * Handle creating a new macro
   */
  const handleNewMacro = useCallback(() => {
    setEditingMacro(undefined);
    setShowEditor(true);
  }, []);

  /**
   * Handle editing a macro
   */
  const handleEdit = useCallback((macro: Macro) => {
    setEditingMacro(macro);
    setShowEditor(true);
  }, []);

  /**
   * Handle saving a macro (create or update)
   */
  const handleSave = useCallback(async (data: MacroFormData | Macro) => {
    setIsSaving(true);
    try {
      if (editingMacro) {
        await updateMacro(editingMacro.id, data);
      } else {
        await createMacro(data as MacroFormData);
      }
      setShowEditor(false);
      setEditingMacro(undefined);
    } finally {
      setIsSaving(false);
    }
  }, [editingMacro, createMacro, updateMacro]);

  /**
   * Handle adding a preset as a new macro
   */
  const handleAddPreset = useCallback(async (preset: MacroPreset) => {
    await createMacro(preset.macro);
    setViewMode('list'); // Switch back to list view
  }, [createMacro]);

  /**
   * Handle toggling macro enabled state
   * @requirements 7.2
   */
  const handleToggle = useCallback(async (macroId: string) => {
    await toggleMacro(macroId);
  }, [toggleMacro]);

  /**
   * Handle duplicating a macro
   * @requirements 7.3
   */
  const handleDuplicate = useCallback(async (macroId: string) => {
    await duplicateMacro(macroId);
  }, [duplicateMacro]);

  /**
   * Handle delete confirmation
   * @requirements 7.4
   */
  const handleDeleteRequest = useCallback((macro: Macro) => {
    setDeleteConfirmation({ macroId: macro.id, macroName: macro.name });
  }, []);

  /**
   * Handle confirmed deletion
   * @requirements 7.4
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteConfirmation) {
      await deleteMacro(deleteConfirmation.macroId);
      setDeleteConfirmation(null);
    }
  }, [deleteConfirmation, deleteMacro]);

  /**
   * Handle macro execution
   */
  const handleExecute = useCallback(async (macroId: string): Promise<boolean> => {
    try {
      const result = await execute(macroId);
      onExecute?.(macroId);
      
      // If this was a prediction macro, refresh prediction state after a short delay
      const macro = macros.find(m => m.id === macroId);
      if (macro?.actions.some(a => a.type === 'start_prediction')) {
        // Wait a bit for the API to process, then refresh
        setTimeout(() => {
          refreshPrediction();
        }, 1500);
      }
      
      return result?.success ?? false;
    } catch {
      return false;
    }
  }, [execute, onExecute, macros, refreshPrediction]);

  /**
   * Handle canceling active prediction
   */
  const handleCancelPrediction = useCallback(async (): Promise<boolean> => {
    if (!currentPrediction) return false;
    try {
      const success = await cancelPrediction();
      return success;
    } catch {
      return false;
    }
  }, [currentPrediction, cancelPrediction]);

  /**
   * Handle locking active prediction
   */
  const handleLockPrediction = useCallback(async (): Promise<boolean> => {
    if (!currentPrediction) return false;
    try {
      const success = await lockPrediction();
      return success;
    } catch {
      return false;
    }
  }, [currentPrediction, lockPrediction]);

  /**
   * Handle closing the editor
   */
  const handleCloseEditor = useCallback(() => {
    setShowEditor(false);
    setEditingMacro(undefined);
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Zap size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Macros</h2>
              <p className="text-xs text-zinc-500">
                {macros.length} macro{macros.length !== 1 ? 's' : ''} configurada{macros.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Pause/Resume */}
            <button
              onClick={isPaused ? resumeAll : pauseAll}
              className={`p-2 rounded-lg transition-colors ${
                isPaused
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
              title={isPaused ? 'Reanudar todas' : 'Pausar todas'}
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>

            {/* Import/Export */}
            <button
              onClick={() => setShowImportExport(true)}
              className="p-2 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              title="Importar/Exportar"
            >
              <Download size={18} />
            </button>

            {/* Refresh */}
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-2 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* New Macro */}
            <button
              onClick={handleNewMacro}
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span className="text-sm font-medium">Nueva</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode('presets')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'presets'
                ? 'bg-pink-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <Sparkles size={16} />
            Presets
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-purple-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <Zap size={16} />
            Mis Macros
          </button>
          <button
            onClick={() => setViewMode('quick')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'quick'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            <Terminal size={16} />
            Comandos Rápidos
          </button>
        </div>

        {/* Search and Filters - only show in list view */}
        {viewMode === 'list' && (
          <>
            {/* Search */}
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar macros..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    filter === option.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Global Pause Warning */}
      {isPaused && (
        <div className="mx-4 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <Pause size={16} />
            <span className="text-sm font-medium">
              Todas las macros están pausadas
            </span>
            <button
              onClick={resumeAll}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Reanudar
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="text-sm">{error.message}</span>
            <button
              onClick={clearError}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Content Area - Single scroll container */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'presets' ? (
          <MacroPresets
            onAddPreset={handleAddPreset}
            isModeratorView={isModeratorView}
            platform={platform}
          />
        ) : viewMode === 'quick' ? (
          <QuickCommands
            isModeratorView={isModeratorView}
          />
        ) : (
          /* Macro List */
          <div className="p-4">
            {isLoading && macros.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw size={32} className="mx-auto mb-2 text-zinc-500 animate-spin" />
                  <p className="text-sm text-zinc-500">Cargando macros...</p>
                </div>
              </div>
            ) : filteredMacros.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Zap size={48} className="mx-auto mb-3 text-zinc-600" />
                  {macros.length === 0 ? (
                    <>
                      <p className="text-zinc-400 mb-1">No hay macros configuradas</p>
                      <p className="text-sm text-zinc-500 mb-4">
                        Crea tu primera macro o añade un preset
                      </p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setViewMode('presets')}
                          className="flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg transition-colors"
                        >
                          <Sparkles size={18} />
                          <span>Ver presets</span>
                        </button>
                        <button
                          onClick={handleNewMacro}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                        >
                          <Plus size={18} />
                          <span>Crear macro</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-zinc-400 mb-1">No se encontraron macros</p>
                      <p className="text-sm text-zinc-500">
                        Intenta con otros términos de búsqueda o filtros
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredMacros.map((macro) => (
                  <MacroCard
                    key={macro.id}
                    macro={macro}
                    onToggle={() => handleToggle(macro.id)}
                    onEdit={() => handleEdit(macro)}
                    onDuplicate={() => handleDuplicate(macro.id)}
                    onDelete={() => handleDeleteRequest(macro)}
                    onExecute={() => handleExecute(macro.id)}
                    onClearError={() => clearMacroError(macro.id)}
                    onStopPrediction={handleCancelPrediction}
                    onLockPrediction={handleLockPrediction}
                    isPaused={isPaused}
                    hasPredictionActive={hasPredictionActive}
                    predictionStatus={predictionStatus}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh]">
            <MacroEditor
              macro={editingMacro}
              onSave={handleSave}
              onCancel={handleCloseEditor}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle size={20} className="text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Eliminar macro</h3>
            </div>
            <p className="text-zinc-400 mb-6">
              ¿Estás seguro de que quieres eliminar la macro{' '}
              <span className="text-white font-medium">"{deleteConfirmation.macroName}"</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <MacroImportExport
            macros={macros}
            onClose={() => setShowImportExport(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MacroManager;
