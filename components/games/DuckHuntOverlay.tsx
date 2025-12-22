import React, { useState, useEffect, useRef } from 'react';

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
  canMove: boolean;
}

interface DuckHuntState {
  ducks: Duck[];
  score: number;
  kills: { username: string; color: string }[];
}

const GAME_CHANNEL = 'duckhunt_sync';
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const DUCK_SIZE = 50;

export const DuckHuntOverlay: React.FC = () => {
  const [state, setState] = useState<DuckHuntState>({
    ducks: [],
    score: 0,
    kills: []
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ducksRef = useRef<Duck[]>([]);
  const animationRef = useRef<number>();
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    
    channelRef.current.onmessage = (event) => {
      if (event.data.type === 'duckhunt_state') {
        ducksRef.current = event.data.ducks || [];
        setState({
          ducks: event.data.ducks || [],
          score: event.data.score || 0,
          kills: event.data.kills || []
        });
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
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      const time = Date.now() / 3000;
      for (let i = 0; i < 5; i++) {
        const x = ((time * 20 + i * 200) % (canvas.width + 100)) - 50;
        const y = 30 + i * 40;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 25, y - 10, 20, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 25, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Ground
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
      
      // Bushes
      ctx.fillStyle = '#166534';
      for (let i = 0; i < canvas.width; i += 80) {
        ctx.beginPath();
        ctx.arc(i + 40, canvas.height - 50, 35, Math.PI, 0);
        ctx.fill();
      }

      // Draw ducks from state
      ducksRef.current.filter((d: Duck) => d.isAlive).forEach((duck: Duck) => {
        ctx.save();
        ctx.translate(duck.x, duck.y);
        
        // Flip based on direction
        if (duck.vx < 0) ctx.scale(-1, 1);
        
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
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(DUCK_SIZE / 3 + 6, -DUCK_SIZE / 4 - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Wing animation
        ctx.fillStyle = duck.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(-5, 5, DUCK_SIZE / 4, DUCK_SIZE / 5, Math.sin(Date.now() / 100) * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.restore();
        
        // Username
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(duck.username.slice(0, 12), duck.x, duck.y + DUCK_SIZE / 2 + 18);
        ctx.shadowBlur = 0;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const { score, kills, ducks } = state;
  const aliveDucks = ducks.filter((d: Duck) => d.isAlive).length;

  return (
    <div className="h-screen w-screen bg-[#87CEEB] overflow-hidden relative">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full"
        style={{ objectFit: 'cover' }}
      />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 flex items-center gap-4">
        <div className="bg-black/60 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-2xl">🦆</span>
          <span className="text-white font-bold text-xl">{aliveDucks}</span>
        </div>
        
        <div className="bg-black/60 rounded-xl px-4 py-2 flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span className="text-white font-bold text-xl">{score}</span>
          <span className="text-zinc-400 text-sm">pts</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 right-4 bg-black/60 rounded-xl px-4 py-2">
        <p className="text-yellow-400 font-bold">!pato</p>
        <p className="text-white text-xs">para aparecer</p>
      </div>

      {/* Recent kills */}
      {kills.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-black/60 rounded-xl p-3">
          <p className="text-red-400 text-xs font-bold mb-1">💀 Últimas bajas:</p>
          <div className="flex flex-wrap gap-1">
            {kills.slice(-5).map((kill: { username: string; color: string }, i: number) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-red-500/30"
                style={{ color: kill.color }}
              >
                {kill.username}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No ducks message */}
      {aliveDucks === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-2xl px-8 py-4 text-center">
            <p className="text-white text-2xl font-bold">🦆 Caza de Patos</p>
            <p className="text-yellow-400 mt-2">Escribe <span className="font-bold">!pato</span> para jugar</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DuckHuntOverlay;
