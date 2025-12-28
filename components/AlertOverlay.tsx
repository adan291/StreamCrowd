/**
 * AlertOverlay Component
 * 
 * Componente de overlay para mostrar alertas de stream con animaciones y sonidos.
 * Soporta templates: default, minimal, fancy.
 * 
 * @requirements 1.1, 1.2
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Heart, Star, Users, Gift, Coins } from 'lucide-react';
import { useAlerts, AlertConfig, AlertEvent, AlertEventType } from '../src/application/hooks/useAlerts';
import { useOverlayMode, OVERLAY_BG_COLORS } from '../hooks/useOverlayMode';

// Get background color from URL param
const getBgFromUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  const bg = params.get('bg');
  if (!bg) return 'transparent';
  
  const namedColors: Record<string, string> = {
    'green': '#00FF00',
    'magenta': '#FF00FF',
    'blue': '#0000FF',
    'black': '#000000',
    'transparent': 'transparent',
    'none': 'transparent',
  };
  
  if (namedColors[bg.toLowerCase()]) return namedColors[bg.toLowerCase()];
  if (bg.startsWith('#')) return bg;
  return 'transparent';
};

// Icon mapping for event types
const EVENT_ICONS: Record<AlertEventType, React.FC<{ size?: number; className?: string }>> = {
  follow: Heart,
  sub: Star,
  raid: Users,
  gift: Gift,
  bits: Coins,
};

// Default colors for event types
const EVENT_COLORS: Record<AlertEventType, string> = {
  follow: '#FF6B6B',
  sub: '#9B59B6',
  raid: '#3498DB',
  gift: '#E91E63',
  bits: '#F39C12',
};

// Animation classes
const ANIMATION_CLASSES: Record<string, { enter: string; exit: string }> = {
  fade: {
    enter: 'animate-fadeIn',
    exit: 'animate-fadeOut',
  },
  slide: {
    enter: 'animate-slideInDown',
    exit: 'animate-slideOutUp',
  },
  bounce: {
    enter: 'animate-bounceIn',
    exit: 'animate-bounceOut',
  },
  zoom: {
    enter: 'animate-zoomIn',
    exit: 'animate-zoomOut',
  },
};

interface AlertDisplayProps {
  event: AlertEvent;
  config: AlertConfig;
  onComplete: () => void;
}

/**
 * Default template for alerts
 */
const DefaultTemplate: React.FC<AlertDisplayProps> = ({ event, config }) => {
  const Icon = EVENT_ICONS[event.type];
  const color = EVENT_COLORS[event.type];
  
  return (
    <div 
      className="bg-black/80 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/10 max-w-md"
      style={{ borderColor: color + '40' }}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: color + '30' }}
        >
          <Icon size={32} style={{ color }} />
        </div>
        <div className="flex-1">
          <p className="text-white text-2xl font-bold">{event.username}</p>
          <p className="text-zinc-400 text-lg">
            {getEventMessage(event)}
          </p>
        </div>
      </div>
      {event.message && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <p className="text-white text-sm italic">"{event.message}"</p>
        </div>
      )}
      {config.customMessage && (
        <p className="mt-3 text-center text-zinc-300">{config.customMessage}</p>
      )}
    </div>
  );
};

/**
 * Minimal template for alerts
 */
const MinimalTemplate: React.FC<AlertDisplayProps> = ({ event }) => {
  const Icon = EVENT_ICONS[event.type];
  const color = EVENT_COLORS[event.type];
  
  return (
    <div 
      className="bg-black/70 backdrop-blur rounded-full px-6 py-3 flex items-center gap-3"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <Icon size={24} style={{ color }} />
      <span className="text-white font-bold">{event.username}</span>
      <span className="text-zinc-400">{getEventMessage(event)}</span>
    </div>
  );
};

/**
 * Fancy template for alerts
 */
const FancyTemplate: React.FC<AlertDisplayProps> = ({ event, config }) => {
  const Icon = EVENT_ICONS[event.type];
  const color = EVENT_COLORS[event.type];
  
  return (
    <div className="relative">
      {/* Glow effect */}
      <div 
        className="absolute inset-0 blur-3xl opacity-30 rounded-3xl"
        style={{ backgroundColor: color }}
      />
      
      <div 
        className="relative bg-gradient-to-br from-black/90 to-black/70 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 max-w-lg"
        style={{ borderColor: color }}
      >
        {/* Animated icon */}
        <div className="flex justify-center mb-4">
          <div 
            className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse"
            style={{ 
              backgroundColor: color + '30',
              boxShadow: `0 0 40px ${color}60`
            }}
          >
            <Icon size={48} style={{ color }} />
          </div>
        </div>
        
        {/* Event type label */}
        <div className="text-center mb-2">
          <span 
            className="text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full"
            style={{ backgroundColor: color + '30', color }}
          >
            {getEventTypeLabel(event.type)}
          </span>
        </div>
        
        {/* Username */}
        <p 
          className="text-4xl font-black text-center mb-2"
          style={{ 
            color,
            textShadow: `0 0 20px ${color}80`
          }}
        >
          {event.username}
        </p>
        
        {/* Event details */}
        <p className="text-zinc-300 text-xl text-center">
          {getEventMessage(event)}
        </p>
        
        {/* Message */}
        {event.message && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white text-center italic">"{event.message}"</p>
          </div>
        )}
        
        {/* Custom message */}
        {config.customMessage && (
          <p className="mt-4 text-center text-zinc-400 text-sm">{config.customMessage}</p>
        )}
        
        {/* Custom image */}
        {config.customImage && (
          <div className="mt-4 flex justify-center">
            <img 
              src={config.customImage} 
              alt="Alert" 
              className="max-h-32 rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Template mapping
const TEMPLATES: Record<string, React.FC<AlertDisplayProps>> = {
  default: DefaultTemplate,
  minimal: MinimalTemplate,
  fancy: FancyTemplate,
};

// Helper functions
function getEventTypeLabel(type: AlertEventType): string {
  const labels: Record<AlertEventType, string> = {
    follow: 'Nuevo Seguidor',
    sub: 'Suscripción',
    raid: 'Raid',
    gift: 'Regalo',
    bits: 'Bits',
  };
  return labels[type];
}

function getEventMessage(event: AlertEvent): string {
  switch (event.type) {
    case 'follow':
      return '¡Ahora te sigue!';
    case 'sub':
      return event.tier 
        ? `¡Se suscribió (Tier ${event.tier === 'Prime' ? 'Prime' : event.tier.replace('000', '')})!`
        : '¡Se suscribió!';
    case 'raid':
      return event.amount 
        ? `¡Raid con ${event.amount} viewers!`
        : '¡Está haciendo raid!';
    case 'gift':
      return event.amount && event.amount > 1
        ? `¡Regaló ${event.amount} subs!`
        : '¡Regaló una sub!';
    case 'bits':
      return event.amount 
        ? `¡Donó ${event.amount} bits!`
        : '¡Donó bits!';
    default:
      return '';
  }
}

/**
 * Alert display component with animation
 */
const AlertDisplay: React.FC<{
  event: AlertEvent;
  config: AlertConfig;
  isExiting: boolean;
}> = ({ event, config, isExiting }) => {
  const Template = TEMPLATES[config.template] || TEMPLATES.default;
  const animation = ANIMATION_CLASSES[config.animation] || ANIMATION_CLASSES.fade;
  
  return (
    <div className={`${isExiting ? animation.exit : animation.enter}`}>
      <Template event={event} config={config} onComplete={() => {}} />
    </div>
  );
};

/**
 * Settings button component
 */
const SettingsButton: React.FC<{
  bgColor: string;
  setBgColor: (color: string) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
}> = ({ bgColor, setBgColor, showSettings, setShowSettings }) => (
  <>
    <button
      onClick={() => setShowSettings(!showSettings)}
      className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50"
    >
      <Settings size={18} />
    </button>
    
    {showSettings && (
      <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-48">
        <p className="text-xs text-zinc-400 mb-2 font-bold">Chroma Key (OBS)</p>
        <div className="flex gap-1 flex-wrap">
          {OVERLAY_BG_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setBgColor(color)}
              className={`w-8 h-8 rounded border-2 transition-transform ${
                bgColor === color ? 'border-white scale-110' : 'border-zinc-600'
              } ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`}
              style={{ backgroundColor: color === 'transparent' ? undefined : color }}
            />
          ))}
        </div>
        <p className="text-[10px] text-zinc-500 mt-2">
          Para OBS usa: ?bg=green
        </p>
      </div>
    )}
  </>
);

/**
 * Main AlertOverlay component
 */
export const AlertOverlay: React.FC = () => {
  const { bgColor: defaultBg } = useOverlayMode(true);
  const [bgColor, setBgColor] = useState(getBgFromUrl() || defaultBg);
  const [showSettings, setShowSettings] = useState(false);
  const [displayedAlert, setDisplayedAlert] = useState<{ event: AlertEvent; config: AlertConfig } | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { onAlert } = useAlerts();

  // Handle alert display
  const showAlert = useCallback((event: AlertEvent, config: AlertConfig) => {
    setDisplayedAlert({ event, config });
    setIsExiting(false);
    
    // Play sound if configured
    if (config.soundUrl) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(config.soundUrl);
        audioRef.current.volume = config.soundVolume / 100;
        audioRef.current.play().catch(err => {
          console.warn('Failed to play alert sound:', err);
        });
      } catch (err) {
        console.warn('Invalid sound URL:', err);
      }
    }
    
    // Start exit animation before hiding
    const exitTime = Math.max(config.duration - 500, 0);
    setTimeout(() => {
      setIsExiting(true);
    }, exitTime);
    
    // Hide alert after duration
    setTimeout(() => {
      setDisplayedAlert(null);
      setIsExiting(false);
    }, config.duration);
  }, []);

  // Subscribe to alerts
  useEffect(() => {
    const unsubscribe = onAlert(showAlert);
    return unsubscribe;
  }, [onAlert, showAlert]);

  return (
    <div 
      className="w-screen h-screen flex items-center justify-center"
      style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}
    >
      <SettingsButton 
        bgColor={bgColor} 
        setBgColor={setBgColor} 
        showSettings={showSettings} 
        setShowSettings={setShowSettings} 
      />
      
      {displayedAlert && (
        <AlertDisplay 
          event={displayedAlert.event}
          config={displayedAlert.config}
          isExiting={isExiting}
        />
      )}
      
      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideInDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutUp {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-100%); opacity: 0; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounceOut {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes zoomOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.5); opacity: 0; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-fadeOut { animation: fadeOut 0.3s ease-out forwards; }
        .animate-slideInDown { animation: slideInDown 0.4s ease-out forwards; }
        .animate-slideOutUp { animation: slideOutUp 0.4s ease-out forwards; }
        .animate-bounceIn { animation: bounceIn 0.5s ease-out forwards; }
        .animate-bounceOut { animation: bounceOut 0.5s ease-out forwards; }
        .animate-zoomIn { animation: zoomIn 0.3s ease-out forwards; }
        .animate-zoomOut { animation: zoomOut 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AlertOverlay;
