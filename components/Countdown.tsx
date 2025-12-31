import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Clock,
  Plus,
  Minus,
  Gift,
  Coins,
  Heart,
  Zap,
  ChevronUp,
  ExternalLink,
  Minimize2,
  Maximize2,
  GripHorizontal,
} from 'lucide-react';
import { TwitchMessage } from '../types';
import { useI18n } from '../i18n';
import { countdownSync } from '../src/infrastructure/sync/FirebaseSync';
import { OBSOverlayUrl } from './OBSOverlayUrl';

interface CountdownConfig {
  initialDays: number;
  initialHours: number;
  initialMinutes: number;
  initialSeconds: number;
  // Sub tiers
  subTimeTier1: number;
  subTimeTier2: number;
  subTimeTier3: number;
  // Gift sub tiers
  giftSubTimeTier1: number;
  giftSubTimeTier2: number;
  giftSubTimeTier3: number;
  // Other events
  bitsPer100: number;
  raidTime: number;
  // Toggles
  enableSubs: boolean;
  enableBits: boolean;
  enableGiftSubs: boolean;
  enableRaids: boolean;
  // Overlay settings
  showValuesInOverlay: boolean;
}

// Overlay style settings
interface OverlayStyleConfig {
  fontFamily: 'mono' | 'sans' | 'serif' | 'display';
  fontSize: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  fontWeight: 'normal' | 'medium' | 'bold' | 'black';
  textShadow: 'none' | 'soft' | 'strong' | 'glow' | 'outline';
  showAddedTime: boolean;
  valuesPosition: 'bottom' | 'top' | 'hidden';
  valuesSize: 'sm' | 'md' | 'lg';
  // Personalización visual
  customTitle: string; // Título encima del timer (ej: "SUBATHON")
  customEndText: string; // Texto cuando termina (ej: "¡TIEMPO!")
  customImage: string; // URL o base64 de imagen/logo
  imagePosition: 'top' | 'bottom' | 'left' | 'right' | 'background' | 'none';
  imageSize: 'sm' | 'md' | 'lg';
}

const DEFAULT_OVERLAY_STYLE: OverlayStyleConfig = {
  fontFamily: 'mono',
  fontSize: 'lg',
  fontWeight: 'bold',
  textShadow: 'soft',
  showAddedTime: true,
  valuesPosition: 'bottom',
  valuesSize: 'sm',
  // Personalización
  customTitle: '',
  customEndText: '¡TIEMPO!',
  customImage: '',
  imagePosition: 'none',
  imageSize: 'md',
};

interface CountdownProps {
  onClose: () => void;
  chatMessages?: TwitchMessage[];
  isOverlayMode?: boolean;
}

const DEFAULT_CONFIG: CountdownConfig = {
  initialDays: 0,
  initialHours: 0,
  initialMinutes: 5,
  initialSeconds: 0,
  // Sub tiers (Tier 1 = $4.99, Tier 2 = $9.99, Tier 3 = $24.99)
  subTimeTier1: 60,
  subTimeTier2: 120,
  subTimeTier3: 300,
  // Gift sub tiers
  giftSubTimeTier1: 30,
  giftSubTimeTier2: 60,
  giftSubTimeTier3: 150,
  // Other events
  bitsPer100: 30,
  raidTime: 120,
  // Toggles
  enableSubs: true,
  enableBits: true,
  enableGiftSubs: true,
  enableRaids: false,
  // Overlay
  showValuesInOverlay: true,
};

const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', '#1a1a2e', 'transparent'];
const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
const COUNTDOWN_CHANNEL = 'countdown_sync';

// Font families for overlay
const FONT_FAMILIES = {
  mono: 'font-mono',
  sans: 'font-sans',
  serif: 'font-serif',
  display: 'font-display',
};

// Font sizes for overlay (responsive)
const FONT_SIZES = {
  sm: 'text-4xl sm:text-5xl md:text-6xl',
  md: 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl',
  lg: 'text-6xl sm:text-7xl md:text-8xl lg:text-9xl',
  xl: 'text-7xl sm:text-8xl md:text-9xl lg:text-[10rem]',
  xxl: 'text-8xl sm:text-9xl md:text-[10rem] lg:text-[12rem]',
};

// Font weights
const FONT_WEIGHTS = {
  normal: 'font-normal',
  medium: 'font-medium',
  bold: 'font-bold',
  black: 'font-black',
};

// Image sizes for overlay
const IMAGE_SIZES = {
  sm: { width: 60, height: 60 },
  md: { width: 100, height: 100 },
  lg: { width: 150, height: 150 },
};

// Text shadow styles
const getTextShadow = (style: string, color: string) => {
  const isLight = color === '#FFFFFF' || color === '#FFD700' || color === '#00FFFF' || color === '#4ADE80';
  switch (style) {
    case 'none': return 'none';
    case 'soft': return '0 4px 20px rgba(0,0,0,0.5)';
    case 'strong': return '0 4px 8px rgba(0,0,0,0.8), 0 8px 32px rgba(0,0,0,0.6)';
    case 'glow': return `0 0 20px ${color}80, 0 0 40px ${color}40, 0 0 60px ${color}20`;
    case 'outline': return isLight 
      ? '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 20px rgba(0,0,0,0.5)'
      : '-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff';
    default: return '0 4px 20px rgba(0,0,0,0.5)';
  }
};

// Values panel sizes
const VALUES_SIZES = {
  sm: { container: 'text-[10px] sm:text-xs', padding: 'px-2 py-1', icon: 12 },
  md: { container: 'text-xs sm:text-sm', padding: 'px-3 py-1.5', icon: 14 },
  lg: { container: 'text-sm sm:text-base', padding: 'px-4 py-2', icon: 16 },
};

interface CountdownState {
  timeLeft: number;
  isRunning: boolean;
  totalAdded: number;
  recentEvents: { type: string; amount: number; user: string }[];
  config?: CountdownConfig;
  overlayStyle?: OverlayStyleConfig;
}

export const Countdown: React.FC<CountdownProps> = ({
  onClose,
  chatMessages = [],
  isOverlayMode = false,
}) => {
  const { t } = useI18n();
  
  // Widget flotante - Estado minimizado/expandido y resize
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('countdown_widget_position');
    return saved ? JSON.parse(saved) : { x: 20, y: 80 };
  });
  const [widgetSize, setWidgetSize] = useState(() => {
    const saved = localStorage.getItem('countdown_widget_size');
    return saved ? JSON.parse(saved) : { width: 320, height: 450 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);
  
  const [overlayBgColor, setOverlayBgColor] = useState('#00FF00');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlaySize, setOverlaySize] = useState<'normal' | 'large' | 'huge'>('large');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState<OverlayStyleConfig>(() => {
    const saved = localStorage.getItem('countdown_overlay_style');
    return saved ? { ...DEFAULT_OVERLAY_STYLE, ...JSON.parse(saved) } : DEFAULT_OVERLAY_STYLE;
  });
  const [config, setConfig] = useState<CountdownConfig>(() => {
    const saved = localStorage.getItem('countdown_config');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });
  const [showConfig, setShowConfig] = useState(false);
  
  // Calcular tiempo inicial en segundos
  const getInitialTime = (cfg: CountdownConfig) => {
    return (cfg.initialDays * 86400) + (cfg.initialHours * 3600) + (cfg.initialMinutes * 60) + cfg.initialSeconds;
  };
  
  const [timeLeft, setTimeLeft] = useState(() => getInitialTime(config));
  const [isRunning, setIsRunning] = useState(false);
  const [totalAdded, setTotalAdded] = useState(0);
  const [recentEvents, setRecentEvents] = useState<{ type: string; amount: number; user: string }[]>([]);
  const lastProcessedIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Ref para estado actual
  const stateRef = useRef({ timeLeft, isRunning, totalAdded, recentEvents });
  useEffect(() => {
    stateRef.current = { timeLeft, isRunning, totalAdded, recentEvents, config, overlayStyle };
  }, [timeLeft, isRunning, totalAdded, recentEvents, config, overlayStyle]);

  // Save overlay style to localStorage
  useEffect(() => {
    localStorage.setItem('countdown_overlay_style', JSON.stringify(overlayStyle));
  }, [overlayStyle]);

  // Setup BroadcastChannel for sync
  useEffect(() => {
    channelRef.current = new BroadcastChannel(COUNTDOWN_CHANNEL);
    
    if (isOverlayMode) {
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') return;
        const state: CountdownState = event.data;
        setTimeLeft(state.timeLeft);
        setIsRunning(state.isRunning);
        setTotalAdded(state.totalAdded);
        setRecentEvents(state.recentEvents || []);
        if (state.config) setConfig(state.config);
        if (state.overlayStyle) setOverlayStyle(state.overlayStyle);
      };
      
      // Subscribe to Firebase for real-time sync (works across browsers/OBS)
      const unsubscribeFirebase = countdownSync.subscribe((data) => {
        if (data) {
          setTimeLeft(Math.floor((data.endTime - Date.now()) / 1000));
          setIsRunning(data.isActive);
        }
      });
      
      setTimeout(() => channelRef.current?.postMessage({ type: 'request_sync' }), 100);
      
      return () => { 
        channelRef.current?.close(); 
        unsubscribeFirebase();
      };
    } else {
      channelRef.current.onmessage = (event) => {
        if (event.data?.type === 'request_sync') {
          const s = stateRef.current;
          channelRef.current?.postMessage({ timeLeft: s.timeLeft, isRunning: s.isRunning, totalAdded: s.totalAdded, recentEvents: s.recentEvents, config: s.config, overlayStyle: s.overlayStyle });
        }
      };
      
      return () => { channelRef.current?.close(); };
    }
  }, [isOverlayMode]);

  const syncToOverlay = useCallback(() => {
    if (!isOverlayMode && channelRef.current) {
      channelRef.current.postMessage({ timeLeft, isRunning, totalAdded, recentEvents, config, overlayStyle });
      // Also sync to Firebase for OBS Browser Source
      countdownSync.update({
        endTime: Date.now() + (timeLeft * 1000),
        label: 'Countdown',
        isActive: isRunning
      }).catch(err => console.error('Firebase countdown sync error:', err));
    }
  }, [isOverlayMode, timeLeft, isRunning, totalAdded, recentEvents, config, overlayStyle]);

  // Sync on state changes
  useEffect(() => { syncToOverlay(); }, [timeLeft, isRunning, totalAdded, recentEvents, config, overlayStyle]);

  useEffect(() => {
    localStorage.setItem('countdown_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    if (isRunning && timeLeft > 0 && !isOverlayMode) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft, isOverlayMode]);

  // Helper para obtener tiempo según tier
  const getSubTimeByTier = (tier: string | number): number => {
    const tierNum = typeof tier === 'string' ? parseInt(tier) : tier;
    if (tierNum >= 3000 || tierNum === 3) return config.subTimeTier3;
    if (tierNum >= 2000 || tierNum === 2) return config.subTimeTier2;
    return config.subTimeTier1;
  };

  const getGiftSubTimeByTier = (tier: string | number): number => {
    const tierNum = typeof tier === 'string' ? parseInt(tier) : tier;
    if (tierNum >= 3000 || tierNum === 3) return config.giftSubTimeTier3;
    if (tierNum >= 2000 || tierNum === 2) return config.giftSubTimeTier2;
    return config.giftSubTimeTier1;
  };

  useEffect(() => {
    if (!isRunning || isOverlayMode) return;
    const newMessages = chatMessages.slice(lastProcessedIndexRef.current);
    if (newMessages.length === 0) return;
    lastProcessedIndexRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase();
      
      // Subs - detectar tier si está disponible en el mensaje
      if (config.enableSubs && msgLower.includes('subscribed')) {
        // Intentar detectar tier del mensaje (ej: "subscribed at Tier 3")
        const tierMatch = msgLower.match(/tier\s*(\d)/i);
        const tier = tierMatch ? parseInt(tierMatch[1]) : 1;
        const timeToAdd = getSubTimeByTier(tier);
        addTime(timeToAdd, tier > 1 ? `sub-t${tier}` : 'sub', msg.username);
      }
      
      // Bits
      if (config.enableBits) {
        const cheerMatch = msgLower.match(/cheer(\d+)/i);
        if (cheerMatch) {
          const bits = parseInt(cheerMatch[1]);
          const timeToAdd = Math.floor(bits / 100) * config.bitsPer100;
          if (timeToAdd > 0) addTime(timeToAdd, 'bits', msg.username);
        }
      }
      
      // Gift subs - detectar tier y cantidad
      if (config.enableGiftSubs && msgLower.includes('gifted')) {
        const tierMatch = msgLower.match(/tier\s*(\d)/i);
        const tier = tierMatch ? parseInt(tierMatch[1]) : 1;
        // Detectar cantidad de gifts (ej: "gifted 5 subs")
        const countMatch = msgLower.match(/gifted\s+(\d+)/i);
        const count = countMatch ? parseInt(countMatch[1]) : 1;
        const timePerGift = getGiftSubTimeByTier(tier);
        const totalTime = timePerGift * count;
        addTime(totalTime, tier > 1 ? `gift-t${tier}` : 'gift', msg.username);
      }
      
      // Raids
      if (config.enableRaids && msgLower.includes('is raiding')) {
        addTime(config.raidTime, 'raid', msg.username);
      }
    });
  }, [chatMessages, isRunning, config, isOverlayMode]);

  const addTime = useCallback((seconds: number, type: string, user: string) => {
    setTimeLeft((prev) => prev + seconds);
    setTotalAdded((prev) => prev + seconds);
    setRecentEvents((prev) => [{ type, amount: seconds, user }, ...prev.slice(0, 4)]);
  }, []);

  const manualAddTime = (seconds: number) => addTime(seconds, 'manual', 'Streamer');

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Formato compacto para el widget minimizado
  const formatTimeCompact = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hrs}h`;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Quitar tiempo manualmente
  const manualRemoveTime = (seconds: number) => {
    setTimeLeft((prev) => Math.max(0, prev - seconds));
  };

  const reset = () => {
    setIsRunning(false);
    setTimeLeft(getInitialTime(config));
    setTotalAdded(0);
    setRecentEvents([]);
    lastProcessedIndexRef.current = chatMessages.length;
  };

  const toggleRunning = () => {
    if (!isRunning) lastProcessedIndexRef.current = chatMessages.length;
    setIsRunning(!isRunning);
  };

  const updateConfig = (key: keyof CountdownConfig, value: number | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const openOverlayWindow = () => {
    const width = 400;
    const height = 350;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayCountdown=true`, 'CountdownOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sub': return <Heart className="text-pink-500" size={14} />;
      case 'sub-t2': return <Heart className="text-blue-500" size={14} />;
      case 'sub-t3': return <Heart className="text-yellow-500" size={14} />;
      case 'bits': return <Coins className="text-yellow-500" size={14} />;
      case 'gift': return <Gift className="text-purple-500" size={14} />;
      case 'gift-t2': return <Gift className="text-blue-500" size={14} />;
      case 'gift-t3': return <Gift className="text-yellow-500" size={14} />;
      case 'raid': return <Zap className="text-orange-500" size={14} />;
      default: return <Plus className="text-green-500" size={14} />;
    }
  };

  // Formatear tiempo para mostrar en overlay
  const formatTimeLabel = (seconds: number): string => {
    if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
    if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
    return `${seconds}s`;
  };

  const isLowTime = timeLeft <= 60 && timeLeft > 0;
  const isCritical = timeLeft <= 10 && timeLeft > 0; // Últimos 10 segundos
  const isFinalCountdown = timeLeft <= 5 && timeLeft > 0; // Últimos 5 segundos - animación especial
  const isFinished = timeLeft === 0;

  // Get computed styles for overlay
  const getOverlayFontClass = () => {
    return `${FONT_FAMILIES[overlayStyle.fontFamily]} ${FONT_SIZES[overlayStyle.fontSize]} ${FONT_WEIGHTS[overlayStyle.fontWeight]}`;
  };

  const getOverlayTextShadowStyle = () => {
    return getTextShadow(overlayStyle.textShadow, overlayTextColor);
  };

  // Guardar posición del widget en localStorage
  useEffect(() => {
    if (!isOverlayMode) {
      localStorage.setItem('countdown_widget_position', JSON.stringify(position));
    }
  }, [position, isOverlayMode]);

  // Guardar tamaño del widget en localStorage
  useEffect(() => {
    if (!isOverlayMode) {
      localStorage.setItem('countdown_widget_size', JSON.stringify(widgetSize));
    }
  }, [widgetSize, isOverlayMode]);

  // Drag handlers para el widget
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
    setIsDragging(true);
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  };

  useEffect(() => {
    if (isOverlayMode) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y));
        setPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        e.preventDefault();
        const deltaX = e.clientX - resizeStart.current.x;
        const deltaY = e.clientY - resizeStart.current.y;
        const newWidth = Math.max(260, Math.min(450, resizeStart.current.width + deltaX));
        const newHeight = Math.max(300, Math.min(600, resizeStart.current.height + deltaY));
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
  }, [isDragging, isResizing, isOverlayMode]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, width: widgetSize.width, height: widgetSize.height };
  };

  // Tamaños de texto para overlay
  const getOverlayTextSize = () => {
    switch (overlaySize) {
      case 'normal': return 'text-7xl';
      case 'large': return 'text-9xl';
      case 'huge': return 'text-[12rem]';
    }
  };

  // Helper to update overlay style
  const updateOverlayStyle = <K extends keyof OverlayStyleConfig>(key: K, value: OverlayStyleConfig[K]) => {
    setOverlayStyle(prev => ({ ...prev, [key]: value }));
  };

  // Render values panel for overlay
  const renderValuesPanel = () => {
    if (overlayStyle.valuesPosition === 'hidden' || !config.showValuesInOverlay || isFinalCountdown) return null;
    
    const sizeConfig = VALUES_SIZES[overlayStyle.valuesSize];
    const positionClass = overlayStyle.valuesPosition === 'top' ? 'top-2 sm:top-4' : 'bottom-2 sm:bottom-4';
    
    return (
      <div className={`fixed ${positionClass} left-1/2 -translate-x-1/2 flex flex-wrap gap-1 sm:gap-2 justify-center max-w-[95vw] sm:max-w-xl px-2`}>
        {config.enableSubs && (
          <div className={`flex items-center gap-1 sm:gap-2 bg-black/70 backdrop-blur rounded-lg ${sizeConfig.padding}`}>
            <Heart className="text-pink-500 flex-shrink-0" size={sizeConfig.icon} />
            <span className={`text-white font-medium ${sizeConfig.container}`}>Sub:</span>
            <span className={`text-pink-400 ${sizeConfig.container}`}>T1 +{formatTimeLabel(config.subTimeTier1)}</span>
            <span className={`text-blue-400 ${sizeConfig.container} hidden sm:inline`}>T2 +{formatTimeLabel(config.subTimeTier2)}</span>
            <span className={`text-yellow-400 ${sizeConfig.container} hidden sm:inline`}>T3 +{formatTimeLabel(config.subTimeTier3)}</span>
          </div>
        )}
        {config.enableGiftSubs && (
          <div className={`flex items-center gap-1 sm:gap-2 bg-black/70 backdrop-blur rounded-lg ${sizeConfig.padding}`}>
            <Gift className="text-purple-500 flex-shrink-0" size={sizeConfig.icon} />
            <span className={`text-white font-medium ${sizeConfig.container}`}>Gift:</span>
            <span className={`text-pink-400 ${sizeConfig.container}`}>+{formatTimeLabel(config.giftSubTimeTier1)}</span>
          </div>
        )}
        {config.enableBits && (
          <div className={`flex items-center gap-1 sm:gap-2 bg-black/70 backdrop-blur rounded-lg ${sizeConfig.padding}`}>
            <Coins className="text-yellow-500 flex-shrink-0" size={sizeConfig.icon} />
            <span className={`text-white font-medium ${sizeConfig.container}`}>100 Bits:</span>
            <span className={`text-yellow-400 ${sizeConfig.container}`}>+{formatTimeLabel(config.bitsPer100)}</span>
          </div>
        )}
        {config.enableRaids && (
          <div className={`flex items-center gap-1 sm:gap-2 bg-black/70 backdrop-blur rounded-lg ${sizeConfig.padding}`}>
            <Zap className="text-orange-500 flex-shrink-0" size={sizeConfig.icon} />
            <span className={`text-white font-medium ${sizeConfig.container}`}>Raid:</span>
            <span className={`text-orange-400 ${sizeConfig.container}`}>+{formatTimeLabel(config.raidTime)}</span>
          </div>
        )}
      </div>
    );
  };


  // Overlay Mode - Solo visualización
  if (isOverlayMode) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden" style={{ backgroundColor: overlayBgColor }}>
        <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
          <Settings size={18} />
        </button>
        
        {showOverlaySettings && (
          <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-72 max-h-[80vh] overflow-y-auto">
            {/* Chroma Key */}
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.chromaKey}</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {OVERLAY_BG_COLORS.map((color) => (
                <button 
                  key={color} 
                  onClick={() => setOverlayBgColor(color)} 
                  className={`w-7 h-7 rounded border-2 ${overlayBgColor === color ? 'border-white scale-110' : 'border-transparent'} ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`} 
                  style={{ backgroundColor: color === 'transparent' ? undefined : color }} 
                />
              ))}
            </div>
            
            {/* Text Color */}
            <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.textColor}</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {OVERLAY_TEXT_COLORS.map((color) => (
                <button 
                  key={color} 
                  onClick={() => setOverlayTextColor(color)} 
                  className={`w-7 h-7 rounded border-2 ${overlayTextColor === color ? 'border-white scale-110' : 'border-zinc-600'}`} 
                  style={{ backgroundColor: color }} 
                />
              ))}
            </div>
            
            {/* Font Family */}
            <p className="text-xs text-zinc-400 mb-2 font-bold">Fuente</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {(['mono', 'sans', 'serif', 'display'] as const).map((font) => (
                <button 
                  key={font} 
                  onClick={() => updateOverlayStyle('fontFamily', font)} 
                  className={`px-2 py-1 rounded text-xs font-medium ${overlayStyle.fontFamily === font ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'} ${FONT_FAMILIES[font]}`}
                >
                  {font === 'mono' ? 'Mono' : font === 'sans' ? 'Sans' : font === 'serif' ? 'Serif' : 'Display'}
                </button>
              ))}
            </div>
            
            {/* Font Size */}
            <p className="text-xs text-zinc-400 mb-2 font-bold">Tamaño</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {(['sm', 'md', 'lg', 'xl', 'xxl'] as const).map((size) => (
                <button 
                  key={size} 
                  onClick={() => updateOverlayStyle('fontSize', size)} 
                  className={`px-2 py-1 rounded text-xs font-medium ${overlayStyle.fontSize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
            
            {/* Font Weight */}
            <p className="text-xs text-zinc-400 mb-2 font-bold">Grosor</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {(['normal', 'medium', 'bold', 'black'] as const).map((weight) => (
                <button 
                  key={weight} 
                  onClick={() => updateOverlayStyle('fontWeight', weight)} 
                  className={`px-2 py-1 rounded text-xs ${overlayStyle.fontWeight === weight ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'} ${FONT_WEIGHTS[weight]}`}
                >
                  {weight === 'normal' ? 'Normal' : weight === 'medium' ? 'Medium' : weight === 'bold' ? 'Bold' : 'Black'}
                </button>
              ))}
            </div>
            
            {/* Text Shadow */}
            <p className="text-xs text-zinc-400 mb-2 font-bold">Sombra</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {(['none', 'soft', 'strong', 'glow', 'outline'] as const).map((shadow) => (
                <button 
                  key={shadow} 
                  onClick={() => updateOverlayStyle('textShadow', shadow)} 
                  className={`px-2 py-1 rounded text-xs font-medium ${overlayStyle.textShadow === shadow ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
                >
                  {shadow === 'none' ? 'Sin' : shadow === 'soft' ? 'Suave' : shadow === 'strong' ? 'Fuerte' : shadow === 'glow' ? 'Brillo' : 'Borde'}
                </button>
              ))}
            </div>
            
            {/* Values Panel Position */}
            <p className="text-xs text-zinc-400 mb-2 font-bold">Panel de valores</p>
            <div className="flex gap-1 mb-3 flex-wrap">
              {(['top', 'bottom', 'hidden'] as const).map((pos) => (
                <button 
                  key={pos} 
                  onClick={() => updateOverlayStyle('valuesPosition', pos)} 
                  className={`px-2 py-1 rounded text-xs font-medium ${overlayStyle.valuesPosition === pos ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
                >
                  {pos === 'top' ? 'Arriba' : pos === 'bottom' ? 'Abajo' : 'Oculto'}
                </button>
              ))}
            </div>
            
            {/* Values Size */}
            {overlayStyle.valuesPosition !== 'hidden' && (
              <>
                <p className="text-xs text-zinc-400 mb-2 font-bold">Tamaño valores</p>
                <div className="flex gap-1 mb-3">
                  {(['sm', 'md', 'lg'] as const).map((size) => (
                    <button 
                      key={size} 
                      onClick={() => updateOverlayStyle('valuesSize', size)} 
                      className={`flex-1 py-1 rounded text-xs font-medium ${overlayStyle.valuesSize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
                    >
                      {size === 'sm' ? 'Pequeño' : size === 'md' ? 'Medio' : 'Grande'}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            {/* Show Added Time Toggle */}
            <div className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
              <button 
                onClick={() => updateOverlayStyle('showAddedTime', !overlayStyle.showAddedTime)} 
                className={`w-8 h-4 rounded-full transition-colors ${overlayStyle.showAddedTime ? 'bg-green-500' : 'bg-zinc-600'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${overlayStyle.showAddedTime ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-white">Mostrar tiempo añadido</span>
            </div>
          </div>
        )}

        {/* Animación especial últimos 5 segundos - Solo el número gigante */}
        {isFinalCountdown ? (
          <div className="relative flex items-center justify-center">
            {/* Círculos de onda expansiva */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                key={`ring1-${timeLeft}`}
                className="absolute w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 rounded-full border-4 border-red-500/60 animate-ping"
                style={{ animationDuration: '1s' }}
              />
              <div 
                key={`ring2-${timeLeft}`}
                className="absolute w-24 h-24 sm:w-36 sm:h-36 md:w-48 md:h-48 rounded-full border-4 border-orange-500/60 animate-ping"
                style={{ animationDuration: '0.8s', animationDelay: '0.1s' }}
              />
              <div 
                key={`ring3-${timeLeft}`}
                className="absolute w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full border-4 border-yellow-500/60 animate-ping"
                style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}
              />
            </div>
            {/* Número gigante con animación de escala */}
            <div 
              key={`number-${timeLeft}`}
              className="text-[8rem] sm:text-[12rem] md:text-[16rem] lg:text-[20rem] font-black leading-none animate-[scaleIn_0.3s_ease-out]"
              style={{ 
                color: timeLeft <= 3 ? '#ef4444' : timeLeft <= 4 ? '#f97316' : '#fbbf24',
                textShadow: `0 0 30px ${timeLeft <= 3 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(251, 191, 36, 0.8)'}, 0 0 60px ${timeLeft <= 3 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(251, 191, 36, 0.5)'}`,
                animation: 'scaleIn 0.3s ease-out, pulse 0.5s ease-in-out infinite'
              }}
            >
              {timeLeft}
            </div>
          </div>
        ) : (
          <>
            {/* Imagen de fondo */}
            {overlayStyle.customImage && overlayStyle.imagePosition === 'background' && (
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url(${overlayStyle.customImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}

            {/* Contenedor principal con flexbox para posicionar imagen */}
            <div className={`flex items-center justify-center gap-4 sm:gap-8 ${
              overlayStyle.imagePosition === 'left' || overlayStyle.imagePosition === 'right' ? 'flex-row' : 'flex-col'
            }`}>
              {/* Imagen arriba o izquierda */}
              {overlayStyle.customImage && (overlayStyle.imagePosition === 'top' || overlayStyle.imagePosition === 'left') && (
                <img 
                  src={overlayStyle.customImage} 
                  alt="" 
                  style={{ 
                    width: IMAGE_SIZES[overlayStyle.imageSize].width, 
                    height: IMAGE_SIZES[overlayStyle.imageSize].height,
                    objectFit: 'contain'
                  }}
                  className="drop-shadow-lg"
                />
              )}

              {/* Timer y título */}
              <div className={`text-center transition-all duration-300 ${isCritical ? 'animate-bounce' : ''} px-4`}>
                {/* Título personalizado */}
                {overlayStyle.customTitle && !isFinished && (
                  <div 
                    className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 drop-shadow-lg"
                    style={{ color: overlayTextColor, textShadow: getOverlayTextShadowStyle() }}
                  >
                    {overlayStyle.customTitle}
                  </div>
                )}

                {/* Timer o texto de fin */}
                <div 
                  className={`${getOverlayFontClass()} drop-shadow-2xl transition-all duration-300 leading-tight ${
                    isFinished ? 'text-red-500 animate-pulse scale-110' : 
                    isCritical ? 'animate-pulse scale-110' : 
                    isLowTime ? '' : ''
                  }`}
                  style={{ 
                    color: isFinished ? '#ef4444' : isCritical ? '#f97316' : isLowTime ? '#fb923c' : overlayTextColor,
                    textShadow: isCritical ? '0 0 40px rgba(249, 115, 22, 0.8), 0 0 80px rgba(249, 115, 22, 0.4)' : getOverlayTextShadowStyle()
                  }}
                >
                  {isFinished ? (overlayStyle.customEndText || '¡TIEMPO!') : formatTime(timeLeft)}
                </div>
                {overlayStyle.showAddedTime && totalAdded > 0 && !isFinished && (
                  <p className="text-green-400 text-lg sm:text-xl md:text-2xl mt-2 sm:mt-4 font-bold drop-shadow-lg">+{formatTime(totalAdded)} añadido</p>
                )}
              </div>

              {/* Imagen abajo o derecha */}
              {overlayStyle.customImage && (overlayStyle.imagePosition === 'bottom' || overlayStyle.imagePosition === 'right') && (
                <img 
                  src={overlayStyle.customImage} 
                  alt="" 
                  style={{ 
                    width: IMAGE_SIZES[overlayStyle.imageSize].width, 
                    height: IMAGE_SIZES[overlayStyle.imageSize].height,
                    objectFit: 'contain'
                  }}
                  className="drop-shadow-lg"
                />
              )}
            </div>

            {/* Efecto de urgencia en últimos 10 segundos */}
            {isCritical && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-red-500/10 animate-pulse" />
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
              </div>
            )}
          </>
        )}

        {/* Recent events - responsive */}
        {recentEvents.length > 0 && !isFinalCountdown && (
          <div className="mt-4 sm:mt-6 space-y-1 sm:space-y-2 px-2 max-w-md w-full">
            {recentEvents.slice(0, 3).map((event, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3 bg-black/60 backdrop-blur rounded-lg sm:rounded-xl px-3 sm:px-5 py-2 sm:py-3 text-white text-sm sm:text-lg animate-fade-in">
                {getEventIcon(event.type)}
                <span className="font-medium truncate flex-1">{event.user}</span>
                <span className="text-green-400 font-bold">+{event.amount}s</span>
              </div>
            ))}
          </div>
        )}

        {/* Panel de valores - Responsive */}
        {renderValuesPanel()}
      </div>
    );
  }

  // Widget flotante - Modo minimizado
  if (!isOverlayMode && isMinimized) {
    return (
      <div
        ref={widgetRef}
        className="fixed z-50 select-none"
        style={{ left: position.x, top: position.y }}
      >
        <div
          onMouseDown={handleMouseDown}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-2xl border backdrop-blur-sm cursor-move transition-all ${
            isFinished ? 'bg-red-900/90 border-red-500/50' : 
            isLowTime ? 'bg-orange-900/90 border-orange-500/50' : 
            'bg-zinc-900/95 border-zinc-700/50'
          } ${isRunning ? 'ring-2 ring-green-500/50' : ''}`}
        >
          <GripHorizontal size={14} className="text-zinc-500" />
          <Clock size={16} className={isRunning ? 'text-green-400 animate-pulse' : 'text-cyan-400'} />
          <span className={`font-mono font-bold text-lg ${
            isFinished ? 'text-red-400' : isLowTime ? 'text-orange-400' : 'text-white'
          }`}>
            {formatTimeCompact(timeLeft)}
          </span>
          {totalAdded > 0 && <span className="text-green-400 text-xs">+{formatTimeCompact(totalAdded)}</span>}
          <button
            onClick={toggleRunning}
            className={`p-1.5 rounded-lg transition-colors ${isRunning ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
          </button>
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

  // Widget flotante - Modo expandido (modo normal, no overlay)
  return (
    <div
      ref={widgetRef}
      className="fixed z-50 select-none"
      style={{ left: position.x, top: position.y }}
    >
      <div 
        className={`bg-zinc-900/95 backdrop-blur-sm rounded-2xl shadow-2xl border transition-colors overflow-hidden flex flex-col relative ${
          isFinished ? 'border-red-500/50' : isLowTime ? 'border-orange-500/50' : 'border-zinc-700/50'
        } ${isRunning ? 'ring-2 ring-green-500/30' : ''} ${isResizing ? 'ring-2 ring-cyan-500/50' : ''}`}
        style={{ width: widgetSize.width, height: widgetSize.height }}
      >
        {/* Header - Draggable */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 cursor-move shrink-0 bg-zinc-900/50"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal size={14} className="text-zinc-500" />
            <Clock size={16} className="text-cyan-400" />
            <span className="text-sm font-bold text-white">Countdown</span>
            {isRunning && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
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

        {/* Timer Display - Scrollable content */}
        <div className="p-3 overflow-y-auto flex-1 space-y-3">
          {/* Timer principal */}
          <div className={`text-center p-3 rounded-xl ${isFinished ? 'bg-red-500/20' : isLowTime ? 'bg-orange-500/20' : 'bg-zinc-800/50'}`}>
            <div className={`font-mono font-bold transition-all ${
              widgetSize.width < 300 ? 'text-3xl' : 'text-4xl'
            } ${isFinished ? 'text-red-400 animate-pulse' : isLowTime ? 'text-orange-400 animate-pulse' : 'text-white'}`}>
              {formatTime(timeLeft)}
            </div>
            {totalAdded > 0 && <p className="text-green-400 text-xs mt-1">+{formatTime(totalAdded)} añadido</p>}
          </div>

          {/* Quick Add/Remove Buttons - Más compactos */}
          <div className="space-y-1.5">
            <div className="flex gap-1 justify-center flex-wrap">
              {[
                { secs: 30, label: '30s' },
                { secs: 60, label: '1m' },
                { secs: 300, label: '5m' },
                { secs: 600, label: '10m' },
                { secs: 1800, label: '30m' },
                { secs: 3600, label: '1h' },
              ].map(({ secs, label }) => (
                <button key={secs} onClick={() => manualAddTime(secs)} className="px-1.5 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-[10px] font-medium transition-all flex items-center gap-0.5">
                  <Plus size={9} /> {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 justify-center flex-wrap">
              {[
                { secs: 30, label: '30s' },
                { secs: 60, label: '1m' },
                { secs: 300, label: '5m' },
                { secs: 600, label: '10m' },
                { secs: 1800, label: '30m' },
                { secs: 3600, label: '1h' },
              ].map(({ secs, label }) => (
                <button key={secs} onClick={() => manualRemoveTime(secs)} className="px-1.5 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-[10px] font-medium transition-all flex items-center gap-0.5">
                  <Minus size={9} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={toggleRunning} className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-bold rounded-lg transition-all text-xs ${isRunning ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}>
              {isRunning ? <Pause size={14} /> : <Play size={14} />} {isRunning ? 'Pausar' : 'Iniciar'}
            </button>
            <button onClick={reset} className="px-2.5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-all" title="Reiniciar">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => setShowConfig(!showConfig)} className={`px-2.5 py-2 rounded-lg transition-all ${showConfig ? 'bg-twitch-brand text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`} title="Configuración">
              <Settings size={14} />
            </button>
          </div>

          {/* OBS Overlay URL */}
          <OBSOverlayUrl overlayParam="overlayCountdown" title="el countdown" />

          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <div className="space-y-1 max-h-20 overflow-y-auto">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Eventos</p>
              {recentEvents.slice(0, 3).map((event, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-zinc-800/50 rounded px-2 py-1">
                  {getEventIcon(event.type)}
                  <span className="text-zinc-300 truncate flex-1">{event.user}</span>
                  <span className="text-green-400">+{event.amount}s</span>
                </div>
              ))}
            </div>
          )}

          {/* Config Panel */}
          {showConfig && (
            <div className="bg-zinc-800/50 rounded-xl p-3 space-y-3 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white">Configuración</p>
                <button onClick={() => setShowConfig(false)} className="text-zinc-400 hover:text-white"><ChevronUp size={14} /></button>
              </div>
              
              {/* Tiempo inicial - Días, Horas, Minutos, Segundos */}
              <div>
                <p className="text-[10px] text-zinc-400 mb-2 font-bold uppercase">Tiempo inicial</p>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label htmlFor="countdown-days" className="text-[9px] text-zinc-500 block mb-0.5 text-center">Días</label>
                    <input type="number" id="countdown-days" name="countdown-days" min="0" max="365" value={config.initialDays} onChange={(e) => updateConfig('initialDays', Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-zinc-700 rounded-lg px-1.5 py-1.5 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label htmlFor="countdown-hours" className="text-[9px] text-zinc-500 block mb-0.5 text-center">Horas</label>
                    <input type="number" id="countdown-hours" name="countdown-hours" min="0" max="23" value={config.initialHours} onChange={(e) => updateConfig('initialHours', Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))} className="w-full bg-zinc-700 rounded-lg px-1.5 py-1.5 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label htmlFor="countdown-minutes" className="text-[9px] text-zinc-500 block mb-0.5 text-center">Min</label>
                    <input type="number" id="countdown-minutes" name="countdown-minutes" min="0" max="59" value={config.initialMinutes} onChange={(e) => updateConfig('initialMinutes', Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} className="w-full bg-zinc-700 rounded-lg px-1.5 py-1.5 text-white text-xs text-center" />
                  </div>
                  <div>
                    <label htmlFor="countdown-seconds" className="text-[9px] text-zinc-500 block mb-0.5 text-center">Seg</label>
                    <input type="number" id="countdown-seconds" name="countdown-seconds" min="0" max="59" value={config.initialSeconds} onChange={(e) => updateConfig('initialSeconds', Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} className="w-full bg-zinc-700 rounded-lg px-1.5 py-1.5 text-white text-xs text-center" />
                  </div>
                </div>
                {/* Presets rápidos */}
                <div className="flex gap-1 mt-2 flex-wrap">
                  {[
                    { label: '5m', d: 0, h: 0, m: 5, s: 0 },
                    { label: '30m', d: 0, h: 0, m: 30, s: 0 },
                    { label: '1h', d: 0, h: 1, m: 0, s: 0 },
                    { label: '2h', d: 0, h: 2, m: 0, s: 0 },
                    { label: '6h', d: 0, h: 6, m: 0, s: 0 },
                    { label: '12h', d: 0, h: 12, m: 0, s: 0 },
                    { label: '24h', d: 1, h: 0, m: 0, s: 0 },
                    { label: '48h', d: 2, h: 0, m: 0, s: 0 },
                    { label: '1 sem', d: 7, h: 0, m: 0, s: 0 },
                  ].map(({ label, d, h, m, s }) => (
                    <button
                      key={label}
                      onClick={() => setConfig(prev => ({ ...prev, initialDays: d, initialHours: h, initialMinutes: m, initialSeconds: s }))}
                      className="px-2 py-1 bg-zinc-600/50 hover:bg-zinc-600 text-zinc-300 hover:text-white rounded text-[9px] font-medium transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Subs por tier */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded-lg">
                  <button onClick={() => updateConfig('enableSubs', !config.enableSubs)} className={`w-8 h-4 rounded-full transition-colors ${config.enableSubs ? 'bg-pink-500' : 'bg-zinc-600'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${config.enableSubs ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <Heart className="text-pink-500" size={14} />
                  <span className="text-xs text-white flex-1">Subs</span>
                </div>
                {config.enableSubs && (
                  <div className="ml-4 grid grid-cols-3 gap-1.5 p-2 bg-zinc-800/50 rounded-lg">
                    <div>
                      <label htmlFor="sub-time-tier1" className="text-[9px] text-pink-400 block mb-0.5 text-center">Tier 1</label>
                      <div className="flex items-center gap-0.5">
                        <input type="number" id="sub-time-tier1" name="sub-time-tier1" min="0" value={config.subTimeTier1} onChange={(e) => updateConfig('subTimeTier1', parseInt(e.target.value) || 0)} className="w-full bg-zinc-600 rounded px-1 py-1 text-white text-[10px] text-center" />
                        <span className="text-[9px] text-zinc-500">s</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="sub-time-tier2" className="text-[9px] text-blue-400 block mb-0.5 text-center">Tier 2</label>
                      <div className="flex items-center gap-0.5">
                        <input type="number" id="sub-time-tier2" name="sub-time-tier2" min="0" value={config.subTimeTier2} onChange={(e) => updateConfig('subTimeTier2', parseInt(e.target.value) || 0)} className="w-full bg-zinc-600 rounded px-1 py-1 text-white text-[10px] text-center" />
                        <span className="text-[9px] text-zinc-500">s</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="sub-time-tier3" className="text-[9px] text-yellow-400 block mb-0.5 text-center">Tier 3</label>
                      <div className="flex items-center gap-0.5">
                        <input type="number" id="sub-time-tier3" name="sub-time-tier3" min="0" value={config.subTimeTier3} onChange={(e) => updateConfig('subTimeTier3', parseInt(e.target.value) || 0)} className="w-full bg-zinc-600 rounded px-1 py-1 text-white text-[10px] text-center" />
                        <span className="text-[9px] text-zinc-500">s</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gift Subs por tier */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded-lg">
                  <button onClick={() => updateConfig('enableGiftSubs', !config.enableGiftSubs)} className={`w-8 h-4 rounded-full transition-colors ${config.enableGiftSubs ? 'bg-purple-500' : 'bg-zinc-600'}`}>
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${config.enableGiftSubs ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <Gift className="text-purple-500" size={14} />
                  <span className="text-xs text-white flex-1">Gift Subs</span>
                </div>
                {config.enableGiftSubs && (
                  <div className="ml-4 grid grid-cols-3 gap-1.5 p-2 bg-zinc-800/50 rounded-lg">
                    <div>
                      <label htmlFor="gift-sub-time-tier1" className="text-[9px] text-pink-400 block mb-0.5 text-center">Tier 1</label>
                      <div className="flex items-center gap-0.5">
                        <input type="number" id="gift-sub-time-tier1" name="gift-sub-time-tier1" min="0" value={config.giftSubTimeTier1} onChange={(e) => updateConfig('giftSubTimeTier1', parseInt(e.target.value) || 0)} className="w-full bg-zinc-600 rounded px-1 py-1 text-white text-[10px] text-center" />
                        <span className="text-[9px] text-zinc-500">s</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="gift-sub-time-tier2" className="text-[9px] text-blue-400 block mb-0.5 text-center">Tier 2</label>
                      <div className="flex items-center gap-0.5">
                        <input type="number" id="gift-sub-time-tier2" name="gift-sub-time-tier2" min="0" value={config.giftSubTimeTier2} onChange={(e) => updateConfig('giftSubTimeTier2', parseInt(e.target.value) || 0)} className="w-full bg-zinc-600 rounded px-1 py-1 text-white text-[10px] text-center" />
                        <span className="text-[9px] text-zinc-500">s</span>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="gift-sub-time-tier3" className="text-[9px] text-yellow-400 block mb-0.5 text-center">Tier 3</label>
                      <div className="flex items-center gap-0.5">
                        <input type="number" id="gift-sub-time-tier3" name="gift-sub-time-tier3" min="0" value={config.giftSubTimeTier3} onChange={(e) => updateConfig('giftSubTimeTier3', parseInt(e.target.value) || 0)} className="w-full bg-zinc-600 rounded px-1 py-1 text-white text-[10px] text-center" />
                        <span className="text-[9px] text-zinc-500">s</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bits */}
              <div className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded-lg">
                <button onClick={() => updateConfig('enableBits', !config.enableBits)} className={`w-8 h-4 rounded-full transition-colors ${config.enableBits ? 'bg-yellow-500' : 'bg-zinc-600'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${config.enableBits ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <Coins className="text-yellow-500" size={14} />
                <label htmlFor="bits-per-100" className="text-xs text-white flex-1">Bits/100</label>
                <input type="number" id="bits-per-100" name="bits-per-100" min="0" value={config.bitsPer100} onChange={(e) => updateConfig('bitsPer100', parseInt(e.target.value) || 0)} disabled={!config.enableBits} className="w-12 bg-zinc-600 rounded px-1.5 py-0.5 text-white text-xs text-center disabled:opacity-50" />
                <span className="text-[10px] text-zinc-400">s</span>
              </div>

              {/* Raids */}
              <div className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded-lg">
                <button onClick={() => updateConfig('enableRaids', !config.enableRaids)} className={`w-8 h-4 rounded-full transition-colors ${config.enableRaids ? 'bg-orange-500' : 'bg-zinc-600'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${config.enableRaids ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <Zap className="text-orange-500" size={14} />
                <label htmlFor="raid-time" className="text-xs text-white flex-1">Raids</label>
                <input type="number" id="raid-time" name="raid-time" min="0" value={config.raidTime} onChange={(e) => updateConfig('raidTime', parseInt(e.target.value) || 0)} disabled={!config.enableRaids} className="w-12 bg-zinc-600 rounded px-1.5 py-0.5 text-white text-xs text-center disabled:opacity-50" />
                <span className="text-[10px] text-zinc-400">s</span>
              </div>

              {/* Toggle mostrar valores en overlay */}
              <div className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded-lg">
                <button onClick={() => updateConfig('showValuesInOverlay', !config.showValuesInOverlay)} className={`w-8 h-4 rounded-full transition-colors ${config.showValuesInOverlay ? 'bg-cyan-500' : 'bg-zinc-600'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${config.showValuesInOverlay ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <ExternalLink className="text-cyan-500" size={14} />
                <span className="text-xs text-white flex-1">Mostrar valores en overlay</span>
              </div>

              {/* Personalización visual del overlay */}
              <div className="border-t border-zinc-600 pt-3 mt-2">
                <p className="text-[10px] text-zinc-400 mb-2 font-bold uppercase">Personalización Overlay</p>
                
                {/* Título personalizado */}
                <div className="mb-2">
                  <label className="text-[10px] text-zinc-500 block mb-1">Título (encima del timer)</label>
                  <input 
                    type="text" 
                    value={overlayStyle.customTitle} 
                    onChange={(e) => updateOverlayStyle('customTitle', e.target.value)}
                    placeholder="Ej: SUBATHON, EVENTO..."
                    className="w-full bg-zinc-700 rounded px-2 py-1.5 text-white text-xs placeholder:text-zinc-500"
                  />
                </div>

                {/* Texto al terminar */}
                <div className="mb-2">
                  <label className="text-[10px] text-zinc-500 block mb-1">Texto al terminar</label>
                  <input 
                    type="text" 
                    value={overlayStyle.customEndText} 
                    onChange={(e) => updateOverlayStyle('customEndText', e.target.value)}
                    placeholder="Ej: ¡TIEMPO!, FIN..."
                    className="w-full bg-zinc-700 rounded px-2 py-1.5 text-white text-xs placeholder:text-zinc-500"
                  />
                </div>

                {/* Imagen/Logo */}
                <div className="mb-2">
                  <label className="text-[10px] text-zinc-500 block mb-1">Imagen/Logo (URL)</label>
                  <input 
                    type="text" 
                    value={overlayStyle.customImage} 
                    onChange={(e) => updateOverlayStyle('customImage', e.target.value)}
                    placeholder="https://... o dejar vacío"
                    className="w-full bg-zinc-700 rounded px-2 py-1.5 text-white text-xs placeholder:text-zinc-500"
                  />
                </div>

                {/* Posición de imagen */}
                {overlayStyle.customImage && (
                  <div className="mb-2">
                    <label className="text-[10px] text-zinc-500 block mb-1">Posición imagen</label>
                    <div className="flex gap-1 flex-wrap">
                      {(['top', 'bottom', 'left', 'right', 'background'] as const).map((pos) => (
                        <button 
                          key={pos} 
                          onClick={() => updateOverlayStyle('imagePosition', pos)} 
                          className={`px-2 py-1 rounded text-[10px] font-medium ${overlayStyle.imagePosition === pos ? 'bg-twitch-brand text-white' : 'bg-zinc-600 text-zinc-300'}`}
                        >
                          {pos === 'top' ? 'Arriba' : pos === 'bottom' ? 'Abajo' : pos === 'left' ? 'Izq' : pos === 'right' ? 'Der' : 'Fondo'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tamaño de imagen */}
                {overlayStyle.customImage && overlayStyle.imagePosition !== 'background' && (
                  <div className="mb-2">
                    <label className="text-[10px] text-zinc-500 block mb-1">Tamaño imagen</label>
                    <div className="flex gap-1">
                      {(['sm', 'md', 'lg'] as const).map((size) => (
                        <button 
                          key={size} 
                          onClick={() => updateOverlayStyle('imageSize', size)} 
                          className={`flex-1 py-1 rounded text-[10px] font-medium ${overlayStyle.imageSize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-600 text-zinc-300'}`}
                        >
                          {size === 'sm' ? 'Pequeño' : size === 'md' ? 'Medio' : 'Grande'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={() => { setTimeLeft(getInitialTime(config)); setShowConfig(false); }} className="w-full py-1.5 bg-twitch-brand hover:bg-twitch-brand/80 text-white font-medium rounded-lg text-xs">
                Aplicar tiempo
              </button>
            </div>
          )}
        </div>

        {/* Resize handle - Más visible y fácil de usar */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize group z-10"
          title="Redimensionar"
        >
          <div className="absolute bottom-1 right-1 w-3 h-3 flex items-end justify-end">
            <svg width="10" height="10" viewBox="0 0 10 10" className="text-zinc-500 group-hover:text-cyan-400 transition-colors">
              <path d="M9 1v8H1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M9 5v4H5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Countdown;
