import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Pause, Settings, ExternalLink, Trash2, Volume2, VolumeX, Target, Trophy, RotateCcw } from 'lucide-react';

interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  username: string;
  createdAt: number;
  points: number;
  popped: boolean;
}

interface PiumGameProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'pium_game_sync';
const BALL_LIFETIME = 20000;
const GRAVITY = 0.15;
const BOUNCE_DAMPING = 0.8;
const FRICTION = 0.995;
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

export const PiumGame: React.FC<PiumGameProps> = ({ chatMessages, isConnected = true }) => {
  const [isActive, setIsActive] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ballSize, setBallSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [ballCount, setBallCount] = useState(0);
  const [gameMode, setGameMode] = useState<'free' | 'target'>('free');
  const [targetPosition, setTargetPosition] = useState({ x: 300, y: 200 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const animationRef = useRef<number>();
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getBallRadius = useCallback(() => {
    switch (ballSize) {
      case 'small': return 12;
      case 'large': return 28;
      default: return 20;
    }
  }, [ballSize]);

  const playSound = useCallback((type: 'pium' | 'pop' | 'score') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'pium') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'pop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'score') {
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.error('Audio error:', e);
    }
  }, [soundEnabled]);

  // Setup BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(() => {
    channelRef.current?.postMessage({ 
      type: 'game_state', 
      balls: ballsRef.current.filter(b => !b.popped),
      target: gameMode === 'target' ? targetPosition : null,
      scores: Array.from(scores.entries())
    });
  }, [gameMode, targetPosition, scores]);

  // Randomize target position
  const moveTarget = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setTargetPosition({
      x: Math.random() * (canvas.width - 100) + 50,
      y: Math.random() * (canvas.height - 100) + 50
    });
  }, []);

  // Process chat messages for !pium command
  useEffect(() => {
    if (!isActive || !isConnected) return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      if (msgLower === '!pium' || msgLower.startsWith('!pium ')) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Parse direction from message (e.g., !pium left, !pium right, !pium up)
        const parts = msgLower.split(' ');
        let vx = (Math.random() - 0.5) * 6;
        let vy = -Math.random() * 4 - 2;
        
        if (parts[1] === 'left' || parts[1] === 'izq') vx = -Math.abs(vx) - 3;
        else if (parts[1] === 'right' || parts[1] === 'der') vx = Math.abs(vx) + 3;
        else if (parts[1] === 'up' || parts[1] === 'arriba') vy = -8;
        
        const newBall: Ball = {
          id: `${msg.userId || msg.username}-${Date.now()}-${Math.random()}`,
          x: canvas.width / 2 + (Math.random() - 0.5) * 100,
          y: canvas.height - 50,
          vx,
          vy,
          radius: getBallRadius(),
          color: msg.color || COLORS[Math.floor(Math.random() * COLORS.length)],
          username: msg.username,
          createdAt: Date.now(),
          points: 0,
          popped: false,
        };
        
        ballsRef.current = [...ballsRef.current, newBall].slice(-30);
        setBallCount(ballsRef.current.length);
        playSound('pium');
        syncToOverlay();
      }
    });
  }, [chatMessages, isActive, isConnected, getBallRadius, playSound, syncToOverlay]);

  // Remove expired balls
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const before = ballsRef.current.length;
      ballsRef.current = ballsRef.current.filter(b => !b.popped && now - b.createdAt < BALL_LIFETIME);
      if (ballsRef.current.length !== before) {
        setBallCount(ballsRef.current.length);
        syncToOverlay();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [syncToOverlay]);

  // Check target collision
  const checkTargetCollision = useCallback((ball: Ball) => {
    if (gameMode !== 'target') return false;
    const dx = ball.x - targetPosition.x;
    const dy = ball.y - targetPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < ball.radius + 30;
  }, [gameMode, targetPosition]);

  // Animation loop - using refs to avoid re-renders
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update physics using ref (no setState)
      ballsRef.current = ballsRef.current.map(ball => {
        if (ball.popped) return ball;
        
        let { x, y, vx, vy, radius } = ball;
        
        vy += GRAVITY;
        vx *= FRICTION;
        x += vx;
        y += vy;
        
        // Bounce off walls
        if (x - radius < 0) { x = radius; vx = -vx * BOUNCE_DAMPING; }
        if (x + radius > canvas.width) { x = canvas.width - radius; vx = -vx * BOUNCE_DAMPING; }
        if (y - radius < 0) { y = radius; vy = -vy * BOUNCE_DAMPING; }
        if (y + radius > canvas.height) { 
          y = canvas.height - radius; 
          vy = -vy * BOUNCE_DAMPING;
          if (Math.abs(vy) < 0.5) vy = 0;
        }
        
        return { ...ball, x, y, vx, vy };
      });

      // Check target collisions
      if (gameMode === 'target') {
        ballsRef.current.forEach(ball => {
          if (!ball.popped && checkTargetCollision(ball)) {
            ball.popped = true;
            ball.points = 10;
            setScores(prev => {
              const newScores = new Map(prev);
              newScores.set(ball.username, (newScores.get(ball.username) || 0) + 10);
              return newScores;
            });
            playSound('score');
            moveTarget();
            setBallCount(ballsRef.current.filter(b => !b.popped).length);
          }
        });
      }

      // Draw target
      if (gameMode === 'target') {
        ctx.beginPath();
        ctx.arc(targetPosition.x, targetPosition.y, 35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(targetPosition.x, targetPosition.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(targetPosition.x, targetPosition.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#FF4444';
        ctx.fill();
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('🎯', targetPosition.x, targetPosition.y + 4);
      }

      // Draw balls
      ballsRef.current.filter(b => !b.popped).forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fill();
        
        const gradient = ctx.createRadialGradient(
          ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
          ball.x, ball.y, ball.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.4, ball.color);
        gradient.addColorStop(1, ball.color);
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 3;
        ctx.fillText(ball.username.slice(0, 10), ball.x, ball.y + ball.radius + 12);
        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameMode, targetPosition, checkTargetCollision, playSound, moveTarget]);

  const clearBalls = () => {
    ballsRef.current = [];
    setBallCount(0);
    syncToOverlay();
  };

  const resetScores = () => {
    setScores(new Map());
  };

  const openOverlay = () => {
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayPium=true`, 'PiumOverlay', `width=${width},height=${height},left=${left},top=${top}`);
    setTimeout(syncToOverlay, 500);
  };

  const topScores = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="p-4 space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isActive ? 'bg-green-500 text-white' : 'bg-zinc-700 text-zinc-300'
          }`}
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
          {isActive ? 'Activo' : 'Pausado'}
        </button>
        
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg transition-all ${
            soundEnabled ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400'
          }`}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-lg transition-all"
        >
          <Settings size={18} />
        </button>
        
        <button
          onClick={clearBalls}
          className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
        >
          <Trash2 size={18} />
        </button>
        
        <button
          onClick={openOverlay}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-medium rounded-lg transition-all ml-auto"
        >
          <ExternalLink size={16} />
          Overlay OBS
        </button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Modo de juego:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setGameMode('free')}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${
                  gameMode === 'free' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                Libre
              </button>
              <button
                onClick={() => { setGameMode('target'); moveTarget(); }}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${
                  gameMode === 'target' ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-400'
                }`}
              >
                <Target size={14} /> Diana
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Tamaño:</span>
            <div className="flex gap-1">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setBallSize(size)}
                  className={`px-3 py-1 rounded text-xs font-medium ${
                    ballSize === size ? 'bg-twitch-brand text-white' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-zinc-800/50 rounded-xl p-3">
        <p className="text-zinc-400 text-sm text-center">
          Escribe <span className="text-twitch-brand font-bold">!pium</span> para lanzar
          {gameMode === 'free' ? '' : ' • ¡Apunta a la diana!'}
        </p>
        <p className="text-zinc-500 text-xs mt-1 text-center">
          Opciones: <code className="bg-zinc-700 px-1 rounded">!pium left</code> <code className="bg-zinc-700 px-1 rounded">!pium right</code> <code className="bg-zinc-700 px-1 rounded">!pium up</code>
        </p>
      </div>

      {/* Scoreboard for target mode */}
      {gameMode === 'target' && topScores.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">Ranking</span>
            </div>
            <button onClick={resetScores} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div className="space-y-1">
            {topScores.map(([user, score], i) => (
              <div key={user} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {user}
                </span>
                <span className="text-yellow-400 font-bold">{score} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Canvas */}
      <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
        <canvas
          ref={canvasRef}
          width={600}
          height={350}
          className="w-full"
          style={{ aspectRatio: '12/7' }}
        />
        <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-1">
          <span className="text-white text-xs">{ballCount} 🔵</span>
        </div>
        {ballCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-zinc-500 text-sm bg-black/30 px-4 py-2 rounded-lg">
              Esperando !pium del chat...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PiumGame;
