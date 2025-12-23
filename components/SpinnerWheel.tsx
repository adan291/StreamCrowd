import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PollOption, TwitchMessage, CollaborationChannel } from '../types';
import { RotateCcw, Play, X, Users, Timer, Pause, BarChart3, Equal, ExternalLink, Settings, UserPlus, Trash2, Download, Upload } from 'lucide-react';
import { useI18n } from '../i18n';
import { ToolWithChat } from './ToolWithChat';

type WheelMode = 'classic' | 'voting';

interface SpinnerWheelProps {
  options: PollOption[];
  onClose: () => void;
  chatMessages?: TwitchMessage[];
  votePrefix?: string;
  isOverlayMode?: boolean;
  userVoteMap?: Map<string, number>;
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  onAddCollaborator?: (channel: string) => void;
  onRemoveCollaborator?: (channel: string) => void;
  isConnected?: boolean;
}

const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', '#1a1a2e', 'transparent'];
const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
const SPINNER_CHANNEL = 'spinner_sync';

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
  userVoteMap = new Map(),
  collaborationChannels = [],
  mainChannel,
  onAddCollaborator,
  onRemoveCollaborator,
  isConnected = true,
}) => {
  const { t } = useI18n();
  const [overlayBgColor, setOverlayBgColor] = useState('#00FF00');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlayWheelSize, setOverlayWheelSize] = useState<'normal' | 'large'>('large');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const [mode, setMode] = useState<WheelMode>('classic');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<PollOption | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  // En overlay mode, empezar sin opciones hasta recibir sync
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
    
    if (isOverlayMode) {
      // Overlay listens for state updates
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') return; // Ignorar requests
        const state: SpinnerState = event.data;
        setRotation(state.rotation);
        setIsSpinning(state.isSpinning);
        setWinner(state.winner);
        setShowWinner(state.showWinner);
        if (state.options && state.options.length > 0) {
          setCurrentOptions(state.options);
          setIsOverlayReady(true);
        }
      };
      // Request initial state
      setTimeout(() => {
        channelRef.current?.postMessage({ type: 'request_sync' });
      }, 100);
    } else {
      // Main window listens for sync requests and sends current state
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') {
          const current = stateRef.current;
          channelRef.current?.postMessage({
            rotation: current.rotation,
            isSpinning: current.isSpinning,
            winner: current.winner,
            showWinner: current.showWinner,
            options: current.options.length > 0 ? current.options : options
          });
        }
      };
    }
    
    return () => {
      channelRef.current?.close();
    };
  }, [isOverlayMode, options]);

  // Sync state to overlay (only from main window)
  const syncToOverlay = useCallback((state: Partial<SpinnerState>) => {
    if (!isOverlayMode && channelRef.current) {
      channelRef.current.postMessage({
        rotation,
        isSpinning,
        winner,
        showWinner,
        options: currentOptions,
        ...state
      });
    }
  }, [isOverlayMode, rotation, isSpinning, winner, showWinner, currentOptions]);

  // Update options when prop changes
  useEffect(() => {
    setCurrentOptions(options);
    syncToOverlay({ options });
  }, [options]);


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

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || currentOptions.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

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
      const label = option.label.length > 12 ? option.label.slice(0, 12) + '...' : option.label;
      ctx.fillText(label, radius - 20, 5);
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
  }, [currentOptions, segmentAngles]);

  const spin = () => {
    if (isSpinning || currentOptions.length === 0) return;
    if (mode === 'voting' && isVotingActive) return;

    setIsSpinning(true);
    setShowWinner(false);
    setWinner(null);

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

  const openOverlayWindow = () => {
    const width = 450;
    const height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlaySpinner=true`, 'SpinnerOverlay', `width=${width},height=${height},left=${left},top=${top}`);
    // Enviar estado inicial después de un pequeño delay para que el overlay esté listo
    setTimeout(() => {
      syncToOverlay({ options: currentOptions.length > 0 ? currentOptions : options });
    }, 500);
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

    // Mostrar pantalla de espera si no hay opciones todavía
    if (!isOverlayReady || currentOptions.length === 0) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: overlayBgColor }}>
          <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
            <Settings size={18} />
          </button>
          {showOverlaySettings && <OverlaySettingsPanel />}
          <div className="text-center bg-black/50 rounded-2xl px-10 py-8">
            <div className="animate-spin w-12 h-12 border-4 border-twitch-brand border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white/70 text-lg">Conectando con la ruleta...</p>
            <p className="text-white/50 text-sm mt-2">Abre la ruleta en la ventana principal</p>
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
        {currentOptions.length === 0 && (
          <p className="text-white/70 text-lg mt-4">Esperando opciones...</p>
        )}
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

        <h2 className="text-2xl font-bold text-white text-center mb-2">🎰 Ruleta de la Suerte</h2>

        <button onClick={openOverlayWindow} className="w-full mb-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-500/80 hover:to-purple-600/80 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
          <ExternalLink size={16} />
          Abrir Overlay para OBS
        </button>

        <div className="flex justify-center gap-2 mb-4">
          <button onClick={() => setMode('classic')} disabled={isSpinning || isVotingActive} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${mode === 'classic' ? 'bg-twitch-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-50`}>
            <Equal size={18} /> Clásica
          </button>
          <button onClick={() => setMode('voting')} disabled={isSpinning || isVotingActive} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${mode === 'voting' ? 'bg-twitch-brand text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} disabled:opacity-50`}>
            <BarChart3 size={18} /> Por Votos
          </button>
        </div>

        {/* Manual participants section */}
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

        <div className="flex justify-center gap-4">
          <button onClick={spin} disabled={isSpinning || currentOptions.length === 0 || (mode === 'voting' && isVotingActive)} className="flex items-center gap-2 px-6 py-3 bg-twitch-brand hover:bg-twitch-brand/80 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95">
            <Play size={20} /> {isSpinning ? 'Girando...' : 'Girar'}
          </button>
          <button onClick={reset} disabled={isSpinning} className="flex items-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all">
            <RotateCcw size={20} />
          </button>
        </div>

        {currentOptions.length === 0 && <p className="text-center text-zinc-400 mt-4">Crea una encuesta primero para usar la ruleta</p>}
      </div>
    </ToolWithChat>
  );
};
