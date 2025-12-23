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
const POCKET_RADIUS = 24;
const TABLE_COLOR = '#0a6b35';
const TABLE_FELT = '#0d7a3e';
const BORDER_COLOR = '#4a2c1a';
const WOOD_LIGHT = '#6b4423';
const WOOD_DARK = '#3d2415';
const OVERLAY_BG_COLORS = ['#00FF00', '#FF00FF', '#0000FF', '#000000', 'transparent'];

// Source canvas dimensions (must match PiumGame)
const SOURCE_WIDTH = 700;
const SOURCE_HEIGHT = 380;

export const PiumOverlay: React.FC = () => {
  const [bgColor, setBgColor] = useState('#00FF00');
  const [showSettings, setShowSettings] = useState(false);
  const [scores, setScores] = useState<[string, number][]>([]);
  
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
      }
    };
    return () => channelRef.current?.close();
  }, []);

  // Helper function to darken colors
  const shadeColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + 
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + 
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + 
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
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
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.clearRect(0, 0, w, h);
      
      // Scale factors
      const scaleX = w / SOURCE_WIDTH;
      const scaleY = h / SOURCE_HEIGHT;
      const scale = Math.min(scaleX, scaleY);
      
      // Center the table
      const tableW = SOURCE_WIDTH * scale;
      const tableH = SOURCE_HEIGHT * scale;
      const offsetX = (w - tableW) / 2;
      const offsetY = (h - tableH) / 2;
      
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      
      // Draw wood border
      const borderWidth = 18;
      const borderGrad = ctx.createLinearGradient(0, 0, 0, SOURCE_HEIGHT);
      borderGrad.addColorStop(0, WOOD_LIGHT);
      borderGrad.addColorStop(0.5, BORDER_COLOR);
      borderGrad.addColorStop(1, WOOD_DARK);
      ctx.fillStyle = borderGrad;
      ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
      
      // Inner shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(borderWidth - 3, borderWidth - 3, SOURCE_WIDTH - (borderWidth - 3) * 2, SOURCE_HEIGHT - (borderWidth - 3) * 2);
      
      // Table felt
      const feltGrad = ctx.createRadialGradient(SOURCE_WIDTH/2, SOURCE_HEIGHT/2, 0, SOURCE_WIDTH/2, SOURCE_HEIGHT/2, SOURCE_WIDTH/2);
      feltGrad.addColorStop(0, TABLE_FELT);
      feltGrad.addColorStop(1, TABLE_COLOR);
      ctx.fillStyle = feltGrad;
      ctx.fillRect(borderWidth, borderWidth, SOURCE_WIDTH - borderWidth * 2, SOURCE_HEIGHT - borderWidth * 2);
      
      // Felt texture
      ctx.strokeStyle = 'rgba(0,0,0,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < SOURCE_WIDTH; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, borderWidth);
        ctx.lineTo(i, SOURCE_HEIGHT - borderWidth);
        ctx.stroke();
      }
      
      // Rail cushions
      ctx.fillStyle = '#0a5c2e';
      ctx.fillRect(borderWidth + 30, borderWidth, SOURCE_WIDTH - borderWidth * 2 - 60, 6);
      ctx.fillRect(borderWidth + 30, SOURCE_HEIGHT - borderWidth - 6, SOURCE_WIDTH - borderWidth * 2 - 60, 6);
      ctx.fillRect(borderWidth, borderWidth + 30, 6, SOURCE_HEIGHT - borderWidth * 2 - 60);
      ctx.fillRect(SOURCE_WIDTH - borderWidth - 6, borderWidth + 30, 6, SOURCE_HEIGHT - borderWidth * 2 - 60);
      
      // Decorative diamonds
      ctx.fillStyle = '#c9a959';
      [0.25, 0.5, 0.75].forEach(pos => {
        ctx.beginPath();
        ctx.arc(SOURCE_WIDTH * pos, borderWidth / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(SOURCE_WIDTH * pos, SOURCE_HEIGHT - borderWidth / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw pockets
      const margin = 22;
      const pockets = [
        { x: margin, y: margin },
        { x: SOURCE_WIDTH / 2, y: margin - 3 },
        { x: SOURCE_WIDTH - margin, y: margin },
        { x: margin, y: SOURCE_HEIGHT - margin },
        { x: SOURCE_WIDTH / 2, y: SOURCE_HEIGHT - margin + 3 },
        { x: SOURCE_WIDTH - margin, y: SOURCE_HEIGHT - margin },
      ];
      
      pockets.forEach(pocket => {
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
        const pocketGrad = ctx.createRadialGradient(pocket.x, pocket.y, 0, pocket.x, pocket.y, POCKET_RADIUS);
        pocketGrad.addColorStop(0, '#000000');
        pocketGrad.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = pocketGrad;
        ctx.fill();
      });
      
      // Head string line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(SOURCE_WIDTH * 0.25, 25);
      ctx.lineTo(SOURCE_WIDTH * 0.25, SOURCE_HEIGHT - 25);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update and draw balls
      const allBalls = [...ballsRef.current.filter(b => !b.pocketed)];
      
      allBalls.forEach(ball => {
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.05) ball.vy = 0;
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        const { x, y, radius, color, username } = ball;
        
        // Shadow
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();
        
        // Ball gradient
        const gradient = ctx.createRadialGradient(
          x - radius * 0.35, y - radius * 0.35, radius * 0.1,
          x, y, radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.2, color);
        gradient.addColorStop(1, shadeColor(color, -30));
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Glossy highlight
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
        
        // Edge
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Username with background
        if (username) {
          const displayName = username.slice(0, 5);
          
          ctx.font = '500 6px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const textWidth = ctx.measureText(displayName).width;
          const labelX = Math.round(x);
          const labelY = Math.round(y + radius + 7);
          const paddingX = 2;
          const paddingY = 1;
          
          // Background pill
          ctx.fillStyle = 'rgba(0,0,0,0.85)';
          ctx.beginPath();
          ctx.roundRect(
            Math.round(labelX - textWidth / 2 - paddingX),
            Math.round(labelY - 3 - paddingY),
            Math.round(textWidth + paddingX * 2),
            Math.round(6 + paddingY * 2),
            2
          );
          ctx.fill();
          
          // Text
          ctx.fillStyle = '#ffffff';
          ctx.fillText(displayName, labelX, labelY);
        }
      });

      // Draw cue ball
      if (cueBallRef.current && !cueBallRef.current.pocketed) {
        const cue = cueBallRef.current;
        cue.vx *= FRICTION;
        cue.vy *= FRICTION;
        if (Math.abs(cue.vx) < 0.05) cue.vx = 0;
        if (Math.abs(cue.vy) < 0.05) cue.vy = 0;
        cue.x += cue.vx;
        cue.y += cue.vy;
        
        const { x, y, radius } = cue;
        
        // Shadow
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();
        
        // Cue ball gradient
        const gradient = ctx.createRadialGradient(
          x - radius * 0.35, y - radius * 0.35, radius * 0.1,
          x, y, radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.8, '#f0f0f0');
        gradient.addColorStop(1, '#d0d0d0');
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Glossy highlight
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      ctx.restore();

      // Draw scoreboard (outside scaled area)
      if (scores.length > 0) {
        const topScores = [...scores].sort((a, b) => b[1] - a[1]).slice(0, 5);
        const sbX = 15;
        const sbY = 15;
        const sbW = 180;
        const sbH = 40 + topScores.length * 22;
        
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();
        ctx.roundRect(sbX, sbY, sbW, sbH, 10);
        ctx.fill();
        
        ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.textAlign = 'left';
        ctx.fillText('🎱 Mejores Tiradores', sbX + 10, sbY + 22);
        
        topScores.forEach(([user, score], i) => {
          ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
          ctx.fillStyle = '#fff';
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          ctx.fillText(`${medal} ${user}`, sbX + 10, sbY + 45 + i * 22);
          ctx.fillStyle = '#FFD700';
          ctx.textAlign = 'right';
          ctx.fillText(`${score}`, sbX + sbW - 10, sbY + 45 + i * 22);
          ctx.textAlign = 'left';
        });
      }

      // Instructions
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(w - 190, h - 45, 175, 32, 8);
      ctx.fill();
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.fillText('!pium para disparar', w - 102, h - 24);

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
          <div className="bg-black/70 backdrop-blur-sm rounded-xl px-8 py-5 text-center">
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
