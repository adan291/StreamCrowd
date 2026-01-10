/**
 * useGiveawaySound Hook - Enhanced Version
 * Manages sound effects for giveaway animations with Web Audio API
 * Integrates with SoundBoard custom sounds
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export type SoundType = 'tick' | 'winner' | 'drumroll' | 'countdown' | 'countdownFinal' | 'start';

// Built-in bit sounds (same as SoundBoard)
export type BitSoundId = 'fart' | 'timer' | 'laugh' | 'drumroll' | 'bell' | 'buzzer' | 'heart' | 'fail' | 'party' | 'alert' | 'correct' | 'wrong' | 'tada' | 'suspense';

export type SoundFile = 'synth' | BitSoundId | string; // string for custom_xxx

export interface SoundboardCustomSound {
  id: string;
  name: string;
  file: string; // base64 audio
  color: string;
  duration?: number;
}

export interface SoundConfig {
  winner: SoundFile;
  drumroll: SoundFile;
  start: SoundFile;
  countdown: SoundFile;
}

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  winner: 'synth',
  drumroll: 'synth',
  start: 'synth',
  countdown: 'synth',
};

// Bit sounds available from SoundBoard
export const BIT_SOUND_OPTIONS: { value: BitSoundId; label: string }[] = [
  { value: 'tada', label: '✨ Ta-dá!' },
  { value: 'party', label: '🎉 Fiesta' },
  { value: 'bell', label: '🔔 Campana' },
  { value: 'drumroll', label: '🥁 Redoble' },
  { value: 'correct', label: '👍 Correcto' },
  { value: 'wrong', label: '👎 Incorrecto' },
  { value: 'alert', label: '⚠️ Alerta' },
  { value: 'suspense', label: '🎵 Suspenso' },
  { value: 'timer', label: '⏰ Tiempo' },
  { value: 'buzzer', label: '⚡ Buzzer' },
  { value: 'laugh', label: '😂 Risa' },
  { value: 'heart', label: '❤️ Corazón' },
  { value: 'fail', label: '💀 Fail' },
  { value: 'fart', label: '💨 Pedorreta' },
];

export const SOUND_OPTIONS: { value: SoundFile; label: string }[] = [
  { value: 'synth', label: '🎵 Sintético' },
  ...BIT_SOUND_OPTIONS,
];

export interface UseGiveawaySoundOptions {
  enabled?: boolean;
  volume?: number;
  persistSettings?: boolean;
}

export interface UseGiveawaySoundReturn {
  play: (type: SoundType) => void;
  playCountdown: (secondsLeft: number) => void;
  stop: () => void;
  stopAll: () => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setSoundConfig: (config: Partial<SoundConfig>) => void;
  testSound: (file: SoundFile) => void;
  isEnabled: boolean;
  volume: number;
  soundConfig: SoundConfig;
  customSounds: SoundboardCustomSound[];
}

// ============================================
// SOUNDBOARD INTEGRATION
// ============================================

const SOUNDBOARD_STORAGE_KEY = 'soundboard_custom_sounds';

const loadSoundboardCustomSounds = (): SoundboardCustomSound[] => {
  try {
    const saved = localStorage.getItem(SOUNDBOARD_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// ============================================
// WEB AUDIO SOUND GENERATOR
// ============================================

class SoundGenerator {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private audioElement: HTMLAudioElement | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
    if (this.audioElement) {
      this.audioElement.volume = volume;
    }
  }

  playCustomSound(base64Data: string, volume: number): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    
    const audio = new Audio(base64Data);
    audio.volume = volume;
    this.audioElement = audio;
    audio.play().catch(() => {});
  }

  playBitSound(soundId: BitSoundId): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const masterGain = this.gainNode!;

    const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(masterGain);
      osc.frequency.value = freq;
      osc.type = type;
      gain.gain.setValueAtTime(0.5, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.1);
      this.activeOscillators.push(osc);
    };

    switch (soundId) {
      case 'fart':
        const bufferSize = ctx.sampleRate * 0.6;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        source.connect(filter);
        filter.connect(masterGain);
        source.start(now);
        break;
      case 'laugh':
        [0, 0.12, 0.24, 0.4, 0.52, 0.68, 0.84, 1.0, 1.16, 1.3, 1.45, 1.6].forEach((t, i) => {
          playTone(260 + Math.random() * 140 + (i % 2) * 70, t, 0.1, 'sine');
        });
        break;
      case 'timer':
        [0, 0.3, 0.6, 0.9].forEach((t, i) => playTone(i % 2 === 0 ? 1000 : 800, t, 0.15));
        break;
      case 'drumroll':
        for (let i = 0; i < 35; i++) playTone(100 + Math.random() * 50, i * 0.045, 0.04, 'triangle');
        playTone(80, 1.6, 0.4, 'triangle');
        break;
      case 'bell':
        playTone(830, 0, 1);
        playTone(1660, 0, 0.5);
        playTone(2490, 0, 0.3);
        break;
      case 'buzzer':
        playTone(150, 0, 0.6, 'sawtooth');
        playTone(148, 0.05, 0.55, 'square');
        break;
      case 'heart':
        [0, 0.15, 0.6, 0.75].forEach((t, i) => playTone(i % 2 === 0 ? 80 : 60, t, 0.12));
        break;
      case 'fail':
        [0, 0.15, 0.3, 0.45, 0.6].forEach((t, i) => playTone(450 - i * 70, t, 0.14, 'sawtooth'));
        break;
      case 'party':
        [0, 0.08, 0.16, 0.28, 0.4, 0.55, 0.7, 0.85].forEach((t, i) => playTone(300 + i * 80, t, 0.1));
        break;
      case 'correct':
        playTone(523, 0, 0.2);
        playTone(659, 0.12, 0.15);
        playTone(784, 0.25, 0.3);
        break;
      case 'wrong':
        playTone(400, 0, 0.2, 'square');
        playTone(350, 0.12, 0.15, 'square');
        playTone(300, 0.25, 0.3, 'square');
        break;
      case 'tada':
        [523, 587, 659, 784, 880, 1047].forEach((f, i) => playTone(f, i * 0.1, i === 5 ? 0.5 : 0.08));
        break;
      case 'alert':
        [0, 0.15, 0.3, 0.45, 0.6, 0.75].forEach((t, i) => playTone(i % 2 === 0 ? 880 : 660, t, 0.12));
        break;
      case 'suspense':
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 6;
        lfoGain.gain.value = 25;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(220, now + 2.5);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 2);
        gain.gain.linearRampToValueAtTime(0.01, now + 2.8);
        lfo.start(now);
        osc.start(now);
        osc.stop(now + 2.8);
        lfo.stop(now + 2.8);
        break;
    }
  }

  playTick(frequency: number = 800, duration: number = 0.05): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    this.activeOscillators.push(osc);
  }

  playCountdownTick(secondsLeft: number): void {
    const baseFreq = 600;
    const maxFreq = 1200;
    const freq = baseFreq + ((10 - Math.min(secondsLeft, 10)) / 10) * (maxFreq - baseFreq);
    this.playTick(freq, 0.08);
  }

  playCountdownFinal(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.frequency.value = 1000;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  playWinner(): void {
    const ctx = this.getContext();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.gainNode!);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const startTime = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
      this.activeOscillators.push(osc);
    });
  }

  playDrumroll(duration: number = 2): void {
    const ctx = this.getContext();
    const interval = 0.05;
    const count = Math.floor(duration / interval);
    for (let i = 0; i < count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.gainNode!);
      osc.frequency.value = i % 2 === 0 ? 150 : 180;
      osc.type = 'triangle';
      const startTime = ctx.currentTime + i * interval;
      const vol = 0.1 + (i / count) * 0.2;
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + interval * 0.8);
      osc.start(startTime);
      osc.stop(startTime + interval);
      this.activeOscillators.push(osc);
    }
  }

  playStart(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.1);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  stopAll(): void {
    this.activeOscillators.forEach(osc => { try { osc.stop(); } catch {} });
    this.activeOscillators = [];
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  dispose(): void {
    this.stopAll();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useGiveawaySound(options: UseGiveawaySoundOptions = {}): UseGiveawaySoundReturn {
  const { enabled: initialEnabled = true, volume: initialVolume = 0.5, persistSettings = true } = options;

  const [isEnabled, setIsEnabled] = useState(() => {
    if (persistSettings) {
      const saved = localStorage.getItem('giveaway_sound_enabled');
      return saved !== null ? saved === 'true' : initialEnabled;
    }
    return initialEnabled;
  });

  const [volume, setVolumeState] = useState(() => {
    if (persistSettings) {
      const saved = localStorage.getItem('giveaway_sound_volume');
      return saved !== null ? parseFloat(saved) : initialVolume;
    }
    return initialVolume;
  });

  const [soundConfig, setSoundConfigState] = useState<SoundConfig>(() => {
    if (persistSettings) {
      const saved = localStorage.getItem('giveaway_sound_config');
      return saved ? { ...DEFAULT_SOUND_CONFIG, ...JSON.parse(saved) } : DEFAULT_SOUND_CONFIG;
    }
    return DEFAULT_SOUND_CONFIG;
  });

  const [customSounds, setCustomSounds] = useState<SoundboardCustomSound[]>(loadSoundboardCustomSounds);
  const soundGenRef = useRef<SoundGenerator | null>(null);

  useEffect(() => {
    soundGenRef.current = new SoundGenerator();
    soundGenRef.current.setVolume(volume);
    return () => { soundGenRef.current?.dispose(); soundGenRef.current = null; };
  }, []);

  useEffect(() => { soundGenRef.current?.setVolume(volume); }, [volume]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SOUNDBOARD_STORAGE_KEY) setCustomSounds(loadSoundboardCustomSounds());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const getCustomSoundData = useCallback((soundFile: string): string | null => {
    if (!soundFile.startsWith('custom_')) return null;
    const customId = soundFile.replace('custom_', '');
    return customSounds.find(s => s.id === customId)?.file || null;
  }, [customSounds]);

  const isBitSound = (file: string): file is BitSoundId => BIT_SOUND_OPTIONS.some(opt => opt.value === file);

  const play = useCallback((type: SoundType): void => {
    if (!isEnabled || !soundGenRef.current) return;
    const configKey = type === 'tick' ? 'countdown' : type === 'countdownFinal' ? 'countdown' : type as keyof SoundConfig;
    const soundFile = soundConfig[configKey] || 'synth';

    const customData = getCustomSoundData(soundFile);
    if (customData) { soundGenRef.current.playCustomSound(customData, volume); return; }
    if (isBitSound(soundFile)) { soundGenRef.current.playBitSound(soundFile); return; }

    switch (type) {
      case 'tick': soundGenRef.current.playTick(); break;
      case 'winner': soundGenRef.current.playWinner(); break;
      case 'drumroll': soundGenRef.current.playDrumroll(); break;
      case 'countdown': soundGenRef.current.playCountdownTick(5); break;
      case 'countdownFinal': soundGenRef.current.playCountdownFinal(); break;
      case 'start': soundGenRef.current.playStart(); break;
    }
  }, [isEnabled, soundConfig, getCustomSoundData, volume]);

  const playCountdown = useCallback((secondsLeft: number): void => {
    if (!isEnabled || !soundGenRef.current) return;
    if (secondsLeft <= 3 && secondsLeft > 0) soundGenRef.current.playCountdownFinal();
    else if (secondsLeft <= 10 && secondsLeft > 0) soundGenRef.current.playCountdownTick(secondsLeft);
  }, [isEnabled]);

  const stop = useCallback((): void => { soundGenRef.current?.stopAll(); }, []);
  const stopAll = useCallback((): void => { soundGenRef.current?.stopAll(); }, []);

  const setEnabled = useCallback((enabled: boolean): void => {
    setIsEnabled(enabled);
    if (persistSettings) localStorage.setItem('giveaway_sound_enabled', String(enabled));
    if (!enabled) soundGenRef.current?.stopAll();
  }, [persistSettings]);

  const setVolume = useCallback((vol: number): void => {
    const clampedVol = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVol);
    if (persistSettings) localStorage.setItem('giveaway_sound_volume', String(clampedVol));
    soundGenRef.current?.setVolume(clampedVol);
  }, [persistSettings]);

  const setSoundConfig = useCallback((config: Partial<SoundConfig>): void => {
    setSoundConfigState(prev => {
      const newConfig = { ...prev, ...config };
      if (persistSettings) localStorage.setItem('giveaway_sound_config', JSON.stringify(newConfig));
      return newConfig;
    });
  }, [persistSettings]);

  const testSound = useCallback((file: SoundFile): void => {
    if (!soundGenRef.current) return;
    const customData = getCustomSoundData(file);
    if (customData) { soundGenRef.current.playCustomSound(customData, volume); return; }
    if (isBitSound(file)) { soundGenRef.current.playBitSound(file); return; }
    soundGenRef.current.playWinner();
  }, [getCustomSoundData, volume]);

  return { play, playCountdown, stop, stopAll, setEnabled, setVolume, setSoundConfig, testSound, isEnabled, volume, soundConfig, customSounds };
}

export default useGiveawaySound;