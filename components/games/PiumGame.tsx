import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Pause, ExternalLink, Trash2, Volume2, VolumeX, Trophy, RotateCcw } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../services/firebaseSync';

const STORAGE_KEY_PIUM = 'pium_game_state';

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
const BALL_RADIUS = 24;
const FRICTION = 0.985;
const POCKET_RADIUS = 36;
const TABLE_COLOR = '#0a6b35';
const TABLE_FELT = '#0d7a3e';
const BORDER_COLOR = '#4a2c1a';
const WOOD_LIGHT = '#6b4423';
const WOOD_DARK = '#3d2415';
const COLORS = ['#FFD700', '#1E90FF', '#FF4500', '#9932CC', '#00CED1', '#FF69B4', '#32CD32', '#FF6347', '#4169E1', '#FFA500'];

// Canvas dimensions (higher resolution for crisp text when scaled)
const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 760;

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
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const margin = 44;
    return [
      { x: margin, y: margin },
      { x: w / 2, y: margin - 6 },
      { x: w - margin, y: margin },
      { x: margin, y: h - margin },
      { x: w / 2, y: h - margin + 6 },
      { x: w - margin, y: h - margin },
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
    const state = { 
      type: 'game_state', 
      balls: ballsRef.current.filter(b => !b.pocketed),
      cueBall: cueBallRef.current,
      scores: Array.from(scores.entries()),
      pockets: getPockets()
    };
    
    // Sync via BroadcastChannel (same browser)
    channelRef.current?.postMessage(state);
    
    // Also save to localStorage for cross-browser (OBS)
    try {
      localStorage.setItem(STORAGE_KEY_PIUM, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('pium', state).catch(() => {});
  }, [scores, getPockets]);

  // Get spawn position for new balls (random but on right side of cue ball)
  const getSpawnPosition = useCallback(() => {
    const margin = 80; // Distance from walls
    const cueBallX = CANVAS_WIDTH * 0.2; // Cue ball position
    
    // Spawn area: from right of cue ball to right edge
    const minX = cueBallX + BALL_RADIUS * 4; // Start a bit after cue ball
    const maxX = CANVAS_WIDTH - margin;
    const minY = margin;
    const maxY = CANVAS_HEIGHT - margin;
    
    // Random position in the right zone
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    
    return { x, y };
  }, []);

  // Add viewers as balls when they chat
  useEffect(() => {
    if (!isActive || !isConnected) return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const oderId = msg.userId || msg.username;
      const msgLower = msg.message.toLowerCase().trim();
      
      // !pium shoots the cue ball
      if (msgLower === '!pium' || msgLower.startsWith('!pium ') || msgLower.startsWith('!pium-')) {
        if (!cueBallReady || ballsRef.current.length === 0) return;
        
        let angle = shotAngle * (Math.PI / 180);
        let power = shotPower;
        
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
        } else if (msgLower.startsWith('!pium ')) {
          const parts = msgLower.split(' ');
          if (parts[1]) {
            const num = parseInt(parts[1]);
            if (!isNaN(num)) angle = num * (Math.PI / 180);
          }
        }
        
        if (cueBallRef.current) {
          cueBallRef.current.vx = Math.cos(angle) * power;
          cueBallRef.current.vy = Math.sin(angle) * power;
          setCueBallReady(false);
          playSound('hit');
          (cueBallRef.current as any).shooter = msg.username;
          (cueBallRef.current as any).shooterColor = msg.color || '#fff';
        }
        return;
      }
      
      // Any other message adds the user as a ball
      const existingBall = ballsRef.current.find(b => b.id === oderId && !b.pocketed);
      if (!existingBall) {
        let pos = getSpawnPosition();
        let attempts = 0;
        const maxAttempts = 10;
        
        // Try to find a position that doesn't overlap with existing balls
        while (attempts < maxAttempts) {
          let overlaps = false;
          
          // Check against existing balls
          for (const ball of ballsRef.current) {
            if (ball.pocketed) continue;
            const dx = pos.x - ball.x;
            const dy = pos.y - ball.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BALL_RADIUS * 3) {
              overlaps = true;
              break;
            }
          }
          
          // Check against pockets
          const pockets = getPockets();
          for (const pocket of pockets) {
            const dx = pos.x - pocket.x;
            const dy = pos.y - pocket.y;
            if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS + BALL_RADIUS + 15) {
              overlaps = true;
              break;
            }
          }
          
          if (!overlaps) break;
          pos = getSpawnPosition();
          attempts++;
        }
        
        const newBall: Ball = {
          id: oderId,
          x: pos.x,
          y: pos.y,
          vx: 0,
          vy: 0,
          radius: BALL_RADIUS,
          color: msg.color || COLORS[Math.floor(Math.random() * COLORS.length)],
          username: msg.username,
          isWhite: false,
          pocketed: false,
        };
        
        ballsRef.current = [...ballsRef.current, newBall].slice(-20);
        syncToOverlay();
      }
    });
  }, [chatMessages, isActive, isConnected, shotAngle, shotPower, playSound, syncToOverlay, getPockets, cueBallReady, getSpawnPosition]);

  // Initialize cue ball
  useEffect(() => {
    if (!cueBallRef.current) {
      cueBallRef.current = {
        id: 'cue_ball',
        x: CANVAS_WIDTH * 0.2,
        y: CANVAS_HEIGHT / 2,
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

  // Draw wood texture pattern
  const drawWoodBorder = useCallback((ctx: CanvasRenderingContext2D) => {
    const w = CANVAS_WIDTH;
    const h = CANVAS_HEIGHT;
    const borderWidth = 36;
    
    // Outer border gradient
    const borderGrad = ctx.createLinearGradient(0, 0, 0, h);
    borderGrad.addColorStop(0, WOOD_LIGHT);
    borderGrad.addColorStop(0.5, BORDER_COLOR);
    borderGrad.addColorStop(1, WOOD_DARK);
    
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, 0, w, h);
    
    // Inner shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(borderWidth - 3, borderWidth - 3, w - (borderWidth - 3) * 2, h - (borderWidth - 3) * 2);
    
    // Table felt with subtle texture
    const feltGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    feltGrad.addColorStop(0, TABLE_FELT);
    feltGrad.addColorStop(1, TABLE_COLOR);
    ctx.fillStyle = feltGrad;
    ctx.fillRect(borderWidth, borderWidth, w - borderWidth * 2, h - borderWidth * 2);
    
    // Felt texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, borderWidth);
      ctx.lineTo(i, h - borderWidth);
      ctx.stroke();
    }
    
    // Rail cushions
    ctx.fillStyle = '#0a5c2e';
    // Top rail
    ctx.fillRect(borderWidth + 60, borderWidth, w - borderWidth * 2 - 120, 12);
    // Bottom rail
    ctx.fillRect(borderWidth + 60, h - borderWidth - 12, w - borderWidth * 2 - 120, 12);
    // Left rail
    ctx.fillRect(borderWidth, borderWidth + 60, 12, h - borderWidth * 2 - 120);
    // Right rail
    ctx.fillRect(w - borderWidth - 12, borderWidth + 60, 12, h - borderWidth * 2 - 120);
    
    // Decorative diamonds on rails
    ctx.fillStyle = '#c9a959';
    const diamondPositions = [0.25, 0.5, 0.75];
    diamondPositions.forEach(pos => {
      // Top
      ctx.beginPath();
      ctx.arc(w * pos, borderWidth / 2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Bottom
      ctx.beginPath();
      ctx.arc(w * pos, h - borderWidth / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  // Draw a ball with 3D effect
  const drawBall = useCallback((ctx: CanvasRenderingContext2D, ball: Ball, showName: boolean = true) => {
    const { x, y, radius, color, username, isWhite } = ball;
    
    // Shadow
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();
    
    // Main ball gradient
    const gradient = ctx.createRadialGradient(
      x - radius * 0.35, y - radius * 0.35, radius * 0.1,
      x, y, radius
    );
    
    if (isWhite) {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.8, '#f0f0f0');
      gradient.addColorStop(1, '#d0d0d0');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.2, color);
      gradient.addColorStop(1, shadeColor(color, -30));
    }
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Glossy highlight
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    
    // Edge definition
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Username label with background
    if (showName && username) {
      const displayName = username.slice(0, 8);
      
      // Larger font for high-res canvas
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const textWidth = ctx.measureText(displayName).width;
      const labelX = Math.round(x);
      const labelY = Math.round(y + radius + 18);
      const paddingX = 8;
      const boxWidth = Math.round(textWidth + paddingX * 2);
      const boxHeight = 24;
      
      // Background with border for better contrast
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.beginPath();
      ctx.roundRect(
        Math.round(labelX - boxWidth / 2),
        Math.round(labelY - boxHeight / 2),
        boxWidth,
        boxHeight,
        6
      );
      ctx.fill();
      
      // White border for extra pop
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(displayName, labelX, labelY);
    }
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution (high res for crisp rendering)
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const animate = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw table
      drawWoodBorder(ctx);
      
      // Draw pockets
      const pockets = getPockets();
      pockets.forEach(pocket => {
        // Pocket hole
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        
        // Inner pocket
        ctx.beginPath();
        ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
        const pocketGrad = ctx.createRadialGradient(pocket.x, pocket.y, 0, pocket.x, pocket.y, POCKET_RADIUS);
        pocketGrad.addColorStop(0, '#000000');
        pocketGrad.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = pocketGrad;
        ctx.fill();
      });

      // Draw head string line (where cue ball starts)
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH * 0.25, 25);
      ctx.lineTo(CANVAS_WIDTH * 0.25, CANVAS_HEIGHT - 25);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update physics
      const allBalls = [...ballsRef.current.filter(b => !b.pocketed), cueBallRef.current].filter(Boolean) as Ball[];
      
      allBalls.forEach(ball => {
        if (ball.pocketed) return;
        
        ball.vx *= FRICTION;
        ball.vy *= FRICTION;
        
        if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
        if (Math.abs(ball.vy) < 0.05) ball.vy = 0;
        
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Wall collision
        const margin = 48;
        if (ball.x - ball.radius < margin) { ball.x = margin + ball.radius; ball.vx = -ball.vx * 0.8; playSound('wall'); }
        if (ball.x + ball.radius > CANVAS_WIDTH - margin) { ball.x = CANVAS_WIDTH - margin - ball.radius; ball.vx = -ball.vx * 0.8; playSound('wall'); }
        if (ball.y - ball.radius < margin) { ball.y = margin + ball.radius; ball.vy = -ball.vy * 0.8; playSound('wall'); }
        if (ball.y + ball.radius > CANVAS_HEIGHT - margin) { ball.y = CANVAS_HEIGHT - margin - ball.radius; ball.vy = -ball.vy * 0.8; playSound('wall'); }
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
        cueBallRef.current.x = CANVAS_WIDTH * 0.2;
        cueBallRef.current.y = CANVAS_HEIGHT / 2;
        cueBallRef.current.vx = 0;
        cueBallRef.current.vy = 0;
      }

      // Check if all balls stopped
      const allStopped = allBalls.every(b => Math.abs(b.vx) < 0.1 && Math.abs(b.vy) < 0.1);
      if (allStopped && !cueBallReady) {
        setCueBallReady(true);
      }

      // Draw balls (colored first, then cue ball on top)
      ballsRef.current.filter(b => !b.pocketed).forEach(ball => {
        drawBall(ctx, ball, true);
      });

      // Draw cue ball
      if (cueBallRef.current && !cueBallRef.current.pocketed) {
        drawBall(ctx, cueBallRef.current, false);
        
        // Draw aim line when ready
        if (cueBallReady && ballsRef.current.filter(b => !b.pocketed).length > 0) {
          const cue = cueBallRef.current;
          const angle = shotAngle * (Math.PI / 180);
          
          // Aim line
          ctx.strokeStyle = 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(cue.x, cue.y);
          ctx.lineTo(cue.x + Math.cos(angle) * 70, cue.y + Math.sin(angle) * 70);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Arrow head
          const arrowX = cue.x + Math.cos(angle) * 70;
          const arrowY = cue.y + Math.sin(angle) * 70;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - Math.cos(angle - 0.4) * 10, arrowY - Math.sin(angle - 0.4) * 10);
          ctx.lineTo(arrowX - Math.cos(angle + 0.4) * 10, arrowY - Math.sin(angle + 0.4) * 10);
          ctx.closePath();
          ctx.fill();
          
          // Power indicator
          const powerBarX = cue.x - 25;
          const powerBarY = cue.y - cue.radius - 15;
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(powerBarX, powerBarY, 50, 6);
          ctx.fillStyle = `hsl(${120 - shotPower * 8}, 80%, 50%)`;
          ctx.fillRect(powerBarX, powerBarY, (shotPower / 15) * 50, 6);
        }
      }

      syncToOverlay();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [getPockets, checkBallCollision, checkPocketCollision, playSound, syncToOverlay, cueBallReady, shotAngle, shotPower, drawWoodBorder, drawBall]);

  const clearTable = () => {
    ballsRef.current = [];
    if (cueBallRef.current) {
      cueBallRef.current.x = CANVAS_WIDTH * 0.2;
      cueBallRef.current.y = CANVAS_HEIGHT / 2;
      cueBallRef.current.vx = 0;
      cueBallRef.current.vy = 0;
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
    <div className="p-4 space-y-3">
      {/* Controls */}
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
        
        <OBSOverlayUrl overlayParam="overlayPium" title="el billar" />
      </div>

      {/* Shot controls */}
      <div className="bg-zinc-800 rounded-xl p-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 flex items-center justify-between">
              <span>Ángulo</span>
              <span className="text-purple-400 font-mono">{shotAngle}°</span>
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={shotAngle}
              onChange={(e) => setShotAngle(parseInt(e.target.value))}
              className="w-full accent-purple-500 h-2"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 flex items-center justify-between">
              <span>Fuerza</span>
              <span className="text-orange-400 font-mono">{shotPower}</span>
            </label>
            <input
              type="range"
              min="3"
              max="15"
              value={shotPower}
              onChange={(e) => setShotPower(parseInt(e.target.value))}
              className="w-full accent-orange-500 h-2"
            />
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full ${cueBallReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
          <span className="text-zinc-400 text-xs">
            {cueBallReady ? 'Listo para disparar' : 'Esperando...'}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
        <p className="text-zinc-300 text-sm">
          Escribe en el chat para ser una bola 🎱 • <span className="text-yellow-400 font-bold">!pium</span> dispara
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          <code className="bg-zinc-700 px-1.5 py-0.5 rounded">!pium-180-15</code> ángulo + fuerza
        </p>
      </div>

      {/* Last pocketed notification */}
      {lastPocketed && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center animate-pulse">
          <p className="text-white font-bold">
            🎱 ¡<span style={{ color: lastPocketed.color }}>{lastPocketed.username}</span> entró en la tronera!
          </p>
        </div>
      )}

      {/* Leaderboard */}
      {topScores.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3">
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
              <span key={user} className="text-xs px-2 py-1 bg-zinc-800/80 rounded-lg">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`} {user}: {score}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl" style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        <canvas 
          ref={canvasRef}
          className="w-full block"
          style={{ aspectRatio: '1400 / 760' }}
        />
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1">
          <span className="text-white text-xs font-medium">🎱 {activeBalls} bolas</span>
        </div>
        {activeBalls === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <p className="text-white text-sm bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
              Escribe en el chat para unirte
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to darken/lighten colors
function shadeColor(color: string, percent: number): string {
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
}

export default PiumGame;
