import React, { useState, useRef, useCallback } from 'react';
import { X, Volume2, VolumeX, Wind, Clock, Laugh, Drum, Bell, Zap, Heart, Skull, PartyPopper, AlertTriangle, ThumbsUp, ThumbsDown, Music, Sparkles } from 'lucide-react';

interface Sound {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  frequency?: number;
  duration?: number;
  type: 'tone' | 'noise' | 'sequence';
}

interface SoundBoardProps {
  onClose: () => void;
}

export const SoundBoard: React.FC<SoundBoardProps> = ({ onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const sounds: Sound[] = [
    { id: 'fart', name: 'Pedorreta', icon: <Wind size={24} />, color: '#8B4513', type: 'noise', duration: 0.5 },
    { id: 'timer', name: 'Tiempo', icon: <Clock size={24} />, color: '#FF6B6B', type: 'sequence', duration: 1 },
    { id: 'laugh', name: 'Risa Sitcom', icon: <Laugh size={24} />, color: '#FFD93D', type: 'sequence', duration: 2 },
    { id: 'drumroll', name: 'Redoble', icon: <Drum size={24} />, color: '#6BCB77', type: 'sequence', duration: 2 },
    { id: 'bell', name: 'Campana', icon: <Bell size={24} />, color: '#4D96FF', type: 'tone', frequency: 830, duration: 0.8 },
    { id: 'buzzer', name: 'Buzzer', icon: <Zap size={24} />, color: '#FF4444', type: 'tone', frequency: 150, duration: 0.5 },
    { id: 'heart', name: 'Corazón', icon: <Heart size={24} />, color: '#FF69B4', type: 'sequence', duration: 0.6 },
    { id: 'fail', name: 'Fail', icon: <Skull size={24} />, color: '#333333', type: 'sequence', duration: 1 },
    { id: 'party', name: 'Fiesta', icon: <PartyPopper size={24} />, color: '#A970FF', type: 'sequence', duration: 1.5 },
    { id: 'alert', name: 'Alerta', icon: <AlertTriangle size={24} />, color: '#FFA500', type: 'sequence', duration: 0.8 },
    { id: 'correct', name: 'Correcto', icon: <ThumbsUp size={24} />, color: '#00C851', type: 'sequence', duration: 0.5 },
    { id: 'wrong', name: 'Incorrecto', icon: <ThumbsDown size={24} />, color: '#FF4444', type: 'sequence', duration: 0.5 },
    { id: 'tada', name: 'Ta-dá!', icon: <Sparkles size={24} />, color: '#FFD700', type: 'sequence', duration: 1 },
    { id: 'suspense', name: 'Suspenso', icon: <Music size={24} />, color: '#9B59B6', type: 'sequence', duration: 3 },
  ];

  const playSound = useCallback((sound: Sound) => {
    if (isMuted) return;
    
    setPlayingId(sound.id);
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = 0.3;

    switch (sound.id) {
      case 'fart': {
        // Brown noise burst
        const bufferSize = ctx.sampleRate * 0.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        source.connect(filter);
        filter.connect(masterGain);
        source.start(now);
        break;
      }
      case 'timer': {
        // Tick tock
        [0, 0.25, 0.5, 0.75].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = i % 2 === 0 ? 1000 : 800;
          gain.gain.setValueAtTime(0.5, now + t);
          gain.gain.exponentialDecayTo?.(0.01, now + t + 0.1) || gain.gain.setValueAtTime(0.01, now + t + 0.1);
          osc.start(now + t);
          osc.stop(now + t + 0.1);
        });
        break;
      }
      case 'laugh': {
        // Ha ha ha pattern
        [0, 0.15, 0.3, 0.5, 0.65, 0.85, 1.1, 1.3, 1.5].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = 300 + Math.random() * 100 + (i % 2) * 50;
          gain.gain.setValueAtTime(0.3, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.12);
          osc.start(now + t);
          osc.stop(now + t + 0.12);
        });
        break;
      }
      case 'drumroll': {
        // Fast repeating hits
        for (let i = 0; i < 40; i++) {
          const t = i * 0.05;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.type = 'triangle';
          osc.frequency.value = 100 + Math.random() * 50;
          gain.gain.setValueAtTime(0.2 + (i / 40) * 0.3, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.04);
          osc.start(now + t);
          osc.stop(now + t + 0.04);
        }
        // Final hit
        const finalOsc = ctx.createOscillator();
        const finalGain = ctx.createGain();
        finalOsc.connect(finalGain);
        finalGain.connect(masterGain);
        finalOsc.type = 'triangle';
        finalOsc.frequency.value = 80;
        finalGain.gain.setValueAtTime(0.6, now + 2);
        finalGain.gain.linearRampToValueAtTime(0.01, now + 2.3);
        finalOsc.start(now + 2);
        finalOsc.stop(now + 2.3);
        break;
      }
      case 'bell': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.value = sound.frequency || 830;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
      }
      case 'buzzer': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.value = 150;
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'heart': {
        // Lub-dub
        [0, 0.15].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = i === 0 ? 80 : 60;
          gain.gain.setValueAtTime(0.5, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.15);
          osc.start(now + t);
          osc.stop(now + t + 0.15);
        });
        break;
      }
      case 'fail': {
        // Descending tones
        [0, 0.2, 0.4, 0.6].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = 400 - i * 80;
          osc.type = 'sawtooth';
          gain.gain.setValueAtTime(0.3, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.18);
          osc.start(now + t);
          osc.stop(now + t + 0.2);
        });
        break;
      }
      case 'party': {
        // Ascending celebration
        [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.1].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = 300 + i * 100;
          gain.gain.setValueAtTime(0.3, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.15);
          osc.start(now + t);
          osc.stop(now + t + 0.15);
        });
        break;
      }
      case 'alert': {
        // Alternating high tones
        [0, 0.2, 0.4, 0.6].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = i % 2 === 0 ? 880 : 660;
          gain.gain.setValueAtTime(0.4, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.15);
          osc.start(now + t);
          osc.stop(now + t + 0.18);
        });
        break;
      }
      case 'correct': {
        // Two ascending tones
        [0, 0.15].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = i === 0 ? 523 : 784;
          gain.gain.setValueAtTime(0.4, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.2);
          osc.start(now + t);
          osc.stop(now + t + 0.25);
        });
        break;
      }
      case 'wrong': {
        // Two descending tones
        [0, 0.15].forEach((t, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = i === 0 ? 400 : 300;
          osc.type = 'square';
          gain.gain.setValueAtTime(0.3, now + t);
          gain.gain.linearRampToValueAtTime(0.01, now + t + 0.2);
          osc.start(now + t);
          osc.stop(now + t + 0.25);
        });
        break;
      }
      case 'tada': {
        // Fanfare
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(masterGain);
          osc.frequency.value = freq;
          const t = i * 0.15;
          gain.gain.setValueAtTime(0.4, now + t);
          gain.gain.linearRampToValueAtTime(i === 3 ? 0.3 : 0.01, now + t + (i === 3 ? 0.5 : 0.12));
          osc.start(now + t);
          osc.stop(now + t + (i === 3 ? 0.5 : 0.15));
        });
        break;
      }
      case 'suspense': {
        // Low rumbling with rising tension
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        
        lfo.frequency.value = 4;
        lfoGain.gain.value = 20;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(200, now + 3);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 2.5);
        gain.gain.linearRampToValueAtTime(0.01, now + 3);
        
        lfo.start(now);
        osc.start(now);
        osc.stop(now + 3);
        lfo.stop(now + 3);
        break;
      }
    }

    setTimeout(() => setPlayingId(null), (sound.duration || 1) * 1000);
  }, [isMuted, getAudioContext]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🔊 Panel de Sonidos
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Sound Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sounds.map((sound) => (
            <button
              key={sound.id}
              onClick={() => playSound(sound)}
              disabled={isMuted}
              className={`
                relative p-4 rounded-xl transition-all transform
                ${playingId === sound.id ? 'scale-95 ring-2 ring-white' : 'hover:scale-105'}
                ${isMuted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{ backgroundColor: sound.color }}
            >
              <div className="flex flex-col items-center gap-2 text-white">
                <div className={playingId === sound.id ? 'animate-bounce' : ''}>
                  {sound.icon}
                </div>
                <span className="text-sm font-bold drop-shadow-lg">{sound.name}</span>
              </div>
              
              {playingId === sound.id && (
                <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-zinc-500 text-sm mt-6">
          💡 Los sonidos se reproducen usando Web Audio API
        </p>
      </div>
    </div>
  );
};
