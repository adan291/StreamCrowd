// MascotFace component - The animated face of AI Vision
import React, { useState, useEffect, useRef } from 'react';
import { MascotEmotion, EyeStyle } from './types';

interface MascotFaceProps {
  emotion: MascotEmotion;
  size?: number;
  intensity?: number; // 0-100, affects animation speed/intensity
  isAnalyzing?: boolean; // Show analyzing state
}

// Eye style configurations for each emotion
const getEyeStyle = (emotion: MascotEmotion, isBlinking: boolean): EyeStyle => {
  if (isBlinking) return { scaleY: 0.1, scaleX: 1 };

  const styles: Record<MascotEmotion, EyeStyle> = {
    neutral: { scaleY: 1, scaleX: 1 },
    happy: { scaleY: 0.6, scaleX: 1.1 },
    celebrating: { scaleY: 0.6, scaleX: 1.1 },
    excited: { scaleY: 1.2, scaleX: 1.2 },
    surprised: { scaleY: 1.4, scaleX: 1.3 },
    love: { scaleY: 0.7, scaleX: 1.2 },
    sad: { scaleY: 0.8, scaleX: 0.9, translateY: 2 },
    angry: { scaleY: 0.85, scaleX: 1, translateY: 1 },
    concerned: { scaleY: 0.85, scaleX: 1, translateY: 1 },
    confused: { scaleY: 1, scaleX: 0.7 },
    thinking: { scaleY: 0.9, scaleX: 0.8 },
    sleepy: { scaleY: 0.3, scaleX: 1 },
    helpful: { scaleY: 1.1, scaleX: 1 },
  };

  return styles[emotion] || styles.neutral;
};

// Mouth path configurations
const getMouthPath = (emotion: MascotEmotion): string => {
  const paths: Record<MascotEmotion, string> = {
    neutral: 'M 18 30 L 32 30',
    happy: 'M 14 28 Q 25 36 36 28',
    excited: 'M 12 26 Q 25 40 38 26',
    celebrating: 'M 12 25 Q 25 42 38 25',
    surprised: 'M 20 28 Q 25 38 30 28 Q 25 38 20 28',
    love: 'M 14 28 Q 25 38 36 28',
    sad: 'M 15 35 Q 25 27 35 35',
    angry: 'M 16 32 Q 25 28 34 32',
    concerned: 'M 16 33 Q 25 29 34 33',
    confused: 'M 18 31 Q 22 29 26 32 Q 30 29 34 31',
    thinking: 'M 22 31 Q 25 29 28 31',
    sleepy: 'M 20 31 Q 25 33 30 31',
    helpful: 'M 15 29 Q 25 36 35 29',
  };

  return paths[emotion] || paths.neutral;
};

// Color configurations for each emotion
const getEmotionColor = (emotion: MascotEmotion): string => {
  const colors: Record<MascotEmotion, string> = {
    neutral: '#a970ff',
    happy: '#4ade80',
    celebrating: '#fbbf24',
    excited: '#f472b6',
    surprised: '#facc15',
    love: '#ec4899',
    sad: '#60a5fa',
    angry: '#ef4444',
    concerned: '#f97316',
    confused: '#a78bfa',
    thinking: '#8b5cf6',
    sleepy: '#6366f1',
    helpful: '#06b6d4',
  };

  return colors[emotion] || colors.neutral;
};

// Body animation class for each emotion
const getBodyAnimation = (emotion: MascotEmotion, intensity: number): string => {
  const baseAnimations: Record<MascotEmotion, string> = {
    neutral: 'mascot-idle',
    happy: intensity > 70 ? 'mascot-bounce' : 'mascot-idle',
    celebrating: 'mascot-bounce-fast',
    excited: 'mascot-wiggle',
    surprised: 'mascot-shake',
    love: 'mascot-float',
    sad: 'mascot-droop',
    angry: 'mascot-shake-fast',
    concerned: 'mascot-tilt',
    confused: 'mascot-shake',
    thinking: 'mascot-tilt',
    sleepy: 'mascot-droop-slow',
    helpful: 'mascot-bounce-subtle',
  };

  return baseAnimations[emotion] || baseAnimations.neutral;
};

export const MascotFace: React.FC<MascotFaceProps> = ({
  emotion,
  size = 80, 
  intensity = 50,
  isAnalyzing = false 
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [lookDirection, setLookDirection] = useState({ x: 0, y: 0 });
  const [breathScale, setBreathScale] = useState(1);
  const [particlePhase, setParticlePhase] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);

  // Breathing animation
  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      const breathSpeed = emotion === 'excited' ? 0.15 : emotion === 'sleepy' ? 0.03 : 0.05;
      setBreathScale(1 + Math.sin(frame * breathSpeed) * 0.02);
      setParticlePhase(frame * 0.02);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [emotion]);

  // Random blinking effect - more frequent when excited
  useEffect(() => {
    const blinkChance = emotion === 'excited' ? 0.5 : emotion === 'sleepy' ? 0.9 : 0.7;
    const blinkInterval = emotion === 'sleepy' ? 4000 : 2000;
    
    const interval = setInterval(() => {
      if (Math.random() > blinkChance) {
        setIsBlinking(true);
        const blinkDuration = emotion === 'sleepy' ? 400 : 150;
        setTimeout(() => setIsBlinking(false), blinkDuration);
      }
    }, blinkInterval);
    return () => clearInterval(interval);
  }, [emotion]);

  // Eye movement - more active when analyzing or thinking
  useEffect(() => {
    const shouldMove = ['neutral', 'thinking', 'confused', 'helpful'].includes(emotion) || isAnalyzing;
    if (shouldMove) {
      const moveSpeed = isAnalyzing ? 500 : 3000;
      const interval = setInterval(() => {
        const range = isAnalyzing ? 4 : 3;
        setLookDirection({
          x: (Math.random() - 0.5) * range,
          y: (Math.random() - 0.5) * (range * 0.7),
        });
      }, moveSpeed);
      return () => clearInterval(interval);
    }
    setLookDirection({ x: 0, y: 0 });
  }, [emotion, isAnalyzing]);

  const glowColor = getEmotionColor(emotion);
  const eyeStyle = getEyeStyle(emotion, isBlinking);
  const mouthPath = getMouthPath(emotion);
  const bodyAnimation = getBodyAnimation(emotion, intensity);
  
  // Intensity affects glow
  const glowIntensity = Math.max(0.3, intensity / 100);

  return (
    <div
      className={`relative transition-all duration-300 ${bodyAnimation}`}
      style={{ 
        width: size, 
        height: size,
        transform: `scale(${breathScale})`,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-xl animate-pulse"
        style={{
          backgroundColor: glowColor,
          opacity: glowIntensity * 0.5,
          animationDuration: emotion === 'celebrating' ? '0.5s' : emotion === 'sleepy' ? '4s' : '2s',
        }}
      />

      {/* Secondary glow for intense emotions */}
      {(emotion === 'celebrating' || emotion === 'excited' || intensity > 80) && (
        <div
          className="absolute inset-0 rounded-full blur-2xl animate-ping"
          style={{ backgroundColor: glowColor, opacity: 0.3, animationDuration: '1s' }}
        />
      )}

      {/* Analyzing ring */}
      {isAnalyzing && (
        <div 
          className="absolute inset-0 rounded-full border-2 border-dashed animate-spin"
          style={{ 
            borderColor: glowColor, 
            opacity: 0.5,
            animationDuration: '3s',
          }}
        />
      )}

      {/* Screen/Face SVG */}
      <svg
        viewBox="0 0 50 50"
        className="relative z-10 drop-shadow-lg"
        style={{ width: size, height: size }}
      >
        <defs>
          {/* Gradient for screen */}
          <linearGradient id={`screenGrad-${emotion}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2a2a4e" />
            <stop offset="100%" stopColor="#1a1a2e" />
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Screen body */}
        <rect
          x="2" y="5"
          width="46" height="40"
          rx="8"
          fill={`url(#screenGrad-${emotion})`}
          stroke={glowColor}
          strokeWidth="2"
          className="transition-all duration-300"
          filter="url(#glow)"
        />

        {/* Screen inner glow */}
        <rect
          x="5" y="8"
          width="40" height="34"
          rx="5"
          fill={`${glowColor}15`}
          className="transition-all duration-500"
        />

        {/* Scan line effect */}
        <rect 
          x="5" 
          y={8 + (particlePhase * 10) % 34} 
          width="40" 
          height="2" 
          fill={`${glowColor}20`} 
        />

        {/* Data stream effect when analyzing */}
        {isAnalyzing && (
          <>
            {[...Array(5)].map((_, i) => (
              <rect
                key={i}
                x={8 + i * 8}
                y={10 + ((particlePhase * 20 + i * 7) % 30)}
                width="4"
                height="2"
                fill={glowColor}
                opacity={0.3 + Math.sin(particlePhase + i) * 0.2}
                rx="1"
              />
            ))}
          </>
        )}

        {/* Eyebrows */}
        <Eyebrows emotion={emotion} color={glowColor} />

        {/* Eyes */}
        <ellipse
          cx={17 + lookDirection.x}
          cy={22 + lookDirection.y + (eyeStyle.translateY || 0)}
          rx={5 * eyeStyle.scaleX}
          ry={6 * eyeStyle.scaleY}
          fill={glowColor}
          className="transition-all duration-200"
          filter="url(#glow)"
        />
        <ellipse
          cx={33 + lookDirection.x}
          cy={22 + lookDirection.y + (eyeStyle.translateY || 0)}
          rx={5 * eyeStyle.scaleX}
          ry={6 * eyeStyle.scaleY}
          fill={glowColor}
          className="transition-all duration-200"
          filter="url(#glow)"
        />

        {/* Eye highlights */}
        {!isBlinking && (
          <>
            <circle cx={15 + lookDirection.x} cy={20 + lookDirection.y} r="2" fill="white" opacity="0.9" />
            <circle cx={31 + lookDirection.x} cy={20 + lookDirection.y} r="2" fill="white" opacity="0.9" />
            <circle cx={18 + lookDirection.x} cy={23 + lookDirection.y} r="1" fill="white" opacity="0.5" />
            <circle cx={34 + lookDirection.x} cy={23 + lookDirection.y} r="1" fill="white" opacity="0.5" />
          </>
        )}

        {/* Cheeks for happy emotions */}
        {(emotion === 'happy' || emotion === 'celebrating' || emotion === 'excited' || emotion === 'love') && (
          <>
            <ellipse cx="10" cy="26" rx="4" ry="2" fill="#f472b6" opacity={0.3 + Math.sin(particlePhase * 2) * 0.1} />
            <ellipse cx="40" cy="26" rx="4" ry="2" fill="#f472b6" opacity={0.3 + Math.sin(particlePhase * 2) * 0.1} />
          </>
        )}

        {/* Tears for sad */}
        {emotion === 'sad' && (
          <>
            <ellipse 
              cx="14" 
              cy={28 + Math.sin(particlePhase * 3) * 2} 
              rx="1.5" 
              ry="3" 
              fill="#60a5fa" 
              opacity={0.4 + Math.sin(particlePhase * 2) * 0.2} 
            />
            <ellipse 
              cx="36" 
              cy={29 + Math.sin(particlePhase * 3 + 1) * 2} 
              rx="1.5" 
              ry="3" 
              fill="#60a5fa" 
              opacity={0.4 + Math.sin(particlePhase * 2 + 1) * 0.2} 
            />
          </>
        )}

        {/* Sweat for concerned */}
        {emotion === 'concerned' && (
          <path 
            d={`M 42 ${14 + Math.sin(particlePhase * 2) * 2} Q 44 18 42 20 Q 40 18 42 ${14 + Math.sin(particlePhase * 2) * 2}`} 
            fill="#60a5fa" 
            opacity="0.7" 
          />
        )}

        {/* Mouth */}
        <path
          d={mouthPath}
          fill={emotion === 'celebrating' || emotion === 'excited' ? `${glowColor}40` : 'none'}
          stroke={glowColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="transition-all duration-300"
          filter="url(#glow)"
        />

        {/* Tongue for excited/celebrating */}
        {(emotion === 'celebrating' || emotion === 'excited') && (
          <ellipse cx="25" cy="34" rx="4" ry="3" fill="#f472b6" opacity="0.8" />
        )}

        {/* Antenna */}
        <line x1="25" y1="5" x2="25" y2="0" stroke={glowColor} strokeWidth="2" />
        <circle
          cx="25" cy="0" r="2.5"
          fill={glowColor}
          opacity={0.7 + Math.sin(particlePhase * 3) * 0.3}
          filter="url(#glow)"
        />

        {/* Emotion-specific decorations */}
        <EmotionDecorations emotion={emotion} color={glowColor} phase={particlePhase} intensity={intensity} />
      </svg>

      {/* Floating particles for high intensity */}
      {intensity > 60 && (
        <FloatingParticles color={glowColor} count={Math.floor(intensity / 20)} phase={particlePhase} />
      )}
    </div>
  );
};

// Floating particles component
const FloatingParticles: React.FC<{ color: string; count: number; phase: number }> = ({ color, count, phase }) => (
  <div className="absolute inset-0 pointer-events-none overflow-visible">
    {[...Array(count)].map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + phase;
      const radius = 35 + Math.sin(phase * 2 + i) * 5;
      const x = 50 + Math.cos(angle) * radius;
      const y = 50 + Math.sin(angle) * radius;
      return (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            backgroundColor: color,
            opacity: 0.4 + Math.sin(phase + i) * 0.3,
            transform: 'translate(-50%, -50%)',
          }}
        />
      );
    })}
  </div>
);

// Eyebrows sub-component
const Eyebrows: React.FC<{ emotion: MascotEmotion; color: string }> = ({ emotion, color }) => {
  switch (emotion) {
    case 'sad':
      return (
        <>
          <line x1="12" y1="14" x2="20" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="16" x2="38" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'concerned':
    case 'angry':
      return (
        <>
          <line x1="12" y1="15" x2="20" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="14" x2="38" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'excited':
    case 'celebrating':
    case 'surprised':
      return (
        <>
          <line x1="12" y1="16" x2="20" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="13" x2="38" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case 'confused':
      return (
        <>
          <line x1="12" y1="14" x2="20" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <line x1="30" y1="13" x2="38" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
};

// Emotion decorations sub-component
const EmotionDecorations: React.FC<{ 
  emotion: MascotEmotion; 
  color: string; 
  phase: number;
  intensity: number;
}> = ({ emotion, color, phase, intensity }) => {
  switch (emotion) {
    case 'celebrating':
      return (
        <>
          {[...Array(6)].map((_, i) => {
            const angle = (i / 6) * Math.PI * 2 + phase;
            const radius = 22 + Math.sin(phase * 3 + i) * 3;
            const x = 25 + Math.cos(angle) * radius;
            const y = 25 + Math.sin(angle) * radius;
            const colors = ['#fbbf24', '#f472b6', '#4ade80', '#60a5fa', '#a78bfa', '#f97316'];
            return (
              <circle 
                key={i} 
                cx={x} 
                cy={y} 
                r={1.5 + Math.sin(phase + i) * 0.5} 
                fill={colors[i]} 
                opacity={0.8}
              />
            );
          })}
        </>
      );
    case 'thinking':
      return (
        <g>
          <circle cx={44 + Math.sin(phase) * 2} cy={6 + Math.cos(phase) * 1} r="3" fill={color} opacity="0.6" />
          <circle cx={48 + Math.sin(phase + 1) * 1} cy={2 + Math.cos(phase + 1) * 1} r="2" fill={color} opacity="0.4" />
          <circle cx={50} cy={-1} r="1.5" fill={color} opacity="0.2" />
        </g>
      );
    case 'helpful':
      return (
        <g style={{ opacity: 0.6 + Math.sin(phase * 2) * 0.2 }}>
          <path d="M 44 8 L 46 6 L 44 4 L 42 6 Z" fill={color} />
          <path d="M 44 10 L 44 2" stroke={color} strokeWidth="1" />
          <path d="M 40 6 L 48 6" stroke={color} strokeWidth="1" />
        </g>
      );
    case 'love':
      return (
        <>
          {[0, 1].map(i => {
            const baseX = i === 0 ? 6 : 40;
            const baseY = i === 0 ? 8 : 6;
            const floatY = Math.sin(phase * 2 + i * 2) * 3;
            const scale = 0.8 + Math.sin(phase * 3 + i) * 0.2;
            return (
              <g key={i} transform={`translate(${baseX}, ${baseY + floatY}) scale(${scale})`}>
                <path 
                  d="M 0 2 C 0 -1 3 -1 3 2 C 3 -1 6 -1 6 2 C 6 6 3 8 3 8 C 3 8 0 6 0 2" 
                  fill={i === 0 ? '#ec4899' : '#f472b6'} 
                />
              </g>
            );
          })}
        </>
      );
    case 'surprised':
      return (
        <>
          <text 
            x="44" 
            y={10 + Math.sin(phase * 5) * 2} 
            fontSize="12" 
            fill={color} 
            fontWeight="bold"
          >!</text>
          <circle cx="6" cy="10" r={2 + Math.sin(phase * 3) * 0.5} fill={color} opacity="0.5" />
        </>
      );
    case 'sleepy':
      return (
        <g>
          <text x={38 + Math.sin(phase) * 2} y={8 - phase % 10} fontSize="8" fill={color} opacity={0.8 - (phase % 10) * 0.05}>Z</text>
          <text x={42 + Math.sin(phase + 1) * 2} y={4 - (phase + 2) % 10} fontSize="6" fill={color} opacity={0.6 - ((phase + 2) % 10) * 0.04}>z</text>
          <text x={45 + Math.sin(phase + 2) * 2} y={1 - (phase + 4) % 10} fontSize="4" fill={color} opacity={0.4 - ((phase + 4) % 10) * 0.03}>z</text>
        </g>
      );
    case 'angry':
      return (
        <>
          {[0, 1].map(i => {
            const baseX = i === 0 ? 6 : 44;
            const floatY = Math.sin(phase * 4 + i * 2) * 2;
            return (
              <g key={i}>
                <path 
                  d={`M ${baseX} ${6 + floatY} Q ${baseX - 2} ${4 + floatY} ${baseX} ${2 + floatY} Q ${baseX + 2} ${4 + floatY} ${baseX} ${6 + floatY}`} 
                  fill="none" 
                  stroke={color} 
                  strokeWidth="1.5" 
                  opacity="0.7" 
                />
              </g>
            );
          })}
        </>
      );
    case 'confused':
      return (
        <text 
          x="44" 
          y={8 + Math.sin(phase * 2) * 2} 
          fontSize="10" 
          fill={color}
        >?</text>
      );
    case 'excited':
      return (
        <>
          <text 
            x="44" 
            y={8 + Math.sin(phase * 4) * 2} 
            fontSize="10" 
            fill={color} 
            fontWeight="bold"
          >!</text>
          {intensity > 70 && (
            <text 
              x="4" 
              y={10 + Math.sin(phase * 4 + 1) * 2} 
              fontSize="8" 
              fill={color}
            >★</text>
          )}
        </>
      );
    default:
      return null;
  }
};

export default MascotFace;
