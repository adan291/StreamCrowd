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
  createdAt: number;
  points: number;
  popped: boolean;
}

const GAME_CHANNEL = 'pium_game_sync';
const GRAVITY = 0.15;
const BOUNCE_DAMPING = 0.8;
const FRICTION = 0.995;
const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', 'transparent'];

export const PiumOverlay: React.FC = () => {
  const [bgColor, setBgColor] = useState('#00FF00');
  const [showSettings, setShowSettings] = useState(false);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [scores, setScores] = useState<[string, number][]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const animationRef = useRef<number>();
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Setup BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    channelRef.current.onmessage = (event) => {
      if (event.data?.type === 'game_state') {
        ballsRef.current = event.data.balls || [];
        setTarget(event.data.target);
        setScores(event.data.scores || []);
      }
    };
    return () => channelRef.current?.close();
  }, []);

  // Animation loop
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
      
      // Update physics locally for smooth animation
      ballsRef.current = ballsRef.current.map(ball => {
        if (ball.popped) return ball;
        let { x, y, vx, vy, radius } = ball;
        vy += GRAVITY;
        vx *= FRICTION;
        x += vx;
        y += vy;
        
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

      // Draw target
      if (target) {
        ctx.beginPath();
        ctx.arc(target.x, target.y, 40, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(target.x, target.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(target.x, target.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#FF4444';
        ctx.fill();
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('🎯', target.x, target.y + 5);
      }

      // Draw balls
      ballsRef.current.filter(b => !b.popped).forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x + 3, ball.y + 3, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
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
        
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(ball.username.slice(0, 12), ball.x, ball.y + ball.radius + 14);
        ctx.shadowBlur = 0;
      });

      // Draw scoreboard if in target mode
      if (target && scores.length > 0) {
        const topScores = scores.sort((a, b) => b[1] - a[1]).slice(0, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.roundRect(10, 10, 150, 30 + topScores.length * 22, 8);
        ctx.fill();
        
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.fillText('🏆 Ranking', 20, 28);
        
        topScores.forEach(([user, score], i) => {
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#fff';
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          ctx.fillText(`${medal} ${user}`, 20, 48 + i * 22);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'right';
          ctx.fillText(`${score}`, 150, 48 + i * 22);
          ctx.textAlign = 'left';
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [target, scores]);

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
      
      {ballsRef.current.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-xl px-6 py-4 text-center">
            <p className="text-white/70">Esperando !pium del chat...</p>
            <p className="text-white/50 text-xs mt-1">Conectado al panel principal</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PiumOverlay;
