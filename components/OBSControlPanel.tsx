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
} from 'lucide-react';
import { useOBS } from '../src/application/hooks/useOBS';
import { useOBSTriggers } from '../src/application/hooks/useOBSTriggers';
import type { SceneAutomation, AutomationTrigger } from '../src/application/services/OBSService';
import type { OBSSource } from '../src/domain/ports/IOBSController';

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
interface AutomationPreset {
  name: string;
  description: string;
  icon: string;
  automations: Array<{
    name: string;
    trigger: AutomationTrigger;
    sceneNameHint: string;
  }>;
}

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
  const [activeTab, setActiveTab] = useState<'scenes' | 'automations' | 'stream' | 'quick'>('scenes');
  
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

  const applyPreset = (preset: AutomationPreset) => {
    preset.automations.forEach(auto => {
      // Buscar escena que coincida con el hint
      const matchingScene = scenes.find(s => 
        s.name.toLowerCase().includes(auto.sceneNameHint.toLowerCase())
      );
      
      if (matchingScene) {
        addAutomation({
          name: auto.name,
          trigger: auto.trigger,
          sceneName: matchingScene.name,
          enabled: true,
        });
      }
    });
    setShowPresets(false);
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
                <span className="text-xs text-zinc-500 font-medium">Escenas Favoritas</span>
                <div className="grid grid-cols-2 gap-2">
                  {scenes.slice(0, 4).map((scene) => (
                    <button
                      key={scene.name}
                      onClick={() => switchScene(scene.name)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all truncate ${
                        currentScene === scene.name
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {scene.name}
                    </button>
                  ))}
                </div>
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
                            <button
                              onClick={() => setSourceVisible(scene.name, source.name, !source.enabled)}
                              className={`p-1 rounded transition-colors ${
                                source.enabled
                                  ? 'text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10'
                                  : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {source.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
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
                        onClick={() => applyPreset(preset)}
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
    </div>
  );
};

export default OBSControlPanel;
