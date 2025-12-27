import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Trophy,
  Users,
  Clock,
  Gift,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Crown,
  Hash,
  RotateCcw,
  MessageSquare,
  Star,
  List,
  Timer,
  TimerOff,
  Download,
  Upload,
  AlertTriangle,
  UserPlus,
  X,
  RefreshCw,
  Loader2,
  Ban,
  Shield,
  Heart,
  Settings,
  Coins,
  DollarSign,
  Zap,
} from 'lucide-react';
import { GiveawayThread, GiveawayParticipant, TwitchMessage, CollaborationChannel, SubsGiveawayConfig, SubsGiveawayEntry, DEFAULT_SUBS_CONFIG } from '../types';
import { useI18n } from '../i18n';
import { twitchService, StreamEventData } from '../services/twitchService';
import { giveawaySync } from '../services/firebaseSync';
import { OBSOverlayUrl } from './OBSOverlayUrl';
import { useOBSTriggers } from '../src/application/hooks/useOBSTriggers';

interface GiveawayHubProps {
  chatMessages: TwitchMessage[];
  isConnected: boolean;
  onClearChatMessages?: () => void;
  userVoteMap?: Map<string, number>;
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  authToken?: string;
  userId?: string;
}

type TabType = 'raffle' | 'active';
type RaffleMode = 'viewers' | 'keyword' | 'subs';

const generateId = () => Math.random().toString(36).substring(2, 9);
const THREAD_COLORS = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6'];
const RANDOM_WINNER_CHANNEL = 'random_winner_sync';

interface WinnerState {
  winner: string | null;
  isSelecting: boolean;
  displayName: string;
  participantCount: number;
}

// Tipo para sorteos finalizados (para historial)
export interface FinishedGiveaway {
  id: string;
  name: string;
  keyword: string;
  mode: 'viewers' | 'keyword' | 'subs';
  winner: string;
  participantCount: number;
  subscribersOnly: boolean;
  createdAt: number;
  finishedAt: number;
}

// Tipo para exportar/importar
interface GiveawayExport {
  version: 1;
  exportedAt: number;
  threads: GiveawayThread[];
  history: FinishedGiveaway[];
}

// Componente para configurar valores de subs
const SubsConfigPanel: React.FC<{
  config: SubsGiveawayConfig;
  onChange: (config: SubsGiveawayConfig) => void;
  onClose: () => void;
}> = ({ config, onChange, onClose }) => {
  const [localConfig, setLocalConfig] = useState(config);
  
  const updateConfig = (key: keyof SubsGiveawayConfig, value: number | boolean | string) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };
  
  const handleSave = () => {
    onChange(localConfig);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Settings className="text-pink-500" size={24} />
            </div>
            <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Configurar Valores</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Subs por Tier */}
          <div className="p-3 bg-purple-500/10 rounded-xl space-y-3">
            <h4 className="font-bold text-purple-600 dark:text-purple-400 text-sm flex items-center gap-2">
              <Star size={16} /> Suscripciones
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Tier 1</label>
                <input
                  type="number"
                  min="0"
                  value={localConfig.tier1Value}
                  onChange={(e) => updateConfig('tier1Value', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Tier 2</label>
                <input
                  type="number"
                  min="0"
                  value={localConfig.tier2Value}
                  onChange={(e) => updateConfig('tier2Value', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Tier 3</label>
                <input
                  type="number"
                  min="0"
                  value={localConfig.tier3Value}
                  onChange={(e) => updateConfig('tier3Value', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Prime</label>
                <input
                  type="number"
                  min="0"
                  value={localConfig.primeValue}
                  onChange={(e) => updateConfig('primeValue', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Resubs */}
          <div className="p-3 bg-cyan-500/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-cyan-600 dark:text-cyan-400 text-sm flex items-center gap-2">
                <RefreshCw size={16} /> Resubs
              </h4>
              <button
                onClick={() => updateConfig('resubEnabled', !localConfig.resubEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${localConfig.resubEnabled ? 'bg-cyan-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localConfig.resubEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {localConfig.resubEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Entradas por resub</label>
                  <input
                    type="number"
                    min="0"
                    value={localConfig.resubValue}
                    onChange={(e) => updateConfig('resubValue', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Bonus por mes</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={localConfig.resubBonusPerMonth}
                    onChange={(e) => updateConfig('resubBonusPerMonth', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Gift Subs */}
          <div className="p-3 bg-pink-500/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-pink-600 dark:text-pink-400 text-sm flex items-center gap-2">
                <Gift size={16} /> Gift Subs
              </h4>
              <button
                onClick={() => updateConfig('giftSubEnabled', !localConfig.giftSubEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${localConfig.giftSubEnabled ? 'bg-pink-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localConfig.giftSubEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {localConfig.giftSubEnabled && (
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Entradas por sub regalada</label>
                <input
                  type="number"
                  min="0"
                  value={localConfig.giftSubValue}
                  onChange={(e) => updateConfig('giftSubValue', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
          
          {/* Bits */}
          <div className="p-3 bg-yellow-500/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-yellow-600 dark:text-yellow-400 text-sm flex items-center gap-2">
                <Coins size={16} /> Bits
              </h4>
              <button
                onClick={() => updateConfig('bitsEnabled', !localConfig.bitsEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${localConfig.bitsEnabled ? 'bg-yellow-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localConfig.bitsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {localConfig.bitsEnabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Bits por entrada</label>
                  <input
                    type="number"
                    min="1"
                    value={localConfig.bitsPerEntry}
                    onChange={(e) => updateConfig('bitsPerEntry', Math.max(1, parseInt(e.target.value) || 100))}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Mínimo bits</label>
                  <input
                    type="number"
                    min="0"
                    value={localConfig.bitsMinimum}
                    onChange={(e) => updateConfig('bitsMinimum', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Donaciones */}
          <div className="p-3 bg-green-500/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
                <DollarSign size={16} /> Donaciones
              </h4>
              <button
                onClick={() => updateConfig('donationsEnabled', !localConfig.donationsEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${localConfig.donationsEnabled ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localConfig.donationsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {localConfig.donationsEnabled && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">€ por entrada</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={localConfig.donationPerEntry}
                    onChange={(e) => updateConfig('donationPerEntry', Math.max(0.01, parseFloat(e.target.value) || 1))}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={localConfig.donationMinimum}
                    onChange={(e) => updateConfig('donationMinimum', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">Moneda</label>
                  <select
                    value={localConfig.donationCurrency}
                    onChange={(e) => updateConfig('donationCurrency', e.target.value)}
                    className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          {/* Regalos de canal */}
          <div className="p-3 bg-orange-500/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-orange-600 dark:text-orange-400 text-sm flex items-center gap-2">
                <Zap size={16} /> Regalos de Canal
              </h4>
              <button
                onClick={() => updateConfig('channelGiftsEnabled', !localConfig.channelGiftsEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${localConfig.channelGiftsEnabled ? 'bg-orange-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localConfig.channelGiftsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {localConfig.channelGiftsEnabled && (
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400">Entradas por regalo</label>
                <input
                  type="number"
                  min="0"
                  value={localConfig.channelGiftValue}
                  onChange={(e) => updateConfig('channelGiftValue', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setLocalConfig(DEFAULT_SUBS_CONFIG)}
            className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors text-sm"
          >
            Restaurar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-lg transition-colors text-sm"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export const GiveawayHub: React.FC<GiveawayHubProps> = ({
  chatMessages,
  isConnected,
  onClearChatMessages,
  authToken,
  userId: propUserId,
}) => {
  const { t } = useI18n();
  const { triggerGiveawayStart, triggerGiveawayWinner } = useOBSTriggers();
  const [activeTab, setActiveTab] = useState<TabType>('raffle');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============================================
  // RAFFLE STATE
  // ============================================
  const [raffleMode, setRaffleMode] = useState<RaffleMode>('viewers');
  const [raffleTitle, setRaffleTitle] = useState('');
  const [subsOnly, setSubsOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [useTimer, setUseTimer] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Separate participants for each mode
  const [viewersParticipants, setViewersParticipants] = useState<Set<string>>(new Set());
  const [keywordParticipants, setKeywordParticipants] = useState<Set<string>>(new Set());
  const viewersParticipantsRef = useRef<Set<string>>(new Set());
  const keywordParticipantsRef = useRef<Set<string>>(new Set());
  const viewersManualRef = useRef<Set<string>>(new Set());
  const keywordManualRef = useRef<Set<string>>(new Set());
  
  // Subs mode - array to allow multiple entries per user (1 sub = 1 entry)
  const [subsParticipants, setSubsParticipants] = useState<string[]>([]);
  const subsParticipantsRef = useRef<string[]>([]);
  
  // Subs mode detailed entries (for weighted selection)
  const [subsEntries, setSubsEntries] = useState<SubsGiveawayEntry[]>([]);
  const subsEntriesRef = useRef<SubsGiveawayEntry[]>([]);
  
  // Subs configuration
  const [subsConfig, setSubsConfig] = useState<SubsGiveawayConfig>(() => {
    const saved = localStorage.getItem('giveaway_subs_config');
    if (saved) {
      try { return { ...DEFAULT_SUBS_CONFIG, ...JSON.parse(saved) }; }
      catch { return DEFAULT_SUBS_CONFIG; }
    }
    return DEFAULT_SUBS_CONFIG;
  });
  const [showSubsConfig, setShowSubsConfig] = useState(false);
  
  // Legacy refs for compatibility - point to current mode
  const participantsRef = raffleMode === 'viewers' ? viewersParticipantsRef : keywordParticipantsRef;
  const participants = raffleMode === 'viewers' ? viewersParticipants : keywordParticipants;
  const setParticipants = raffleMode === 'viewers' ? setViewersParticipants : setKeywordParticipants;
  const manualParticipantsRef = raffleMode === 'viewers' ? viewersManualRef : keywordManualRef;
  
  const [winner, setWinner] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const startTimeRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // ============================================
  // THREADS STATE
  // ============================================
  const [threads, setThreads] = useState<GiveawayThread[]>(() => {
    const saved = localStorage.getItem('giveaway_threads');
    if (saved) {
      try { 
        const all = JSON.parse(saved);
        // Migrate old threads without mode field
        return all.filter((t: GiveawayThread) => !t.winner).map((t: GiveawayThread) => ({
          ...t,
          mode: t.mode || 'keyword', // Default to keyword for old threads
        }));
      } catch { return []; }
    }
    return [];
  });
  
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());
  
  // Manual participant input
  const [manualParticipant, setManualParticipant] = useState('');
  const [manualParticipantError, setManualParticipantError] = useState<string | null>(null);
  const [threadManualParticipant, setThreadManualParticipant] = useState<{ [threadId: string]: string }>({});
  const [threadManualError, setThreadManualError] = useState<{ [threadId: string]: string | null }>({});
  const participantsFileInputRef = useRef<HTMLInputElement>(null);
  
  // Blacklist (banned users from raffles)
  const [blacklist, setBlacklist] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('giveaway_blacklist');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch { return new Set(); }
    }
    return new Set();
  });
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [blacklistInput, setBlacklistInput] = useState('');
  const blacklistFileInputRef = useRef<HTMLInputElement>(null);
  
  // Loading states for API calls
  const [isLoadingChatters, setIsLoadingChatters] = useState(false);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Save blacklist to localStorage
  useEffect(() => {
    localStorage.setItem('giveaway_blacklist', JSON.stringify(Array.from(blacklist)));
  }, [blacklist]);

  // Save subs config to localStorage
  useEffect(() => {
    localStorage.setItem('giveaway_subs_config', JSON.stringify(subsConfig));
  }, [subsConfig]);

  const activeThreadCount = threads.filter(t => t.isActive).length;

  // Ref para estado actual (para BroadcastChannel)
  const stateRef = useRef({ winner, isSelecting, displayName });
  useEffect(() => {
    stateRef.current = { winner, isSelecting, displayName };
  }, [winner, isSelecting, displayName]);

  // ============================================
  // BEFOREUNLOAD - Avisar si hay sorteos activos
  // ============================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeThreadCount > 0 || isRunning) {
        // Guardar backup automático
        const backup: GiveawayExport = {
          version: 1,
          exportedAt: Date.now(),
          threads,
          history: JSON.parse(localStorage.getItem('giveaway_history') || '[]'),
        };
        localStorage.setItem('giveaway_backup', JSON.stringify(backup));
        
        e.preventDefault();
        e.returnValue = `Tienes ${activeThreadCount} sorteo(s) activo(s). ¿Seguro que quieres salir?`;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeThreadCount, isRunning, threads]);

  // Comprobar si hay backup al cargar
  useEffect(() => {
    const backup = localStorage.getItem('giveaway_backup');
    if (backup && threads.length === 0) {
      try {
        const data: GiveawayExport = JSON.parse(backup);
        if (data.threads && data.threads.length > 0) {
          const activeBackupThreads = data.threads.filter(t => !t.winner);
          if (activeBackupThreads.length > 0) {
            setShowImportModal(true);
          }
        }
      } catch { /* ignore */ }
    }
  }, []);

  // ============================================
  // BROADCAST CHANNEL
  // ============================================
  useEffect(() => {
    channelRef.current = new BroadcastChannel(RANDOM_WINNER_CHANNEL);
    channelRef.current.onmessage = (event) => {
      if (event.data?.type === 'request_sync') {
        const s = stateRef.current;
        channelRef.current?.postMessage({ winner: s.winner, isSelecting: s.isSelecting, displayName: s.displayName });
      }
    };
    return () => { channelRef.current?.close(); };
  }, []);

  const syncToOverlay = (state: Partial<WinnerState>) => {
    const fullState = {
      winner,
      isSelecting,
      displayName,
      participantCount: raffleMode === 'viewers' ? getViewers().length : participants.size,
      ...state
    };
    
    // Sync via BroadcastChannel (same browser)
    if (channelRef.current) {
      channelRef.current.postMessage(fullState);
    }
    
    // Sync via Firebase (OBS Browser Source)
    giveawaySync.update({
      winner: fullState.winner,
      isSpinning: fullState.isSelecting,
      displayName: fullState.displayName || '',
      participants: [],
      updatedAt: Date.now()
    }).catch(err => console.error('Firebase giveaway sync error:', err));
  };

  // ============================================
  // HELPERS
  // ============================================
  const getViewers = () => {
    const viewers = new Set<string>();
    chatMessages.forEach((msg) => {
      if (subsOnly) {
        if (msg.isSubscriber) viewers.add(msg.username);
      } else {
        viewers.add(msg.username);
      }
    });
    return Array.from(viewers);
  };

  const viewerCount = getViewers().length;

  // ============================================
  // EFFECTS
  // ============================================
  
  // Process messages when running
  useEffect(() => {
    if (!isRunning) return;
    
    if (raffleMode === 'keyword' && keyword.trim()) {
      const keywordLower = keyword.toLowerCase().trim();
      chatMessages.forEach((msg) => {
        if (msg.timestamp && msg.timestamp > startTimeRef.current) {
          if (msg.message.toLowerCase().includes(keywordLower)) {
            if (subsOnly && !msg.isSubscriber) return;
            participantsRef.current.add(msg.username);
            setParticipants(new Set(participantsRef.current));
          }
        }
      });
    } else if (raffleMode === 'viewers') {
      chatMessages.forEach((msg) => {
        if (msg.timestamp && msg.timestamp > startTimeRef.current) {
          if (subsOnly && !msg.isSubscriber) return;
          participantsRef.current.add(msg.username);
          setParticipants(new Set(participantsRef.current));
        }
      });
    }
  }, [chatMessages, raffleMode, isRunning, keyword, subsOnly]);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || !useTimer || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { 
          setIsRunning(false); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, useTimer, timeLeft]);

  // Ref to track if subs raffle is running (for the stream event listener)
  const subsRaffleActiveRef = useRef(false);
  const subsStartTimeRef = useRef(0);
  
  // Update refs when raffle state changes
  useEffect(() => {
    subsRaffleActiveRef.current = isRunning && raffleMode === 'subs';
    if (isRunning && raffleMode === 'subs') {
      subsStartTimeRef.current = startTimeRef.current;
    }
  }, [isRunning, raffleMode]);

  // Set up stream event listener for subs mode
  useEffect(() => {
    const handleSubEvent = (data: StreamEventData) => {
      // Only process if subs raffle is active
      if (!subsRaffleActiveRef.current) return;
      
      // Only process events that happened after raffle started
      const eventTime = data.timestamp || Date.now();
      if (eventTime < subsStartTimeRef.current) return;
      
      const username = (data.displayName || data.username).toLowerCase();
      const config = subsConfig;
      
      // Calculate entries based on event type and config
      let entries = 0;
      let entryType: SubsGiveawayEntry['type'] = 'sub';
      let tier: SubsGiveawayEntry['tier'] | undefined;
      let months: number | undefined;
      let amount: number | undefined;
      
      if (data.type === 'sub') {
        entryType = 'sub';
        // Determine tier from tier field
        if (data.tier === '1000' || data.tier === 'Prime') {
          tier = data.tier === 'Prime' ? 'prime' : 1;
          entries = data.tier === 'Prime' ? config.primeValue : config.tier1Value;
        } else if (data.tier === '2000') {
          tier = 2;
          entries = config.tier2Value;
        } else if (data.tier === '3000') {
          tier = 3;
          entries = config.tier3Value;
        } else {
          tier = 1;
          entries = config.tier1Value;
        }
      } else if (data.type === 'resub' && config.resubEnabled) {
        entryType = 'resub';
        months = data.months || 1;
        // Base resub value + bonus per month
        entries = config.resubValue + Math.floor((months - 1) * config.resubBonusPerMonth);
        // Determine tier
        if (data.tier === '1000' || data.tier === 'Prime') {
          tier = data.tier === 'Prime' ? 'prime' : 1;
        } else if (data.tier === '2000') {
          tier = 2;
        } else if (data.tier === '3000') {
          tier = 3;
        } else {
          tier = 1;
        }
      } else if ((data.type === 'subgift' || data.type === 'submysterygift') && config.giftSubEnabled) {
        entryType = 'giftsub';
        const giftCount = data.giftCount || 1;
        entries = giftCount * config.giftSubValue;
        amount = giftCount;
      } else if (data.type === 'cheer' && config.bitsEnabled) {
        const bits = data.bits || 0;
        if (bits >= config.bitsMinimum) {
          entryType = 'bits' as SubsGiveawayEntry['type'];
          entries = Math.floor(bits / config.bitsPerEntry);
          amount = bits;
        }
      }
      
      if (entries > 0) {
        // Add detailed entry
        const entry: SubsGiveawayEntry = {
          oderId: data.userId || username,
          username,
          entries,
          type: entryType,
          tier,
          months,
          amount,
          timestamp: eventTime,
        };
        subsEntriesRef.current = [...subsEntriesRef.current, entry];
        setSubsEntries([...subsEntriesRef.current]);
        
        // Add to simple participants array (for weighted selection)
        const newEntries = Array(entries).fill(username);
        subsParticipantsRef.current = [...subsParticipantsRef.current, ...newEntries];
        setSubsParticipants([...subsParticipantsRef.current]);
      }
    };
    
    twitchService.onStreamEvent(handleSubEvent);
    
    return () => {
      twitchService.offStreamEvent(handleSubEvent);
    };
  }, [subsConfig]);

  // Save threads to localStorage
  useEffect(() => {
    localStorage.setItem('giveaway_threads', JSON.stringify(threads));
  }, [threads]);

  // Process chat messages for active threads
  useEffect(() => {
    if (!isConnected) return;
    
    const activeThreads = threads.filter(t => t.isActive && t.mode === 'keyword');
    if (activeThreads.length === 0) return;

    chatMessages.forEach(msg => {
      const msgId = msg.id || `${msg.userId}-${msg.timestamp}`;
      if (processedMessagesRef.current.has(msgId)) return;
      processedMessagesRef.current.add(msgId);

      const msgLower = msg.message.toLowerCase().trim();

      activeThreads.forEach(thread => {
        const keywordLower = thread.keyword.toLowerCase();
        
        if (msgLower.includes(keywordLower) || msgLower === keywordLower) {
          if (thread.subscribersOnly && !msg.isSubscriber) return;
          
          if (!thread.allowMultipleEntries) {
            const alreadyParticipated = thread.participants.some(p => p.oderId === msg.userId);
            if (alreadyParticipated) return;
          }

          const participant: GiveawayParticipant = {
            oderId: msg.userId || msg.username,
            username: msg.username,
            timestamp: Date.now(),
            messageId: msgId,
          };

          setThreads(prev => prev.map(t => 
            t.id === thread.id 
              ? { ...t, participants: [...t.participants, participant] }
              : t
          ));
        }
      });
    });
  }, [chatMessages, threads, isConnected]);

  // Process stream events for active subs threads
  useEffect(() => {
    const handleSubEventForThreads = (data: StreamEventData) => {
      const activeSubsThreads = threads.filter(t => t.isActive && t.mode === 'subs');
      if (activeSubsThreads.length === 0) return;
      
      const eventTime = data.timestamp || Date.now();
      const username = (data.displayName || data.username).toLowerCase();
      
      activeSubsThreads.forEach(thread => {
        // Only process events after thread was created
        if (eventTime < thread.createdAt) return;
        
        const config = thread.subsConfig || DEFAULT_SUBS_CONFIG;
        let entries = 0;
        
        if (data.type === 'sub') {
          if (data.tier === '1000' || data.tier === 'Prime') {
            entries = data.tier === 'Prime' ? config.primeValue : config.tier1Value;
          } else if (data.tier === '2000') {
            entries = config.tier2Value;
          } else if (data.tier === '3000') {
            entries = config.tier3Value;
          } else {
            entries = config.tier1Value;
          }
        } else if (data.type === 'resub' && config.resubEnabled) {
          const months = data.months || 1;
          entries = config.resubValue + Math.floor((months - 1) * config.resubBonusPerMonth);
        } else if ((data.type === 'subgift' || data.type === 'submysterygift') && config.giftSubEnabled) {
          const giftCount = data.giftCount || 1;
          entries = giftCount * config.giftSubValue;
        } else if (data.type === 'cheer' && config.bitsEnabled) {
          const bits = data.bits || 0;
          if (bits >= config.bitsMinimum) {
            entries = Math.floor(bits / config.bitsPerEntry);
          }
        }
        
        if (entries > 0) {
          // Add participant entries
          const newParticipants: GiveawayParticipant[] = Array(entries).fill(null).map((_, i) => ({
            oderId: data.userId || username,
            username,
            timestamp: eventTime,
            messageId: `${data.type}_${eventTime}_${i}`,
          }));
          
          setThreads(prev => prev.map(t => 
            t.id === thread.id 
              ? { ...t, participants: [...t.participants, ...newParticipants] }
              : t
          ));
        }
      });
    };
    
    twitchService.onStreamEvent(handleSubEventForThreads);
    
    return () => {
      twitchService.offStreamEvent(handleSubEventForThreads);
    };
  }, [threads]);


  // ============================================
  // RAFFLE ACTIONS
  // ============================================
  const startRaffle = () => {
    setWinner(null);
    setIsSelecting(false);
    syncToOverlay({ winner: null, isSelecting: false, displayName: '' });

    if (!useTimer && raffleMode === 'viewers') {
      // Use combined list (viewers + manual participants)
      const allParticipants = getAllParticipants();
      if (allParticipants.length === 0) return;
      animateSelection(allParticipants);
    } else if (raffleMode === 'subs') {
      // Subs mode always uses timer to collect sub events
      startTimeRef.current = Date.now();
      if (useTimer) setTimeLeft(timeLimit);
      setIsRunning(true);
    } else {
      // Keep existing manual participants, only reset the timestamp for new chat participants
      startTimeRef.current = Date.now();
      if (useTimer) setTimeLeft(timeLimit);
      setIsRunning(true);
    }
  };

  const finishAndSelectWinner = () => {
    setIsRunning(false);
    
    // OBS Trigger: Giveaway start (selection animation)
    triggerGiveawayStart();
    
    if (raffleMode === 'subs') {
      // Use subs participants array (allows duplicates for weighted selection)
      const participantList = subsParticipantsRef.current;
      if (participantList.length === 0) return;
      animateSelection(participantList);
    } else {
      // Use all participants (manual + from chat)
      const participantList: string[] = Array.from(participantsRef.current) as string[];
      if (participantList.length === 0) return;
      animateSelection(participantList);
    }
  };

  const animateSelection = (candidates: string[]) => {
    // Filter out blacklisted users before selection
    const filteredCandidates = filterBlacklisted(candidates);
    
    if (filteredCandidates.length === 0) {
      setManualParticipantError('No hay participantes válidos (todos están en la lista de prohibidos)');
      setTimeout(() => setManualParticipantError(null), 3000);
      return;
    }
    
    setIsSelecting(true);
    syncToOverlay({ isSelecting: true, winner: null });
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * filteredCandidates.length);
      setDisplayName(filteredCandidates[randomIndex]);
      syncToOverlay({ displayName: filteredCandidates[randomIndex], isSelecting: true });
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(interval);
        const winnerIndex = Math.floor(Math.random() * filteredCandidates.length);
        const winnerName = filteredCandidates[winnerIndex];
        setWinner(winnerName);
        setDisplayName(winnerName);
        setIsSelecting(false);
        syncToOverlay({ winner: winnerName, displayName: winnerName, isSelecting: false });
        saveToHistory(winnerName, filteredCandidates.length);
        // OBS Trigger: Giveaway winner selected
        triggerGiveawayWinner();
      }
    }, 100);
  };

  const saveToHistory = (winnerName: string, participantCount: number) => {
    const getName = () => {
      if (raffleTitle.trim()) return raffleTitle.trim();
      if (raffleMode === 'keyword') return `Sorteo: ${keyword}`;
      if (raffleMode === 'subs') return 'Sorteo de Subs';
      return 'Sorteo de viewers';
    };
    
    const finished: FinishedGiveaway = {
      id: generateId(),
      name: getName(),
      keyword: raffleMode === 'keyword' ? keyword : '',
      mode: raffleMode,
      winner: winnerName,
      participantCount,
      subscribersOnly: raffleMode === 'subs' ? true : subsOnly,
      createdAt: startTimeRef.current || Date.now(),
      finishedAt: Date.now(),
    };
    
    const history = JSON.parse(localStorage.getItem('giveaway_history') || '[]');
    history.unshift(finished);
    localStorage.setItem('giveaway_history', JSON.stringify(history.slice(0, 50)));
  };

  const resetRaffle = () => {
    setWinner(null);
    setIsRunning(false);
    setTimeLeft(0);
    // Clear only current mode's participants
    if (raffleMode === 'viewers') {
      setViewersParticipants(new Set());
      viewersParticipantsRef.current = new Set();
      viewersManualRef.current = new Set();
    } else if (raffleMode === 'keyword') {
      setKeywordParticipants(new Set());
      keywordParticipantsRef.current = new Set();
      keywordManualRef.current = new Set();
    } else if (raffleMode === 'subs') {
      setSubsParticipants([]);
      subsParticipantsRef.current = [];
      setSubsEntries([]);
      subsEntriesRef.current = [];
    }
    setDisplayName('');
    setIsSelecting(false);
    syncToOverlay({ winner: null, isSelecting: false, displayName: '' });
  };

  // Soft reset - only clears winner/running state, keeps participants
  const softResetRaffle = () => {
    setWinner(null);
    setIsRunning(false);
    setTimeLeft(0);
    setDisplayName('');
    setIsSelecting(false);
    syncToOverlay({ winner: null, isSelecting: false, displayName: '' });
  };
  
  // Clear all participants in all modes
  const clearAllParticipants = () => {
    setViewersParticipants(new Set());
    setKeywordParticipants(new Set());
    setSubsParticipants([]);
    setSubsEntries([]);
    viewersParticipantsRef.current = new Set();
    keywordParticipantsRef.current = new Set();
    subsParticipantsRef.current = [];
    subsEntriesRef.current = [];
    viewersManualRef.current = new Set();
    keywordManualRef.current = new Set();
  };

  // ============================================
  // THREAD ACTIONS
  // ============================================
  const createThreadFromRaffle = () => {
    if (!keyword.trim()) return;

    const newThread: GiveawayThread = {
      id: generateId(),
      name: `Sorteo: ${keyword}`,
      keyword: keyword,
      isActive: true,
      participants: [],
      createdAt: Date.now(),
      subscribersOnly: subsOnly,
      allowMultipleEntries: false,
      mode: 'keyword',
    };

    setThreads(prev => [...prev, newThread]);
    setActiveTab('active');
  };

  // Create a subs thread (runs in background collecting sub events)
  const createSubsThread = () => {
    const name = raffleTitle.trim() || 'Sorteo de Subs';
    
    const newThread: GiveawayThread = {
      id: generateId(),
      name,
      keyword: '', // No keyword for subs mode
      isActive: true,
      participants: [],
      createdAt: Date.now(),
      subscribersOnly: true,
      allowMultipleEntries: true, // Multiple entries allowed based on config
      mode: 'subs',
      subsConfig: { ...subsConfig },
    };

    setThreads(prev => [...prev, newThread]);
    setActiveTab('active');
    
    // Reset the quick raffle state
    softResetRaffle();
    setRaffleTitle('');
  };

  const toggleThread = (id: string) => {
    setThreads(prev => prev.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ));
  };

  const deleteThread = (id: string) => {
    setThreads(prev => prev.filter(t => t.id !== id));
  };

  const pickThreadWinner = (id: string) => {
    const thread = threads.find(t => t.id === id);
    if (!thread || thread.participants.length === 0) return;

    let candidates: string[];
    let uniqueCount: number;
    
    if (thread.mode === 'subs') {
      // For subs mode, use all participants (weighted by entries)
      // Filter out blacklisted users
      candidates = filterBlacklisted(thread.participants.map(p => p.username));
      uniqueCount = new Set(candidates).size;
    } else {
      // For keyword mode, use unique participants
      const participantMap = new Map<string, GiveawayParticipant>();
      thread.participants.forEach(p => participantMap.set(p.oderId, p));
      const uniqueParticipants = Array.from(participantMap.values());
      candidates = filterBlacklisted(uniqueParticipants.map(p => p.username));
      uniqueCount = candidates.length;
    }
    
    if (candidates.length === 0) {
      setManualParticipantError('No hay participantes válidos (todos están en la lista de prohibidos)');
      setTimeout(() => setManualParticipantError(null), 3000);
      return;
    }

    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const winnerName = candidates[winnerIndex];

    // Guardar en historial
    const finished: FinishedGiveaway = {
      id: thread.id,
      name: thread.name,
      keyword: thread.keyword,
      mode: thread.mode || 'keyword',
      winner: winnerName,
      participantCount: uniqueCount,
      subscribersOnly: thread.subscribersOnly,
      createdAt: thread.createdAt,
      finishedAt: Date.now(),
    };
    
    const history = JSON.parse(localStorage.getItem('giveaway_history') || '[]');
    history.unshift(finished);
    localStorage.setItem('giveaway_history', JSON.stringify(history.slice(0, 50)));

    // Eliminar de hilos activos
    setThreads(prev => prev.filter(t => t.id !== id));
    
    // Mostrar ganador
    setWinner(winnerName);
    setDisplayName(winnerName);
    syncToOverlay({ winner: winnerName, displayName: winnerName, isSelecting: false });
  };

  const getUniqueParticipantCount = (thread: GiveawayThread) => {
    return new Set(thread.participants.map(p => p.oderId)).size;
  };

  const getTotalEntries = (thread: GiveawayThread) => {
    return thread.participants.length;
  };

  // ============================================
  // MANUAL PARTICIPANT FUNCTIONS
  // ============================================
  const addManualParticipant = () => {
    const name = manualParticipant.trim().toLowerCase();
    if (!name) return;
    
    // Check for duplicates in current participants
    if (participantsRef.current.has(name)) {
      setManualParticipantError('Este usuario ya está participando');
      setTimeout(() => setManualParticipantError(null), 2000);
      return;
    }
    
    // In viewers mode without timer, also check against existing viewers
    if (raffleMode === 'viewers' && !useTimer) {
      const viewers = getViewers();
      if (viewers.some(v => v.toLowerCase() === name)) {
        setManualParticipantError('Este usuario ya está en el chat');
        setTimeout(() => setManualParticipantError(null), 2000);
        return;
      }
    }
    
    participantsRef.current.add(name);
    manualParticipantsRef.current.add(name);
    setParticipants(new Set(participantsRef.current));
    setManualParticipant('');
    setManualParticipantError(null);
  };

  const removeParticipant = (name: string) => {
    participantsRef.current.delete(name);
    manualParticipantsRef.current.delete(name);
    setParticipants(new Set(participantsRef.current));
  };

  // Check if a participant was added manually
  const isManualParticipant = (name: string): boolean => {
    return manualParticipantsRef.current.has(name);
  };

  // Blacklist functions
  const addToBlacklist = (name: string) => {
    const nameLower = name.trim().toLowerCase();
    if (nameLower) {
      setBlacklist(prev => new Set([...prev, nameLower]));
    }
  };

  const removeFromBlacklist = (name: string) => {
    setBlacklist(prev => {
      const newSet = new Set(prev);
      newSet.delete(name.toLowerCase());
      return newSet;
    });
  };

  const exportBlacklist = () => {
    if (blacklist.size === 0) return;
    const content = Array.from(blacklist).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blacklist_sorteos.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBlacklist = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      
      const lines = content.split(/[\n\r]+/).map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
      setBlacklist(prev => new Set([...prev, ...lines]));
      setManualParticipantError(`${lines.length} usuarios añadidos a la lista de prohibidos`);
      setTimeout(() => setManualParticipantError(null), 3000);
    };
    reader.readAsText(file);
    if (blacklistFileInputRef.current) {
      blacklistFileInputRef.current.value = '';
    }
  };

  // Filter out blacklisted users from a list
  const filterBlacklisted = (users: string[]): string[] => {
    return users.filter(u => !blacklist.has(u.toLowerCase()));
  };

  // Check if user is blacklisted
  const isBlacklisted = (name: string): boolean => {
    return blacklist.has(name.toLowerCase());
  };

  // Get all participants (viewers + manual) for display
  const getAllParticipants = (): string[] => {
    if (raffleMode === 'viewers' && !useTimer && !isRunning) {
      // Combine viewers from chat with manually added participants
      const viewers = getViewers();
      const manual: string[] = Array.from(participantsRef.current);
      const combined = new Set<string>([...viewers, ...manual]);
      return Array.from(combined);
    }
    return Array.from(participantsRef.current) as string[];
  };

  // Export participants to file
  const exportParticipants = () => {
    const allParticipants = getAllParticipants();
    if (allParticipants.length === 0) return;
    
    const content = allParticipants.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import participants from file
  const importParticipants = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      
      const lines = content.split(/[\n\r]+/).map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
      const existingViewers = new Set(getViewers().map(v => v.toLowerCase()));
      const existingManual = new Set((Array.from(participantsRef.current) as string[]).map(p => p.toLowerCase()));
      
      let added = 0;
      let duplicates = 0;
      
      lines.forEach(name => {
        if (existingViewers.has(name) || existingManual.has(name) || participantsRef.current.has(name)) {
          duplicates++;
        } else {
          participantsRef.current.add(name);
          manualParticipantsRef.current.add(name);
          added++;
        }
      });
      
      setParticipants(new Set(participantsRef.current));
      
      setManualParticipantError(`Añadidos: ${added}${duplicates > 0 ? `, Duplicados: ${duplicates}` : ''}`);
      setTimeout(() => setManualParticipantError(null), 3000);
    };
    reader.readAsText(file);
    
    // Reset file input so same file can be selected again
    if (participantsFileInputRef.current) {
      participantsFileInputRef.current.value = '';
    }
  };

  // Load chatters from Twitch API
  const loadChatters = async () => {
    if (!authToken || !isConnected) {
      setApiError('Necesitas estar conectado con un token OAuth');
      setTimeout(() => setApiError(null), 3000);
      return;
    }
    
    setIsLoadingChatters(true);
    setApiError(null);
    
    try {
      const channel = twitchService.getCurrentChannel();
      // Use prop userId if available, otherwise fetch it
      const odUserId = propUserId || await twitchService.getUserId(authToken, channel);
      
      if (!odUserId) {
        setApiError('No se pudo obtener el ID del canal');
        setIsLoadingChatters(false);
        return;
      }
      
      const chatters = await twitchService.getChatters(authToken, odUserId, odUserId);
      
      if (!chatters) {
        setApiError('Token sin permiso. Genera uno nuevo con scope: moderator:read:chatters');
        setIsLoadingChatters(false);
        return;
      }
      
      let added = 0;
      let duplicates = 0;
      chatters.forEach(name => {
        const nameLower = name.toLowerCase();
        if (participantsRef.current.has(nameLower)) {
          duplicates++;
        } else {
          participantsRef.current.add(nameLower);
          added++;
        }
      });
      
      setParticipants(new Set(participantsRef.current));
      setManualParticipantError(`Chatters: ${added} añadidos${duplicates > 0 ? `, ${duplicates} ya estaban` : ''}`);
      setTimeout(() => setManualParticipantError(null), 3000);
    } catch (err) {
      setApiError('Error al cargar chatters');
    } finally {
      setIsLoadingChatters(false);
    }
  };

  // Load subscribers from Twitch API
  const loadSubscribers = async () => {
    if (!authToken || !isConnected) {
      setApiError('Necesitas estar conectado con un token OAuth');
      setTimeout(() => setApiError(null), 3000);
      return;
    }
    
    setIsLoadingSubs(true);
    setApiError(null);
    
    try {
      const channel = twitchService.getCurrentChannel();
      // Use prop userId if available, otherwise fetch it
      const odUserId = propUserId || await twitchService.getUserId(authToken, channel);
      
      if (!odUserId) {
        setApiError('No se pudo obtener el ID del canal');
        setIsLoadingSubs(false);
        return;
      }
      
      const subs = await twitchService.getSubscribers(authToken, odUserId);
      
      if (!subs) {
        setApiError('Token sin permiso. Genera uno nuevo con scope: channel:read:subscriptions');
        setIsLoadingSubs(false);
        return;
      }
      
      let added = 0;
      let duplicates = 0;
      subs.forEach(name => {
        const nameLower = name.toLowerCase();
        if (participantsRef.current.has(nameLower)) {
          duplicates++;
        } else {
          participantsRef.current.add(nameLower);
          added++;
        }
      });
      
      setParticipants(new Set(participantsRef.current));
      setManualParticipantError(`Subs: ${added} añadidos${duplicates > 0 ? `, ${duplicates} ya estaban` : ''}`);
      setTimeout(() => setManualParticipantError(null), 3000);
    } catch (err) {
      setApiError('Error al cargar suscriptores');
    } finally {
      setIsLoadingSubs(false);
    }
  };

  const addManualParticipantToThread = (threadId: string) => {
    const name = (threadManualParticipant[threadId] || '').trim().toLowerCase();
    if (!name) return;
    
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;
    
    // Check for duplicates
    const existingParticipant = thread.participants.find(p => p.username.toLowerCase() === name);
    if (existingParticipant) {
      setThreadManualError(prev => ({ ...prev, [threadId]: 'Este usuario ya está participando' }));
      setTimeout(() => setThreadManualError(prev => ({ ...prev, [threadId]: null })), 2000);
      return;
    }
    
    const participant: GiveawayParticipant = {
      oderId: `manual_${name}_${Date.now()}`,
      username: name,
      timestamp: Date.now(),
      messageId: `manual_${Date.now()}`,
    };
    
    setThreads(prev => prev.map(t => 
      t.id === threadId 
        ? { ...t, participants: [...t.participants, participant] }
        : t
    ));
    
    setThreadManualParticipant(prev => ({ ...prev, [threadId]: '' }));
    setThreadManualError(prev => ({ ...prev, [threadId]: null }));
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return 'Ahora';
  };

  // ============================================
  // EXPORT / IMPORT
  // ============================================
  const exportData = () => {
    const data: GiveawayExport = {
      version: 1,
      exportedAt: Date.now(),
      threads,
      history: JSON.parse(localStorage.getItem('giveaway_history') || '[]'),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sorteos_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data: GiveawayExport = JSON.parse(e.target?.result as string);
        if (data.version !== 1) {
          setImportError('Versión de archivo no compatible');
          return;
        }
        
        if (data.threads) {
          const activeThreads = data.threads.filter(t => !t.winner);
          setThreads(prev => [...prev, ...activeThreads]);
        }
        
        if (data.history) {
          const currentHistory = JSON.parse(localStorage.getItem('giveaway_history') || '[]');
          const merged = [...data.history, ...currentHistory].slice(0, 50);
          localStorage.setItem('giveaway_history', JSON.stringify(merged));
        }
        
        setShowImportModal(false);
        setImportError(null);
        localStorage.removeItem('giveaway_backup');
      } catch {
        setImportError('Error al leer el archivo');
      }
    };
    reader.readAsText(file);
  };

  const importFromBackup = () => {
    const backup = localStorage.getItem('giveaway_backup');
    if (backup) {
      try {
        const data: GiveawayExport = JSON.parse(backup);
        if (data.threads) {
          const activeThreads = data.threads.filter(t => !t.winner);
          setThreads(activeThreads);
        }
        localStorage.removeItem('giveaway_backup');
        setShowImportModal(false);
      } catch { /* ignore */ }
    }
  };

  const dismissBackup = () => {
    localStorage.removeItem('giveaway_backup');
    setShowImportModal(false);
  };


  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Backup Recovery Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="text-yellow-500" size={24} />
              </div>
              <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Sorteos sin finalizar</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
              Se encontraron sorteos activos de una sesión anterior. ¿Deseas recuperarlos?
            </p>
            <div className="flex gap-2">
              <button
                onClick={importFromBackup}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Recuperar
              </button>
              <button
                onClick={dismissBackup}
                className="flex-1 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-zinc-800 dark:text-white flex items-center gap-2">
            <Gift className="text-pink-500" size={20} />
            Sorteos
          </h2>
          <div className="flex items-center gap-2">
            <OBSOverlayUrl overlayParam="overlayRandomWinner" title="el sorteo" />
            {activeThreadCount > 0 && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                {activeThreadCount}
              </span>
            )}
            {/* Export/Import buttons */}
            <button
              onClick={exportData}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Exportar sorteos"
            >
              <Download size={16} />
            </button>
            <label className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer" title="Importar sorteos">
              <Upload size={16} />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
              />
            </label>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('raffle')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'raffle'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Sparkles size={16} />
            Sorteo
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'active'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            <List size={16} />
            Activos
            {activeThreadCount > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === 'active' ? 'bg-white/20' : 'bg-green-500/20 text-green-600 dark:text-green-400'}`}>
                {activeThreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'raffle' ? (
          // ============================================
          // RAFFLE TAB
          // ============================================
          <div className="p-4 space-y-4">
            {/* Mode selector */}
            <div className="flex gap-2">
              <button 
                onClick={() => { setRaffleMode('viewers'); softResetRaffle(); }} 
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${raffleMode === 'viewers' ? 'bg-purple-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                <Users size={18} /> {t.randomWinner.viewers}
              </button>
              <button 
                onClick={() => { setRaffleMode('keyword'); softResetRaffle(); }} 
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${raffleMode === 'keyword' ? 'bg-purple-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                <MessageSquare size={18} /> {t.randomWinner.keyword}
              </button>
              <button 
                onClick={() => { setRaffleMode('subs'); softResetRaffle(); }} 
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${raffleMode === 'subs' ? 'bg-pink-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                <Heart size={18} /> Subs
              </button>
            </div>

            {/* Raffle title */}
            <div className="space-y-2">
              <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase">Título del sorteo (opcional)</label>
              <input 
                type="text" 
                value={raffleTitle} 
                onChange={(e) => setRaffleTitle(e.target.value)} 
                placeholder="Ej: Sorteo de subs, Regalo navideño..." 
                disabled={isRunning} 
                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 disabled:opacity-50" 
              />
            </div>

            {/* Common options */}
            <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              {/* Subs only toggle - not shown in subs mode */}
              {raffleMode !== 'subs' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="text-yellow-400" size={16} />
                    <span className="text-zinc-700 dark:text-zinc-300 text-sm">{t.randomWinner.subsOnly}</span>
                  </div>
                  <button 
                    onClick={() => setSubsOnly(!subsOnly)} 
                    disabled={isRunning}
                    className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${subsOnly ? 'bg-yellow-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${subsOnly ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}

              {/* Timer toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {useTimer ? <Timer className="text-cyan-500" size={16} /> : <TimerOff className="text-zinc-400" size={16} />}
                  <span className="text-zinc-700 dark:text-zinc-300 text-sm">Usar tiempo</span>
                </div>
                <button 
                  onClick={() => setUseTimer(!useTimer)} 
                  disabled={isRunning}
                  className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${useTimer ? 'bg-cyan-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${useTimer ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Time limit input */}
              {useTimer && (
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-zinc-400" />
                  <input 
                    type="number" 
                    value={timeLimit} 
                    onChange={(e) => setTimeLimit(Math.max(10, parseInt(e.target.value) || 60))} 
                    min="10" 
                    max="300" 
                    disabled={isRunning} 
                    className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50" 
                  />
                  <span className="text-zinc-500 text-sm">segundos</span>
                </div>
              )}
            </div>

            {/* Subs mode info */}
            {raffleMode === 'subs' && (
              <div className="space-y-3">
                <div className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-pink-600 dark:text-pink-400 text-sm font-medium flex items-center gap-2">
                      <Heart size={14} />
                      Sorteo de Subs
                    </p>
                    <button
                      onClick={() => setShowSubsConfig(true)}
                      className="p-1.5 text-pink-500 hover:bg-pink-500/20 rounded-lg transition-colors"
                      title="Configurar valores"
                    >
                      <Settings size={16} />
                    </button>
                  </div>
                  <p className="text-pink-600/70 dark:text-pink-400/70 text-xs">
                    T1: {subsConfig.tier1Value} | T2: {subsConfig.tier2Value} | T3: {subsConfig.tier3Value} | Prime: {subsConfig.primeValue}
                    {subsConfig.giftSubEnabled && ` | Gift: ${subsConfig.giftSubValue}`}
                    {subsConfig.bitsEnabled && ` | ${subsConfig.bitsPerEntry} bits = 1`}
                  </p>
                </div>
                
                {/* Blacklist button for subs mode */}
                <button
                  onClick={() => setShowBlacklistModal(true)}
                  className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <Ban size={14} />
                  Lista de prohibidos {blacklist.size > 0 && `(${blacklist.size})`}
                </button>
              </div>
            )}

            {/* Keyword input (only in keyword mode) */}
            {raffleMode === 'keyword' && (
              <div className="space-y-2">
                <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase">{t.randomWinner.keywordLabel}</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input 
                    type="text" 
                    value={keyword} 
                    onChange={(e) => setKeyword(e.target.value.replace(/\s/g, ''))} 
                    placeholder={t.randomWinner.keywordPlaceholder} 
                    disabled={isRunning} 
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-white rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-purple-500 disabled:opacity-50" 
                  />
                </div>
              </div>
            )}

            {/* Manual participant input - not shown in subs mode */}
            {raffleMode !== 'subs' && (
            <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600">
              <div className="flex items-center justify-between">
                <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                  <UserPlus size={14} />
                  Añadir participantes
                </label>
                <div className="flex items-center gap-1">
                  <button
                    onClick={exportParticipants}
                    disabled={getAllParticipants().length === 0}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Exportar participantes"
                  >
                    <Download size={14} />
                  </button>
                  <label className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors cursor-pointer" title="Importar participantes">
                    <Upload size={14} />
                    <input
                      ref={participantsFileInputRef}
                      type="file"
                      accept=".txt,.csv"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && importParticipants(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>
              
              {/* Load from Twitch API button - dynamic based on subsOnly */}
              {authToken && (
                <div className="flex gap-2">
                  <button
                    onClick={subsOnly ? loadSubscribers : loadChatters}
                    disabled={(subsOnly ? isLoadingSubs : isLoadingChatters) || !isConnected}
                    className={`flex-1 py-2 px-3 ${subsOnly ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 dark:text-yellow-400' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-600 dark:text-cyan-400'} disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:text-zinc-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-xs`}
                  >
                    {(subsOnly ? isLoadingSubs : isLoadingChatters) ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : subsOnly ? (
                      <Star size={14} />
                    ) : (
                      <Users size={14} />
                    )}
                    {subsOnly ? 'Cargar Subs' : 'Cargar Chatters'}
                  </button>
                  <button
                    onClick={() => setShowBlacklistModal(true)}
                    className="py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                    title="Lista de prohibidos"
                  >
                    <Ban size={14} />
                    {blacklist.size > 0 && <span className="text-[10px]">({blacklist.size})</span>}
                  </button>
                </div>
              )}
              
              {/* Blacklist button when no authToken */}
              {!authToken && (
                <button
                  onClick={() => setShowBlacklistModal(true)}
                  className="w-full py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <Ban size={14} />
                  Lista de prohibidos {blacklist.size > 0 && `(${blacklist.size})`}
                </button>
              )}
              
              {apiError && (
                <p className="text-red-500 text-xs bg-red-500/10 p-2 rounded-lg">{apiError}</p>
              )}
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={manualParticipant} 
                  onChange={(e) => setManualParticipant(e.target.value.replace(/\s/g, ''))} 
                  placeholder="Nombre de usuario" 
                  onKeyDown={(e) => e.key === 'Enter' && addManualParticipant()}
                  className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500" 
                />
                <button 
                  onClick={addManualParticipant}
                  disabled={!manualParticipant.trim()}
                  className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus size={16} />
                </button>
              </div>
              {manualParticipantError && (
                <p className={`text-xs ${manualParticipantError.includes('Añadidos') ? 'text-green-500' : 'text-red-500'}`}>{manualParticipantError}</p>
              )}
            </div>
            )}

            {/* Participants list - shown for viewers and keyword modes */}
            {raffleMode !== 'subs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                  <Users size={14} />
                  Participantes ({raffleMode === 'viewers' && !useTimer ? getAllParticipants().length : participants.size})
                </label>
                {participants.size > 0 && !isRunning && (
                  <button 
                    onClick={resetRaffle}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 rounded-xl p-2">
                {(() => {
                  const displayParticipants = raffleMode === 'viewers' && !useTimer 
                    ? getAllParticipants() 
                    : (Array.from(participants) as string[]);
                  
                  if (displayParticipants.length === 0) {
                    return (
                      <p className="text-xs text-zinc-500 text-center py-4">
                        No hay participantes aún
                      </p>
                    );
                  }
                  
                  return (
                    <div className="flex flex-wrap gap-1">
                      {displayParticipants.map((name) => {
                        const isManual = isManualParticipant(name);
                        return (
                          <span 
                            key={name}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              isManual 
                                ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30' 
                                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {name}
                            <button 
                              onClick={() => removeParticipant(name)}
                              className="hover:text-red-500 transition-colors ml-0.5"
                              title="Eliminar"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
              <p className="text-zinc-500 text-[10px] text-center">
                <span className="inline-block w-2 h-2 rounded bg-purple-500/30 mr-1"></span>Manuales
                <span className="inline-block w-2 h-2 rounded bg-zinc-300 dark:bg-zinc-600 ml-2 mr-1"></span>Del chat
              </p>
            </div>
            )}

            {/* Subs participants list */}
            {raffleMode === 'subs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase flex items-center gap-2">
                  <Heart size={14} className="text-pink-500" />
                  Participaciones ({subsParticipants.length})
                </label>
                {subsParticipants.length > 0 && !isRunning && (
                  <button 
                    onClick={resetRaffle}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 rounded-xl p-2">
                {subsParticipants.length === 0 ? (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    {isRunning ? 'Esperando subs, bits, donaciones...' : 'Inicia el sorteo para capturar eventos'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {(() => {
                      // Group entries by user and show details
                      const userEntries: Record<string, { total: number; details: SubsGiveawayEntry[] }> = subsEntries.reduce((acc, entry) => {
                        if (!acc[entry.username]) {
                          acc[entry.username] = { total: 0, details: [] };
                        }
                        acc[entry.username].total += entry.entries;
                        acc[entry.username].details.push(entry);
                        return acc;
                      }, {} as Record<string, { total: number; details: SubsGiveawayEntry[] }>);
                      
                      // Sort by total entries descending
                      const sorted = Object.entries(userEntries).sort((a, b) => b[1].total - a[1].total);
                      
                      return sorted.map(([name, data]) => {
                        // Check if blacklisted
                        const blocked = isBlacklisted(name);
                        return (
                          <div 
                            key={name}
                            className={`flex items-center justify-between px-2 py-1.5 rounded ${
                              blocked 
                                ? 'bg-red-500/10 text-red-400 line-through opacity-50' 
                                : 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{name}</span>
                              {blocked && <Ban size={10} />}
                            </div>
                            <div className="flex items-center gap-1">
                              {data.details.some(d => d.type === 'sub' || d.type === 'resub') && (
                                <Star size={10} className="text-purple-400" />
                              )}
                              {data.details.some(d => d.type === 'giftsub') && (
                                <Gift size={10} className="text-pink-400" />
                              )}
                              {data.details.some(d => d.type === 'bits') && (
                                <Coins size={10} className="text-yellow-400" />
                              )}
                              <span className="text-xs bg-pink-500/20 px-2 py-0.5 rounded-full ml-1">
                                x{data.total}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
              <p className="text-zinc-500 text-[10px] text-center">
                Usuarios únicos: {new Set(subsParticipants).size} | Total entradas: {subsParticipants.length}
                {blacklist.size > 0 && ` | Bloqueados: ${blacklist.size}`}
              </p>
            </div>
            )}

            {/* Running stats - time only */}
            {isRunning && useTimer && (
              <div className="text-center p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 dark:text-zinc-400 text-xs">{t.randomWinner.time}</p>
                <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-zinc-800 dark:text-white'}`}>{timeLeft}s</p>
              </div>
            )}

            {/* Winner display */}
            {(winner || isSelecting) && (
              <div className="text-center">
                <div className={`inline-block px-8 py-4 rounded-2xl ${winner && !isSelecting ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                  {winner && !isSelecting && (
                    <div className="flex items-center gap-2 mb-1 justify-center">
                      <Crown className="text-white" size={20} />
                      <span className="text-white/80 text-sm">{t.randomWinner.winner}</span>
                      <Crown className="text-white" size={20} />
                    </div>
                  )}
                  <span className={`font-bold text-2xl ${winner && !isSelecting ? 'text-white' : 'text-purple-500'}`}>{displayName || '...'}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {/* Main action button - hidden for subs/keyword without timer (use create thread instead) */}
              {!isRunning && !winner && !(raffleMode === 'subs' && !useTimer) && !(raffleMode === 'keyword' && !useTimer) && (
                <button 
                  onClick={startRaffle} 
                  disabled={(raffleMode === 'keyword' && !keyword.trim()) || (raffleMode === 'viewers' && !useTimer && getAllParticipants().length === 0) || isSelecting} 
                  className={`w-full flex items-center justify-center gap-2 py-3 ${raffleMode === 'subs' ? 'bg-pink-500 hover:bg-pink-600' : 'bg-purple-500 hover:bg-purple-600'} disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all`}
                >
                  {raffleMode === 'subs' ? (
                    <>
                      <Heart size={20} />
                      Iniciar Sorteo de Subs
                    </>
                  ) : useTimer ? (
                    <>
                      <Play size={20} />
                      Iniciar Recolección
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      {t.randomWinner.selectWinner} ({getAllParticipants().length})
                    </>
                  )}
                </button>
              )}
              
              {/* Viewers mode without timer - direct select */}
              {!isRunning && !winner && raffleMode === 'viewers' && !useTimer && (
                <button 
                  onClick={startRaffle} 
                  disabled={getAllParticipants().length === 0 || isSelecting} 
                  className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                >
                  <Sparkles size={20} />
                  {t.randomWinner.selectWinner} ({getAllParticipants().length})
                </button>
              )}

              {/* Running - finish button */}
              {isRunning && (
                <button 
                  onClick={finishAndSelectWinner} 
                  disabled={raffleMode === 'subs' ? subsParticipants.length === 0 : participants.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold rounded-xl transition-all animate-pulse"
                >
                  <Trophy size={20} /> {t.randomWinner.finishAndChoose} ({raffleMode === 'subs' ? subsParticipants.length : participants.size})
                </button>
              )}

              {/* Winner - new raffle button */}
              {winner && !isSelecting && (
                <button 
                  onClick={resetRaffle} 
                  className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-white font-bold rounded-xl transition-all"
                >
                  <RotateCcw size={20} /> {t.randomWinner.newRaffle}
                </button>
              )}

              {/* Create thread button (keyword or subs mode without timer) */}
              {(raffleMode === 'keyword' || raffleMode === 'subs') && !useTimer && !isRunning && !winner && (
                <button 
                  onClick={raffleMode === 'subs' ? createSubsThread : createThreadFromRaffle} 
                  disabled={raffleMode === 'keyword' && !keyword.trim()}
                  className={`w-full flex items-center justify-center gap-2 py-3 ${
                    raffleMode === 'subs' 
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400'
                  } disabled:from-zinc-400 disabled:to-zinc-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all`}
                >
                  <Plus size={20} /> Crear Hilo (sin límite de tiempo)
                </button>
              )}
            </div>

            {/* Clear all button */}
            <button 
              onClick={() => { 
                clearAllParticipants();
                softResetRaffle();
                setRaffleTitle('');
                setKeyword(''); 
                setTimeLimit(60); 
                setSubsOnly(false);
                setUseTimer(true);
                onClearChatMessages?.();
              }} 
              className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm border border-red-500/20"
            >
              <Trash2 size={16} /> {t.randomWinner.clearAll}
            </button>

            <p className="text-center text-zinc-500 text-xs">
              {raffleMode === 'viewers' 
                ? (useTimer ? 'Los viewers que escriban durante el tiempo participarán' : t.randomWinner.viewersHint)
                : raffleMode === 'subs'
                ? 'Cada sub/resub/gift sub durante el sorteo = 1 participación'
                : t.randomWinner.keywordHint
              }
            </p>
          </div>
        ) : (
          // ============================================
          // ACTIVE THREADS TAB
          // ============================================
          <div className="p-4 space-y-3">
            {threads.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <Gift size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay sorteos activos</p>
                <p className="text-xs mt-1">Crea uno desde "Sorteo" → Palabra clave → Sin tiempo</p>
              </div>
            )}

            {threads.map((thread, index) => (
              <div 
                key={thread.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  thread.isActive 
                    ? thread.mode === 'subs' 
                      ? 'border-pink-500/30 bg-pink-500/5'
                      : 'border-green-500/30 bg-green-500/5' 
                    : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'
                }`}
              >
                {/* Thread Header */}
                <div 
                  className="p-3 cursor-pointer"
                  onClick={() => setExpandedThreadId(expandedThreadId === thread.id ? null : thread.id)}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: thread.mode === 'subs' ? '#ec4899' : THREAD_COLORS[index % THREAD_COLORS.length] }}
                    >
                      <span className="relative">
                        {thread.mode === 'subs' ? <Heart size={18} /> : <Gift size={18} />}
                        {thread.isActive && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-800 dark:text-white truncate">{thread.name}</span>
                        {thread.mode === 'subs' ? (
                          <span className="px-1.5 py-0.5 bg-pink-500/20 text-pink-600 dark:text-pink-400 text-[10px] font-bold rounded">SUBS</span>
                        ) : thread.subscribersOnly && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded">SUB</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {thread.mode === 'keyword' && (
                          <>
                            <span className="flex items-center gap-1">
                              <Hash size={10} />
                              {thread.keyword}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {getUniqueParticipantCount(thread)}
                          {thread.mode === 'subs' && ` (${getTotalEntries(thread)} entradas)`}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(thread.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {thread.isActive ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleThread(thread.id); }}
                          className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                          title="Pausar"
                        >
                          <Pause size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleThread(thread.id); }}
                          className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Reanudar"
                        >
                          <Play size={16} />
                        </button>
                      )}
                      {expandedThreadId === thread.id ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedThreadId === thread.id && (
                  <div className="px-3 pb-3 border-t border-zinc-200 dark:border-zinc-700 pt-3 space-y-3">
                    {/* Subs config summary for subs threads */}
                    {thread.mode === 'subs' && thread.subsConfig && (
                      <div className="p-2 bg-pink-500/10 rounded-lg text-xs text-pink-600 dark:text-pink-400">
                        <p className="font-medium mb-1">Configuración:</p>
                        <p>
                          T1: {thread.subsConfig.tier1Value} | T2: {thread.subsConfig.tier2Value} | T3: {thread.subsConfig.tier3Value} | Prime: {thread.subsConfig.primeValue}
                          {thread.subsConfig.giftSubEnabled && ` | Gift: ${thread.subsConfig.giftSubValue}`}
                          {thread.subsConfig.bitsEnabled && ` | ${thread.subsConfig.bitsPerEntry} bits = 1`}
                        </p>
                      </div>
                    )}
                    
                    {/* Manual participant input for thread - only for keyword mode */}
                    {thread.mode === 'keyword' && (
                    <div className="space-y-2 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600">
                      <label className="text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase flex items-center gap-1">
                        <UserPlus size={12} />
                        Añadir manual
                      </label>
                      <div className="flex gap-1">
                        <input 
                          type="text" 
                          value={threadManualParticipant[thread.id] || ''} 
                          onChange={(e) => setThreadManualParticipant(prev => ({ ...prev, [thread.id]: e.target.value.replace(/\s/g, '') }))} 
                          placeholder="Usuario" 
                          onKeyDown={(e) => e.key === 'Enter' && addManualParticipantToThread(thread.id)}
                          className="flex-1 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-800 dark:text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500" 
                        />
                        <button 
                          onClick={() => addManualParticipantToThread(thread.id)}
                          disabled={!(threadManualParticipant[thread.id] || '').trim()}
                          className="px-2 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {threadManualError[thread.id] && (
                        <p className="text-red-500 text-[10px]">{threadManualError[thread.id]}</p>
                      )}
                    </div>
                    )}

                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase mb-2">
                        {thread.mode === 'subs' 
                          ? `Participantes (${getUniqueParticipantCount(thread)} usuarios, ${getTotalEntries(thread)} entradas)`
                          : `Participantes (${getUniqueParticipantCount(thread)})`
                        }
                      </p>
                      <div className="max-h-32 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
                        {thread.participants.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-2">
                            {thread.mode === 'subs' ? 'Esperando subs, bits, donaciones...' : 'Esperando participantes...'}
                          </p>
                        ) : thread.mode === 'subs' ? (
                          // Subs mode - show weighted entries
                          <div className="space-y-1">
                            {(() => {
                              const counts: Record<string, number> = thread.participants.reduce((acc, p) => {
                                acc[p.username] = (acc[p.username] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>);
                              
                              const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
                              
                              return sorted.slice(0, 50).map(([name, count]) => {
                                const blocked = isBlacklisted(name);
                                return (
                                  <div 
                                    key={name}
                                    className={`flex items-center justify-between px-2 py-1 rounded ${
                                      blocked 
                                        ? 'bg-red-500/10 text-red-400 line-through opacity-50' 
                                        : 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                                    }`}
                                  >
                                    <span className="text-xs font-medium flex items-center gap-1">
                                      {name}
                                      {blocked && <Ban size={10} />}
                                    </span>
                                    <span className="text-xs bg-pink-500/20 px-2 py-0.5 rounded-full">
                                      x{count}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          // Keyword mode - show unique participants
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const participantMap = new Map<string, GiveawayParticipant>();
                              thread.participants.forEach(p => participantMap.set(p.oderId, p));
                              return Array.from(participantMap.values()).slice(-50).map((p, i) => {
                                const blocked = isBlacklisted(p.username);
                                return (
                                  <span 
                                    key={`${p.oderId}-${i}`}
                                    className={`px-2 py-0.5 rounded text-xs ${
                                      blocked 
                                        ? 'bg-red-500/10 text-red-400 line-through opacity-50' 
                                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                                    }`}
                                  >
                                    {p.username}
                                    {blocked && <Ban size={8} className="inline ml-1" />}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => pickThreadWinner(thread.id)}
                        disabled={thread.participants.length === 0}
                        className={`flex-1 py-2 ${
                          thread.mode === 'subs'
                            ? 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400'
                            : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400'
                        } disabled:from-zinc-400 disabled:to-zinc-500 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm transition-all`}
                      >
                        <Sparkles size={16} />
                        Sortear Ganador
                      </button>
                      <button
                        onClick={() => deleteThread(thread.id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blacklist Modal */}
      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Shield className="text-red-500" size={24} />
                </div>
                <h3 className="font-bold text-lg text-zinc-800 dark:text-white">Lista de Prohibidos</h3>
              </div>
              <button
                onClick={() => setShowBlacklistModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
              Los usuarios en esta lista nunca podrán ganar sorteos (bots, cuentas no deseadas, etc.)
            </p>
            
            {/* Add user input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={blacklistInput}
                onChange={(e) => setBlacklistInput(e.target.value.replace(/\s/g, ''))}
                placeholder="Nombre de usuario"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && blacklistInput.trim()) {
                    addToBlacklist(blacklistInput);
                    setBlacklistInput('');
                  }
                }}
                className="flex-1 bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => {
                  if (blacklistInput.trim()) {
                    addToBlacklist(blacklistInput);
                    setBlacklistInput('');
                  }
                }}
                disabled={!blacklistInput.trim()}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
              >
                <Plus size={18} />
              </button>
            </div>
            
            {/* Import/Export buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={exportBlacklist}
                disabled={blacklist.size === 0}
                className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} />
                Exportar
              </button>
              <label className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer">
                <Upload size={16} />
                Importar
                <input
                  ref={blacklistFileInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importBlacklist(e.target.files[0])}
                />
              </label>
            </div>
            
            {/* Blacklist users */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase mb-2">
                Usuarios bloqueados ({blacklist.size})
              </p>
              {blacklist.size === 0 ? (
                <div className="text-center py-8 text-zinc-400">
                  <Ban size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay usuarios en la lista</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-2">
                  {Array.from(blacklist as Set<string>).sort().map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                    >
                      {name}
                      <button
                        onClick={() => removeFromBlacklist(name)}
                        className="hover:text-red-700 dark:hover:text-red-300 transition-colors ml-0.5"
                        title="Quitar de la lista"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setShowBlacklistModal(false)}
              className="mt-4 w-full py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Subs Config Modal */}
      {showSubsConfig && (
        <SubsConfigPanel
          config={subsConfig}
          onChange={setSubsConfig}
          onClose={() => setShowSubsConfig(false)}
        />
      )}
    </div>
  );
};

export default GiveawayHub;
