import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Pause, ExternalLink, Fish, Anchor, Trophy, RotateCcw } from 'lucide-react';

interface CaughtFish {
  id: string;
  username: string;
  message: string;
  color: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  timestamp: number;
}

interface SwimmingFish {
  id: string;
  username: string;
  message: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface ChatFishingProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'chat_fishing_sync';
const RARITY_COLORS = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B'
};
const RARITY_POINTS = { common: 10, rare: 25, epic: 50, legendary: 100 };

export const ChatFishing: React.FC<ChatFishingProps> = ({ chatMessages, isConnected = true }) => {
  const [isActive, setIsActive] = useState(true);
  const [isFishing, setIsFishing] = useState(false);
  const [hookPosition, setHookPosition] = useState({ x: 300, y: 50 });
  const [hookDepth, setHookDepth] = useState(0);
  const [caughtFish, setCaughtFish] = useState<CaughtFish[]>([]);
  const [lastCatch, setLastCatch] = useState<CaughtFish | null>(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [fishCount, setFishCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fishRef = useRef<SwimmingFish[]>([]);
  const animationRef = useRef<number>();
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const getRarity = useCallback((msg: TwitchMessage): 'common' | 'rare' | 'epic' | 'legendary' => {
    if (msg.isSubscriber && msg.message.length > 50) return 'legendary';
    if (msg.isSubscriber) return 'epic';
    if (msg.message.length > 30) return 'rare';
    return 'common';
  }, []);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(() => {
    channelRef.current?.postMessage({
      type: 'fishing_state',
      fish: fishRef.current,
      hook: { ...hookPosition, depth: hookDepth },
      isFishing,
      lastCatch,
      totalPoints
    });
  }, [hookPosition, hookDepth, isFishing, lastCatch, totalPoints]);

  useEffect(() => {
    syncToOverlay();
  }, [syncToOverlay]);


  // Convert chat messages to fish
  useEffect(() => {
    if (!isActive || !isConnected) return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    newMessages.forEach((msg) => {
      const rarity = getRarity(msg);
      const newFish: SwimmingFish = {
        id: `${msg.userId || msg.username}-${Date.now()}-${Math.random()}`,
        username: msg.username,
        message: msg.message.slice(0, 30),
        color: msg.color || '#a970ff',
        x: -50,
        y: 100 + Math.random() * (canvas.height - 150),
        vx: 0.8 + Math.random() * 1.2, // Velocidad más consistente
        vy: (Math.random() - 0.5) * 0.5, // Movimiento vertical suave
        size: rarity === 'legendary' ? 45 : rarity === 'epic' ? 38 : rarity === 'rare' ? 32 : 28,
        rarity
      };
      fishRef.current = [...fishRef.current, newFish].slice(-30);
      setFishCount(fishRef.current.length);
    });
  }, [chatMessages, isActive, isConnected, getRarity]);

  // Check if hook catches a fish - hitbox más pequeña pero más precisa
  const checkCatch = useCallback((currentDepth: number): CaughtFish | null => {
    const hookX = hookPosition.x;
    const hookY = 50 + currentDepth + 20; // Centro del anzuelo (donde está el cebo)
    
    // Ordenar peces por distancia para pescar el más cercano
    const fishWithDistance = fishRef.current.map(fish => {
      const dx = fish.x - hookX;
      const dy = fish.y - hookY;
      return { fish, distance: Math.sqrt(dx * dx + dy * dy) };
    }).sort((a, b) => a.distance - b.distance);
    
    for (const { fish, distance } of fishWithDistance) {
      // Radio de captura más pequeño pero seguro: tamaño del pez + 25px
      const catchRadius = fish.size + 25;
      
      if (distance < catchRadius) {
        const caught: CaughtFish = {
          id: fish.id,
          username: fish.username,
          message: fish.message,
          color: fish.color,
          points: RARITY_POINTS[fish.rarity],
          rarity: fish.rarity,
          timestamp: Date.now()
        };
        
        fishRef.current = fishRef.current.filter(f => f.id !== fish.id);
        setFishCount(fishRef.current.length);
        return caught;
      }
    }
    return null;
  }, [hookPosition.x]);

  // Fishing action - más fluida y precisa
  const castLine = useCallback(() => {
    if (isFishing) return;
    setIsFishing(true);
    setLastCatch(null);
    
    const maxDepth = 260;
    const downSpeed = 2.5; // Un poco más lento para mejor precisión
    const upSpeed = 6;
    let currentDepth = 0;
    let goingDown = true;
    let caughtSomething: CaughtFish | null = null;
    let frameCount = 0;
    
    const animateFishing = () => {
      frameCount++;
      
      if (goingDown) {
        currentDepth += downSpeed;
        setHookDepth(currentDepth);
        
        // Verificar captura cada 2 frames para mejor rendimiento pero buena precisión
        if (frameCount % 2 === 0) {
          const caught = checkCatch(currentDepth);
          if (caught) {
            caughtSomething = caught;
            goingDown = false;
            setCaughtFish(prev => [caught, ...prev].slice(0, 10));
            setLastCatch(caught);
            setTotalPoints(prev => prev + caught.points);
          }
        }
        
        if (currentDepth >= maxDepth) {
          goingDown = false;
        }
        
        requestAnimationFrame(animateFishing);
      } else {
        // Subiendo
        currentDepth -= upSpeed;
        setHookDepth(Math.max(0, currentDepth));
        
        if (currentDepth > 0) {
          requestAnimationFrame(animateFishing);
        } else {
          setIsFishing(false);
          setHookDepth(0);
        }
      }
    };
    
    requestAnimationFrame(animateFishing);
  }, [isFishing, checkCatch]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Sky
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, canvas.width, 60);
      
      // Water gradient
      const waterGradient = ctx.createLinearGradient(0, 60, 0, canvas.height);
      waterGradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
      waterGradient.addColorStop(0.5, 'rgba(37, 99, 235, 0.5)');
      waterGradient.addColorStop(1, 'rgba(30, 64, 175, 0.6)');
      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, 60, canvas.width, canvas.height - 60);
      
      // Water surface waves
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 15) {
        const y = 60 + Math.sin((x + Date.now() * 0.003) * 0.08) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      
      // Bubbles
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 0; i < 8; i++) {
        const bx = (Date.now() / 20 + i * 80) % canvas.width;
        const by = canvas.height - 50 - ((Date.now() / 30 + i * 50) % 250);
        ctx.beginPath();
        ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // Update and draw fish
      fishRef.current = fishRef.current.map(fish => {
        let newX = fish.x + fish.vx;
        let newY = fish.y + fish.vy;
        
        // Bounce vertically
        if (newY < 80 || newY > canvas.height - 30) {
          fish.vy = -fish.vy;
          newY = Math.max(80, Math.min(canvas.height - 30, newY));
        }
        
        // Reset when off screen
        if (newX > canvas.width + 60) {
          newX = -50;
          newY = 100 + Math.random() * (canvas.height - 150);
        }
        
        return { ...fish, x: newX, y: newY };
      });

      fishRef.current.forEach(fish => {
        const rarityColor = RARITY_COLORS[fish.rarity];
        
        ctx.save();
        ctx.translate(fish.x, fish.y);
        
        // Glow for rare fish
        if (fish.rarity !== 'common') {
          ctx.shadowColor = rarityColor;
          ctx.shadowBlur = 15;
        }
        
        // Body
        ctx.fillStyle = fish.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size, fish.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail
        ctx.beginPath();
        ctx.moveTo(-fish.size, 0);
        ctx.lineTo(-fish.size - 18, -12);
        ctx.lineTo(-fish.size - 18, 12);
        ctx.closePath();
        ctx.fill();
        
        // Fin
        ctx.beginPath();
        ctx.moveTo(0, -fish.size * 0.4);
        ctx.lineTo(-8, -fish.size * 0.8);
        ctx.lineTo(8, -fish.size * 0.4);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(fish.size * 0.4, -fish.size * 0.1, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(fish.size * 0.45, -fish.size * 0.1, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Rarity star
        if (fish.rarity !== 'common') {
          ctx.fillStyle = rarityColor;
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(fish.rarity === 'legendary' ? '⭐' : fish.rarity === 'epic' ? '💎' : '✨', 0, -fish.size - 5);
        }
        
        ctx.restore();
        
        // Username
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(fish.username.slice(0, 12), fish.x, fish.y + fish.size + 14);
        ctx.shadowBlur = 0;
      });

      // Fishing rod (on surface)
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hookPosition.x - 30, 0);
      ctx.lineTo(hookPosition.x, 50);
      ctx.stroke();
      
      // Fishing line
      ctx.strokeStyle = '#A0A0A0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hookPosition.x, 50);
      ctx.lineTo(hookPosition.x, 50 + hookDepth);
      ctx.stroke();
      
      // Hook with bait - más visible
      ctx.strokeStyle = '#D4D4D4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hookPosition.x, 50 + hookDepth + 12, 10, 0, Math.PI);
      ctx.stroke();
      
      // Bait (worm) - más grande y visible
      ctx.fillStyle = '#FF5555';
      ctx.beginPath();
      ctx.ellipse(hookPosition.x, 50 + hookDepth + 20, 5, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF8888';
      ctx.beginPath();
      ctx.ellipse(hookPosition.x - 2, 50 + hookDepth + 18, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Catch zone indicator when fishing - más pequeño y preciso
      if (isFishing) {
        // Zona de captura real (más pequeña)
        ctx.strokeStyle = 'rgba(0,255,100,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(hookPosition.x, 50 + hookDepth + 20, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Punto central del anzuelo
        ctx.fillStyle = 'rgba(255,255,0,0.8)';
        ctx.beginPath();
        ctx.arc(hookPosition.x, 50 + hookDepth + 20, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      setFishCount(fishRef.current.length);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [hookPosition, hookDepth, isFishing]);

  const resetGame = () => {
    setCaughtFish([]);
    setTotalPoints(0);
    setLastCatch(null);
    fishRef.current = [];
    setFishCount(0);
  };

  const moveHook = (direction: 'left' | 'right') => {
    if (isFishing) return;
    setHookPosition(prev => ({
      ...prev,
      x: Math.max(50, Math.min(550, prev.x + (direction === 'left' ? -40 : 40)))
    }));
  };

  const openOverlay = () => {
    const width = 700, height = 450;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayFishing=true`, 'FishingOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isActive ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
          }`}
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          {isActive ? 'Activo' : 'Iniciar'}
        </button>
        
        <button
          onClick={castLine}
          disabled={isFishing || !isActive}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
        >
          <Anchor size={16} />
          {isFishing ? '🎣 Pescando...' : '¡Pescar!'}
        </button>
        
        <div className="flex gap-1">
          <button onClick={() => moveHook('left')} disabled={isFishing} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg">←</button>
          <button onClick={() => moveHook('right')} disabled={isFishing} className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded-lg">→</button>
        </div>
        
        <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg ml-auto">
          <RotateCcw size={18} />
        </button>
        
        <button onClick={openOverlay} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-medium rounded-lg">
          <ExternalLink size={16} /> Overlay
        </button>
      </div>

      <div className="flex items-center justify-between bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-yellow-400" />
          <span className="text-white font-bold text-lg">{totalPoints} pts</span>
          <span className="text-zinc-400 text-sm">({caughtFish.length} pescados)</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400"></span> 10</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 25</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> 50</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> 100</span>
        </div>
      </div>

      {lastCatch && (
        <div className={`text-center p-3 rounded-xl animate-bounce ${
          lastCatch.rarity === 'legendary' ? 'bg-yellow-500/30' :
          lastCatch.rarity === 'epic' ? 'bg-purple-500/30' :
          lastCatch.rarity === 'rare' ? 'bg-blue-500/30' : 'bg-gray-500/30'
        }`}>
          <p className="text-white font-bold text-lg">
            🎣 ¡Pescaste a <span style={{ color: lastCatch.color }}>{lastCatch.username}</span>!
          </p>
          <p className="text-sm text-zinc-300">"{lastCatch.message}" <span className="text-yellow-400 font-bold">+{lastCatch.points} pts</span></p>
        </div>
      )}

      <div className="relative bg-gradient-to-b from-sky-400 to-sky-200 rounded-xl overflow-hidden border border-zinc-700">
        <canvas ref={canvasRef} width={600} height={350} className="w-full" style={{ aspectRatio: '12/7' }} />
        <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-1">
          <span className="text-white text-xs flex items-center gap-1"><Fish size={14} /> {fishCount} peces</span>
        </div>
        <div className="absolute top-2 right-2 bg-black/50 rounded-lg px-2 py-1">
          <span className="text-white text-xs">Los mensajes del chat son peces 🐟</span>
        </div>
      </div>

      {caughtFish.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3">
          <p className="text-xs text-zinc-400 mb-2">🏆 Últimas capturas:</p>
          <div className="flex flex-wrap gap-1">
            {caughtFish.slice(0, 8).map((fish) => (
              <span key={fish.id} className="text-[10px] px-2 py-1 rounded-full" style={{ backgroundColor: RARITY_COLORS[fish.rarity] + '40', color: fish.color }}>
                {fish.rarity === 'legendary' ? '⭐' : fish.rarity === 'epic' ? '💎' : fish.rarity === 'rare' ? '✨' : '🐟'} {fish.username} +{fish.points}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatFishing;
