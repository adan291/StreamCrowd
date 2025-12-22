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
  ExternalLink,
  List,
  Timer,
  TimerOff,
  Download,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { GiveawayThread, GiveawayParticipant, TwitchMessage, CollaborationChannel } from '../types';
import { useI18n } from '../i18n';

interface GiveawayHubProps {
  chatMessages: TwitchMessage[];
  isConnected: boolean;
  onClearChatMessages?: () => void;
  userVoteMap?: Map<string, number>;
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
}

type TabType = 'raffle' | 'active';
type RaffleMode = 'viewers' | 'keyword';

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
  mode: 'viewers' | 'keyword';
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

export const GiveawayHub: React.FC<GiveawayHubProps> = ({
  chatMessages,
  isConnected,
  onClearChatMessages,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('raffle');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ============================================
  // RAFFLE STATE
  // ============================================
  const [raffleMode, setRaffleMode] = useState<RaffleMode>('viewers');
  const [subsOnly, setSubsOnly] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [useTimer, setUseTimer] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
  const [winner, setWinner] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const startTimeRef = useRef<number>(0);
  const participantsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<BroadcastChannel | null>(null);

  // ============================================
  // THREADS STATE
  // ============================================
  const [threads, setThreads] = useState<GiveawayThread[]>(() => {
    const saved = localStorage.getItem('giveaway_threads');
    if (saved) {
      try { 
        const all = JSON.parse(saved);
        return all.filter((t: GiveawayThread) => !t.winner);
      } catch { return []; }
    }
    return [];
  });
  
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const processedMessagesRef = useRef<Set<string>>(new Set());

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
    if (channelRef.current) {
      channelRef.current.postMessage({
        winner,
        isSelecting,
        displayName,
        participantCount: raffleMode === 'viewers' ? getViewers().length : participants.size,
        ...state
      });
    }
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

  // Save threads to localStorage
  useEffect(() => {
    localStorage.setItem('giveaway_threads', JSON.stringify(threads));
  }, [threads]);

  // Process chat messages for active threads
  useEffect(() => {
    if (!isConnected) return;
    
    const activeThreads = threads.filter(t => t.isActive);
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


  // ============================================
  // RAFFLE ACTIONS
  // ============================================
  const startRaffle = () => {
    setWinner(null);
    setIsSelecting(false);
    syncToOverlay({ winner: null, isSelecting: false, displayName: '' });

    if (!useTimer && raffleMode === 'viewers') {
      const viewers = getViewers();
      if (viewers.length === 0) return;
      animateSelection(viewers);
    } else {
      participantsRef.current = new Set();
      setParticipants(new Set());
      startTimeRef.current = Date.now();
      if (useTimer) setTimeLeft(timeLimit);
      setIsRunning(true);
    }
  };

  const finishAndSelectWinner = () => {
    setIsRunning(false);
    const participantList: string[] = Array.from(participantsRef.current);
    if (participantList.length === 0) return;
    animateSelection(participantList);
  };

  const animateSelection = (candidates: string[]) => {
    setIsSelecting(true);
    syncToOverlay({ isSelecting: true, winner: null });
    let iterations = 0;
    const maxIterations = 20;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      setDisplayName(candidates[randomIndex]);
      syncToOverlay({ displayName: candidates[randomIndex], isSelecting: true });
      iterations++;

      if (iterations >= maxIterations) {
        clearInterval(interval);
        const winnerIndex = Math.floor(Math.random() * candidates.length);
        const winnerName = candidates[winnerIndex];
        setWinner(winnerName);
        setDisplayName(winnerName);
        setIsSelecting(false);
        syncToOverlay({ winner: winnerName, displayName: winnerName, isSelecting: false });
        saveToHistory(winnerName, candidates.length);
      }
    }, 100);
  };

  const saveToHistory = (winnerName: string, participantCount: number) => {
    const finished: FinishedGiveaway = {
      id: generateId(),
      name: raffleMode === 'keyword' ? `Sorteo: ${keyword}` : 'Sorteo de viewers',
      keyword: raffleMode === 'keyword' ? keyword : '',
      mode: raffleMode,
      winner: winnerName,
      participantCount,
      subscribersOnly: subsOnly,
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
    setParticipants(new Set());
    participantsRef.current = new Set();
    setDisplayName('');
    setIsSelecting(false);
    syncToOverlay({ winner: null, isSelecting: false, displayName: '' });
  };

  const openOverlayWindow = () => {
    const width = 450;
    const height = 350;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayRandomWinner=true`, 'RandomWinnerOverlay', `width=${width},height=${height},left=${left},top=${top}`);
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
    };

    setThreads(prev => [...prev, newThread]);
    setActiveTab('active');
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

    const participantMap = new Map<string, GiveawayParticipant>();
    thread.participants.forEach(p => participantMap.set(p.oderId, p));
    const uniqueParticipants = Array.from(participantMap.values());

    const winnerIndex = Math.floor(Math.random() * uniqueParticipants.length);
    const threadWinner = uniqueParticipants[winnerIndex];

    // Guardar en historial
    const finished: FinishedGiveaway = {
      id: thread.id,
      name: thread.name,
      keyword: thread.keyword,
      mode: 'keyword',
      winner: threadWinner.username,
      participantCount: uniqueParticipants.length,
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
    setWinner(threadWinner.username);
    setDisplayName(threadWinner.username);
    syncToOverlay({ winner: threadWinner.username, displayName: threadWinner.username, isSelecting: false });
  };

  const getUniqueParticipantCount = (thread: GiveawayThread) => {
    return new Set(thread.participants.map(p => p.oderId)).size;
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
            {/* Overlay button */}
            <button 
              onClick={openOverlayWindow} 
              className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-500/80 hover:to-orange-500/80 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={16} /> {t.randomWinner.openOverlay}
            </button>

            {/* Mode selector */}
            <div className="flex gap-2">
              <button 
                onClick={() => { setRaffleMode('viewers'); resetRaffle(); }} 
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${raffleMode === 'viewers' ? 'bg-purple-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                <Users size={18} /> {t.randomWinner.viewers}
              </button>
              <button 
                onClick={() => { setRaffleMode('keyword'); resetRaffle(); }} 
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${raffleMode === 'keyword' ? 'bg-purple-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                <MessageSquare size={18} /> {t.randomWinner.keyword}
              </button>
            </div>

            {/* Common options */}
            <div className="space-y-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              {/* Subs only toggle */}
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

            {/* Participant count (viewers mode without timer) */}
            {raffleMode === 'viewers' && !useTimer && !isRunning && (
              <div className="text-center p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{t.randomWinner.availableParticipants}</p>
                <p className="text-3xl font-bold text-zinc-800 dark:text-white mt-1">{viewerCount}</p>
                <p className="text-xs text-zinc-500 mt-1">{subsOnly ? t.randomWinner.subsInChat : t.randomWinner.usersInChat}</p>
              </div>
            )}

            {/* Running stats */}
            {(isRunning || participants.size > 0) && (
              <div className={`grid gap-3 ${useTimer ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {useTimer && (
                  <div className="text-center p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs">{t.randomWinner.time}</p>
                    <p className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400' : 'text-zinc-800 dark:text-white'}`}>{timeLeft}s</p>
                  </div>
                )}
                <div className="text-center p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl">
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs">{t.randomWinner.participants}</p>
                  <p className="text-2xl font-bold text-green-500">{participants.size}</p>
                </div>
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
              {/* Main action button */}
              {!isRunning && !winner && (
                <button 
                  onClick={startRaffle} 
                  disabled={(raffleMode === 'keyword' && !keyword.trim()) || (raffleMode === 'viewers' && !useTimer && viewerCount === 0) || isSelecting} 
                  className="w-full flex items-center justify-center gap-2 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                >
                  {useTimer ? <Play size={20} /> : <Sparkles size={20} />}
                  {useTimer ? 'Iniciar Recolección' : t.randomWinner.selectWinner}
                </button>
              )}

              {/* Running - finish button */}
              {isRunning && (
                <button 
                  onClick={finishAndSelectWinner} 
                  disabled={participants.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-bold rounded-xl transition-all animate-pulse"
                >
                  <Trophy size={20} /> {t.randomWinner.finishAndChoose} ({participants.size})
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

              {/* Create thread button (only keyword mode without timer) */}
              {raffleMode === 'keyword' && !useTimer && !isRunning && !winner && (
                <button 
                  onClick={createThreadFromRaffle} 
                  disabled={!keyword.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:from-zinc-400 disabled:to-zinc-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
                >
                  <Plus size={20} /> Crear Hilo (sin límite de tiempo)
                </button>
              )}
            </div>

            {/* Clear all button */}
            <button 
              onClick={() => { 
                resetRaffle(); 
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
                    ? 'border-green-500/30 bg-green-500/5' 
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
                      style={{ backgroundColor: THREAD_COLORS[index % THREAD_COLORS.length] }}
                    >
                      <span className="relative">
                        <Gift size={18} />
                        {thread.isActive && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-800 dark:text-white truncate">{thread.name}</span>
                        {thread.subscribersOnly && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded">SUB</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Hash size={10} />
                          {thread.keyword}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Users size={10} />
                          {getUniqueParticipantCount(thread)}
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
                    <div>
                      <p className="text-xs text-zinc-500 font-bold uppercase mb-2">
                        Participantes ({getUniqueParticipantCount(thread)})
                      </p>
                      <div className="max-h-32 overflow-y-auto bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2">
                        {thread.participants.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-2">
                            Esperando participantes...
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const participantMap = new Map<string, GiveawayParticipant>();
                              thread.participants.forEach(p => participantMap.set(p.oderId, p));
                              return Array.from(participantMap.values()).slice(-50).map((p, i) => (
                                <span 
                                  key={`${p.oderId}-${i}`}
                                  className="px-2 py-0.5 rounded text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                >
                                  {p.username}
                                </span>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => pickThreadWinner(thread.id)}
                        disabled={thread.participants.length === 0}
                        className="flex-1 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-zinc-400 disabled:to-zinc-500 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 text-sm transition-all"
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
    </div>
  );
};

export default GiveawayHub;
