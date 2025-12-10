// MascotFace component - The animated face of AI Vision
import React, { useState, useEffect } from 'react';
import { MascotEmotion, EyeStyle } from './types';

interface MascotFaceProps {
  emotion: MascotEmotion;
  size?: number;
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
const getBodyAnimation = (emotion: MascotEmotion): string => {
  const animations: Record<MascotEmotion, string> = {
    neutral: 'mascot-idle',
    happy: 'mascot-idle',
    celebrating: 'mascot-bounce',
    excited: 'mascot-wiggle',
    surprised: 'mascot-shake',
    love: 'mascot-bounce',
    sad: 'mascot-droop',
    angry: 'mascot-shake',
    concerned: 'mascot-idle',
    confused: 'mascot-shake',
    thinking: 'mascot-tilt',
    sleepy: 'mascot-droop',
    helpful: 'mascot-idle',
  };

  return animations[emotion] || animations.neutral;
};

export const MascotFace: React.FC<MascotFaceProps> = ({ emotion, size = 80 }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [lookDirection, setLookDirection] = useState({ x: 0, y: 0 });

  // Random blinking effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Random eye movement for neutral/thinking states
  useEffect(() => {
    if (emotion === 'neutral' || emotion === 'thinking') {
      const lookInterval = setInterval(() => {
        setLookDirection({
          x: (Math.random() - 0.5) * 3,
          y: (Math.random() - 0.5) * 2,
        });
      }, 3000);
      return () => clearInterval(lookInterval);
    }
    setLookDirection({ x: 0, y: 0 });
  }, [emotion]);

  const glowColor = getEmotionColor(emotion);
  const eyeStyle = getEyeStyle(emotion, isBlinking);
  const mouthPath = getMouthPath(emotion);
  const bodyAnimation = getBodyAnimation(emotion);

  return (
    <div
      className={`relative transition-all duration-300 ${bodyAnimation}`}
      style={{ width: size, height: size }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-50 animate-pulse"
        style={{
          backgroundColor: glowColor,
          animationDuration: emotion === 'celebrating' ? '0.5s' : '2s',
        }}
      />

      {/* Secondary glow for intense emotions */}
      {(emotion === 'celebrating' || emotion === 'excited') && (
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-ping"
          style={{ backgroundColor: glowColor, animationDuration: '1s' }}
        />
      )}

      {/* Screen/Face SVG */}
      <svg
        viewBox="0 0 50 50"
        className="relative z-10 drop-shadow-lg"
        style={{ width: size, height: size }}
      >
        {/* Screen body */}
        <rect
          x="2" y="5"
          width="46" height="40"
          rx="8"
          fill="#1a1a2e"
          stroke={glowColor}
          strokeWidth="2"
          className="transition-all duration-300"
        />

        {/* Screen inner glow */}
        <rect
          x="5" y="8"
          width="40" height="34"
          rx="5"
          fill={`${glowColor}20`}
          className="transition-all duration-500"
        />

        {/* Scan line effect */}
        <rect x="5" y="8" width="40" height="2" fill={`${glowColor}30`} className="animate-scanline" />

        {/* Eyebrows */}
        <Eyebrows emotion={emotion} color={glowColor} />

        {/* Eyes */}
        <ellipse
          cx={17 + lookDirection.x}
          cy={22 + lookDirection.y}
          rx={5 * eyeStyle.scaleX}
          ry={6 * eyeStyle.scaleY}
          fill={glowColor}
          className="transition-all duration-200"
        />
        <ellipse
          cx={33 + lookDirection.x}
          cy={22 + lookDirection.y}
          rx={5 * eyeStyle.scaleX}
          ry={6 * eyeStyle.scaleY}
          fill={glowColor}
          className="transition-all duration-200"
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
            <ellipse cx="10" cy="26" rx="4" ry="2" fill="#f472b6" opacity="0.4" />
            <ellipse cx="40" cy="26" rx="4" ry="2" fill="#f472b6" opacity="0.4" />
          </>
        )}

        {/* Tears for sad */}
        {emotion === 'sad' && (
          <>
            <ellipse cx="14" cy="28" rx="1.5" ry="3" fill="#60a5fa" opacity="0.6" className="animate-tear" />
            <ellipse cx="36" cy="29" rx="1.5" ry="3" fill="#60a5fa" opacity="0.6" className="animate-tear" style={{ animationDelay: '0.5s' }} />
          </>
        )}

        {/* Sweat for concerned */}
        {emotion === 'concerned' && (
          <path d="M 42 14 Q 44 18 42 20 Q 40 18 42 14" fill="#60a5fa" opacity="0.7" className="animate-sweat" />
        )}

        {/* Mouth */}
        <path
          d={mouthPath}
          fill={emotion === 'celebrating' || emotion === 'excited' ? `${glowColor}40` : 'none'}
          stroke={glowColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          className="transition-all duration-300"
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
          className={emotion === 'celebrating' ? 'animate-ping' : 'animate-pulse'}
        />

        {/* Emotion-specific decorations */}
        <EmotionDecorations emotion={emotion} color={glowColor} />
      </svg>
    </div>
  );
};

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
const EmotionDecorations: React.FC<{ emotion: MascotEmotion; color: string }> = ({ emotion, color }) => {
  switch (emotion) {
    case 'celebrating':
      return (
        <>
          <circle cx="6" cy="10" r="2" fill="#fbbf24" className="animate-ping" />
          <circle cx="44" cy="10" r="2" fill="#f472b6" className="animate-ping" style={{ animationDelay: '0.2s' }} />
          <circle cx="8" cy="42" r="1.5" fill="#4ade80" className="animate-ping" style={{ animationDelay: '0.4s' }} />
          <circle cx="42" cy="42" r="1.5" fill="#60a5fa" className="animate-ping" style={{ animationDelay: '0.6s' }} />
        </>
      );
    case 'thinking':
      return (
        <g className="animate-float" style={{ animationDuration: '3s' }}>
          <circle cx="44" cy="6" r="3" fill={color} opacity="0.6" />
          <circle cx="48" cy="2" r="2" fill={color} opacity="0.4" />
          <circle cx="50" cy="-1" r="1.5" fill={color} opacity="0.2" />
        </g>
      );
    case 'helpful':
      return (
        <g className="animate-pulse">
          <path d="M 44 8 L 46 6 L 44 4 L 42 6 Z" fill={color} opacity="0.8" />
          <path d="M 44 10 L 44 2" stroke={color} strokeWidth="1" opacity="0.6" />
          <path d="M 40 6 L 48 6" stroke={color} strokeWidth="1" opacity="0.6" />
        </g>
      );
    case 'love':
      return (
        <>
          <g className="animate-float" style={{ animationDuration: '1.5s' }}>
            <path d="M 6 8 C 6 5 9 5 9 8 C 9 5 12 5 12 8 C 12 12 9 14 9 14 C 9 14 6 12 6 8" fill="#ec4899" />
          </g>
          <g className="animate-float" style={{ animationDuration: '2s', animationDelay: '0.3s' }}>
            <path d="M 40 6 C 40 4 42 4 42 6 C 42 4 44 4 44 6 C 44 9 42 10 42 10 C 42 10 40 9 40 6" fill="#f472b6" />
          </g>
        </>
      );
    case 'surprised':
      return (
        <>
          <text x="44" y="10" fontSize="12" fill={color} className="animate-bounce" style={{ animationDuration: '0.3s' }}>!</text>
          <circle cx="6" cy="10" r="2" fill={color} opacity="0.5" className="animate-ping" />
        </>
      );
    case 'sleepy':
      return (
        <g className="animate-float" style={{ animationDuration: '3s' }}>
          <text x="38" y="8" fontSize="8" fill={color} opacity="0.8">Z</text>
          <text x="42" y="4" fontSize="6" fill={color} opacity="0.6">z</text>
          <text x="45" y="1" fontSize="4" fill={color} opacity="0.4">z</text>
        </g>
      );
    case 'angry':
      return (
        <>
          <g className="animate-float" style={{ animationDuration: '1s' }}>
            <path d="M 6 6 Q 4 4 6 2 Q 8 4 6 6" fill="none" stroke={color} strokeWidth="1.5" opacity="0.7" />
          </g>
          <g className="animate-float" style={{ animationDuration: '1.2s', animationDelay: '0.2s' }}>
            <path d="M 44 6 Q 42 4 44 2 Q 46 4 44 6" fill="none" stroke={color} strokeWidth="1.5" opacity="0.7" />
          </g>
        </>
      );
    case 'confused':
      return (
        <text x="44" y="8" fontSize="10" fill={color} className="animate-bounce" style={{ animationDuration: '1s' }}>?</text>
      );
    case 'excited':
      return (
        <text x="44" y="8" fontSize="10" fill={color} className="animate-bounce" style={{ animationDuration: '0.5s' }}>!</text>
      );
    default:
      return null;
  }
};

export default MascotFace;
