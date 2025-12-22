import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Pause, ExternalLink, Trash2, Volume2, VolumeX, Trophy, RotateCcw } from 'lucide-react';

interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  username: string;
  isWhite: boolean;
  pocketed: boolean;
}

interface PiumGameProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'pium_game_sync';
const BALL_RADIUS = 14;
const FRICTION = 0.985;
const POCKET_RADIUS = 22;
const TABLE_COLOR = '#0d5c2e';
const BORDER_COLOR = '#5c3d2e';
const COLORS = ['#FFD700', '#1E90FF', '#FF4500', '#9932CC', '#00CED1', '#FF69B4', '#32CD32', '#FF6347', '#4169E1', '#FFA500'];

export const PiumGame: React.FC<PiumGameProps> = ({ chatMessages, isConnected = true }) => {
  const [isActive, setIsActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [lastPocketed, setLastPocketed] = useState<{ username: string; color: string } | null>(null);
  const [cueBallReady, setCueBallReady] = useState(true);
  const [shotPower, setShotPower] = useState(8);
  const [shotAngle, setShotAngle] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const cueBallRef = useRef<Ball | null>(null);
  const animationRef = useRef<number>();
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Pocket positions (6 pockets like real pool)
  const getPockets = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return [];
    const w = canvas.width;
    const h = canvas.height;
    const margin = 25;
    return [
      { x: margin, y: margin }, // Top-left
      { x: w / 2, y: margin - 5 }, // Top-center
      { x: w - margin, y: margin }, // Top-right
      { x: margin, y: h - margin }, // Bottom-left
      { x: w / 2, y: h - margin + 5 }, // Bottom-center
      { x: w - margin, y: h - margin }, // Bottom-right
    ];
  }, []);

  const playSound = useCallback((type: 'hit' | 'pocket' | 'wall') => {
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
      
      if (type === 'hit') {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      } else if (type === 'pocket') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      } else if (type === 'wall') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      }
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }, [soundEnabled]);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(() => {
    channelRef.current?.postMessage({ 
      type: 'game_state', 
      balls: ballsRef.current.filter(b => !b.pocketed),
      cueBall: cueBallRef.current,
      scores: Array.from(scores.entries()),
      pockets: getPockets()
    });
  }, [scores, getPockets]);


  // Add viewers as balls when they chat
  useEffect(() => {
    if (!isActive || !isConnected) return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;
    const canvas = canvasRef.current;
    if (!canvas) return;

    newMessages.forEach((msg) => {
      const oderId = msg.userId || msg.username;
      const msgLower = msg.message.toLowerCase().trim();
      
      // !pium shoots the cue ball - formatos: !pium, !pium 45, !pium-45-10
      if (msgLower === '!pium' || msgLower.startsWith('!pium ') || msgLower.startsWith('!pium-')) {
        if (!cueBallReady || ballsRef.current.length === 0) return;
        
        let angle = shotAngle * (Math.PI / 180);
        let power = shotPower;
        
        // Formato !pium-ANGULO-FUERZA (ej: !pium-180-15)
        if (msgLower.startsWith('!pium-')) {
          const parts = msgLower.split('-');
          if (parts[1]) {
            const angleNum = parseInt(parts[1]);
            if (!isNaN(angleNum)) angle = angleNum * (Math.PI / 180);
          }
          if (parts[2]) {
            const powerNum = parseInt(parts[2]);
            if (!isNaN(powerNum)) power = Math.max(3, Math.min(15, powerNum));
          }
        }
        // Formato !pium ANGULO (ej: !pium 45)
        else if (msgLower.startsWith('!pium ')) {
          const parts = msgLower.split(' ');
          if (parts[1]) {
            const num = parseInt(parts[1]);
            if (!isNaN(num)) angle = num * (Math.PI / 180);
          }
        }
        
        // Shoot the cue ball
        if (cueBallRef.current) {
          cueBallRef.current.vx = Math.cos(angle) * power;
          cueBallRef.current.vy = Math.sin(angle) * power;
          setCueBallReady(false);
          playSound('hit');
          
          // Update shooter for scoring
          (cueBallRef.current as any).shooter = msg.username;
          (cueBallRef.current as any).shooterColor = msg.color || '#fff';
        }
        return;
      }
      
      // Any other message adds the user as a ball (if not already on table)
      const existingBall = ballsRef.current.find(b => b.id === oderId && !b.pocketed);
      if (!existingBall) {
        const margin = 60;
        const newBall: Ball = {
          id: oderId,
          x: margin + Math.random() * (canvas.width - margin * 2),
          y: margin + Math.random() * (canvas.height - margin * 2),
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          color: msg.color || COLORS[Math.floor(Math.random() * COLORS.length)],
          username: msg.username,
          isWhite: false,
          pocketed: false,
        };
        
        // Avoid spawning on pockets
        const pockets = getPockets();
        for (const pocket of pockets) {
          const dx = newBall.x - pocket.x;
          const dy = newBall.y - pocket.y;
          if (Math.sqrt(dx*dx + dy*dy) < POCKET_RADIUS + BALL_RADIUS + 10) {
            newBall.x = canvas.width / 2 + (Math.random() - 0.5) * 100;
            newBall.y = canvas.height / 2 + (Math.random() - 0.5) * 100;
          }
        }
        
        ballsRef.current = [...ballsRef.current, newBall].slice(-15);
        syncToOverlay();
      }
    });
  }, [chatMessages, isActive, isConnected, shotAngle, shotPower, playSound, syncToOverlay, getPockets, cueBallReady]);

  // Initialize cue ball
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (!cueBallRef.current) {
      cueBallRef.current = {
        id: 'cue_ball',
        x: canvas.width * 0.25,
        y: canvas.height / 2,
        vx: 0,
        vy: 0,
        radius: BALL_RADIUS,
        color: '#FFFFFF',
        username: '',
        isWhite: true,
        pocketed: false,
      };
    }
  }, []);

  // Check ball-ball collision
  const checkBallCollision = useCallback((b1: Ball, b2: Ball) => {
    const dx = b2.x - b1.x;
    const dy = b2.y - b1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = b1.radius + b2.radius;
    
    if (dist < minDist && dist > 0) {
      // Collision response
      const nx = dx / dist;
      const ny = dy / dist;
      const dvx = b1.vx - b2.vx;
      const dvy = b1.vy - b2.vy;
      const dvn = dvx * nx + dvy * ny;
      
      if (dvn > 0) {
        b1.vx -= dvn * nx;
        b1.vy -= dvn * ny;
        b2.vx += dvn * nx;
        b2.vy += dvn * ny;
        
        // Separate balls
        const overlap = minDist - dist;
        b1.x -= overlap * nx * 0.5;
        b1.y -= overlap * ny * 0.5;
        b2.x += overlap * nx * 0.5;
        b2.y += overlap * ny * 0.5;
        
        playSound('hit');
      }
    }
  }, [playSound]);

  // Check pocket collision
  const checkPocketCollision = useCallback((ball: Ball): boolean => {
    const pockets = getPockets();
    for (const pocket of pockets) {
      const dx = ball.x - pocket.x;
      const dy = ball.y - pocket.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < POCKET_RADIUS) {
        return true;
      }
    }
    return false;
  }, [getPockets]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw table
      ctx.fillStyle = BORDER_COLOR;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = TABLE_COLOR;
      ctx.fillRect(15, 15, canvas.width - 30, canvas.height - 30);
      
      // Draw table lines
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.25, 20);
      ctx.lineTo(canvas.width * 0.25, canvas.height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw pockets
      const pockets = getPockets();
      pockets.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS - 3, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
      });

      // Update physics
      const allBalls = [...ballsRef.current.filter(b => !b.pocketed), cueBallRef.current].filter(Boolean) as Ball[];
      
      allBalls.forEach(ball => {
        if (ball.pocketed) return;
        
        // Apply friction
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        
        // Stop if very slow
        if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.05) ball.vy = 0;
        
        // Move
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Wall collision
        const margin = 20;
        if (ball.x - ball.radius < margin) { ball.x = margin + ball.radius; ball.vx = -ball.vx * 0.8; playSound('wall'); }
        if (ball.x + ball.radius > canvas.width - margin) { ball.x = canvas.width - margin - ball.radius; ball.vx = -ball.vx * 0.8; playSound('wall'); }
        if (ball.y - ball.radius < margin) { ball.y = margin + ball.radius; ball.vy = -ball.vy * 0.8; playSound('wall'); }
        if (ball.y + ball.radius > canvas.height - margin) { ball.y = canvas.height - margin - ball.radius; ball.vy = -ball.vy * 0.8; playSound('wall'); }
      });

      // Ball-ball collisions
      for (let i = 0; i < allBalls.length; i++) {
        for (let j = i + 1; j < allBalls.length; j++) {
          if (!allBalls[i].pocketed && !allBalls[j].pocketed) {
            checkBallCollision(allBalls[i], allBalls[j]);
          }
        }
      }

      // Check pockets
      ballsRef.current.forEach(ball => {
        if (!ball.pocketed && checkPocketCollision(ball)) {
          ball.pocketed = true;
          playSound('pocket');
          setLastPocketed({ username: ball.username, color: ball.color });
          
          // Award points to shooter
          const shooter = (cueBallRef.current as any)?.shooter;
          if (shooter) {
            setScores(prev => {
              const newScores = new Map<string, number>(prev);
              const currentScore = newScores.get(shooter) || 0;
              newScores.set(shooter, currentScore + 10);
              return newScores;
            });
          }
        }
      });

      // Check if cue ball pocketed (foul)
      if (cueBallRef.current && !cueBallRef.current.pocketed && checkPocketCollision(cueBallRef.current)) {
        // Reset cue ball position
        cueBallRef.current.x = canvas.width * 0.25;
        cueBallRef.current.y = canvas.height / 2;
        cueBallRef.current.vx = 0;
        cueBallRef.current.vy = 0;
      }

      // Check if all balls stopped
      const allStopped = allBalls.every(b => Math.abs(b.vx) < 0.1 && Math.abs(b.vy) < 0.1);
      if (allStopped && !cueBallReady) {
        setCueBallReady(true);
      }


      // Draw balls
      ballsRef.current.filter(b => !b.pocketed).forEach(ball => {
        // Shadow
        ctx.beginPath();
        ctx.arc(ball.x + 2, ball.y + 2, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();
        
        // Ball gradient
        const gradient = ctx.createRadialGradient(
          ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 0,
          ball.x, ball.y, ball.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, ball.color);
        gradient.addColorStop(1, ball.color);
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Username
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 2;
        ctx.fillText(ball.username.slice(0, 8), ball.x, ball.y + ball.radius + 10);
        ctx.shadowBlur = 0;
      });

      // Draw cue ball
      if (cueBallRef.current && !cueBallRef.current.pocketed) {
        const cue = cueBallRef.current;
        ctx.beginPath();
        ctx.arc(cue.x + 2, cue.y + 2, cue.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();
        
        const gradient = ctx.createRadialGradient(
          cue.x - cue.radius * 0.3, cue.y - cue.radius * 0.3, 0,
          cue.x, cue.y, cue.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#e0e0e0');
        
        ctx.beginPath();
        ctx.arc(cue.x, cue.y, cue.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw aim line when ready
        if (cueBallReady && ballsRef.current.filter(b => !b.pocketed).length > 0) {
          const angle = shotAngle * (Math.PI / 180);
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x + Math.cos(angle) * 80, cue.y + Math.sin(angle) * 80);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Arrow head
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          const arrowX = cue.x + Math.cos(angle) * 80;
          const arrowY = cue.y + Math.sin(angle) * 80;
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - Math.cos(angle - 0.3) * 10, arrowY - Math.sin(angle - 0.3) * 10);
          ctx.lineTo(arrowX - Math.cos(angle + 0.3) * 10, arrowY - Math.sin(angle + 0.3) * 10);
          ctx.closePath();
          ctx.fill();
        }
      }

      syncToOverlay();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [getPockets, checkBallCollision, checkPocketCollision, playSound, syncToOverlay, cueBallReady, shotAngle]);

  const clearTable = () => {
    ballsRef.current = [];
    if (cueBallRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        cueBallRef.current.x = canvas.width * 0.25;
        cueBallRef.current.y = canvas.height / 2;
        cueBallRef.current.vx = 0;
        cueBallRef.current.vy = 0;
      }
    }
    setCueBallReady(true);
    setLastPocketed(null);
    syncToOverlay();
  };

  const resetScores = () => setScores(new Map());

  const openOverlay = () => {
    const width = 800, height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    window.open(`${baseUrl}?overlayPium=true`, 'PiumOverlay', `width=${width},height=${height},left=${left},top=${top}`);
  };

  const activeBalls = ballsRef.current.filter(b => !b.pocketed).length;
  const topScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

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
          {isActive ? 'En Juego' : 'Iniciar'}
        </button>
        
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-lg transition-all ${soundEnabled ? 'bg-blue-500 text-white' : 'bg-zinc-700 text-zinc-400'}`}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        
        <button onClick={clearTable} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
          <Trash2 size={18} />
        </button>
        
        <button
          onClick={openOverlay}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white font-medium rounded-lg ml-auto"
        >
          <ExternalLink size={16} /> Overlay
        </button>
      </div>

      {/* Shot controls */}
      <div className="bg-zinc-800 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Ángulo: {shotAngle}°</label>
            <input
              type="range"
              min="0"
              max="360"
              value={shotAngle}
              onChange={(e) => setShotAngle(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Fuerza: {shotPower}</label>
            <input
              type="range"
              min="3"
              max="15"
              value={shotPower}
              onChange={(e) => setShotPower(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
        </div>
        <p className="text-zinc-500 text-xs text-center">
          {cueBallReady ? '✅ Listo para disparar' : '⏳ Esperando que las bolas paren...'}
        </p>
      </div>

      <div className="bg-zinc-800/50 rounded-xl p-3">
        <p className="text-zinc-400 text-sm text-center">
          Escribe en el chat para ser una bola 🎱 • <span className="text-yellow-400 font-bold">!pium</span> dispara la bola blanca
        </p>
        <p className="text-zinc-500 text-xs text-center mt-1">
          <code className="bg-zinc-700 px-1 rounded">!pium-180-15</code> = ángulo 180° + fuerza 15 • <code className="bg-zinc-700 px-1 rounded">!pium 45</code> = solo ángulo
        </p>
      </div>

      {lastPocketed && (
        <div className="bg-green-500/20 rounded-xl p-3 text-center animate-pulse">
          <p className="text-white font-bold">
            🎱 ¡<span style={{ color: lastPocketed.color }}>{lastPocketed.username}</span> entró en la tronera!
          </p>
        </div>
      )}

      {topScores.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-white">Mejores Tiradores</span>
            </div>
            <button onClick={resetScores} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {topScores.map(([user, score], i) => (
              <span key={user} className="text-xs px-2 py-1 bg-zinc-700/50 rounded">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} {user}: {score}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden border-4 border-amber-900">
        <canvas ref={canvasRef} width={600} height={350} className="w-full" style={{ aspectRatio: '12/7' }} />
        <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-1">
          <span className="text-white text-xs">🎱 {activeBalls} bolas</span>
        </div>
        {activeBalls === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg">
              Escribe en el chat para unirte a la mesa
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PiumGame;
