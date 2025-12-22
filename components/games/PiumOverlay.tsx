import React, { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';

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

interface Pocket {
  x: number;
  y: number;
}

const GAME_CHANNEL = 'pium_game_sync';
const FRICTION = 0.985;
const POCKET_RADIUS = 28;
const TABLE_COLOR = '#0d5c2e';
const BORDER_COLOR = '#5c3d2e';
const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', 'transparent'];

export const PiumOverlay: React.FC = () => {
  const [bgColor, setBgColor] = useState('#00FF00');
  const [showSettings, setShowSettings] = useState(false);
  const [scores, setScores] = useState<[string, number][]>([]);
  const [pockets, setPockets] = useState<Pocket[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const cueBallRef = useRef<Ball | null>(null);
  const animationRef = useRef<number>();
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    channelRef.current.onmessage = (event) => {
      if (event.data?.type === 'game_state') {
        ballsRef.current = event.data.balls || [];
        cueBallRef.current = event.data.cueBall || null;
        setScores(event.data.scores || []);
        if (event.data.pockets) setPockets(event.data.pockets);
      }
    };
    return () => channelRef.current?.close();
  }, []);

  // Calculate scaled pockets based on canvas size
  const getScaledPockets = (canvas: HTMLCanvasElement) => {
    const margin = 35;
    return [
      { x: margin, y: margin },
      { x: canvas.width / 2, y: margin - 8 },
      { x: canvas.width - margin, y: margin },
      { x: margin, y: canvas.height - margin },
      { x: canvas.width / 2, y: canvas.height - margin + 8 },
      { x: canvas.width - margin, y: canvas.height - margin },
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw pool table
      const tableMargin = 20;
      ctx.fillStyle = BORDER_COLOR;
      ctx.fillRect(tableMargin, tableMargin, canvas.width - tableMargin * 2, canvas.height - tableMargin * 2);
      ctx.fillStyle = TABLE_COLOR;
      ctx.fillRect(tableMargin + 15, tableMargin + 15, canvas.width - tableMargin * 2 - 30, canvas.height - tableMargin * 2 - 30);
      
      // Draw table markings
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(canvas.width * 0.25, tableMargin + 20);
      ctx.lineTo(canvas.width * 0.25, canvas.height - tableMargin - 20);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw pockets
      const scaledPockets = getScaledPockets(canvas);
      scaledPockets.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS - 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
      });

      // Scale factor for ball positions
      const scaleX = canvas.width / 600;
      const scaleY = canvas.height / 350;

      // Update and draw balls
      const allBalls = [...ballsRef.current.filter(b => !b.pocketed)];
      if (cueBallRef.current && !cueBallRef.current.pocketed) {
        allBalls.push(cueBallRef.current);
      }

      allBalls.forEach(ball => {
        // Apply friction locally for smooth animation
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.05) ball.vy = 0;
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Scale position
        const x = ball.x * scaleX;
        const y = ball.y * scaleY;
        const radius = ball.radius * Math.min(scaleX, scaleY);
        
        // Shadow
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();
        
        // Ball gradient
        const gradient = ctx.createRadialGradient(
          x - radius * 0.3, y - radius * 0.3, 0,
          x, y, radius
        );
        
        if (ball.isWhite) {
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(1, '#e0e0e0');
        } else {
          gradient.addColorStop(0, '#ffffff');
          gradient.addColorStop(0.3, ball.color);
          gradient.addColorStop(1, ball.color);
        }
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = ball.isWhite ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Username (not for cue ball)
        if (!ball.isWhite && ball.username) {
          ctx.font = `bold ${Math.max(10, 12 * Math.min(scaleX, scaleY))}px sans-serif`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = 4;
          ctx.fillText(ball.username.slice(0, 10), x, y + radius + 14);
          ctx.shadowBlur = 0;
        }
      });

      // Draw scoreboard
      if (scores.length > 0) {
        const topScores = [...scores].sort((a, b) => b[1] - a[1]).slice(0, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.roundRect(15, 15, 180, 35 + topScores.length * 24, 10);
        ctx.fill();
        
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.fillText('🎱 Mejores Tiradores', 25, 35);
        
        topScores.forEach(([user, score], i) => {
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#fff';
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          ctx.fillText(`${medal} ${user}`, 25, 58 + i * 24);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'right';
          ctx.fillText(`${score}`, 185, 58 + i * 24);
          ctx.textAlign = 'left';
        });
      }

      // Instructions
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(canvas.width - 200, canvas.height - 50, 185, 35, 8);
      ctx.fill();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.fillText('!pium para disparar', canvas.width - 107, canvas.height - 28);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [scores]);

  const activeBalls = ballsRef.current.filter(b => !b.pocketed).length;

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ backgroundColor: bgColor }}>
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg z-50"
      >
        <Settings size={18} />
      </button>
      
      {showSettings && (
        <div className="fixed top-12 right-2 bg-zinc-900 rounded-xl p-4 shadow-xl border border-zinc-700 z-50 w-48">
          <p className="text-xs text-zinc-400 mb-2 font-bold">Chroma Key</p>
          <div className="flex gap-1 flex-wrap">
            {OVERLAY_BG_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className={`w-8 h-8 rounded border-2 ${bgColor === color ? 'border-white scale-110' : 'border-transparent'} ${color === 'transparent' ? 'bg-[conic-gradient(#666_25%,#888_25%_50%,#666_50%_75%,#888_75%)] bg-[length:8px_8px]' : ''}`}
                style={{ backgroundColor: color === 'transparent' ? undefined : color }}
              />
            ))}
          </div>
        </div>
      )}
      
      <canvas ref={canvasRef} className="w-full h-full" />
      
      {activeBalls === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 rounded-xl px-8 py-5 text-center">
            <p className="text-white text-xl font-bold">🎱 Billar Chat</p>
            <p className="text-white/70 mt-2">Escribe en el chat para ser una bola</p>
            <p className="text-yellow-400 text-sm mt-1">!pium para disparar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PiumOverlay;
