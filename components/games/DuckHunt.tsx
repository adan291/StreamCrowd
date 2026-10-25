import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Pause, RotateCcw, Trophy, ExternalLink, Crosshair } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

interface Duck {
  id: string;
  oderId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isAlive: boolean;
  canDodge: boolean;
  spawnTime: number;
}

interface DuckHuntProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'duckhunt_sync';
const STORAGE_KEY_DUCKHUNT = 'duckhunt_state';
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const DUCK_SIZE = 40;

export const DuckHunt: React.FC<DuckHuntProps> = ({ chatMessages, isConnected = true }) => {
  const [isActive, setIsActive] = useState(true);
  const [score, setScore] = useState(0);
  const [shotsFired, setShotsFired] = useState(0);
  const [kills, setKills] = useState<{ username: string; color: string }[]>([]);
  const [lastHitPos, setLastHitPos] = useState<{ x: number; y: number; hit: boolean } | null>(null);
  const [duckCount, setDuckCount] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ducksRef = useRef<Duck[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const channelRef = useRef<BroadcastChannel | null>(null);
  // Procesar mensajes en tiempo real
  const processedIdsRef = useRef<Set<string>>(new Set());
  
  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(() => {
    const state = {
      type: 'duckhunt_state',
      ducks: ducksRef.current,
      score,
      kills: kills.slice(-5)
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_DUCKHUNT, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('duckhunt', state).catch(() => {});
  }, [score, kills]);

  useEffect(() => {
    syncToOverlay();
  }, [syncToOverlay]);

  // Procesar TODOS los mensajes del chat en tiempo real
  useEffect(() => {
    if (!isConnected || !isActive) return;
    
    // Procesar cada mensaje nuevo
    chatMessages.forEach((msg: TwitchMessage) => {
      const msgId = msg.id || `${msg.username}-${msg.timestamp}`;
      
      // Evitar procesar el mismo mensaje dos veces
      if (processedIdsRef.current.has(msgId)) return;
      processedIdsRef.current.add(msgId);
      
      // Limpiar IDs antiguos (mantener solo los últimos 500)
      if (processedIdsRef.current.size > 500) {
        const arr = Array.from(processedIdsRef.current);
        processedIdsRef.current = new Set(arr.slice(-300));
      }
      
      const msgLower = msg.message.toLowerCase().trim();
      const oderId = msg.userId || msg.username;
      
      // !pato o !duck - aparecer o esquivar
      if (msgLower === '!pato' || msgLower === '!duck') {
        const existingDuck = ducksRef.current.find((d: Duck) => d.oderId === oderId && d.isAlive);
        
        if (existingDuck) {
          // Esquivar - cambiar dirección drásticamente
          if (existingDuck.canDodge) {
            ducksRef.current = ducksRef.current.map((d: Duck) => {
              if (d.oderId === oderId && d.isAlive) {
                // Movimiento de esquiva más dramático
                const dodgeVy = d.vy > 0 ? -2.5 - Math.random() : 2.5 + Math.random();
                const dodgeVx = (Math.random() - 0.5) * 2;
                return { 
                  ...d, 
                  vy: dodgeVy,
                  vx: d.vx + dodgeVx,
                  canDodge: false
                };
              }
              return d;
            });
            // Cooldown de esquiva: 1 segundo
            setTimeout(() => {
              ducksRef.current = ducksRef.current.map((d: Duck) => 
                d.oderId === oderId ? { ...d, canDodge: true } : d
              );
            }, 1000);
          }
        } else {
          // Crear nuevo pato INSTANTÁNEAMENTE en posición visible
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const newDuck: Duck = {
            id: `duck_${Date.now()}_${Math.random()}`,
            oderId,
            username: msg.username,
            color: msg.color || '#FFD700',
            // Aparecer directamente en el área visible
            x: 50 + Math.random() * (canvas.width - 100),
            y: 50 + Math.random() * (canvas.height - 150),
            // Velocidad LENTA para que sea más fácil apuntar
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1,
            isAlive: true,
            canDodge: true,
            spawnTime: Date.now()
          };
          ducksRef.current = [...ducksRef.current, newDuck].slice(-25);
          setDuckCount(ducksRef.current.filter(d => d.isAlive).length);
        }
      }
    });
  }, [chatMessages, isConnected, isActive]);


  // Animation loop - patos lentos y suaves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      skyGradient.addColorStop(0, '#87CEEB');
      skyGradient.addColorStop(0.7, '#98D8C8');
      skyGradient.addColorStop(1, '#4ADE80');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clouds
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const time = Date.now() / 8000;
      for (let i = 0; i < 4; i++) {
        const cx = ((time * 20 + i * 180) % (canvas.width + 100)) - 50;
        const cy = 25 + i * 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.arc(cx + 18, cy - 4, 14, 0, Math.PI * 2);
        ctx.arc(cx + 32, cy, 16, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Ground
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
      
      // Bushes
      ctx.fillStyle = '#166534';
      for (let i = 0; i < canvas.width; i += 60) {
        ctx.beginPath();
        ctx.arc(i + 30, canvas.height - 40, 25, Math.PI, 0);
        ctx.fill();
      }

      // Update ducks - movimiento MUY LENTO
      ducksRef.current = ducksRef.current.map((d: Duck) => {
        if (!d.isAlive) return d;
        let { x, y, vx, vy } = d;
        
        // Movimiento suave y lento
        x += vx * 0.7;
        y += vy * 0.7;
        
        // Rebote suave en paredes
        if (x < DUCK_SIZE) { x = DUCK_SIZE; vx = Math.abs(vx) * 0.8; }
        if (x > canvas.width - DUCK_SIZE) { x = canvas.width - DUCK_SIZE; vx = -Math.abs(vx) * 0.8; }
        if (y < DUCK_SIZE) { y = DUCK_SIZE; vy = Math.abs(vy) * 0.8; }
        if (y > canvas.height - 70) { y = canvas.height - 70; vy = -Math.abs(vy) * 0.8; }
        
        // Pequeña variación aleatoria muy suave
        vx += (Math.random() - 0.5) * 0.05;
        vy += (Math.random() - 0.5) * 0.05;
        
        // Limitar velocidad máxima (muy lenta)
        vx = Math.max(-2, Math.min(2, vx));
        vy = Math.max(-1.5, Math.min(1.5, vy));
        
        return { ...d, x, y, vx, vy };
      });

      // Draw ducks
      ducksRef.current.filter((d: Duck) => d.isAlive).forEach((duck: Duck) => {
        ctx.save();
        ctx.translate(duck.x, duck.y);
        if (duck.vx < 0) ctx.scale(-1, 1);
        
        // Wing flap animation
        const wingAngle = Math.sin(Date.now() / 150) * 0.3;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(3, 5, DUCK_SIZE / 2.5, DUCK_SIZE / 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Body
        ctx.fillStyle = duck.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, DUCK_SIZE / 2, DUCK_SIZE / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.beginPath();
        ctx.arc(DUCK_SIZE / 3, -DUCK_SIZE / 4, DUCK_SIZE / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.moveTo(DUCK_SIZE / 2, -DUCK_SIZE / 4);
        ctx.lineTo(DUCK_SIZE / 2 + 12, -DUCK_SIZE / 4);
        ctx.lineTo(DUCK_SIZE / 2, -DUCK_SIZE / 4 + 6);
        ctx.closePath();
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(DUCK_SIZE / 3 + 4, -DUCK_SIZE / 4 - 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(DUCK_SIZE / 3 + 5, -DUCK_SIZE / 4 - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Wing
        ctx.fillStyle = duck.color;
        ctx.globalAlpha = 0.8;
        ctx.save();
        ctx.translate(-5, 5);
        ctx.rotate(wingAngle);
        ctx.beginPath();
        ctx.ellipse(0, 0, DUCK_SIZE / 4, DUCK_SIZE / 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
        
        // Dodge indicator
        if (!duck.canDodge) {
          ctx.fillStyle = 'rgba(255,255,0,0.5)';
          ctx.beginPath();
          ctx.arc(0, -DUCK_SIZE / 2 - 10, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.restore();
        
        // Username
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(duck.username.slice(0, 10), duck.x + 1, duck.y + DUCK_SIZE / 2 + 16);
        ctx.fillStyle = '#fff';
        ctx.fillText(duck.username.slice(0, 10), duck.x, duck.y + DUCK_SIZE / 2 + 15);
      });

      // Hit effect
      if (lastHitPos) {
        ctx.fillStyle = lastHitPos.hit ? 'rgba(255,50,50,0.6)' : 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(lastHitPos.x, lastHitPos.y, 25, 0, Math.PI * 2);
        ctx.fill();
        if (lastHitPos.hit) {
          ctx.font = 'bold 18px sans-serif';
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 4;
          ctx.fillText('+100', lastHitPos.x, lastHitPos.y - 30);
          ctx.shadowBlur = 0;
        }
      }

      setDuckCount(ducksRef.current.filter(d => d.isAlive).length);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isActive, lastHitPos]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    setShotsFired(prev => prev + 1);
    
    let hitDuck: Duck | null = null;
    for (const duck of ducksRef.current) {
      if (!duck.isAlive) continue;
      const dx = duck.x - clickX;
      const dy = duck.y - clickY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Radio de impacto generoso
      if (distance < DUCK_SIZE * 1.3) {
        hitDuck = duck;
        break;
      }
    }
    
    setLastHitPos({ x: clickX, y: clickY, hit: !!hitDuck });
    setTimeout(() => setLastHitPos(null), 400);
    
    if (hitDuck) {
      ducksRef.current = ducksRef.current.map((d: Duck) => 
        d.id === hitDuck!.id ? { ...d, isAlive: false } : d
      );
      setScore(prev => prev + 100);
      setKills(prev => [...prev, { username: hitDuck!.username, color: hitDuck!.color }].slice(-10));
      setTimeout(() => {
        ducksRef.current = ducksRef.current.filter((d: Duck) => d.id !== hitDuck!.id);
        setDuckCount(ducksRef.current.filter(d => d.isAlive).length);
      }, 500);
    }
  };

  const resetGame = () => {
    ducksRef.current = [];
    setDuckCount(0);
    setScore(0);
    setShotsFired(0);
    setKills([]);
    setLastHitPos(null);
    processedIdsRef.current.clear();
  };

  const accuracy = shotsFired > 0 ? Math.round((kills.length / shotsFired) * 100) : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            const newState = !isActive;
            setIsActive(newState);
            if (newState) {
              triggerGameStart();
            } else {
              triggerGameEnd();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isActive ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
          }`}
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          {isActive ? 'En Juego' : 'Iniciar'}
        </button>
        
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
          <Crosshair size={16} className="text-red-400" />
          <span className="text-white font-bold">{score}</span>
          <span className="text-zinc-500 text-sm">pts</span>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg">
          <span className="text-zinc-400 text-sm">🎯 {accuracy}%</span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <OBSOverlayUrl overlayParam="overlayDuckHunt" title="el Duck Hunt" />
          <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg" title="Reiniciar">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      
      <div className="bg-zinc-800/50 rounded-xl p-3 mt-3">
        <p className="text-zinc-400 text-sm text-center">
          Viewers escriben <span className="text-yellow-400 font-bold">!pato</span> para aparecer instantáneamente
        </p>
        <p className="text-zinc-500 text-xs text-center mt-1">
          Escribir !pato de nuevo = esquivar (cooldown 1s) • Streamer hace clic para disparar
        </p>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-zinc-700">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          className="w-full cursor-crosshair"
          style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
        />
        <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-1">
          <span className="text-white text-xs">🦆 {duckCount} patos</span>
        </div>
        <div className="absolute top-2 right-2 bg-black/50 rounded-lg px-2 py-1">
          <span className="text-white text-xs">💥 {shotsFired} disparos</span>
        </div>
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center bg-black/60 px-6 py-4 rounded-xl">
              <p className="text-white text-xl font-bold mb-2">🦆 Caza de Patos</p>
              <p className="text-yellow-400">Pulsa "Iniciar" para comenzar</p>
            </div>
          </div>
        )}
      </div>

      {kills.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs font-medium text-zinc-400">Últimas bajas</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {kills.slice(-8).map((kill, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-500/20" style={{ color: kill.color }}>
                💀 {kill.username}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DuckHunt;
