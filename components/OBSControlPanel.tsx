import React, { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, 
  Wifi, 
  WifiOff, 
  Play, 
  Square, 
  Circle,
  Pause,
  RefreshCw,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  Copy,
  Coffee,
  ArrowLeft,
  Keyboard,
  Bell,
  BellOff,
  Star,
  Edit2,
  Command,
  GripVertical,
} from 'lucide-react';
import { useOBS, MAX_FAVORITE_SCENES } from '../src/application/hooks/useOBS';
import { useOBSTriggers } from '../src/application/hooks/useOBSTriggers';
import type { SceneAutomation, AutomationTrigger, QuickCommand, QuickCommandAction } from '../src/application/services/OBSService';
import type { OBSSource } from '../src/domain/ports/IOBSController';
import { PresetConfigModal, type AutomationPreset, type PresetSceneMapping } from './PresetConfigModal';

// SourceToggle Component - Improved toggle with loading, animation, and error handling
interface SourceToggleProps {
  sceneName: string;
  source: OBSSource;
  onToggle: (sceneName: string, sourceName: string, visible: boolean) => Promise<void>;
  onNotification?: (type: 'success' | 'info' | 'error', message: string) => void;
}

const SourceToggle: React.FC<SourceToggleProps> = ({ sceneName, source, onToggle, onNotification }) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    if (isToggling) return;
    
    setIsToggling(true);
    try {
      await onToggle(sceneName, source.name, !source.enabled);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar visibilidad';
      onNotification?.('error', `❌ ${source.name}: ${errorMessage}`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isToggling}
      className={`p-1.5 rounded transition-all duration-200 ${
        isToggling 
          ? 'scale-90 opacity-50 cursor-wait' 
          : 'hover:scale-110 active:scale-95'
      } ${
        source.enabled
          ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
          : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
      }`}
      title={source.enabled ? 'Ocultar fuente' : 'Mostrar fuente'}
    >
      {isToggling ? (
        <Loader2 size={14} className="animate-spin" />
      ) : source.enabled ? (
        <Eye size={14} />
      ) : (
        <EyeOff size={14} />
      )}
    </button>
  );
};

// FavoriteScenesModal Component - Modal for selecting favorite scenes
interface FavoriteScenesModalProps {
  scenes: { name: string }[];
  selectedFavorites: string[];
  onSave: (favorites: string[]) => void;
  onClose: () => void;
}

const FavoriteScenesModal: React.FC<FavoriteScenesModalProps> = ({ 
  scenes, 
  selectedFavorites, 
  onSave, 
  onClose 
}) => {
  const [selected, setSelected] = useState<string[]>(selectedFavorites);

  const toggleScene = (sceneName: string) => {
    setSelected(prev => {
      if (prev.includes(sceneName)) {
        return prev.filter(s => s !== sceneName);
      }
      if (prev.length >= MAX_FAVORITE_SCENES) {
        return prev; // Don't add if at limit
      }
      return [...prev, sceneName];
    });
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md mx-4 overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="text-yellow-500" size={20} />
              <h3 className="font-bold text-zinc-900 dark:text-white">Escenas Favoritas</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
            >
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Selecciona hasta {MAX_FAVORITE_SCENES} escenas para acceso rápido ({selected.length}/{MAX_FAVORITE_SCENES})
          </p>
        </div>

        {/* Scene List */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
          {scenes.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-4">
              No hay escenas disponibles
            </p>
          ) : (
            scenes.map((scene) => {
              const isSelected = selected.includes(scene.name);
              const isDisabled = !isSelected && selected.length >= MAX_FAVORITE_SCENES;
              
              return (
                <button
                  key={scene.name}
                  onClick={() => toggleScene(scene.name)}
                  disabled={isDisabled}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/50'
                      : isDisabled
                        ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-50 cursor-not-allowed'
                        : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-500/50'
                  }`}
                >
                  <span className={`text-sm ${
                    isSelected 
                      ? 'font-medium text-purple-600 dark:text-purple-400' 
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {scene.name}
                  </span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check size={14} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

// Action type labels for Quick Commands
const ACTION_TYPE_LABELS: Record<QuickCommandAction['type'], string> = {
  switch_scene: '🎬 Cambiar escena',
  toggle_source: '👁️ Toggle fuente',
  set_transition: '✨ Cambiar transición',
  start_recording: '⏺️ Iniciar grabación',
  stop_recording: '⏹️ Detener grabación',
  start_stream: '🔴 Iniciar stream',
  stop_stream: '⏹️ Detener stream',
};

// QuickCommandModal Component - Modal for creating/editing quick commands
interface QuickCommandModalProps {
  scenes: { name: string }[];
  transitions: string[];
  command?: QuickCommand;
  onSave: (command: Omit<QuickCommand, 'id'>) => void;
  onClose: () => void;
}

const QuickCommandModal: React.FC<QuickCommandModalProps> = ({ 
  scenes, 
  transitions,
  command, 
  onSave, 
  onClose 
}) => {
  const [name, setName] = useState(command?.name || '');
  const [icon, setIcon] = useState(command?.icon || '⚡');
  const [actions, setActions] = useState<QuickCommandAction[]>(command?.actions || []);
  const [newActionType, setNewActionType] = useState<QuickCommandAction['type']>('switch_scene');
  const [newActionScene, setNewActionScene] = useState('');
  const [newActionSource, setNewActionSource] = useState('');
  const [newActionVisible, setNewActionVisible] = useState(true);
  const [newActionTransition, setNewActionTransition] = useState('');

  const iconOptions = ['⚡', '🎮', '📊', '🎁', '☕', '🔴', '⏹️', '🎬', '🎵', '💬', '🎉', '🏆'];

  const addAction = () => {
    let newAction: QuickCommandAction | null = null;
    
    switch (newActionType) {
      case 'switch_scene':
        if (newActionScene) {
          newAction = { type: 'switch_scene', sceneName: newActionScene };
        }
        break;
      case 'toggle_source':
        if (newActionScene && newActionSource) {
          newAction = { type: 'toggle_source', sceneName: newActionScene, sourceName: newActionSource, visible: newActionVisible };
        }
        break;
      case 'set_transition':
        if (newActionTransition) {
          newAction = { type: 'set_transition', transitionName: newActionTransition };
        }
        break;
      case 'start_recording':
        newAction = { type: 'start_recording' };
        break;
      case 'stop_recording':
        newAction = { type: 'stop_recording' };
        break;
      case 'start_stream':
        newAction = { type: 'start_stream' };
        break;
      case 'stop_stream':
        newAction = { type: 'stop_stream' };
        break;
    }
    
    if (newAction) {
      setActions([...actions, newAction]);
      // Reset form
      setNewActionScene('');
      setNewActionSource('');
      setNewActionTransition('');
    }
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= actions.length) return;
    
    const newActions = [...actions];
    [newActions[index], newActions[newIndex]] = [newActions[newIndex], newActions[index]];
    setActions(newActions);
  };

  const handleSave = () => {
    if (!name.trim() || actions.length === 0) return;
    onSave({ name: name.trim(), icon, actions });
    onClose();
  };

  const getActionDescription = (action: QuickCommandAction): string => {
    switch (action.type) {
      case 'switch_scene':
        return `Cambiar a "${action.sceneName}"`;
      case 'toggle_source':
        return `${action.visible ? 'Mostrar' : 'Ocultar'} "${action.sourceName}" en "${action.sceneName}"`;
      case 'set_transition':
        return `Transición: "${action.transitionName}"`;
      case 'start_recording':
        return 'Iniciar grabación';
      case 'stop_recording':
        return 'Detener grabación';
      case 'start_stream':
        return 'Iniciar stream';
      case 'stop_stream':
        return 'Detener stream';
    }
  };

  const canAddAction = () => {
    switch (newActionType) {
      case 'switch_scene':
        return !!newActionScene;
      case 'toggle_source':
        return !!newActionScene && !!newActionSource;
      case 'set_transition':
        return !!newActionTransition;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 w-full max-w-lg mx-4 overflow-hidden shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Command className="text-purple-500" size={20} />
              <h3 className="font-bold text-zinc-900 dark:text-white">
                {command ? 'Editar Comando' : 'Nuevo Comando Rápido'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Name and Icon */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mi comando..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Icono</label>
              <div className="relative">
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-16 px-2 py-2 text-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg appearance-none text-center"
                >
                  {iconOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions List */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Acciones ({actions.length})</label>
            {actions.length === 0 ? (
              <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <Zap size={20} className="mx-auto mb-2 text-zinc-400" />
                <p className="text-xs text-zinc-500">Sin acciones</p>
                <p className="text-xs text-zinc-400">Añade acciones para crear el comando</p>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveAction(index, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                      >
                        <ChevronDown size={12} className="rotate-180" />
                      </button>
                      <button
                        onClick={() => moveAction(index, 'down')}
                        disabled={index === actions.length - 1}
                        className="p-0.5 text-zinc-400 hover:text-zinc-600 disabled:opacity-30"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <span className="text-xs text-zinc-500 w-5">{index + 1}.</span>
                    <span className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 truncate">
                      {getActionDescription(action)}
                    </span>
                    <button
                      onClick={() => removeAction(index)}
                      className="p-1 text-red-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Action Form */}
          <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-200 dark:border-purple-500/30 space-y-2">
            <label className="text-xs text-purple-600 dark:text-purple-400 font-medium">Añadir acción</label>
            
            <select
              value={newActionType}
              onChange={(e) => setNewActionType(e.target.value as QuickCommandAction['type'])}
              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
            >
              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Conditional fields based on action type */}
            {(newActionType === 'switch_scene' || newActionType === 'toggle_source') && (
              <select
                value={newActionScene}
                onChange={(e) => setNewActionScene(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
              >
                <option value="">Seleccionar escena...</option>
                {scenes.map((scene) => (
                  <option key={scene.name} value={scene.name}>{scene.name}</option>
                ))}
              </select>
            )}

            {newActionType === 'toggle_source' && (
              <>
                <input
                  type="text"
                  value={newActionSource}
                  onChange={(e) => setNewActionSource(e.target.value)}
                  placeholder="Nombre de la fuente..."
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400">Visibilidad:</label>
                  <button
                    onClick={() => setNewActionVisible(!newActionVisible)}
                    className={`px-2 py-1 text-xs rounded ${
                      newActionVisible 
                        ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' 
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                    }`}
                  >
                    {newActionVisible ? 'Mostrar' : 'Ocultar'}
                  </button>
                </div>
              </>
            )}

            {newActionType === 'set_transition' && (
              <select
                value={newActionTransition}
                onChange={(e) => setNewActionTransition(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
              >
                <option value="">Seleccionar transición...</option>
                {transitions.map((trans) => (
                  <option key={trans} value={trans}>{trans}</option>
                ))}
              </select>
            )}

            <button
              onClick={addAction}
              disabled={!canAddAction()}
              className="w-full py-1.5 text-xs bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded transition-colors flex items-center justify-center gap-1"
            >
              <Plus size={12} />
              Añadir acción
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || actions.length === 0}
            className="flex-1 py-2 text-sm bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check size={14} />
            {command ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  game_start: '🎮 Inicio de juego',
  game_end: '🏁 Fin de juego',
  poll_start: '📊 Inicio de encuesta',
  poll_end: '📊 Fin de encuesta',
  poll_results: '🏆 Resultados de encuesta',
  giveaway_start: '🎁 Inicio de sorteo',
  giveaway_winner: '🎉 Ganador de sorteo',
  raid_incoming: '👋 Raid entrante',
  raid_outgoing: '🚀 Raid saliente',
  brb_start: '☕ Inicio BRB',
  brb_end: '👋 Fin BRB',
  stream_start: '🔴 Inicio de stream',
  stream_end: '⏹️ Fin de stream',
  custom: '⚡ Personalizado',
};

// Presets de automatizaciones comunes
const AUTOMATION_PRESETS: AutomationPreset[] = [
  {
    name: 'Juegos Interactivos',
    description: 'Cambia a escena de juego al iniciar y vuelve al terminar',
    icon: '🎮',
    automations: [
      { name: 'Iniciar Juego', trigger: 'game_start', sceneNameHint: 'Juego' },
      { name: 'Terminar Juego', trigger: 'game_end', sceneNameHint: 'Principal' },
    ],
  },
  {
    name: 'Encuestas',
    description: 'Muestra overlay de encuesta y resultados',
    icon: '📊',
    automations: [
      { name: 'Mostrar Encuesta', trigger: 'poll_start', sceneNameHint: 'Encuesta' },
      { name: 'Fin Encuesta', trigger: 'poll_end', sceneNameHint: 'Principal' },
      { name: 'Mostrar Resultados', trigger: 'poll_results', sceneNameHint: 'Resultados' },
    ],
  },
  {
    name: 'Sorteos',
    description: 'Escena especial para sorteos y ganadores',
    icon: '🎁',
    automations: [
      { name: 'Iniciar Sorteo', trigger: 'giveaway_start', sceneNameHint: 'Sorteo' },
      { name: 'Mostrar Ganador', trigger: 'giveaway_winner', sceneNameHint: 'Ganador' },
    ],
  },
  {
    name: 'BRB / Pausas',
    description: 'Escena de espera cuando te ausentas',
    icon: '☕',
    automations: [
      { name: 'Ir a BRB', trigger: 'brb_start', sceneNameHint: 'BRB' },
      { name: 'Volver de BRB', trigger: 'brb_end', sceneNameHint: 'Principal' },
    ],
  },
];

// Hotkey storage key
const HOTKEYS_STORAGE_KEY = 'obs_scene_hotkeys';

interface SceneHotkey {
  sceneName: string;
  key: string;
  modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean };
}

interface OBSControlPanelProps {
  onNotification?: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const OBSControlPanel: React.FC<OBSControlPanelProps> = ({ onNotification }) => {
  const {
    status,
    isConnected,
    isConnecting,
    error,
    version,
    scenes,
    currentScene,
    favoriteScenes,
    saveFavoriteScenes,
    quickCommands,
    addQuickCommand,
    updateQuickCommand,
    removeQuickCommand,
    executeQuickCommand,
    streamStatus,
    transitions,
    automations,
    connect,
    disconnect,
    switchScene,
    refreshScenes,
    getSceneSources,
    setSourceVisible,
    startStream,
    stopStream,
    startRecording,
    stopRecording,
    addAutomation,
    removeAutomation,
    toggleAutomation,
  } = useOBS();

  // Connection form
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // UI state
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [sceneSources, setSceneSources] = useState<Record<string, OBSSource[]>>({});
  const [showAutomationForm, setShowAutomationForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showPresetConfigModal, setShowPresetConfigModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<AutomationPreset | null>(null);
  const [activeTab, setActiveTab] = useState<'scenes' | 'automations' | 'stream' | 'quick'>('scenes');
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [showQuickCommandModal, setShowQuickCommandModal] = useState(false);
  const [editingQuickCommand, setEditingQuickCommand] = useState<QuickCommand | undefined>(undefined);
  const [executingCommandId, setExecutingCommandId] = useState<string | null>(null);
  
  // BRB state
  const [isBRB, setIsBRB] = useState(false);
  const [previousScene, setPreviousScene] = useState<string | null>(null);
  
  // Hotkeys state
  const [hotkeys, setHotkeys] = useState<SceneHotkey[]>(() => {
    try {
      const saved = localStorage.getItem(HOTKEYS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [showHotkeyForm, setShowHotkeyForm] = useState(false);
  const [recordingHotkey, setRecordingHotkey] = useState<string | null>(null);
  const [newHotkey, setNewHotkey] = useState<Partial<SceneHotkey>>({});
  
  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('obs_notifications_enabled') !== 'false';
  });
  const [lastSceneNotification, setLastSceneNotification] = useState<string | null>(null);
  
  // OBS Triggers for manual actions
  const { triggerBRBStart, triggerBRBEnd, triggerRaidIncoming } = useOBSTriggers();
  
  // New automation form
  const [newAutomation, setNewAutomation] = useState<Partial<SceneAutomation>>({
    name: '',
    trigger: 'game_start',
    sceneName: '',
    enabled: true,
  });

  const handleConnect = async () => {
    try {
      await connect(password || undefined, host, parseInt(port));
    } catch {
      // Error is handled by the hook
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  const loadSceneSources = async (sceneName: string) => {
    if (sceneSources[sceneName]) {
      setExpandedScene(expandedScene === sceneName ? null : sceneName);
      return;
    }
    
    const sources = await getSceneSources(sceneName);
    setSceneSources(prev => ({ ...prev, [sceneName]: sources }));
    setExpandedScene(sceneName);
  };

  // Handler for source visibility toggle that updates local state
  const handleSourceVisibilityToggle = async (sceneName: string, sourceName: string, visible: boolean) => {
    await setSourceVisible(sceneName, sourceName, visible);
    // Update local state to reflect the change
    setSceneSources(prev => ({
      ...prev,
      [sceneName]: prev[sceneName]?.map(source => 
        source.name === sourceName 
          ? { ...source, enabled: visible }
          : source
      ) || []
    }));
  };

  const handleAddAutomation = () => {
    if (!newAutomation.name || !newAutomation.sceneName) return;
    
    addAutomation({
      name: newAutomation.name,
      trigger: newAutomation.trigger as AutomationTrigger,
      sceneName: newAutomation.sceneName,
      enabled: true,
    });
    
    setNewAutomation({
      name: '',
      trigger: 'game_start',
      sceneName: '',
      enabled: true,
    });
    setShowAutomationForm(false);
  };

  const openPresetConfig = (preset: AutomationPreset) => {
    setSelectedPreset(preset);
    setShowPresetConfigModal(true);
    setShowPresets(false);
  };

  const handleApplyPreset = (mappings: PresetSceneMapping[]) => {
    let createdCount = 0;
    
    mappings.forEach(mapping => {
      if (mapping.selectedScene) {
        addAutomation({
          name: mapping.automationName,
          trigger: mapping.trigger,
          sceneName: mapping.selectedScene,
          enabled: true,
        });
        createdCount++;
      }
    });
    
    setShowPresetConfigModal(false);
    setSelectedPreset(null);
    
    if (createdCount > 0) {
      showNotification('success', `✅ Preset aplicado: ${createdCount} automatización${createdCount !== 1 ? 'es' : ''} creada${createdCount !== 1 ? 's' : ''}`);
    }
  };

  // Quick Command Functions
  const handleSaveQuickCommand = (command: Omit<QuickCommand, 'id'>) => {
    if (editingQuickCommand) {
      updateQuickCommand(editingQuickCommand.id, command);
      showNotification('success', `✅ Comando "${command.name}" actualizado`);
    } else {
      addQuickCommand(command);
      showNotification('success', `✅ Comando "${command.name}" creado`);
    }
    setEditingQuickCommand(undefined);
    setShowQuickCommandModal(false);
  };

  const handleEditQuickCommand = (command: QuickCommand) => {
    setEditingQuickCommand(command);
    setShowQuickCommandModal(true);
  };

  const handleDeleteQuickCommand = (command: QuickCommand) => {
    removeQuickCommand(command.id);
    showNotification('info', `🗑️ Comando "${command.name}" eliminado`);
  };

  const handleExecuteQuickCommand = async (command: QuickCommand) => {
    if (executingCommandId) return; // Prevent multiple executions
    
    setExecutingCommandId(command.id);
    try {
      const success = await executeQuickCommand(command);
      if (success) {
        showNotification('success', `⚡ ${command.name} ejecutado`);
      } else {
        showNotification('error', `❌ Error ejecutando ${command.name}`);
      }
    } catch (err) {
      showNotification('error', `❌ Error: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setExecutingCommandId(null);
    }
  };

  // BRB Functions
  const handleBRBToggle = async () => {
    if (!isConnected) return;
    
    if (!isBRB) {
      // Going to BRB - save current scene and trigger
      setPreviousScene(currentScene);
      setIsBRB(true);
      await triggerBRBStart();
      showNotification('info', '☕ Modo BRB activado');
    } else {
      // Coming back from BRB
      setIsBRB(false);
      await triggerBRBEnd();
      // If we have a previous scene and BRB automation didn't switch, switch back
      if (previousScene && currentScene !== previousScene) {
        // The trigger should handle this, but as fallback:
        // await switchScene(previousScene);
      }
      showNotification('info', '👋 ¡De vuelta!');
    }
  };

  // Notification helper
  const showNotification = useCallback((type: 'success' | 'info' | 'error', message: string) => {
    if (notificationsEnabled && onNotification) {
      onNotification(type, message);
    }
  }, [notificationsEnabled, onNotification]);

  // Scene change notification
  useEffect(() => {
    if (currentScene && currentScene !== lastSceneNotification && isConnected) {
      setLastSceneNotification(currentScene);
      if (lastSceneNotification !== null) { // Don't notify on initial load
        showNotification('info', `🎬 Escena: ${currentScene}`);
      }
    }
  }, [currentScene, lastSceneNotification, isConnected, showNotification]);

  // Toggle notifications
  const toggleNotifications = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('obs_notifications_enabled', String(newValue));
  };

  // Hotkey Functions
  const saveHotkeys = (newHotkeys: SceneHotkey[]) => {
    setHotkeys(newHotkeys);
    localStorage.setItem(HOTKEYS_STORAGE_KEY, JSON.stringify(newHotkeys));
  };

  const addHotkey = () => {
    if (!newHotkey.sceneName || !newHotkey.key) return;
    
    const hotkey: SceneHotkey = {
      sceneName: newHotkey.sceneName,
      key: newHotkey.key,
      modifiers: newHotkey.modifiers || {},
    };
    
    saveHotkeys([...hotkeys, hotkey]);
    setNewHotkey({});
    setShowHotkeyForm(false);
  };

  const removeHotkey = (index: number) => {
    const newHotkeys = hotkeys.filter((_, i) => i !== index);
    saveHotkeys(newHotkeys);
  };

  const formatHotkey = (hotkey: SceneHotkey): string => {
    const parts: string[] = [];
    if (hotkey.modifiers?.ctrl) parts.push('Ctrl');
    if (hotkey.modifiers?.alt) parts.push('Alt');
    if (hotkey.modifiers?.shift) parts.push('Shift');
    parts.push(hotkey.key.toUpperCase());
    return parts.join(' + ');
  };

  // Global hotkey listener
  useEffect(() => {
    if (!isConnected || hotkeys.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const matchingHotkey = hotkeys.find(h => {
        const keyMatch = h.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatch = !!h.modifiers?.ctrl === e.ctrlKey;
        const altMatch = !!h.modifiers?.alt === e.altKey;
        const shiftMatch = !!h.modifiers?.shift === e.shiftKey;
        return keyMatch && ctrlMatch && altMatch && shiftMatch;
      });

      if (matchingHotkey) {
        e.preventDefault();
        switchScene(matchingHotkey.sceneName);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnected, hotkeys, switchScene]);

  // Hotkey recording
  useEffect(() => {
    if (!recordingHotkey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      
      // Ignore modifier-only presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      
      setNewHotkey({
        sceneName: recordingHotkey,
        key: e.key,
        modifiers: {
          ctrl: e.ctrlKey,
          alt: e.altKey,
          shift: e.shiftKey,
        },
      });
      setRecordingHotkey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingHotkey]);

  const formatTime = (seconds?: number) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="text-purple-500" size={20} />
            <h2 className="font-bold text-zinc-900 dark:text-white">OBS Control</h2>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-2 h-2 bg-zinc-400 rounded-full" />
                Desconectado
              </span>
            )}
          </div>
        </div>
        
        {version && (
          <p className="text-xs text-zinc-500 mt-1">
            OBS {version.obsVersion} • WebSocket {version.obsWebSocketVersion}
          </p>
        )}
      </div>

      {/* Connection Form */}
      {!isConnected && (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Puerto</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="4455"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Contraseña (opcional)</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Wifi size={16} />
                  Conectar a OBS
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Connected Content */}
      {isConnected && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            {(['quick', 'scenes', 'automations', 'stream'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-500'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {tab === 'quick' && '⚡ Rápido'}
                {tab === 'scenes' && 'Escenas'}
                {tab === 'automations' && 'Auto'}
                {tab === 'stream' && 'Stream'}
              </button>
            ))}
          </div>

          {/* Quick Actions Tab */}
          {activeTab === 'quick' && (
            <div className="p-4 space-y-4">
              {/* BRB Toggle */}
              <div className="space-y-2">
                <span className="text-xs text-zinc-500 font-medium">Acciones Rápidas</span>
                <button
                  onClick={handleBRBToggle}
                  className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    isBRB
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  }`}
                >
                  {isBRB ? (
                    <>
                      <ArrowLeft size={18} />
                      Volver del BRB
                    </>
                  ) : (
                    <>
                      <Coffee size={18} />
                      Ir a BRB
                    </>
                  )}
                </button>
                {isBRB && previousScene && (
                  <p className="text-xs text-zinc-500 text-center">
                    Escena anterior: {previousScene}
                  </p>
                )}
              </div>

              {/* Quick Scene Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                    <Star size={12} />
                    Escenas Favoritas
                  </span>
                  <button
                    onClick={() => setShowFavoritesModal(true)}
                    className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1"
                  >
                    <Edit2 size={10} />
                    Editar
                  </button>
                </div>
                {favoriteScenes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {favoriteScenes.map((sceneName) => (
                      <button
                        key={sceneName}
                        onClick={() => switchScene(sceneName)}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all truncate ${
                          currentScene === sceneName
                            ? 'bg-purple-500 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {sceneName}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <Star size={20} className="mx-auto mb-2 text-zinc-400" />
                    <p className="text-xs text-zinc-500">Sin favoritos</p>
                    <button
                      onClick={() => setShowFavoritesModal(true)}
                      className="text-xs text-purple-500 hover:text-purple-600 mt-1"
                    >
                      Añadir escenas favoritas
                    </button>
                  </div>
                )}
              </div>

              {/* Hotkeys Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                    <Keyboard size={12} />
                    Atajos de Teclado
                  </span>
                  <button
                    onClick={() => setShowHotkeyForm(!showHotkeyForm)}
                    className="text-xs text-purple-500 hover:text-purple-600"
                  >
                    {showHotkeyForm ? 'Cancelar' : '+ Añadir'}
                  </button>
                </div>

                {showHotkeyForm && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-2">
                    <select
                      value={newHotkey.sceneName || ''}
                      onChange={(e) => setNewHotkey(prev => ({ ...prev, sceneName: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                    >
                      <option value="">Seleccionar escena...</option>
                      {scenes.map((scene) => (
                        <option key={scene.name} value={scene.name}>{scene.name}</option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => newHotkey.sceneName && setRecordingHotkey(newHotkey.sceneName)}
                      className={`w-full py-2 text-xs rounded transition-colors ${
                        recordingHotkey
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {recordingHotkey 
                        ? 'Presiona una tecla...' 
                        : newHotkey.key 
                          ? `Tecla: ${formatHotkey(newHotkey as SceneHotkey)}`
                          : 'Click para grabar tecla'
                      }
                    </button>
                    
                    <button
                      onClick={addHotkey}
                      disabled={!newHotkey.sceneName || !newHotkey.key}
                      className="w-full py-1.5 text-xs bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-300 text-white rounded transition-colors"
                    >
                      Guardar Atajo
                    </button>
                  </div>
                )}

                {hotkeys.length > 0 ? (
                  <div className="space-y-1">
                    {hotkeys.map((hotkey, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1.5 px-2 bg-zinc-50 dark:bg-zinc-800 rounded text-xs"
                      >
                        <span className="text-zinc-700 dark:text-zinc-300 truncate">
                          {hotkey.sceneName}
                        </span>
                        <div className="flex items-center gap-2">
                          <kbd className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded text-[10px] font-mono">
                            {formatHotkey(hotkey)}
                          </kbd>
                          <button
                            onClick={() => removeHotkey(index)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 text-center py-2">
                    Sin atajos configurados
                  </p>
                )}
              </div>

              {/* Quick Commands Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                    <Command size={12} />
                    Comandos Rápidos
                  </span>
                  <button
                    onClick={() => {
                      setEditingQuickCommand(undefined);
                      setShowQuickCommandModal(true);
                    }}
                    className="text-xs text-purple-500 hover:text-purple-600 flex items-center gap-1"
                  >
                    <Plus size={10} />
                    Nuevo
                  </button>
                </div>

                {quickCommands.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {quickCommands.map((cmd) => (
                      <div
                        key={cmd.id}
                        className="relative group"
                      >
                        <button
                          onClick={() => handleExecuteQuickCommand(cmd)}
                          disabled={executingCommandId === cmd.id}
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                            executingCommandId === cmd.id
                              ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90'
                          }`}
                        >
                          {executingCommandId === cmd.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <span>{cmd.icon}</span>
                          )}
                          <span className="truncate">{cmd.name}</span>
                        </button>
                        {/* Edit/Delete buttons on hover */}
                        <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditQuickCommand(cmd);
                            }}
                            className="p-1 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-purple-500"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuickCommand(cmd);
                            }}
                            className="p-1 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-500"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <Command size={20} className="mx-auto mb-2 text-zinc-400" />
                    <p className="text-xs text-zinc-500">Sin comandos</p>
                    <button
                      onClick={() => {
                        setEditingQuickCommand(undefined);
                        setShowQuickCommandModal(true);
                      }}
                      className="text-xs text-purple-500 hover:text-purple-600 mt-1"
                    >
                      Crear comando rápido
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between py-2 px-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <div className="flex items-center gap-2">
                  {notificationsEnabled ? <Bell size={14} className="text-purple-500" /> : <BellOff size={14} className="text-zinc-400" />}
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">Notificaciones de escena</span>
                </div>
                <button
                  onClick={toggleNotifications}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    notificationsEnabled ? 'bg-purple-500' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          )}

          {/* Scenes Tab */}
          {activeTab === 'scenes' && (
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Escenas disponibles</span>
                <button
                  onClick={refreshScenes}
                  className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              
              {scenes.map((scene) => (
                <div key={scene.name} className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => loadSceneSources(scene.name)}
                    onKeyDown={(e) => e.key === 'Enter' && loadSceneSources(scene.name)}
                    className={`w-full flex items-center justify-between p-3 text-left transition-colors cursor-pointer ${
                      currentScene === scene.name
                        ? 'bg-purple-50 dark:bg-purple-500/10'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {expandedScene === scene.name ? (
                        <ChevronDown size={14} className="text-zinc-400" />
                      ) : (
                        <ChevronRight size={14} className="text-zinc-400" />
                      )}
                      <span className={`text-sm ${
                        currentScene === scene.name
                          ? 'font-medium text-purple-600 dark:text-purple-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {scene.name}
                      </span>
                    </div>
                    
                    {currentScene !== scene.name && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          switchScene(scene.name);
                        }}
                        className="px-2 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                      >
                        Activar
                      </button>
                    )}
                    
                    {currentScene === scene.name && (
                      <span className="text-xs text-purple-500 font-medium">ACTIVA</span>
                    )}
                  </div>
                  
                  {/* Scene Sources */}
                  {expandedScene === scene.name && sceneSources[scene.name] && (
                    <div className="border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-2 space-y-1">
                      {sceneSources[scene.name].length === 0 ? (
                        <p className="text-xs text-zinc-500 text-center py-2">Sin fuentes</p>
                      ) : (
                        sceneSources[scene.name].map((source) => (
                          <div
                            key={source.sceneItemId}
                            className="flex items-center justify-between py-1 px-2"
                          >
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                              {source.name}
                            </span>
                            <SourceToggle
                              sceneName={scene.name}
                              source={source}
                              onToggle={handleSourceVisibilityToggle}
                              onNotification={showNotification}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Automations Tab */}
          {activeTab === 'automations' && (
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {automations.length} automatización{automations.length !== 1 ? 'es' : ''}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowPresets(!showPresets)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white rounded-lg transition-colors"
                  >
                    <Sparkles size={12} />
                    Presets
                  </button>
                  <button
                    onClick={() => setShowAutomationForm(!showAutomationForm)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    Nueva
                  </button>
                </div>
              </div>
              
              {/* Presets Panel */}
              {showPresets && (
                <div className="p-3 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-400">Configuraciones rápidas</span>
                    <button
                      onClick={() => setShowPresets(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-300"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {AUTOMATION_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => openPresetConfig(preset)}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{preset.icon}</span>
                          <span className="text-xs font-medium text-white">{preset.name}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2">{preset.description}</p>
                        <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Copy size={10} className="text-purple-400" />
                          <span className="text-[10px] text-purple-400">Aplicar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 text-center">
                    💡 Los presets buscan escenas con nombres similares (ej: "Juego", "BRB", "Principal")
                  </p>
                </div>
              )}
              
              {/* New Automation Form */}
              {showAutomationForm && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <input
                    type="text"
                    value={newAutomation.name || ''}
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nombre de la automatización"
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                  />
                  
                  <select
                    value={newAutomation.trigger}
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, trigger: e.target.value as AutomationTrigger }))}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                  >
                    {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  
                  <select
                    value={newAutomation.sceneName || ''}
                    onChange={(e) => setNewAutomation(prev => ({ ...prev, sceneName: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                  >
                    <option value="">Seleccionar escena...</option>
                    {scenes.map((scene) => (
                      <option key={scene.name} value={scene.name}>{scene.name}</option>
                    ))}
                  </select>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddAutomation}
                      disabled={!newAutomation.name || !newAutomation.sceneName}
                      className="flex-1 py-1.5 text-xs bg-green-500 hover:bg-green-600 disabled:bg-zinc-300 text-white rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <Check size={12} />
                      Guardar
                    </button>
                    <button
                      onClick={() => setShowAutomationForm(false)}
                      className="px-3 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Automation List */}
              {automations.length === 0 && !showAutomationForm ? (
                <div className="text-center py-6 text-zinc-500">
                  <Zap size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No hay automatizaciones</p>
                  <p className="text-xs opacity-75">Crea una para cambiar escenas automáticamente</p>
                </div>
              ) : (
                automations.map((automation) => (
                  <div
                    key={automation.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      automation.enabled
                        ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 opacity-60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                        {automation.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {TRIGGER_LABELS[automation.trigger]} → {automation.sceneName}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => toggleAutomation(automation.id)}
                        className={`p-1.5 rounded transition-colors ${
                          automation.enabled
                            ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
                            : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {automation.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => removeAutomation(automation.id)}
                        className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Stream Tab */}
          {activeTab === 'stream' && (
            <div className="p-4 space-y-4">
              {/* Stream Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-lg border ${
                  streamStatus?.isStreaming
                    ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {streamStatus?.isStreaming ? (
                      <Circle size={14} className="text-red-500 fill-red-500 animate-pulse" />
                    ) : (
                      <Circle size={14} className="text-zinc-400" />
                    )}
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Streaming
                    </span>
                  </div>
                  <p className="text-lg font-mono text-zinc-900 dark:text-white">
                    {formatTime(streamStatus?.totalStreamTime)}
                  </p>
                  <button
                    onClick={streamStatus?.isStreaming ? stopStream : startStream}
                    className={`mt-2 w-full py-1.5 text-xs font-medium rounded transition-colors ${
                      streamStatus?.isStreaming
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {streamStatus?.isStreaming ? (
                      <span className="flex items-center justify-center gap-1">
                        <Square size={12} /> Detener
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <Play size={12} /> Iniciar
                      </span>
                    )}
                  </button>
                </div>
                
                <div className={`p-3 rounded-lg border ${
                  streamStatus?.isRecording
                    ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                    : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {streamStatus?.isRecording ? (
                      <Circle size={14} className="text-orange-500 fill-orange-500 animate-pulse" />
                    ) : (
                      <Circle size={14} className="text-zinc-400" />
                    )}
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Grabación
                    </span>
                  </div>
                  <p className="text-lg font-mono text-zinc-900 dark:text-white">
                    {streamStatus?.recordTimecode?.split('.')[0] || '00:00:00'}
                  </p>
                  <button
                    onClick={streamStatus?.isRecording ? stopRecording : startRecording}
                    className={`mt-2 w-full py-1.5 text-xs font-medium rounded transition-colors ${
                      streamStatus?.isRecording
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {streamStatus?.isRecording ? (
                      <span className="flex items-center justify-center gap-1">
                        <Square size={12} /> Detener
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        <Circle size={12} /> Grabar
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="w-full py-2 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <WifiOff size={14} />
                Desconectar de OBS
              </button>
            </div>
          )}
        </>
      )}

      {/* Favorites Modal */}
      {showFavoritesModal && (
        <FavoriteScenesModal
          scenes={scenes}
          selectedFavorites={favoriteScenes}
          onSave={saveFavoriteScenes}
          onClose={() => setShowFavoritesModal(false)}
        />
      )}

      {/* Quick Command Modal */}
      {showQuickCommandModal && (
        <QuickCommandModal
          scenes={scenes}
          transitions={transitions}
          command={editingQuickCommand}
          onSave={handleSaveQuickCommand}
          onClose={() => {
            setShowQuickCommandModal(false);
            setEditingQuickCommand(undefined);
          }}
        />
      )}

      {/* Preset Config Modal */}
      {showPresetConfigModal && selectedPreset && (
        <PresetConfigModal
          preset={selectedPreset}
          scenes={scenes}
          onApply={handleApplyPreset}
          onClose={() => {
            setShowPresetConfigModal(false);
            setSelectedPreset(null);
          }}
        />
      )}
    </div>
  );
};

export default OBSControlPanel;
