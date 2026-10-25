import React, { useState, useEffect, useRef } from 'react';
import { Fish, Trophy } from 'lucide-react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';

interface SwimmingFish {
  id: string;
  username: string;
  message: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  size: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface FishingState {
  fish: SwimmingFish[];
  hook: { x: number; y: number; depth: number };
  isFishing: boolean;
  lastCatch: { username: string; points: number; rarity: string } | null;
  totalPoints: number;
}

const GAME_CHANNEL = 'chat_fishing_sync';
const STORAGE_KEY_FISHING = 'chat_fishing_state';
const RARITY_COLORS = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};

export const FishingOverlay: React.FC = () => {
  const { bgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [state, setState] = useState<FishingState>({
    fish: [],
    hook: { x: 300, y: 50, depth: 0 },
    isFishing: false,
    lastCatch: null,
    totalPoints: 0
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const fishRef = useRef<SwimmingFish[]>([]);

  useEffect(() => {
    const channel = new BroadcastChannel(GAME_CHANNEL);
    
    const handleState = (data: any) => {
      if (data.type === 'fishing_state') {
        setState(data);
        fishRef.current = data.fish || [];
      }
    };
    
    channel.onmessage = (e) => handleState(e.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'fishing' && data.state) {
        handleState({ ...data.state, type: 'fishing_state' });
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_FISHING);
        if (stored) handleState(JSON.parse(stored));
      } catch { /* ignore */ }
    };
    loadFromStorage();
    // Other windows of this browser: react to localStorage writes instead of
    // polling (BroadcastChannel and Firebase already deliver live updates)
    window.addEventListener('storage', loadFromStorage);
    
    return () => {
      channel.close();
      unsubscribeFirebase();
      window.removeEventListener('storage', loadFromStorage);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Water gradient
      const waterGradient = ctx.createLinearGradient(0, 80, 0, canvas.height);
      waterGradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
      waterGradient.addColorStop(1, 'rgba(30, 64, 175, 0.6)');
      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, 80, canvas.width, canvas.height - 80);
      
      // Water surface waves
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 15) {
        const y = 80 + Math.sin((x + Date.now() * 0.003) * 0.04) * 5;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Update and draw fish
      fishRef.current = fishRef.current.map(fish => {
        let newX = fish.x + fish.vx;
        if (newX > canvas.width + 60) newX = -60;
        return { ...fish, x: newX };
      });

      fishRef.current.forEach(fish => {
        const rarityColor = RARITY_COLORS[fish.rarity];
        
        ctx.save();
        ctx.translate(fish.x, fish.y);
        
        if (fish.rarity !== 'common') {
          ctx.shadowColor = rarityColor;
          ctx.shadowBlur = 15;
        }
        
        // Body
        ctx.fillStyle = fish.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size * 1.2, fish.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.beginPath();
        ctx.moveTo(-fish.size * 1.2, 0);
        ctx.lineTo(-fish.size * 1.2 - 20, -12);
        ctx.lineTo(-fish.size * 1.2 - 20, 12);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(fish.size * 0.5, -fish.size * 0.15, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(fish.size * 0.55, -fish.size * 0.15, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Rarity glow
        ctx.fillStyle = rarityColor;
        ctx.beginPath();
        ctx.arc(0, -fish.size - 5, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
        
        // Username
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(fish.username.slice(0, 12), fish.x, fish.y + fish.size + 18);
        ctx.shadowBlur = 0;
      });

      // Fishing line
      const hookX = state.hook.x;
      const hookY = 70 + state.hook.depth;
      
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(hookX, 0);
      ctx.lineTo(hookX, hookY);
      ctx.stroke();
      
      // Hook
      ctx.strokeStyle = '#C0C0C0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hookX, hookY + 12, 12, 0, Math.PI);
      ctx.stroke();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state.hook]);

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ backgroundColor: bgColor === 'transparent' ? 'transparent' : bgColor }}>
      <OverlayChromaKey {...chromaKeyProps} />
      <canvas
        ref={canvasRef}
        width={700}
        height={400}
        className="w-full h-full"
      />
      
      {/* Score */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
        <Trophy size={20} className="text-yellow-400" />
        <span className="text-white font-bold text-xl">{state.totalPoints} pts</span>
      </div>
      
      {/* Fish count */}
      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
        <Fish size={20} className="text-blue-400" />
        <span className="text-white font-bold">{fishRef.current.length} peces</span>
      </div>
      
      {/* Last catch */}
      {state.lastCatch && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500/80 backdrop-blur rounded-xl px-6 py-3 animate-bounce">
          <p className="text-white font-bold text-lg text-center">
            🎣 ¡{state.lastCatch.username}! +{state.lastCatch.points} pts
          </p>
        </div>
      )}
    </div>
  );
};

export default FishingOverlay;
