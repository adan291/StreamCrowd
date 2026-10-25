import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OverlayChromaKey, useOverlayChromaKey } from './OverlayChromaKey';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';

interface Bet {
  visitorId: string;
  username: string;
  number: number;
  color: string;
  timestamp: number;
}

const ROULETTE_CHANNEL = 'casino_roulette_sync';
const STORAGE_KEY_ROULETTE = 'casino_roulette_state';
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const RouletteOverlay: React.FC = () => {
  const { bgColor, setBgColor, chromaKeyProps } = useOverlayChromaKey('transparent');
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [bets, setBets] = useState<Bet[]>([]);
  const [wheelSize, setWheelSize] = useState<'normal' | 'large'>('large');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | undefined>(undefined);
  const isSpinningRef = useRef(false);

  const getNumberColor = (num: number): string => {
    if (num === 0) return '#00AA00';
    return RED_NUMBERS.includes(num) ? '#DC2626' : '#1F2937';
  };

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const segmentAngle = (2 * Math.PI) / ROULETTE_NUMBERS.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotationRef.current * Math.PI) / 180);

    ROULETTE_NUMBERS.forEach((num, i) => {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = getNumberColor(num);
      ctx.fill();
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${wheelSize === 'large' ? '14' : '12'}px sans-serif`;
      ctx.fillText(num.toString(), radius - 30, 4);
      ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX - 15, 0);
    ctx.lineTo(centerX + 15, 0);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
  }, [wheelSize]);

  // Setup BroadcastChannel
  // Handle incoming state data
  const handleStateData = useCallback((data: any) => {
    if (data.type === 'spin') {
      isSpinningRef.current = true;
      setShowResult(false);
      setResult(null);
      
      const startRotation = rotationRef.current;
      const targetRotation = data.rotation;
      const duration = 5000;
      const startTime = Date.now();
      
      const animateSpin = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        rotationRef.current = startRotation + (targetRotation - startRotation) * eased;
        drawWheel();
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateSpin);
        } else {
          rotationRef.current = targetRotation;
          isSpinningRef.current = false;
        }
      };
      
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animateSpin();
    } else if (data.type === 'result') {
      setResult(data.result);
      setShowResult(true);
      setBets(data.bets || []);
    } else if (data.type === 'reset') {
      setResult(null);
      setShowResult(false);
      setBets([]);
    }
  }, [drawWheel]);

  useEffect(() => {
    // BroadcastChannel for same-browser sync
    channelRef.current = new BroadcastChannel(ROULETTE_CHANNEL);
    channelRef.current.onmessage = (event) => handleStateData(event.data);
    
    // Subscribe to Firebase for real-time sync (works across browsers/OBS)
    const unsubscribeFirebase = gameSync.subscribe((data) => {
      if (data && data.type === 'roulette' && data.state) {
        handleStateData(data.state);
      }
    });
    
    // Also poll localStorage for legacy support
    const loadFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_ROULETTE);
        if (stored) {
          handleStateData(JSON.parse(stored));
        }
      } catch { /* ignore */ }
    };
    
    loadFromStorage();
    // Other windows of this browser: react to localStorage writes instead of
    // polling (BroadcastChannel and Firebase already deliver live updates)
    window.addEventListener('storage', loadFromStorage);
    
    return () => {
      channelRef.current?.close();
      unsubscribeFirebase();
      window.removeEventListener('storage', loadFromStorage);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [handleStateData]);

  // Initial draw
  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const winners = result !== null ? bets.filter(b => b.number === result) : [];
  const size = wheelSize === 'large' ? 450 : 350;

  return (
    <div 
      className="min-h-screen w-full flex flex-col items-center justify-center p-4" 
      style={{ backgroundColor: bgColor }}
    >
      <OverlayChromaKey {...chromaKeyProps} />

      {/* Roulette Wheel */}
      <div className="relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[20px] border-r-[20px] border-t-[30px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
        </div>
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="drop-shadow-2xl"
        />
      </div>

      {/* Result */}
      {showResult && result !== null && (
        <div className="mt-6 animate-bounce">
          <div
            className="inline-block px-10 py-5 rounded-2xl shadow-2xl"
            style={{ backgroundColor: getNumberColor(result) }}
          >
            <span className="text-white font-bold text-4xl">{result}</span>
          </div>
          {winners.length > 0 && (
            <div className="mt-3 bg-green-500/80 rounded-xl px-6 py-3 text-center">
              <p className="text-white font-bold">🎉 ¡{winners.length} ganador(es)!</p>
              <p className="text-white/90 text-sm">
                {winners.map(w => w.username).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {!showResult && !isSpinningRef.current && (
        <div className="mt-6 bg-black/50 rounded-xl px-6 py-3 text-center">
          <p className="text-white/70">Esperando giro...</p>
          {bets.length > 0 && (
            <p className="text-white/50 text-sm">{bets.length} apuestas registradas</p>
          )}
        </div>
      )}
    </div>
  );
};

export default RouletteOverlay;
