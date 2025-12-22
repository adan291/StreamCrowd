import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Trophy,
  Users,
  Star,
  Play,
  Pause,
  Eye,
  EyeOff,
  Settings,
  Clock,
  Crown,
  Medal,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Gavel,
  Target,
  Sparkles,
  AlertCircle,
  Grid,
} from 'lucide-react';
import {
  JudgePanelConfig,
  JudgePanelState,
  JudgeCriterion,
  Contestant,
  Judge,
  JudgeScore,
  PublicVote,
  ContestantResult,
  TwitchMessage,
  CollaborationChannel,
  MediaAsset,
} from '../types';
import { useI18n } from '../i18n';
import { ToolWithChat } from './ToolWithChat';

// Constants
const JUDGE_PANEL_CHANNEL = 'judge_panel_sync';
const DEFAULT_COLORS = ['#a970ff', '#00f0f0', '#ff6b6b', '#4ade80', '#fbbf24', '#f472b6', '#8b5cf6', '#06b6d4'];
const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', '#1a1a2e', 'transparent'];
const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

interface JudgePanelProps {
  onClose: () => void;
  chatMessages?: TwitchMessage[];
  collaborationChannels?: CollaborationChannel[];
  mainChannel?: string;
  onAddCollaborator?: (channel: string) => void;
  onRemoveCollaborator?: (channel: string) => void;
  isConnected?: boolean;
  userVoteMap?: Map<string, number>;
  isOverlayMode?: boolean;
  isEmbedded?: boolean; // When embedded in main panel, don't show ToolWithChat wrapper
  mediaLibrary?: MediaAsset[];
  onAddAsset?: (asset: MediaAsset) => void;
}

// Default config - empty criteria and judges
const createDefaultConfig = (): JudgePanelConfig => ({
  title: 'Panel de Jueces',
  criteria: [],
  contestants: [],
  judges: [],
  defaultMinScore: 1,
  defaultMaxScore: 10,
  publicVotingEnabled: false,
  publicVotingDuration: undefined,
  publicVoteWeight: 0.3,
  publicVotePrefix: '+',
  revealScoresLive: true,
  showJudgeNames: true,
  isActive: false,
});

const createDefaultState = (): JudgePanelState => ({
  config: createDefaultConfig(),
  scores: [],
  publicVotes: [],
  publicVotingActive: false,
  publicVotingTimeLeft: undefined,
  revealedContestants: [],
});

export const JudgePanel: React.FC<JudgePanelProps> = ({
  onClose,
  chatMessages = [],
  collaborationChannels = [],
  mainChannel = '',
  onAddCollaborator,
  onRemoveCollaborator,
  isConnected = true,
  userVoteMap = new Map(),
  isOverlayMode = false,
  isEmbedded = false,
  mediaLibrary = [],
  onAddAsset,
}) => {
  const { t } = useI18n();
  
  // State
  const [state, setState] = useState<JudgePanelState>(createDefaultState);
  const [showConfig, setShowConfig] = useState(true);
  const [selectedContestant, setSelectedContestant] = useState<string | null>(null);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newContestantName, setNewContestantName] = useState('');
  const [newJudgeName, setNewJudgeName] = useState('');
  const [editingCriterionId, setEditingCriterionId] = useState<string | null>(null);
  const [editingJudgeId, setEditingJudgeId] = useState<string | null>(null);
  
  // Overlay settings
  const [overlayBgColor, setOverlayBgColor] = useState('#00FF00');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlaySize, setOverlaySize] = useState<'normal' | 'large'>('large');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState<string | null>(null); // contestantId
  
  // Refs for file inputs
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Refs
  const channelRef = useRef<BroadcastChannel | null>(null);
  const stateRef = useRef(state);
  const processedVotesRef = useRef<Set<string>>(new Set());
  
  // Sync ref with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // BroadcastChannel for sync between TwitchVote instances
  useEffect(() => {
    channelRef.current = new BroadcastChannel(JUDGE_PANEL_CHANNEL);
    
    channelRef.current.onmessage = (event) => {
      if (event.data?.type === 'request_sync') {
        // Send current state to new instance
        channelRef.current?.postMessage({ type: 'state_sync', state: stateRef.current });
      } else if (event.data?.type === 'state_sync') {
        // Receive state from another instance
        setState(event.data.state);
      } else if (event.data?.type === 'score_update') {
        // Receive score update
        const { score } = event.data;
        setState(prev => ({
          ...prev,
          scores: [...prev.scores.filter(s => 
            !(s.judgeId === score.judgeId && s.contestantId === score.contestantId && s.criterionId === score.criterionId)
          ), score]
        }));
      } else if (event.data?.type === 'public_vote') {
        // Receive public vote
        const { vote } = event.data;
        setState(prev => ({
          ...prev,
          publicVotes: [...prev.publicVotes, vote]
        }));
      }
    };
    
    // Request sync on mount
    setTimeout(() => {
      channelRef.current?.postMessage({ type: 'request_sync' });
    }, 100);
    
    return () => {
      channelRef.current?.close();
    };
  }, []);

  // Sync state to other instances
  const syncState = useCallback(() => {
    channelRef.current?.postMessage({ type: 'state_sync', state: stateRef.current });
  }, []);

  // Auto-add main channel streamer as default judge
  useEffect(() => {
    if (!mainChannel) return;
    
    // Check if judge already exists (by channelName, case insensitive)
    const judgeExists = state.config.judges.some(j => 
      j.channelName.toLowerCase() === mainChannel.toLowerCase()
    );
    
    // Only add if not exists
    if (!judgeExists) {
      const hostJudge: Judge = {
        id: generateId(), // Use unique ID instead of predictable one
        username: mainChannel,
        channelName: mainChannel,
        color: DEFAULT_COLORS[0],
        isHost: true,
      };
      
      setState(prev => {
        // Double check inside setState to avoid race conditions
        const alreadyExists = prev.config.judges.some(j => 
          j.channelName.toLowerCase() === mainChannel.toLowerCase()
        );
        if (alreadyExists) return prev;
        
        return {
          ...prev,
          config: {
            ...prev.config,
            judges: [...prev.config.judges, hostJudge]
          }
        };
      });
    }
  }, [mainChannel]); // Only depend on mainChannel, not state

  // Process chat messages for votes
  useEffect(() => {
    if (!state.config.isActive) return;
    
    chatMessages.forEach(msg => {
      const msgId = msg.id || `${msg.userId}-${msg.timestamp}`;
      if (processedVotesRef.current.has(msgId)) return;
      processedVotesRef.current.add(msgId);
      
      const msgLower = msg.message.toLowerCase().trim();
      
      // Judge score command: !score @contestant criterion score
      // or !score contestant criterion score
      const scoreMatch = msgLower.match(/^!score\s+@?(\w+)\s+(\w+)\s+(\d+)$/);
      if (scoreMatch) {
        const [, contestantName, criterionName, scoreStr] = scoreMatch;
        const score = parseInt(scoreStr);
        
        // Find judge by channel
        const judge = state.config.judges.find(j => 
          j.channelName.toLowerCase() === msg.sourceChannel?.toLowerCase() ||
          j.username.toLowerCase() === msg.username.toLowerCase()
        );
        if (!judge) return;
        
        // Find contestant
        const contestant = state.config.contestants.find(c => 
          c.name.toLowerCase().includes(contestantName) ||
          contestantName.includes(c.name.toLowerCase())
        );
        if (!contestant) return;
        
        // Find criterion
        const criterion = state.config.criteria.find(cr => 
          cr.name.toLowerCase().includes(criterionName) ||
          criterionName.includes(cr.name.toLowerCase())
        );
        if (!criterion) return;
        
        // Validate score
        if (score < criterion.minScore || score > criterion.maxScore) return;
        
        const newScore: JudgeScore = {
          judgeId: judge.id,
          contestantId: contestant.id,
          criterionId: criterion.id,
          score,
          timestamp: Date.now(),
        };
        
        setState(prev => ({
          ...prev,
          scores: [...prev.scores.filter(s => 
            !(s.judgeId === newScore.judgeId && s.contestantId === newScore.contestantId && s.criterionId === newScore.criterionId)
          ), newScore]
        }));
        
        channelRef.current?.postMessage({ type: 'score_update', score: newScore });
      }
      
      // Public vote: prefix + voteKey (e.g., +1, +maria) or !voto @contestant
      if (state.publicVotingActive && state.config.publicVotingEnabled) {
        const prefix = state.config.publicVotePrefix;
        
        let contestant: Contestant | undefined;
        
        // If prefix is set, match prefix + voteKey
        if (prefix) {
          const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const prefixMatch = msgLower.match(new RegExp(`^${escapedPrefix}(\\S+)$`));
          
          if (prefixMatch) {
            const voteKey = prefixMatch[1];
            // Find contestant by voteKey (exact match, case insensitive)
            contestant = state.config.contestants.find(c => 
              c.voteKey?.toLowerCase() === voteKey.toLowerCase()
            );
            // Fallback: try matching by name
            if (!contestant) {
              contestant = state.config.contestants.find(c => 
                c.name.toLowerCase().includes(voteKey.toLowerCase())
              );
            }
          }
        }
        
        // Also check !voto command
        const votoMatch = msgLower.match(/^!voto\s+@?(\w+)$/);
        if (!contestant && votoMatch) {
          const contestantName = votoMatch[1];
          contestant = state.config.contestants.find(c => 
            c.name.toLowerCase().includes(contestantName.toLowerCase()) ||
            c.voteKey?.toLowerCase() === contestantName.toLowerCase()
          );
        }
        
        if (contestant && msg.userId) {
          // Check if user already voted
          const alreadyVoted = state.publicVotes.some(v => v.oderId === msg.userId);
          if (!alreadyVoted) {
            const newVote: PublicVote = {
              oderId: msg.userId,
              odername: msg.username,
              contestantId: contestant.id,
              timestamp: Date.now(),
            };
            
            setState(prev => ({
              ...prev,
              publicVotes: [...prev.publicVotes, newVote]
            }));
            
            channelRef.current?.postMessage({ type: 'public_vote', vote: newVote });
          }
        }
      }
    });
  }, [chatMessages, state.config.isActive, state.publicVotingActive, state.config.publicVotingEnabled, state.config.publicVotePrefix]);

  // Public voting timer
  useEffect(() => {
    if (!state.publicVotingActive || !state.config.publicVotingDuration) return;
    
    const timer = setInterval(() => {
      setState(prev => {
        const newTimeLeft = (prev.publicVotingTimeLeft ?? prev.config.publicVotingDuration ?? 0) - 1;
        if (newTimeLeft <= 0) {
          return { ...prev, publicVotingActive: false, publicVotingTimeLeft: 0 };
        }
        return { ...prev, publicVotingTimeLeft: newTimeLeft };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state.publicVotingActive, state.config.publicVotingDuration]);

  // Calculate results
  const results = useMemo((): ContestantResult[] => {
    const totalPublicVotes = state.publicVotes.length;
    
    return state.config.contestants.map(contestant => {
      // Calculate judge scores
      const judgeScores = state.config.judges.map(judge => {
        const scores = state.config.criteria.map(criterion => {
          const score = state.scores.find(s => 
            s.judgeId === judge.id && 
            s.contestantId === contestant.id && 
            s.criterionId === criterion.id
          );
          return { criterion, score: score?.score ?? null };
        });
        
        const total = scores.reduce((sum, s) => sum + (s.score ?? 0) * s.criterion.weight, 0);
        return { judge, scores, total };
      });
      
      const judgeTotal = judgeScores.reduce((sum, js) => sum + js.total, 0);
      const maxJudgeTotal = state.config.judges.length * 
        state.config.criteria.reduce((sum, c) => sum + c.maxScore * c.weight, 0);
      
      // Calculate public votes
      const publicVotes = state.publicVotes.filter(v => v.contestantId === contestant.id).length;
      const publicPercentage = totalPublicVotes > 0 ? (publicVotes / totalPublicVotes) * 100 : 0;
      
      // Calculate final score
      const judgeNormalized = maxJudgeTotal > 0 ? (judgeTotal / maxJudgeTotal) * 100 : 0;
      const publicWeight = state.config.publicVotingEnabled ? state.config.publicVoteWeight : 0;
      const judgeWeight = 1 - publicWeight;
      
      const finalScore = (judgeNormalized * judgeWeight) + (publicPercentage * publicWeight);
      
      return {
        contestant,
        judgeScores,
        judgeTotal,
        publicVotes,
        publicPercentage,
        finalScore,
        rank: 0,
      };
    }).sort((a, b) => b.finalScore - a.finalScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [state]);

  // Tooltip message for start button
  const startTooltipMessage = useMemo(() => {
    const missing: string[] = [];
    if (state.config.criteria.length === 0) missing.push('criterios');
    if (state.config.contestants.length === 0) missing.push('concursantes');
    if (missing.length === 0) return null;
    return `Falta añadir: ${missing.join(' y ')}`;
  }, [state.config.criteria.length, state.config.contestants.length]);

  // Actions
  const addCriterion = () => {
    if (!newCriterionName.trim()) return;
    const newCriterion: JudgeCriterion = {
      id: generateId(),
      name: newCriterionName.trim(),
      minScore: state.config.defaultMinScore,
      maxScore: state.config.defaultMaxScore,
      weight: 1,
    };
    setState(prev => ({
      ...prev,
      config: { ...prev.config, criteria: [...prev.config.criteria, newCriterion] }
    }));
    setNewCriterionName('');
    syncState();
  };

  const removeCriterion = (id: string) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, criteria: prev.config.criteria.filter(c => c.id !== id) },
      scores: prev.scores.filter(s => s.criterionId !== id)
    }));
    setEditingCriterionId(null);
    syncState();
  };

  const updateCriterion = (id: string, updates: Partial<JudgeCriterion>) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        criteria: prev.config.criteria.map(c => c.id === id ? { ...c, ...updates } : c)
      }
    }));
    syncState();
  };

  // Judge management
  const addJudge = () => {
    if (!newJudgeName.trim()) return;
    const newJudge: Judge = {
      id: generateId(),
      username: newJudgeName.trim(),
      channelName: newJudgeName.trim(),
      color: DEFAULT_COLORS[state.config.judges.length % DEFAULT_COLORS.length],
      isHost: state.config.judges.length === 0, // First judge is host
    };
    setState(prev => ({
      ...prev,
      config: { ...prev.config, judges: [...prev.config.judges, newJudge] }
    }));
    setNewJudgeName('');
    syncState();
  };

  const removeJudge = (id: string) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, judges: prev.config.judges.filter(j => j.id !== id) },
      scores: prev.scores.filter(s => s.judgeId !== id)
    }));
    setEditingJudgeId(null);
    syncState();
  };

  const updateJudge = (id: string, updates: Partial<Judge>) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        judges: prev.config.judges.map(j => j.id === id ? { ...j, ...updates } : j)
      }
    }));
    syncState();
  };

  const addContestant = () => {
    if (!newContestantName.trim()) return;
    const nextIndex = state.config.contestants.length + 1;
    const newContestant: Contestant = {
      id: generateId(),
      name: newContestantName.trim(),
      color: DEFAULT_COLORS[(nextIndex - 1) % DEFAULT_COLORS.length],
      voteKey: String(nextIndex), // Default: 1, 2, 3...
    };
    setState(prev => ({
      ...prev,
      config: { ...prev.config, contestants: [...prev.config.contestants, newContestant] }
    }));
    setNewContestantName('');
    syncState();
  };

  const removeContestant = (id: string) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, contestants: prev.config.contestants.filter(c => c.id !== id) },
      scores: prev.scores.filter(s => s.contestantId !== id),
      publicVotes: prev.publicVotes.filter(v => v.contestantId !== id)
    }));
    syncState();
  };

  const updateContestant = (id: string, updates: Partial<Contestant>) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        contestants: prev.config.contestants.map(c => c.id === id ? { ...c, ...updates } : c)
      }
    }));
    syncState();
  };

  const updateContestantImage = (id: string, image: string) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        contestants: prev.config.contestants.map(c => c.id === id ? { ...c, image } : c)
      }
    }));
    syncState();
  };

  const setJudgeScore = (judgeId: string, contestantId: string, criterionId: string, score: number) => {
    const newScore: JudgeScore = {
      judgeId,
      contestantId,
      criterionId,
      score,
      timestamp: Date.now(),
    };
    
    setState(prev => ({
      ...prev,
      scores: [...prev.scores.filter(s => 
        !(s.judgeId === judgeId && s.contestantId === contestantId && s.criterionId === criterionId)
      ), newScore]
    }));
    
    channelRef.current?.postMessage({ type: 'score_update', score: newScore });
  };

  const startTournament = () => {
    setState(prev => {
      // Apply defaults: prefix "+" if empty, voteKey "1", "2", "3"... if empty
      const finalPrefix = prev.config.publicVotePrefix || '+';
      const finalContestants = prev.config.contestants.map((c, i) => ({
        ...c,
        voteKey: c.voteKey || String(i + 1)
      }));
      
      return {
        ...prev,
        config: { 
          ...prev.config, 
          isActive: true, 
          startTime: Date.now(),
          publicVotePrefix: finalPrefix,
          contestants: finalContestants,
        },
        scores: [],
        publicVotes: [],
        revealedContestants: [],
      };
    });
    processedVotesRef.current.clear();
    setShowConfig(false);
    syncState();
  };

  const stopTournament = () => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, isActive: false, endTime: Date.now() }
    }));
    syncState();
  };

  const resetTournament = () => {
    setState(createDefaultState());
    processedVotesRef.current.clear();
    setShowConfig(true);
    syncState();
  };

  const startPublicVoting = () => {
    setState(prev => ({
      ...prev,
      publicVotingActive: true,
      publicVotingTimeLeft: prev.config.publicVotingDuration,
      publicVotes: [],
    }));
    syncState();
  };

  const stopPublicVoting = () => {
    setState(prev => ({ ...prev, publicVotingActive: false }));
    syncState();
  };

  const revealContestant = (id: string) => {
    setState(prev => ({
      ...prev,
      revealedContestants: [...prev.revealedContestants, id]
    }));
    syncState();
  };

  const revealAll = () => {
    setState(prev => ({
      ...prev,
      revealedContestants: prev.config.contestants.map(c => c.id)
    }));
    syncState();
  };

  const openOverlayWindow = () => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayJudgePanel=true`, 'JudgePanelOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  // Get score for display (respects reveal mode only in overlay)
  const getDisplayScore = (contestantId: string, judgeId: string, criterionId: string, forOverlay: boolean = false): number | null => {
    // Streamer always sees scores, only overlay respects reveal mode
    if (forOverlay && !state.config.revealScoresLive && !state.revealedContestants.includes(contestantId)) {
      return null;
    }
    const score = state.scores.find(s => 
      s.judgeId === judgeId && s.contestantId === contestantId && s.criterionId === criterionId
    );
    return score?.score ?? null;
  };

  const isScoreRevealed = (contestantId: string, forOverlay: boolean = false): boolean => {
    // Streamer always sees scores, only overlay respects reveal mode
    if (!forOverlay) return true;
    return state.config.revealScoresLive || state.revealedContestants.includes(contestantId);
  };

  // Render medal based on rank
  const renderRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="text-yellow-400" size={20} />;
    if (rank === 2) return <Medal className="text-gray-300" size={18} />;
    if (rank === 3) return <Medal className="text-amber-600" size={18} />;
    return <span className="text-zinc-500 font-bold text-sm">#{rank}</span>;
  };

  // Handle image upload
  const handleImageUpload = (contestantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateContestantImage(contestantId, base64);
      // Optionally save to gallery
      if (onAddAsset) {
        onAddAsset({
          id: `asset_${Date.now()}`,
          name: file.name,
          data: base64,
          date: Date.now(),
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Select image from gallery
  const selectAssetFromLibrary = (asset: MediaAsset) => {
    if (showAssetPicker) {
      updateContestantImage(showAssetPicker, asset.data);
      setShowAssetPicker(null);
    }
  };

  // Remove contestant image
  const removeContestantImage = (contestantId: string) => {
    updateContestantImage(contestantId, '');
  };

  // Overlay Mode - Solo visualización
  if (isOverlayMode) {
    const getOverlayTextSize = () => overlaySize === 'normal' ? 'text-base' : 'text-lg';
    const getOverlayTitleSize = () => overlaySize === 'normal' ? 'text-2xl' : 'text-4xl';
    const getOverlayScoreSize = () => overlaySize === 'normal' ? 'text-lg' : 'text-2xl';
    
    return (
      <div className="min-h-screen w-full p-6" style={{ backgroundColor: overlayBgColor }}>
        {/* Settings Button */}
        <button 
          onClick={() => setShowOverlaySettings(!showOverlaySettings)} 
          className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50"
        >
          <Settings size={18} />
        </button>
        
        {/* Settings Panel */}
        {showOverlaySettings && (
          <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-64">
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay?.chromaKey || 'Chroma Key'}</p>
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
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay?.textColor || 'Color de texto'}</p>
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
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay?.size || 'Tamaño'}</p>
            <div className="flex gap-1">
              {(['normal', 'large'] as const).map((size) => (
                <button 
                  key={size} 
                  onClick={() => setOverlaySize(size)} 
                  className={`flex-1 py-1.5 rounded text-xs font-bold ${overlaySize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-400'}`}
                >
                  {size === 'normal' ? 'Normal' : 'Grande'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className={`${getOverlayTitleSize()} font-black mb-2 flex items-center justify-center gap-3`} style={{ color: overlayTextColor }}>
              <Trophy className="text-yellow-400" size={overlaySize === 'normal' ? 30 : 40} />
              {state.config.title}
            </h1>
            {state.publicVotingActive && (
              <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Votación pública activa
                {state.publicVotingTimeLeft !== undefined && (
                  <span className="font-mono font-bold">{state.publicVotingTimeLeft}s</span>
                )}
              </div>
            )}
          </div>

          {/* Results Table */}
          <div className="bg-zinc-800/80 backdrop-blur rounded-2xl overflow-hidden border border-zinc-700">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-900/50">
                  <th className={`p-4 text-left font-bold ${getOverlayTextSize()}`} style={{ color: overlayTextColor }}>#</th>
                  <th className={`p-4 text-left font-bold ${getOverlayTextSize()}`} style={{ color: overlayTextColor }}>Concursante</th>
                  {state.config.judges.map(judge => (
                    <th key={judge.id} className={`p-4 text-center font-bold ${getOverlayTextSize()}`} style={{ color: judge.color }}>
                      {state.config.showJudgeNames ? judge.username : <Gavel size={16} className="mx-auto" />}
                    </th>
                  ))}
                  {state.config.publicVotingEnabled && (
                    <th className={`p-4 text-center font-bold ${getOverlayTextSize()}`} style={{ color: overlayTextColor }}>
                      <Users size={16} className="mx-auto" />
                    </th>
                  )}
                  <th className={`p-4 text-center font-bold ${getOverlayTextSize()}`} style={{ color: overlayTextColor }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr 
                    key={result.contestant.id} 
                    className={`border-t border-zinc-700/50 ${index === 0 ? 'bg-yellow-500/10' : ''}`}
                  >
                    <td className="p-4">{renderRankBadge(result.rank)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {result.contestant.image ? (
                          <img src={result.contestant.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: result.contestant.color }}>
                            {result.contestant.name.charAt(0)}
                          </div>
                        )}
                        <span className={`font-bold ${getOverlayTextSize()}`} style={{ color: overlayTextColor }}>{result.contestant.name}</span>
                      </div>
                    </td>
                    {result.judgeScores.map(js => (
                      <td key={js.judge.id} className="p-4 text-center">
                        {isScoreRevealed(result.contestant.id, true) ? (
                          <span className={`font-mono font-bold ${getOverlayTextSize()}`} style={{ color: overlayTextColor }}>{js.total > 0 ? js.total : '-'}</span>
                        ) : (
                          <span className="text-zinc-600">?</span>
                        )}
                      </td>
                    ))}
                    {state.config.publicVotingEnabled && (
                      <td className="p-4 text-center">
                        <span className="text-cyan-400 font-bold">{result.publicVotes}</span>
                        <span className="text-zinc-500 text-xs ml-1">({result.publicPercentage.toFixed(0)}%)</span>
                      </td>
                    )}
                    <td className="p-4 text-center">
                      {isScoreRevealed(result.contestant.id, true) ? (
                        <span className={`${getOverlayScoreSize()} font-black text-twitch-light`}>{result.finalScore.toFixed(1)}</span>
                      ) : (
                        <span className={`text-zinc-600 ${getOverlayScoreSize()}`}>?</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Content for normal mode
  const panelContent = (
    <div className={`${isEmbedded ? 'h-full overflow-y-auto p-4' : 'bg-zinc-900 rounded-2xl p-6 max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-y-auto'}`}>
      {!isEmbedded && (
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      )}

      <h2 className={`text-2xl font-bold ${isEmbedded ? 'text-zinc-900 dark:text-white' : 'text-white'} text-center mb-2 flex items-center justify-center gap-2`}>
        <Trophy className="text-yellow-400" /> Panel de Jueces
      </h2>
      <p className="text-zinc-400 text-center text-sm mb-4">Sistema de puntuación con jueces y votación pública</p>

      <button onClick={openOverlayWindow} className="w-full mb-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-500/80 hover:to-orange-500/80 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 text-sm">
        <ExternalLink size={16} /> Abrir Overlay para OBS
      </button>

      {/* Config Toggle */}
      <button 
        onClick={() => setShowConfig(!showConfig)}
        className={`w-full mb-4 py-2 ${isEmbedded ? 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'} rounded-lg flex items-center justify-center gap-2 text-sm`}
      >
        <Settings size={16} />
        Configuración
        {showConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="space-y-4 mb-6 p-4 bg-zinc-800/50 rounded-xl">
            {/* Title */}
            <div>
              <label className="text-xs text-zinc-400 font-bold uppercase mb-1 block">Título del Torneo</label>
              <input
                type="text"
                value={state.config.title}
                onChange={(e) => setState(prev => ({ ...prev, config: { ...prev.config, title: e.target.value } }))}
                className="w-full bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm"
                placeholder="Panel de Jueces"
              />
            </div>

            {/* Score Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase mb-1 block">Puntuación Mínima</label>
                <input
                  type="number"
                  value={state.config.defaultMinScore}
                  onChange={(e) => setState(prev => ({ ...prev, config: { ...prev.config, defaultMinScore: parseInt(e.target.value) || 1 } }))}
                  className="w-full bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-bold uppercase mb-1 block">Puntuación Máxima</label>
                <input
                  type="number"
                  value={state.config.defaultMaxScore}
                  onChange={(e) => setState(prev => ({ ...prev, config: { ...prev.config, defaultMaxScore: parseInt(e.target.value) || 10 } }))}
                  className="w-full bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm"
                  min="1"
                />
              </div>
            </div>

            {/* Criteria */}
            <div>
              <label className="text-xs text-zinc-400 font-bold uppercase mb-2 block flex items-center gap-2">
                <Target size={14} /> Criterios de Evaluación
                <span className="text-zinc-500 font-normal normal-case text-[10px]">(ej: dificultad, imaginación, originalidad...)</span>
              </label>
              <div className="space-y-2 mb-2">
                {state.config.criteria.map(criterion => (
                  <div key={criterion.id} className="bg-zinc-700/50 rounded-lg p-2">
                    {editingCriterionId === criterion.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={criterion.name}
                          onChange={(e) => updateCriterion(criterion.id, { name: e.target.value })}
                          className="w-full bg-zinc-600 border border-zinc-500 text-white rounded px-2 py-1 text-sm"
                          placeholder="Nombre del criterio"
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-zinc-500">Mín</label>
                            <input
                              type="number"
                              value={criterion.minScore}
                              onChange={(e) => updateCriterion(criterion.id, { minScore: parseInt(e.target.value) || 0 })}
                              className="w-full bg-zinc-600 border border-zinc-500 text-white rounded px-2 py-1 text-sm"
                              min="0"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-zinc-500">Máx</label>
                            <input
                              type="number"
                              value={criterion.maxScore}
                              onChange={(e) => updateCriterion(criterion.id, { maxScore: parseInt(e.target.value) || 10 })}
                              className="w-full bg-zinc-600 border border-zinc-500 text-white rounded px-2 py-1 text-sm"
                              min="1"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-zinc-500">Peso</label>
                            <input
                              type="number"
                              value={criterion.weight}
                              onChange={(e) => updateCriterion(criterion.id, { weight: parseFloat(e.target.value) || 1 })}
                              className="w-full bg-zinc-600 border border-zinc-500 text-white rounded px-2 py-1 text-sm"
                              min="0.1"
                              max="10"
                              step="0.1"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCriterionId(null)} className="px-2 py-1 text-xs bg-zinc-600 hover:bg-zinc-500 text-white rounded">
                            <Check size={12} />
                          </button>
                          <button onClick={() => removeCriterion(criterion.id)} className="px-2 py-1 text-xs bg-red-600/50 hover:bg-red-600 text-white rounded">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Star size={14} className="text-yellow-400" />
                        <span className="flex-1 text-white text-sm">{criterion.name}</span>
                        <span className="text-zinc-400 text-xs">{criterion.minScore}-{criterion.maxScore}</span>
                        <span className="text-zinc-500 text-xs">x{criterion.weight}</span>
                        <button onClick={() => setEditingCriterionId(criterion.id)} className="p-1 text-zinc-500 hover:text-twitch-brand">
                          <Settings size={14} />
                        </button>
                        <button onClick={() => removeCriterion(criterion.id)} className="p-1 text-zinc-500 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCriterionName}
                  onChange={(e) => setNewCriterionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
                  className="flex-1 bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Nuevo criterio..."
                />
                <button onClick={addCriterion} className="px-3 py-2 bg-twitch-brand hover:bg-twitch-light text-white rounded-lg">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Contestants */}
            <div>
              <label className="text-xs text-zinc-400 font-bold uppercase mb-2 block flex items-center gap-2">
                <Users size={14} /> Concursantes
              </label>
              
              {/* Vote prefix config */}
              <div className="flex items-center gap-2 mb-3 p-2 bg-zinc-700/30 rounded-lg">
                <span className="text-xs text-zinc-400">Prefijo de voto:</span>
                <input
                  type="text"
                  value={state.config.publicVotePrefix}
                  onChange={(e) => setState(prev => ({ ...prev, config: { ...prev.config, publicVotePrefix: e.target.value } }))}
                  className="w-12 bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-xs text-center font-mono"
                  maxLength={3}
                  placeholder="+"
                />
                <span className="text-[10px] text-zinc-500">(ej: +1, #1, !1)</span>
              </div>
              
              <div className="space-y-2 mb-2">
                {state.config.contestants.map((contestant, index) => (
                  <div key={contestant.id} className="flex items-center gap-2 bg-zinc-700/50 rounded-lg p-2">
                    <div className="relative w-10 h-10 shrink-0 group/img">
                      {contestant.image ? (
                        <>
                          <img src={contestant.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                            <button onClick={() => removeContestantImage(contestant.id)} className="p-1 text-white hover:text-red-400">
                              <X size={14} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold relative overflow-hidden" style={{ backgroundColor: contestant.color }}>
                          <span className="group-hover/img:opacity-0 transition-opacity">{contestant.name.charAt(0)}</span>
                          <div className="absolute inset-0 flex opacity-0 group-hover/img:opacity-100 transition-opacity bg-zinc-800/90 rounded-lg">
                            <button 
                              onClick={() => fileInputRefs.current[contestant.id]?.click()} 
                              className="flex-1 flex items-center justify-center text-zinc-400 hover:text-twitch-brand hover:bg-zinc-700/50"
                              title="Subir imagen"
                            >
                              <Upload size={12} />
                            </button>
                            <button 
                              onClick={() => setShowAssetPicker(contestant.id)} 
                              className="flex-1 flex items-center justify-center text-zinc-400 hover:text-twitch-brand hover:bg-zinc-700/50 border-l border-zinc-600"
                              title="Elegir de galería"
                            >
                              <Grid size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={el => fileInputRefs.current[contestant.id] = el}
                        onChange={(e) => handleImageUpload(contestant.id, e)} 
                      />
                    </div>
                    <input
                      type="text"
                      value={contestant.name}
                      onChange={(e) => updateContestant(contestant.id, { name: e.target.value })}
                      className="flex-1 bg-zinc-600/50 border border-zinc-600 text-white rounded px-2 py-1 text-sm"
                      placeholder="Nombre"
                    />
                    <div className="relative w-16">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">{state.config.publicVotePrefix}</span>
                      <input
                        type="text"
                        value={contestant.voteKey || ''}
                        onChange={(e) => updateContestant(contestant.id, { voteKey: e.target.value })}
                        className="w-full bg-zinc-600/50 border border-zinc-600 text-white rounded pl-5 pr-1 py-1 text-xs font-mono"
                        placeholder={String(index + 1)}
                        title="Clave de voto"
                      />
                    </div>
                    <button 
                      onClick={() => fileInputRefs.current[contestant.id]?.click()} 
                      className="p-1 text-zinc-500 hover:text-twitch-brand"
                      title="Subir imagen"
                    >
                      <Upload size={14} />
                    </button>
                    <button 
                      onClick={() => setShowAssetPicker(contestant.id)} 
                      className="p-1 text-zinc-500 hover:text-twitch-brand"
                      title="Elegir de galería"
                    >
                      <Grid size={14} />
                    </button>
                    <button onClick={() => removeContestant(contestant.id)} className="p-1 text-zinc-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Vote preview */}
              {state.config.contestants.length > 0 && (
                <div className="mb-3 p-2 bg-zinc-700/30 rounded-lg">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">El público votará con:</p>
                  <div className="flex flex-wrap gap-1">
                    {state.config.contestants.map((c, i) => (
                      <span key={c.id} className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-mono text-twitch-light border border-zinc-600">
                        {state.config.publicVotePrefix}{c.voteKey || (i + 1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newContestantName}
                  onChange={(e) => setNewContestantName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addContestant()}
                  className="flex-1 bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Nuevo concursante..."
                />
                <button onClick={addContestant} className="px-3 py-2 bg-twitch-brand hover:bg-twitch-light text-white rounded-lg">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Judges */}
            <div>
              <label className="text-xs text-zinc-400 font-bold uppercase mb-2 block flex items-center gap-2">
                <Gavel size={14} /> Jueces ({state.config.judges.length})
              </label>
              <div className="space-y-2 mb-2">
                {state.config.judges.map((judge, index) => (
                  <div key={judge.id} className="bg-zinc-700/50 rounded-lg p-2">
                    {editingJudgeId === judge.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={judge.username}
                          onChange={(e) => updateJudge(judge.id, { username: e.target.value, channelName: e.target.value })}
                          className="w-full bg-zinc-600 border border-zinc-500 text-white rounded px-2 py-1 text-sm"
                          placeholder="Nombre del juez"
                        />
                        <div className="flex gap-2 items-center">
                          <label className="text-[10px] text-zinc-500">Color:</label>
                          <div className="flex gap-1">
                            {DEFAULT_COLORS.map(color => (
                              <button
                                key={color}
                                onClick={() => updateJudge(judge.id, { color })}
                                className={`w-5 h-5 rounded-full border-2 ${judge.color === color ? 'border-white' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <label className="text-[10px] text-zinc-500 ml-2 flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={judge.isHost}
                              onChange={(e) => updateJudge(judge.id, { isHost: e.target.checked })}
                              className="w-3 h-3"
                            />
                            Host
                          </label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingJudgeId(null)} className="px-2 py-1 text-xs bg-zinc-600 hover:bg-zinc-500 text-white rounded">
                            <Check size={12} />
                          </button>
                          <button onClick={() => removeJudge(judge.id)} className="px-2 py-1 text-xs bg-red-600/50 hover:bg-red-600 text-white rounded">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: judge.color }} />
                        {judge.isHost && <Crown size={12} className="text-yellow-400" />}
                        <span className="flex-1 text-white text-sm">{judge.username}</span>
                        <button onClick={() => setEditingJudgeId(judge.id)} className="p-1 text-zinc-500 hover:text-twitch-brand">
                          <Settings size={14} />
                        </button>
                        <button onClick={() => removeJudge(judge.id)} className="p-1 text-zinc-500 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newJudgeName}
                  onChange={(e) => setNewJudgeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addJudge()}
                  className="flex-1 bg-zinc-700 border border-zinc-600 text-white rounded-lg px-3 py-2 text-sm"
                  placeholder="Nombre del juez..."
                />
                <button onClick={addJudge} className="px-3 py-2 bg-twitch-brand hover:bg-twitch-light text-white rounded-lg">
                  <Plus size={16} />
                </button>
              </div>
              
              {/* Quick add from collaborators */}
              {collaborationChannels.length > 0 && (
                <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-[10px] text-cyan-400 uppercase font-bold mb-2 flex items-center gap-1">
                    <Users size={10} /> Añadir colaboradores como jueces:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {collaborationChannels
                      .filter(collab => !state.config.judges.some(j => j.channelName.toLowerCase() === collab.name.toLowerCase()))
                      .map((collab, index) => (
                        <button
                          key={collab.name}
                          onClick={() => {
                            const newJudge: Judge = {
                              id: generateId(),
                              username: collab.name,
                              channelName: collab.name,
                              color: collab.color || DEFAULT_COLORS[(state.config.judges.length) % DEFAULT_COLORS.length],
                              isHost: false,
                            };
                            setState(prev => ({
                              ...prev,
                              config: { ...prev.config, judges: [...prev.config.judges, newJudge] }
                            }));
                            syncState();
                          }}
                          className="px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1"
                          style={{ 
                            borderColor: collab.color || '#00f0f0',
                            color: collab.color || '#00f0f0',
                            backgroundColor: `${collab.color || '#00f0f0'}15`
                          }}
                        >
                          <Plus size={10} /> {collab.name}
                        </button>
                      ))}
                    {collaborationChannels.every(collab => 
                      state.config.judges.some(j => j.channelName.toLowerCase() === collab.name.toLowerCase())
                    ) && (
                      <span className="text-xs text-zinc-500 italic">Todos los colaboradores ya son jueces</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Public Voting Options */}
            <div className="space-y-3 p-3 bg-zinc-700/30 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white flex items-center gap-2">
                  <Users size={14} className="text-cyan-400" /> Votación Pública
                </label>
                <button
                  onClick={() => setState(prev => ({ ...prev, config: { ...prev.config, publicVotingEnabled: !prev.config.publicVotingEnabled } }))}
                  className={`w-10 h-5 rounded-full transition-colors ${state.config.publicVotingEnabled ? 'bg-cyan-500' : 'bg-zinc-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${state.config.publicVotingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              {state.config.publicVotingEnabled && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-zinc-400">Duración (seg):</label>
                    <input
                      type="number"
                      value={state.config.publicVotingDuration || ''}
                      onChange={(e) => setState(prev => ({ ...prev, config: { ...prev.config, publicVotingDuration: e.target.value ? parseInt(e.target.value) : undefined } }))}
                      className="w-20 bg-zinc-700 border border-zinc-600 text-white rounded px-2 py-1 text-sm"
                      placeholder="∞"
                      min="10"
                    />
                    <span className="text-zinc-500 text-xs">(vacío = manual)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-zinc-400">Peso del voto público:</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={state.config.publicVoteWeight * 100}
                      onChange={(e) => setState(prev => ({ ...prev, config: { ...prev.config, publicVoteWeight: parseInt(e.target.value) / 100 } }))}
                      className="flex-1"
                    />
                    <span className="text-white text-sm font-mono w-12">{(state.config.publicVoteWeight * 100).toFixed(0)}%</span>
                  </div>
                </>
              )}
            </div>

            {/* Display Options */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-white flex items-center gap-2">
                {state.config.revealScoresLive ? <Eye size={14} /> : <EyeOff size={14} />}
                Mostrar puntuaciones en tiempo real
              </label>
              <button
                onClick={() => setState(prev => ({ ...prev, config: { ...prev.config, revealScoresLive: !prev.config.revealScoresLive } }))}
                className={`w-10 h-5 rounded-full transition-colors ${state.config.revealScoresLive ? 'bg-green-500' : 'bg-zinc-600'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${state.config.revealScoresLive ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          {!state.config.isActive ? (
            <div className="flex-1 relative group">
              <button
                onClick={startTournament}
                disabled={state.config.contestants.length === 0 || state.config.criteria.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all"
              >
                <Play size={20} /> Iniciar Torneo
              </button>
              {startTooltipMessage && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-zinc-600 text-yellow-400 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap flex items-center gap-2">
                  <AlertCircle size={14} />
                  {startTooltipMessage}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
                </div>
              )}
            </div>
          ) : (
            <>
              <button onClick={stopTournament} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all">
                <Pause size={20} /> Detener
              </button>
              {state.config.publicVotingEnabled && (
                state.publicVotingActive ? (
                  <button onClick={stopPublicVoting} className="px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all">
                    <Pause size={20} />
                  </button>
                ) : (
                  <button onClick={startPublicVoting} className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center gap-2">
                    <Users size={20} /> Votos
                  </button>
                )
              )}
            </>
          )}
          <button onClick={resetTournament} className="px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl transition-all">
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Public Voting Status */}
        {state.publicVotingActive && (
          <div className="mb-4 p-3 bg-cyan-500/20 border border-cyan-500/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
              <span className="font-bold">Votación pública activa</span>
            </div>
            {state.publicVotingTimeLeft !== undefined && (
              <span className="text-cyan-300 font-mono font-bold text-lg">{state.publicVotingTimeLeft}s</span>
            )}
            <span className="text-cyan-300">{state.publicVotes.length} votos</span>
          </div>
        )}

        {/* Results Table */}
        {state.config.contestants.length > 0 && (
          <div className="bg-zinc-800/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900/50">
                    <th className="p-3 text-left text-zinc-400 font-bold">#</th>
                    <th className="p-3 text-left text-zinc-400 font-bold">Concursante</th>
                    {state.config.judges.map(judge => (
                      <th key={judge.id} className="p-3 text-center font-bold" style={{ color: judge.color }}>
                        {judge.username}
                      </th>
                    ))}
                    {state.config.publicVotingEnabled && (
                      <th className="p-3 text-center text-cyan-400 font-bold">Público</th>
                    )}
                    <th className="p-3 text-center text-twitch-light font-bold">Total</th>
                    {!state.config.revealScoresLive && (
                      <th className="p-3 text-center text-zinc-400 font-bold">Revelar</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={result.contestant.id} className={`border-t border-zinc-700/50 ${index === 0 && state.config.isActive ? 'bg-yellow-500/10' : ''}`}>
                      <td className="p-3">{renderRankBadge(result.rank)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {result.contestant.image ? (
                            <img src={result.contestant.image} alt="" className="w-8 h-8 rounded object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: result.contestant.color }}>
                              {result.contestant.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-white font-medium">{result.contestant.name}</span>
                        </div>
                      </td>
                      {result.judgeScores.map(js => (
                        <td key={js.judge.id} className="p-3 text-center">
                          {isScoreRevealed(result.contestant.id) ? (
                            <div className="flex flex-col items-center">
                              <span className="text-white font-bold">{js.total > 0 ? js.total : '-'}</span>
                              <div className="flex gap-1 mt-1">
                                {js.scores.map(s => (
                                  <span key={s.criterion.id} className="text-[10px] text-zinc-500" title={s.criterion.name}>
                                    {s.score ?? '-'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-600">?</span>
                          )}
                        </td>
                      ))}
                      {state.config.publicVotingEnabled && (
                        <td className="p-3 text-center">
                          <span className="text-cyan-400 font-bold">{result.publicVotes}</span>
                          <span className="text-zinc-500 text-xs ml-1">({result.publicPercentage.toFixed(0)}%)</span>
                        </td>
                      )}
                      <td className="p-3 text-center">
                        {isScoreRevealed(result.contestant.id) ? (
                          <span className="text-xl font-black text-twitch-light">{result.finalScore.toFixed(1)}</span>
                        ) : (
                          <span className="text-zinc-600 text-xl">?</span>
                        )}
                      </td>
                      {!state.config.revealScoresLive && (
                        <td className="p-3 text-center">
                          {!state.revealedContestants.includes(result.contestant.id) ? (
                            <button onClick={() => revealContestant(result.contestant.id)} className="p-2 bg-twitch-brand/20 hover:bg-twitch-brand/40 text-twitch-light rounded-lg">
                              <Eye size={16} />
                            </button>
                          ) : (
                            <Check size={16} className="text-green-400 mx-auto" />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {!state.config.revealScoresLive && state.config.contestants.length > 0 && (
              <div className="p-3 border-t border-zinc-700/50 flex justify-end">
                <button onClick={revealAll} className="px-4 py-2 bg-twitch-brand hover:bg-twitch-light text-white rounded-lg flex items-center gap-2 text-sm font-bold">
                  <Sparkles size={16} /> Revelar Todos
                </button>
              </div>
            )}
          </div>
        )}

        {/* Scoring Panel for Selected Contestant */}
        {state.config.isActive && selectedContestant && (
          <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Star className="text-yellow-400" />
              Puntuar: {state.config.contestants.find(c => c.id === selectedContestant)?.name}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {state.config.criteria.map(criterion => (
                <div key={criterion.id} className="space-y-1">
                  <label className="text-xs text-zinc-400">{criterion.name}</label>
                  <div className="flex gap-1">
                    {Array.from({ length: criterion.maxScore - criterion.minScore + 1 }, (_, i) => criterion.minScore + i).map(score => {
                      const currentJudge = state.config.judges.find(j => j.channelName.toLowerCase() === mainChannel?.toLowerCase());
                      const currentScore = currentJudge ? getDisplayScore(selectedContestant, currentJudge.id, criterion.id) : null;
                      return (
                        <button
                          key={score}
                          onClick={() => {
                            const judge = state.config.judges.find(j => j.channelName.toLowerCase() === mainChannel?.toLowerCase());
                            if (judge) setJudgeScore(judge.id, selectedContestant, criterion.id, score);
                          }}
                          className={`w-8 h-8 rounded text-sm font-bold transition-all ${
                            currentScore === score 
                              ? 'bg-twitch-brand text-white' 
                              : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Score Buttons */}
        {state.config.isActive && state.config.contestants.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-zinc-500 mb-2">Selecciona un concursante para puntuar:</p>
            <div className="flex flex-wrap gap-2">
              {state.config.contestants.map(contestant => (
                <button
                  key={contestant.id}
                  onClick={() => setSelectedContestant(selectedContestant === contestant.id ? null : contestant.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedContestant === contestant.id
                      ? 'bg-twitch-brand text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {contestant.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className={`mt-4 p-3 ${isEmbedded ? 'bg-zinc-200/50 dark:bg-zinc-800/30' : 'bg-zinc-800/30'} rounded-lg`}>
          <p className="text-xs text-zinc-500">
            <strong className={`${isEmbedded ? 'text-zinc-600 dark:text-zinc-400' : 'text-zinc-400'}`}>Comandos de chat:</strong><br />
            • Jueces: <code className={`${isEmbedded ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-zinc-700'} px-1 rounded`}>!score @concursante criterio puntuación</code><br />
            • Público: <code className={`${isEmbedded ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-zinc-700'} px-1 rounded`}>{state.config.publicVotePrefix}1</code>, <code className={`${isEmbedded ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-zinc-700'} px-1 rounded`}>{state.config.publicVotePrefix}2</code>, etc. o <code className={`${isEmbedded ? 'bg-zinc-300 dark:bg-zinc-700' : 'bg-zinc-700'} px-1 rounded`}>!voto @nombre</code>
          </p>
        </div>
      </div>
  );

  // If embedded, return content directly without ToolWithChat wrapper
  if (isEmbedded) {
    return (
      <>
        {panelContent}
        {/* Asset Picker Modal */}
        {showAssetPicker !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up flex flex-col max-h-[80vh]">
              <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Grid size={18} className="text-twitch-brand"/> Elegir de Galería
                </h3>
                <button onClick={() => setShowAssetPicker(null)} className="text-zinc-500 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 transition-colors">
                  <X size={18}/>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50 dark:bg-black/20 rounded-xl p-3 min-h-[200px]">
                {mediaLibrary.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                    <Grid size={32} className="opacity-50" />
                    <p className="text-sm">Galería vacía.</p>
                    <p className="text-xs text-zinc-400">Sube imágenes desde la pestaña Galería</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {mediaLibrary.map(asset => (
                      <button 
                        key={asset.id} 
                        onClick={() => selectAssetFromLibrary(asset)} 
                        className="aspect-square bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand overflow-hidden transition-all group relative shadow-sm"
                      >
                        <img src={asset.data} alt={asset.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs font-bold text-white bg-twitch-brand px-2 py-0.5 rounded-full shadow-lg">Usar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Normal Mode - with ToolWithChat wrapper
  return (
    <>
      <ToolWithChat
        chatMessages={chatMessages}
        userVoteMap={userVoteMap}
        collaborationChannels={collaborationChannels}
        mainChannel={mainChannel}
        onAddCollaborator={onAddCollaborator}
        onRemoveCollaborator={onRemoveCollaborator}
        isConnected={isConnected}
      >
        {panelContent}
      </ToolWithChat>
      {/* Asset Picker Modal */}
      {showAssetPicker !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-up flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Grid size={18} className="text-twitch-brand"/> Elegir de Galería
              </h3>
              <button onClick={() => setShowAssetPicker(null)} className="text-zinc-500 hover:text-black dark:hover:text-white bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 transition-colors">
                <X size={18}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50 dark:bg-black/20 rounded-xl p-3 min-h-[200px]">
              {mediaLibrary.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                  <Grid size={32} className="opacity-50" />
                  <p className="text-sm">Galería vacía.</p>
                  <p className="text-xs text-zinc-400">Sube imágenes desde la pestaña Galería</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {mediaLibrary.map(asset => (
                    <button 
                      key={asset.id} 
                      onClick={() => selectAssetFromLibrary(asset)} 
                      className="aspect-square bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-twitch-brand overflow-hidden transition-all group relative shadow-sm"
                    >
                      <img src={asset.data} alt={asset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-bold text-white bg-twitch-brand px-2 py-0.5 rounded-full shadow-lg">Usar</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default JudgePanel;
