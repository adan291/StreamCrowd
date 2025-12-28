import React, { useState, useEffect, useRef } from 'react';
import { Crown, Trophy, Settings } from 'lucide-react';
import { TwitchMessage } from '../types';
import { useI18n } from '../i18n';
import { useOverlayMode, OVERLAY_BG_COLORS } from '../hooks/useOverlayMode';
import { giveawaySync } from '../src/infrastructure/sync/FirebaseSync';

interface RandomWinnerOverlayProps {
  chatMessages: TwitchMessage[];
  onClose: () => void;
}

const OVERLAY_TEXT_COLORS = ['#FFFFFF', '#000000', '#FFD700', '#00FFFF', '#FF6B6B', '#4ADE80'];
const RANDOM_WINNER_CHANNEL = 'random_winner_sync';

interface WinnerState {
  winner: string | null;
  isSelecting: boolean;
  displayName: string;
  participantCount: number;
}

export const RandomWinnerOverlay: React.FC<RandomWinnerOverlayProps> = ({ 
  chatMessages, 
  onClose,
}) => {
  useOverlayMode(true); // Enable transparent background for OBS
  const [overlayBgColor, setOverlayBgColor] = useState('transparent');
  const [overlayTextColor, setOverlayTextColor] = useState('#FFFFFF');
  const [overlaySize, setOverlaySize] = useState<'normal' | 'large'>('large');
  const [showOverlaySettings, setShowOverlaySettings] = useState(false);
  const { t } = useI18n();
  const [winner, setWinner] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Setup BroadcastChannel for sync
  useEffect(() => {
    channelRef.current = new BroadcastChannel(RANDOM_WINNER_CHANNEL);
    
    channelRef.current.onmessage = (event) => {
      if (event.data?.type === 'request_sync') return;
      const state: WinnerState = event.data;
      setWinner(state.winner);
      setIsSelecting(state.isSelecting);
      setDisplayName(state.displayName || '');
    };
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = giveawaySync.subscribe((data) => {
      if (data) {
        setWinner(data.winner);
        setIsSelecting(data.isSpinning);
        setDisplayName(data.displayName || data.winner || '');
      }
    });
    
    // Request sync on mount
    setTimeout(() => channelRef.current?.postMessage({ type: 'request_sync' }), 100);
    
    return () => { 
      channelRef.current?.close(); 
      unsubscribeFirebase();
    };
  }, []);

  const getOverlayTextSize = () => overlaySize === 'large' ? 'text-6xl' : 'text-4xl';
  const getOverlayTitleSize = () => overlaySize === 'large' ? 'text-3xl' : 'text-xl';
  const getOverlayIconSize = () => overlaySize === 'large' ? 40 : 28;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4" style={{ backgroundColor: overlayBgColor }}>
      <button onClick={() => setShowOverlaySettings(!showOverlaySettings)} className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50">
        <Settings size={18} />
      </button>
      {showOverlaySettings && (
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
          <p className="text-xs text-zinc-400 mb-2 font-bold">{t.overlay.textColor}</p>
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
                onClick={() => setOverlaySize(size)} 
                className={`flex-1 py-1.5 rounded text-xs font-medium ${overlaySize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-300'}`}
              >
                {size === 'normal' ? t.overlay.normalSize : t.overlay.largeSize}
              </button>
            ))}
          </div>
        </div>
      )}

      {(winner || isSelecting) ? (
        <div className="text-center">
          <div className={`inline-block px-12 py-8 rounded-3xl ${winner && !isSelecting ? 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse' : 'bg-black/50'}`}>
            {winner && !isSelecting && (
              <div className="flex items-center gap-3 mb-3 justify-center">
                <Crown className="text-white" size={getOverlayIconSize()} />
                <span className={`text-white/90 ${getOverlayTitleSize()} font-bold`}>{t.randomWinner.winner}</span>
                <Crown className="text-white" size={getOverlayIconSize()} />
              </div>
            )}
            <span 
              className={`font-bold ${getOverlayTextSize()} drop-shadow-lg`}
              style={{ color: winner && !isSelecting ? overlayTextColor : '#a78bfa' }}
            >
              {displayName || '...'}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center bg-black/50 rounded-2xl px-10 py-8">
          <Trophy className="text-yellow-400 mx-auto mb-3" size={overlaySize === 'large' ? 64 : 48} />
          <p className={`text-white/70 ${overlaySize === 'large' ? 'text-2xl' : 'text-xl'}`}>{t.randomWinner.waitingRaffle}</p>
        </div>
      )}
    </div>
  );
};

export default RandomWinnerOverlay;
