import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PollOption, TwitchMessage, CollaborationChannel } from '../types';
import { RotateCcw, Play, X, Users, Timer, Pause, BarChart3, Equal, Settings, UserPlus, Trash2, Download, Upload, GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { ToolWithChat } from './ToolWithChat';
import { OBSOverlayUrl } from './OBSOverlayUrl';
import { gameSync } from '../src/infrastructure/sync/FirebaseSync';
import { useOverlayMode, OVERLAY_BG_COLORS } from '../hooks/useOverlayMode';
import { useActivitySound } from '../hooks/useActivitySound';
import { SoundSettingsPopover } from './ui/SoundSettingsPopover';
import { ChatSettingsPopover } from './ui/ChatSettingsPopover';
import { useActivityConfig } from '../hooks/useActivityConfig';
import { getDefaultChatSettings, type ChatSettingsConfig } from './ui/ChatSettingsPanel';

type WheelMode = 'classic' | 'voting';

const STORAGE_KEY_SPINNER = 'spinner_overlay_state';
const SPINNER_CHANNEL = 'spinner_sync';
const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];

// Helper to compare spinner states and avoid unnecessary re-renders (prevents OBS flickering)
const areSpinnerStatesEqual = (prev: SpinnerState | null, next: SpinnerState): boolean => {
  if (!prev) return false;
  if (prev.rotation !== next.rotation) return false;
  if (prev.isSpinning !== next.isSpinning) return false;
  if (prev.showWinner !== next.showWinner) return false;
  if (prev.winner?.id !== next.winner?.id) return false;
  if (prev.options.length !== next.options.length) return false;
  for (let i = 0; i < prev.options.length; i++) {
    if (prev.options[i].id !== next.options[i].id || prev.options[i].label !== next.options[i].label) {
      return false;
    }
  }
  return true;
};

interface SpinnerWheelProps {
  options: PollOption[];
  onClose: () => void;
  chatMessages?: TwitchMessage[];
  votePrefix?: string;
  isOverlayMode?: boolean;
  isFloatingWidget?: boolean; // Widget flotante que no bloquea la pantalla
  userVoteMap?: Map<string, number>;
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  onAddCollaborator?: (channel: string) => void;
  onRemoveCollaborator?: (channel: string) => void;
  isConnected?: boolean;
}

interface SpinnerState {
  rotation: number;
  isSpinning: boolean;
  winner: PollOption | null;
  showWinner: boolean;
  options: PollOption[];
}

interface VoteState {
  [optionId: number]: {
    votes: number;
    voters: Set<string>;
  };
}

export const SpinnerWheel: React.FC<SpinnerWheelProps> = ({ 
  options, 
  onClose, 
  chatMessages = [],
  votePrefix = '+',
  isOverlayMode = false,
  isFloatingWidget = false,
  userVoteMap = new Map(),
  collaborationChannels = [],
  mainChannel,
  onAddCollaborator,
  onRemoveCollaborator,
  isConnected = true,
}) => {
  const { t } = useI18n();
  useOverlayMode(isOverlayMode); // Clean up body background for OBS
  
  // Sound effects
  const sound = useActivitySound({ storageKey: 'spinner_sound_config' });
  
  // Chat settings - version 2 forces update to !tv commands
  const chatConfig = useActivityConfig<ChatSettingsConfig>({
    storageKey: 'spinner_chat_config',
    defaultConfig: getDefaultChatSettings('game'),
    version: 2,
  });
  
  // Widget flotante - Estado para drag, minimize y resize
  const [isMinimized, setIsMinimized] = useState(false);
  const [widgetPosition, setWidgetPosition] = useState(() => {
    const saved = localStorage.getItem('spinner_widget_position');
    return saved ? JSON.parse(saved) : { x: 20, y: 80 };
  });
  const [widgetSize, setWidgetSize] = useState(() => {
    const saved = localStorage.getItem('spinner_widget_size');
    return saved ? JSON.parse(saved) : { width: 320, height: 480 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  
  const [overlayBgColor, setOverlayBgColor] = useState('transparent');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlayWheelSize, setOverlayWheelSize] = useState<'normal' | 'large'>('large');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const [mode, setMode] = useState<WheelMode>('classic');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<PollOption | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  // En overlay mode, empezar vacío y esperar sync de Firebase
  const [currentOptions, setCurrentOptions] = useState<PollOption[]>(isOverlayMode ? [] : options);
  const [isOverlayReady, setIsOverlayReady] = useState(!isOverlayMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  
  // Voting mode state
  const [isVotingActive, setIsVotingActive] = useState(false);
  const [votingTimeLeft, setVotingTimeLeft] = useState(30);
  const [votingDuration, setVotingDuration] = useState(30);
  const [voteState, setVoteState] = useState<VoteState>(() => {
    const initial: VoteState = {};
    options.forEach(opt => {
      initial[opt.id] = { votes: 0, voters: new Set() };
    });
    return initial;
  });
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const lastProcessedIndexRef = useRef(0);

  // Manual participants state
  const [manualParticipants, setManualParticipants] = useState<string[]>([]);
  const [manualParticipantInput, setManualParticipantInput] = useState('');
  const [manualParticipantError, setManualParticipantError] = useState<string | null>(null);
  const manualParticipantsFileRef = useRef<HTMLInputElement>(null);

  // Refs para mantener valores actuales en el handler
  const stateRef = useRef({ rotation, isSpinning, winner, showWinner, options: currentOptions });
  useEffect(() => {
    stateRef.current = { rotation, isSpinning, winner, showWinner, options: currentOptions };
  }, [rotation, isSpinning, winner, showWinner, currentOptions]);

  // Setup BroadcastChannel for sync
  useEffect(() => {
    channelRef.current = new BroadcastChannel(SPINNER_CHANNEL);
    
    // Track last state to prevent duplicate updates (prevents OBS flickering)
    let lastState: SpinnerState | null = null;
    let lastUpdateTime = 0;
    const THROTTLE_MS = 100;
    
    const throttledSetState = (state: SpinnerState) => {
      const now = Date.now();
      // Throttle updates
      if (now - lastUpdateTime < THROTTLE_MS) return;
      // Skip if state hasn't changed
      if (areSpinnerStatesEqual(lastState, state)) return;
      
      lastUpdateTime = now;
      lastState = state;
      
      setRotation(state.rotation);
      setIsSpinning(state.isSpinning);
      setWinner(state.winner);
      setShowWinner(state.showWinner);
      if (state.options && state.options.length > 0) {
        setCurrentOptions(state.options);
        setIsOverlayReady(true);
      }
    };
    
    if (isOverlayMode) {
      console.log('[SpinnerOverlay] Initializing overlay mode...');
      
      // Overlay listens for state updates via BroadcastChannel
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') return;
        const state: SpinnerState = event.data;
        console.log('[SpinnerOverlay] BroadcastChannel update:', state);
        throttledSetState(state);
      };
      
      // Subscribe to Firebase for real-time sync (works across browsers/OBS)
      const unsubscribeFirebase = gameSync.subscribe((data) => {
        console.log('[SpinnerOverlay] Firebase update:', data);
        if (data && data.type === 'spinner' && data.state) {
          const state = data.state as SpinnerState;
          throttledSetState(state);
        }
      });
      
      // Also poll localStorage for legacy support (only once on mount)
      try {
        const stored = localStorage.getItem(STORAGE_KEY_SPINNER);
        if (stored) {
          const state: SpinnerState = JSON.parse(stored);
          console.log('[SpinnerOverlay] localStorage state:', state);
          throttledSetState(state);
        }
      } catch { /* ignore */ }
      
      // Request initial state via BroadcastChannel
      setTimeout(() => {
        channelRef.current?.postMessage({ type: 'request_sync' });
      }, 100);
      
      return () => {
        channelRef.current?.close();
        unsubscribeFirebase();
      };
    } else {
      // Main window listens for sync requests and sends current state
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') {
          const current = stateRef.current;
          const stateToSend = {
            rotation: current.rotation,
            isSpinning: current.isSpinning,
            winner: current.winner,
            showWinner: current.showWinner,
            options: current.options.length > 0 ? current.options : options
          };
          channelRef.current?.postMessage(stateToSend);
          // Also save to localStorage for OBS
          try {
            localStorage.setItem(STORAGE_KEY_SPINNER, JSON.stringify(stateToSend));
          } catch { /* ignore */ }
        }
      };
      
      return () => {
        channelRef.current?.close();
      };
    }
  }, [isOverlayMode, options]);

  // Sync state to overlay (only from main window)
  const syncToOverlay = useCallback((state: Partial<SpinnerState>) => {
    if (!isOverlayMode) {
      const fullState = {
        rotation,
        isSpinning,
        winner,
        showWinner,
        options: state.options || currentOptions,
        ...state
      };
      console.log('[SpinnerMain] Syncing to overlay:', fullState);
      // Sync via BroadcastChannel (same browser)
      channelRef.current?.postMessage(fullState);
      // Also save to localStorage for OBS Browser Source
      try {
        localStorage.setItem(STORAGE_KEY_SPINNER, JSON.stringify(fullState));
      } catch { /* ignore */ }
      // Sync to Firebase for cross-browser/OBS support
      gameSync.update('spinner', fullState).catch(err => console.error('Firebase spinner sync error:', err));
    }
  }, [isOverlayMode, rotation, isSpinning, winner, showWinner, currentOptions]);

  // Update options when prop changes and sync to overlay
  // Use a ref to track previous options to avoid unnecessary syncs
  const prevOptionsRef = useRef<string>('');
  
  useEffect(() => {
    if (!isOverlayMode && options.length > 0) {
      // Only sync if options actually changed (compare by content, not reference)
      const optionsKey = JSON.stringify(options.map(o => ({ id: o.id, label: o.label, votes: o.votes, color: o.color })));
      if (optionsKey === prevOptionsRef.current) {
        return; // Options haven't actually changed
      }
      prevOptionsRef.current = optionsKey;
      
      setCurrentOptions(options);
      // Sync with the new options directly
      const fullState = {
        rotation,
        isSpinning,
        winner,
        showWinner,
        options: options,
      };
      channelRef.current?.postMessage(fullState);
      try {
        localStorage.setItem(STORAGE_KEY_SPINNER, JSON.stringify(fullState));
      } catch { /* ignore */ }
      gameSync.update('spinner', fullState).catch(err => console.error('Firebase spinner sync error:', err));
    }
  }, [options, isOverlayMode, rotation, isSpinning, winner, showWinner]);


  // Calculate total votes helper
  const getTotalVotes = useCallback(() => {
    return currentOptions.reduce((sum, opt) => sum + (voteState[opt.id]?.votes || 0), 0);
  }, [currentOptions, voteState]);

  // Calculate segment angles based on mode
  const getSegmentAngles = useCallback(() => {
    if (mode === 'classic') {
      const angle = 360 / currentOptions.length;
      return currentOptions.map(() => angle);
    } else {
      const totalVotes = getTotalVotes();
      if (totalVotes === 0) {
        const angle = 360 / currentOptions.length;
        return currentOptions.map(() => angle);
      }
      const minAngle = 18;
      const availableAngle = 360 - (minAngle * currentOptions.length);
      return currentOptions.map(opt => {
        const votes = voteState[opt.id]?.votes || 0;
        const proportion = votes / totalVotes;
        return minAngle + (availableAngle * proportion);
      });
    }
  }, [mode, currentOptions, voteState, getTotalVotes]);

  const segmentAngles = getSegmentAngles();

  // Process chat messages for votes
  useEffect(() => {
    if (!isVotingActive || mode !== 'voting' || isOverlayMode) return;
    const newMessages = chatMessages.slice(lastProcessedIndexRef.current);
    if (newMessages.length === 0) return;
    lastProcessedIndexRef.current = chatMessages.length;
    
    setVoteState(prev => {
      const newState = { ...prev };
      let hasChanges = false;
      newMessages.forEach(msg => {
        const msgId = msg.id || `${msg.userId}-${msg.message}-${Date.now()}`;
        if (processedMessageIds.has(msgId)) return;
        const msgLower = msg.message.toLowerCase().trim();
        currentOptions.forEach((opt, index) => {
          const voteNumber = index + 1;
          const votePatterns = [`${votePrefix}${voteNumber}`, `${votePrefix}${opt.label.toLowerCase()}`];
          if (opt.voteKey) votePatterns.push(`${votePrefix}${opt.voteKey.toLowerCase()}`);
          const isVote = votePatterns.some(pattern => msgLower === pattern || msgLower.startsWith(pattern + ' '));
          if (isVote) {
            const oderId = msg.userId || msg.username;
            if (!newState[opt.id].voters.has(oderId)) {
              newState[opt.id] = { votes: newState[opt.id].votes + 1, voters: new Set([...newState[opt.id].voters, oderId]) };
              hasChanges = true;
            }
          }
        });
        setProcessedMessageIds(prev => new Set([...prev, msgId]));
      });
      return hasChanges ? newState : prev;
    });
  }, [chatMessages, isVotingActive, mode, currentOptions, votePrefix, processedMessageIds, isOverlayMode]);

  // Voting timer
  useEffect(() => {
    if (!isVotingActive || votingTimeLeft <= 0 || isOverlayMode) return;
    const timer = setInterval(() => {
      setVotingTimeLeft(prev => {
        if (prev <= 1) { setIsVotingActive(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isVotingActive, votingTimeLeft, isOverlayMode]);

  // Widget flotante - Guardar posición y tamaño
  useEffect(() => {
    if (isFloatingWidget && !isOverlayMode) {
      localStorage.setItem('spinner_widget_position', JSON.stringify(widgetPosition));
    }
  }, [widgetPosition, isFloatingWidget, isOverlayMode]);

  useEffect(() => {
    if (isFloatingWidget && !isOverlayMode) {
      localStorage.setItem('spinner_widget_size', JSON.stringify(widgetSize));
    }
  }, [widgetSize, isFloatingWidget, isOverlayMode]);

  // Widget flotante - Drag handlers
  useEffect(() => {
    if (!isFloatingWidget || isOverlayMode) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y));
        setWidgetPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        e.preventDefault();
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        const newWidth = Math.max(280, Math.min(500, resizeStart.current.width + deltaX));
        const newHeight = Math.max(350, Math.min(650, resizeStart.current.height + deltaY));
        setWidgetSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isDragging || isResizing) {
      if (isResizing) {
        document.body.style.cursor = 'se-resize';
        document.body.style.userSelect = 'none';
      }
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isResizing, isFloatingWidget, isOverlayMode]);

  const handleWidgetMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, width: widgetSize.width, height: widgetSize.height };
  };

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || currentOptions.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const currentTotalVotes = getTotalVotes();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let currentAngle = -90;
    
    currentOptions.forEach((option, index) => {
      const segmentAngle = segmentAngles[index];
      const startAngle = currentAngle * (Math.PI / 180);
      const endAngle = (currentAngle + segmentAngle) * (Math.PI / 180);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = option.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + (segmentAngle * Math.PI / 360));
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      // En modo voting, mostrar porcentaje junto al label
      const votes = voteState[option.id]?.votes || 0;
      const pct = currentTotalVotes > 0 ? Math.round((votes / currentTotalVotes) * 100) : 0;
      const label = option.label.length > 10 ? option.label.slice(0, 10) + '..' : option.label;
      const displayText = mode === 'voting' && currentTotalVotes > 0 ? `${label} ${pct}%` : label;
      
      ctx.fillText(displayText, radius - 15, 5);
      ctx.restore();
      currentAngle += segmentAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#a970ff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [currentOptions, segmentAngles, mode, voteState, getTotalVotes]);

  const spin = () => {
    if (isSpinning || currentOptions.length === 0) return;
    if (mode === 'voting' && isVotingActive) return;

    setIsSpinning(true);
    setShowWinner(false);
    setWinner(null);
    sound.play('start');

    const spins = 5 + Math.random() * 5;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + randomAngle;

    setRotation(totalRotation);
    syncToOverlay({ rotation: totalRotation, isSpinning: true, showWinner: false, winner: null });

    setTimeout(() => {
      const finalRotation = totalRotation % 360;
      const pointerAngle = (360 - finalRotation + 360) % 360;
      let accumulatedAngle = 0;
      let winnerIndex = 0;
      for (let i = 0; i < currentOptions.length; i++) {
        accumulatedAngle += segmentAngles[i];
        if (pointerAngle < accumulatedAngle) { winnerIndex = i; break; }
      }
      const winnerOpt = currentOptions[winnerIndex];
      setWinner(winnerOpt);
      setShowWinner(true);
      setIsSpinning(false);
      sound.play('winner');
      syncToOverlay({ rotation: totalRotation, isSpinning: false, showWinner: true, winner: winnerOpt });
    }, 4000);
  };

  const reset = () => {
    setRotation(0);
    setWinner(null);
    setShowWinner(false);
    syncToOverlay({ rotation: 0, isSpinning: false, showWinner: false, winner: null });
  };

  const resetVotes = () => {
    const initial: VoteState = {};
    currentOptions.forEach(opt => { initial[opt.id] = { votes: 0, voters: new Set() }; });
    setVoteState(initial);
    setProcessedMessageIds(new Set());
    lastProcessedIndexRef.current = chatMessages.length;
  };

  const startVoting = () => { resetVotes(); setVotingTimeLeft(votingDuration); setIsVotingActive(true); };
  const stopVoting = () => { setIsVotingActive(false); };

  // Manual participants functions
  const addManualParticipant = () => {
    const name = manualParticipantInput.trim();
    if (!name) return;
    
    // Check for duplicates (case insensitive)
    if (manualParticipants.some(p => p.toLowerCase() === name.toLowerCase())) {
      setManualParticipantError('Este participante ya está en la lista');
      setTimeout(() => setManualParticipantError(null), 2000);
      return;
    }
    
    setManualParticipants(prev => [...prev, name]);
    setManualParticipantInput('');
    setManualParticipantError(null);
  };

  const removeManualParticipant = (index: number) => {
    setManualParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const clearManualParticipants = () => {
    setManualParticipants([]);
  };

  // Export manual participants to file
  const exportManualParticipants = () => {
    if (manualParticipants.length === 0) return;
    
    const content = manualParticipants.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participantes_ruleta_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import manual participants from file
  const importManualParticipants = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      
      const lines = content.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
      const existingLower = new Set(manualParticipants.map(p => p.toLowerCase()));
      
      let added = 0;
      let duplicates = 0;
      const newParticipants: string[] = [];
      
      lines.forEach(name => {
        if (existingLower.has(name.toLowerCase())) {
          duplicates++;
        } else {
          newParticipants.push(name);
          existingLower.add(name.toLowerCase());
          added++;
        }
      });
      
      setManualParticipants(prev => [...prev, ...newParticipants]);
      
      if (duplicates > 0 || added > 0) {
        setManualParticipantError(`Añadidos: ${added}${duplicates > 0 ? `, Duplicados: ${duplicates}` : ''}`);
        setTimeout(() => setManualParticipantError(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const spinManualParticipants = () => {
    if (isSpinning || manualParticipants.length === 0) return;
    
    // Create temporary options from manual participants
    const tempOptions: PollOption[] = manualParticipants.map((name, index) => ({
      id: index,
      label: name,
      color: `hsl(${(index * 360) / manualParticipants.length}, 70%, 50%)`,
      votes: 0,
    }));
    
    setCurrentOptions(tempOptions);
    syncToOverlay({ options: tempOptions });
    
    // Wait for canvas to update then spin
    setTimeout(() => {
      spin();
    }, 100);
  };

  const totalVotes = getTotalVotes();


  const wheelSize = overlayWheelSize === 'large' ? 450 : 350;

  // Overlay Mode - Solo visualización, sin controles
  if (isOverlayMode) {
    const OverlaySettingsPanel = () => (
      <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-64">
        <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.chromaKey}</p>
        <div className="flex gap-1 mb-3">
          {OVERLAY_BG_COLORS.map((color) => (
            <button 
              key={color} 
              onClick={() => setOverlayBgColor(color)} 
              className={`w-7 h-7 rounded border-2 ${overlayBgColor === color ? 'border-white scale-110' : 'border-transparent'} ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`} 
              style={{ backgroundColor: color === 'transparent' ? undefined : color }} 
            />
          ))}
        </div>
        <p className="text-xs text-zinc-400 mb-2 font-bold">{t.spinner.winnerTextColor}</p>
        <div className="flex gap-1 mb-3">
          {OVERLAY_TEXT_COLORS.map((color) => (
            <button 
              key={color} 
              onClick={() => setOverlayTextColor(color)} 
              className={`w-7 h-7 rounded border-2 ${overlayTextColor === color ? 'border-white scale-110' : 'border-zinc-600'}`} 
              style={{ backgroundColor: color }} 
            />
          ))}
        </div>
        <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.size}</p>
        <div className="flex gap-1">
          {(['normal', 'large'] as const).map((size) => (
            <button 
              key={size} 
              onClick={() => setOverlayWheelSize(size)} 
              className={`flex-1 py-1.5 rounded text-xs font-medium ${overlayWheelSize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
            >
              {size === 'normal' ? t.overlay.normalSize : t.overlay.largeSize}
            </button>
          ))}
        </div>
      </div>
    );

    // Mostrar pantalla de espera si no hay opciones (sin animación para evitar parpadeo en OBS)
    if (!isOverlayReady || currentOptions.length === 0) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: overlayBgColor }}>
          <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
            <Settings size={18} />
          </button>
          {showOverlaySettings && <OverlaySettingsPanel />}
          <div className="text-center">
            <p className="text-white/70 text-lg">🎰 Esperando ruleta...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: overlayBgColor }}>
        <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
          <Settings size={18} />
        </button>
        {showOverlaySettings && <OverlaySettingsPanel />}
        <div className="relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
          </div>
          <div style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
            <canvas ref={canvasRef} width={wheelSize} height={wheelSize} className="drop-shadow-2xl" />
          </div>
        </div>
        {showWinner && winner && (
          <div className="mt-6 animate-bounce">
            <div className="inline-block px-10 py-5 rounded-2xl shadow-2xl" style={{ backgroundColor: winner.color }}>
              <span className="text-white font-bold text-3xl drop-shadow-lg">🎉 {winner.label} 🎉</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Widget flotante - Modo minimizado
  if (isFloatingWidget && isMinimized) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-50 select-none"
        style={{ left: widgetPosition.x, top: widgetPosition.y }}
      >
        <div
          onMouseDown={handleWidgetMouseDown}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl border backdrop-blur-sm cursor-move transition-all ${
            showWinner ? 'bg-green-900/90 border-green-500/50 ring-2 ring-green-500/50' : 
            isSpinning ? 'bg-purple-900/90 border-purple-500/50 ring-2 ring-purple-500/50' : 
            'bg-zinc-900/95 border-zinc-700/50'
          }`}
        >
          <GripHorizontal size={14} className="text-zinc-500" />
          <span className="text-lg">🎰</span>
          <span className="font-bold text-white text-sm">
            {showWinner && winner ? `🎉 ${winner.label}` : isSpinning ? 'Girando...' : 'Ruleta'}
          </span>
          {!isSpinning && !showWinner && (
            <button
              onClick={spin}
              className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
            >
              <Play size={14} />
            </button>
          )}
          <button onClick={() => setIsMinimized(false)} className="p-1.5 rounded-lg bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50 hover:text-white transition-colors">
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  // Widget flotante - Modo expandido
  if (isFloatingWidget) {
    // Calcular tamaño de la ruleta basado en el ancho del widget
    const wheelSizeWidget = Math.min(widgetSize.width - 80, widgetSize.height - 280, 250);
    return (
      <div
        ref={widgetRef}
        className="fixed z-50 select-none"
        style={{ left: widgetPosition.x, top: widgetPosition.y }}
      >
        <div 
          className={`bg-zinc-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border transition-colors overflow-hidden flex flex-col relative ${
            showWinner ? 'border-green-500/50 ring-2 ring-green-500/30' : 
            isSpinning ? 'border-purple-500/50 ring-2 ring-purple-500/30' : 
            isVotingActive ? 'border-green-500/50 ring-2 ring-green-500/30' :
            'border-zinc-700/50'
          } ${isResizing ? 'ring-2 ring-purple-500/50' : ''}`}
          style={{ width: widgetSize.width, height: widgetSize.height }}
        >
          {/* Header - Draggable */}
          <div
            onMouseDown={handleWidgetMouseDown}
            className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 cursor-move shrink-0 bg-zinc-900/50"
          >
            <div className="flex items-center gap-2">
              <GripHorizontal size={14} className="text-zinc-500" />
              <span className="text-lg">🎰</span>
              <span className="text-sm font-bold text-white">Ruleta</span>
              {isSpinning && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
              {isVotingActive && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(true)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors">
                <Minimize2 size={14} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-4 overflow-y-auto flex-1">
            {/* Mode selector */}
            <div className="flex gap-2 mb-3">
              <button 
                onClick={() => setMode('classic')} 
                disabled={isSpinning || isVotingActive} 
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'classic' ? 'bg-twitch-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-50`}
              >
                <Equal size={12} /> Clásico
              </button>
              <button 
                onClick={() => setMode('voting')} 
                disabled={isSpinning || isVotingActive} 
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'voting' ? 'bg-twitch-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-50`}
              >
                <BarChart3 size={12} /> Por Votos
              </button>
            </div>

            {/* Voting mode controls */}
            {mode === 'voting' && (
              <div className="bg-zinc-800/50 rounded-xl p-3 mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Duración:</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      min="10" 
                      max="300" 
                      value={votingDuration} 
                      onChange={(e) => setVotingDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 30)))} 
                      disabled={isVotingActive} 
                      className="w-14 px-2 py-1 bg-zinc-700 rounded text-white text-center text-xs disabled:opacity-50" 
                    />
                    <span className="text-zinc-400 text-xs">seg</span>
                  </div>
                </div>
                
                {isVotingActive ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-green-400">
                        <Timer size={12} className="animate-pulse" />
                        <span className="font-bold text-xs">{votingTimeLeft}s</span>
                      </div>
                      <div className="flex items-center gap-1 text-zinc-300">
                        <Users size={12} />
                        <span className="text-xs">{totalVotes} votos</span>
                      </div>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${(votingTimeLeft / votingDuration) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-500 text-center">
                      Vota: {currentOptions.map((_, i) => `${votePrefix}${i + 1}`).join(', ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500 text-center">
                    {totalVotes > 0 ? `${totalVotes} votos - Los % se muestran en la ruleta` : 'Los votos determinarán el tamaño de cada sección'}
                  </p>
                )}

                {/* Voting controls */}
                <div className="flex gap-2">
                  {!isVotingActive ? (
                    <>
                      <button 
                        onClick={startVoting} 
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-xs"
                      >
                        <Play size={12} /> Iniciar Votación
                      </button>
                      {totalVotes > 0 && (
                        <button 
                          onClick={resetVotes} 
                          className="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </>
                  ) : (
                    <button 
                      onClick={stopVoting} 
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs"
                    >
                      <Pause size={12} /> Detener
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Wheel */}
            <div className="relative flex justify-center mb-3">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[15px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
              </div>
              <div style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
                <canvas ref={canvasRef} width={wheelSizeWidget} height={wheelSizeWidget} className="drop-shadow-xl" />
              </div>
            </div>

            {/* Winner display */}
            {showWinner && winner && (
              <div className="text-center mb-3 animate-bounce">
                <div className="inline-block px-4 py-2 rounded-xl shadow-lg" style={{ backgroundColor: winner.color }}>
                  <span className="text-white font-bold text-sm drop-shadow">🎉 {winner.label} 🎉</span>
                </div>
              </div>
            )}

            {/* Spin Controls */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={spin}
                disabled={isSpinning || currentOptions.length < 2 || (mode === 'voting' && isVotingActive)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 font-bold rounded-lg transition-all text-sm ${
                  isSpinning ? 'bg-purple-500 text-white cursor-not-allowed' : 'bg-twitch-brand hover:bg-twitch-brand/80 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSpinning ? <><RotateCcw size={14} className="animate-spin" /> Girando...</> : <><Play size={14} /> Girar</>}
              </button>
              <button
                onClick={reset}
                disabled={isSpinning}
                className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-all disabled:opacity-50"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* OBS Overlay URL */}
            <div className="mb-3 flex items-center gap-2">
              <ChatSettingsPopover
                config={chatConfig.config}
                onConfigChange={chatConfig.updateConfig}
                activityType="game"
              />
              <SoundSettingsPopover
                config={sound.config}
                onConfigChange={sound.setConfig}
                onTestSound={() => sound.play('winner')}
                showMilestoneOption={false}
              />
              <OBSOverlayUrl overlayParam="overlaySpinner" title="la ruleta" />
            </div>

            {/* Options list */}
            <div className="space-y-1 max-h-24 overflow-y-auto">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Opciones ({currentOptions.length})</p>
              {currentOptions.map((opt) => (
                <div key={opt.id} className="flex items-center gap-2 text-xs bg-zinc-800/50 rounded-lg px-2 py-1">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                  <span className="text-zinc-300 truncate">{opt.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resize handle - Más visible y fácil de usar */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize group z-10"
            title="Redimensionar"
          >
            <div className="absolute bottom-1 right-1 w-3 h-3 flex items-end justify-end">
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-zinc-500 group-hover:text-purple-400 transition-colors">
                <path d="M9 1v8H1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M9 5v4H5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal Mode - UI completa con controles
  return (
    <ToolWithChat
      chatMessages={chatMessages}
      userVoteMap={userVoteMap}
      pollOptions={currentOptions}
      collaborationChannels={collaborationChannels}
      mainChannel={mainChannel}
      onAddCollaborator={onAddCollaborator}
      onRemoveCollaborator={onRemoveCollaborator}
      isConnected={isConnected}
    >
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-lg w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-4">🎰 Ruleta de la Suerte</h2>

        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => setMode('classic')} disabled={isSpinning || isVotingActive} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${mode === 'classic' ? 'bg-twitch-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-50`}>
            <Equal size={18} /> Clásica
          </button>
          <button onClick={() => setMode('voting')} disabled={isSpinning || isVotingActive} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${mode === 'voting' ? 'bg-twitch-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-50`}>
            <BarChart3 size={18} /> Por Votos
          </button>
        </div>

        {/* Manual participants section - HIDDEN: feature disabled for now
        <div className="bg-zinc-800/50 rounded-xl p-4 mb-4 space-y-3 border border-dashed border-zinc-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300 font-medium flex items-center gap-2">
              <UserPlus size={16} className="text-purple-400" />
              Participantes manuales
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={exportManualParticipants}
                disabled={manualParticipants.length === 0}
                className="p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Exportar participantes"
              >
                <Download size={14} />
              </button>
              <label className="p-1.5 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700 rounded transition-colors cursor-pointer" title="Importar participantes">
                <Upload size={14} />
                <input
                  ref={manualParticipantsFileRef}
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && importManualParticipants(e.target.files[0])}
                />
              </label>
              {manualParticipants.length > 0 && (
                <button 
                  onClick={clearManualParticipants}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded transition-colors"
                  title="Limpiar todos"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <input 
              type="text" 
              value={manualParticipantInput} 
              onChange={(e) => setManualParticipantInput(e.target.value)} 
              placeholder="Nombre del participante" 
              onKeyDown={(e) => e.key === 'Enter' && addManualParticipant()}
              disabled={isSpinning}
              className="flex-1 bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50" 
            />
            <button 
              onClick={addManualParticipant}
              disabled={!manualParticipantInput.trim() || isSpinning}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              <UserPlus size={18} />
            </button>
          </div>
          
          {manualParticipantError && (
            <p className={`text-xs ${manualParticipantError.includes('Añadidos') ? 'text-green-400' : 'text-red-400'}`}>{manualParticipantError}</p>
          )}
          
          {manualParticipants.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {manualParticipants.map((name, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: `hsl(${(index * 360) / manualParticipants.length}, 70%, 40%)` }}
                  >
                    {name}
                    <button 
                      onClick={() => removeManualParticipant(index)}
                      className="hover:text-red-300 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <button 
                onClick={spinManualParticipants}
                disabled={isSpinning || manualParticipants.length < 2}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:from-zinc-600 disabled:to-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
              >
                <Play size={16} /> Sortear entre {manualParticipants.length} participantes
              </button>
            </>
          )}
          
          <p className="text-xs text-zinc-500 text-center">
            Añade participantes manualmente para sortear entre ellos
          </p>
        </div>
        */}

        {mode === 'voting' && (
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Duración:</span>
              <div className="flex items-center gap-2">
                <input type="number" min="10" max="300" value={votingDuration} onChange={(e) => setVotingDuration(Math.max(10, Math.min(300, parseInt(e.target.value) || 30)))} disabled={isVotingActive} className="w-16 px-2 py-1 bg-zinc-700 rounded text-white text-center text-sm disabled:opacity-50" />
                <span className="text-zinc-400 text-sm">seg</span>
              </div>
            </div>
            {isVotingActive ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400"><Timer size={16} className="animate-pulse" /><span className="font-bold">{votingTimeLeft}s</span></div>
                  <div className="flex items-center gap-2 text-zinc-300"><Users size={16} /><span>{totalVotes} votos</span></div>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${(votingTimeLeft / votingDuration) * 100}%` }} /></div>
                <p className="text-xs text-zinc-500 text-center">Vota: {currentOptions.map((_, i) => `${votePrefix}${i + 1}`).join(', ')}</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 text-center">Los votos determinarán el tamaño de cada sección</p>
            )}
            {totalVotes > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {currentOptions.map((opt) => {
                  const votes = voteState[opt.id]?.votes || 0;
                  const pct = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0';
                  return (
                    <div key={opt.id} className="flex items-center gap-2 bg-zinc-700/50 rounded-lg px-2 py-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      <span className="text-xs text-zinc-300 truncate flex-1">{opt.label}</span>
                      <span className="text-xs font-bold text-white">{votes} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              {!isVotingActive ? (
                <>
                  <button onClick={startVoting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg"><Play size={16} /> Iniciar Votación</button>
                  {totalVotes > 0 && <button onClick={resetVotes} className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"><RotateCcw size={16} /></button>}
                </>
              ) : (
                <button onClick={stopVoting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg"><Pause size={16} /> Detener</button>
              )}
            </div>
          </div>
        )}

        <div className="relative flex justify-center mb-6">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
          </div>
          <div style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}>
            <canvas ref={canvasRef} width={300} height={300} className="drop-shadow-2xl" />
          </div>
        </div>

        {showWinner && winner && (
          <div className="text-center mb-4 animate-bounce">
            <div className="inline-block px-6 py-3 rounded-xl" style={{ backgroundColor: winner.color }}>
              <span className="text-white font-bold text-xl drop-shadow-lg">🎉 {winner.label} 🎉</span>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mb-4">
          <button onClick={spin} disabled={isSpinning || currentOptions.length === 0 || (mode === 'voting' && isVotingActive)} className="flex items-center gap-2 px-6 py-3 bg-twitch-brand hover:bg-twitch-brand/80 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95">
            <Play size={20} /> {isSpinning ? 'Girando...' : 'Girar'}
          </button>
          <button onClick={reset} disabled={isSpinning} className="flex items-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
            <RotateCcw size={20} />
          </button>
        </div>

        {currentOptions.length === 0 && <p className="text-center text-zinc-400 mb-4">Crea una encuesta primero para usar la ruleta</p>}

        <div className="flex justify-center">
          <OBSOverlayUrl overlayParam="overlaySpinner" title="la ruleta" />
        </div>
      </div>
    </ToolWithChat>
  );
};


export default SpinnerWheel;
