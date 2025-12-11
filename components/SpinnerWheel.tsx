import React, { useState, useRef, useEffect } from 'react';
import { PollOption } from '../types';
import { RotateCcw, Play, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface SpinnerWheelProps {
  options: PollOption[];
  onClose: () => void;
}

export const SpinnerWheel: React.FC<SpinnerWheelProps> = ({ options, onClose }) => {
  const { t } = useI18n();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<PollOption | null>(null);
  const [showWinner, setShowWinner] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spinSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  const segmentAngle = 360 / options.length;

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    options.forEach((option, index) => {
      const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
      const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);

      // Segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = option.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + (segmentAngle * Math.PI / 360));
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      const label = option.label.length > 12 ? option.label.slice(0, 12) + '...' : option.label;
      ctx.fillText(label, radius - 20, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#a970ff';
    ctx.lineWidth = 3;
    ctx.stroke();

  }, [options, segmentAngle]);

  const spin = () => {
    if (isSpinning || options.length === 0) return;

    setIsSpinning(true);
    setShowWinner(false);
    setWinner(null);

    // Random spins (5-10 full rotations) + random final position
    const spins = 5 + Math.random() * 5;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + (spins * 360) + randomAngle;

    setRotation(totalRotation);

    // Calculate winner after spin
    setTimeout(() => {
      // Normalize angle to 0-360
      const normalizedAngle = (360 - (totalRotation % 360) + 90) % 360;
      const winnerIndex = Math.floor(normalizedAngle / segmentAngle) % options.length;
      
      setWinner(options[winnerIndex]);
      setShowWinner(true);
      setIsSpinning(false);
    }, 4000);
  };

  const reset = () => {
    setRotation(0);
    setWinner(null);
    setShowWinner(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-lg w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-4">
          🎰 Ruleta de la Suerte
        </h2>

        {/* Wheel container */}
        <div className="relative flex justify-center mb-6">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
          </div>

          {/* Canvas wheel */}
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Winner announcement */}
        {showWinner && winner && (
          <div className="text-center mb-4 animate-bounce">
            <div className="inline-block px-6 py-3 rounded-xl" style={{ backgroundColor: winner.color }}>
              <span className="text-white font-bold text-xl drop-shadow-lg">
                🎉 {winner.label} 🎉
              </span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <button
            onClick={spin}
            disabled={isSpinning || options.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-twitch-brand hover:bg-twitch-brand/80 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <Play size={20} />
            {isSpinning ? 'Girando...' : 'Girar'}
          </button>
          
          <button
            onClick={reset}
            disabled={isSpinning}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        {options.length === 0 && (
          <p className="text-center text-zinc-400 mt-4">
            Crea una encuesta primero para usar la ruleta
          </p>
        )}
      </div>
    </div>
  );
};
