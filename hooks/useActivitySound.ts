/**
 * useActivitySound Hook - Generic Sound System
 * Reusable sound effects for all activities (polls, predictions, games, etc.)
 * Based on the giveaway sound system but generalized
 */

import { useCallback, useRef, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================

export type ActivitySoundType = 
  | 'start'      // Activity started
  | 'end'        // Activity ended
  | 'winner'     // Winner selected
  | 'tick'       // Timer tick
  | 'countdown'  // Countdown (last 10 seconds)
  | 'vote'       // Vote received
  | 'milestone'  // Milestone reached (e.g., 100 votes)
  | 'alert'      // Alert/notification
  | 'success'    // Success action
  | 'error';     // Error action

export type SoundPreset = 'synth' | 'retro' | 'minimal' | 'party';

export interface ActivitySoundConfig {
  enabled: boolean;
  volume: number;
  preset: SoundPreset;
  countdownEnabled: boolean;
  voteSound: boolean;
  milestoneSound: boolean;
  // Sound selection (from SoundBoard)
  winnerSound?: string;
  countdownSound?: string;
  startSound?: string;
}

export const DEFAULT_ACTIVITY_SOUND_CONFIG: ActivitySoundConfig = {
  enabled: true,
  volume: 0.5,
  preset: 'synth',
  countdownEnabled: true,
  voteSound: false,
  milestoneSound: true,
  winnerSound: 'synth',
  countdownSound: 'synth',
  startSound: 'synth',
};

export type ActivityType = 'poll' | 'prediction' | 'giveaway' | 'game' | 'timer' | 'general';

export interface UseActivitySoundOptions {
  storageKey?: string;
  defaultConfig?: Partial<ActivitySoundConfig>;
  activityType?: ActivityType;
}

export interface UseActivitySoundReturn {
  play: (type: ActivitySoundType) => void;
  playCountdown: (secondsLeft: number) => void;
  stop: () => void;
  config: ActivitySoundConfig;
  setConfig: (config: Partial<ActivitySoundConfig>) => void;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

// ============================================
// SOUND GENERATOR CLASS
// ============================================

class ActivitySoundGenerator {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];

  private getContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        // Return a mock context for test environments
        throw new Error('AudioContext not available');
      }
      this.audioContext = new AudioContextClass();
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
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', delay: number = 0): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.frequency.value = freq;
    osc.type = type;
    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    this.activeOscillators.push(osc);
  }

  playStart(): void {
    // Ascending arpeggio
    [400, 500, 600, 800].forEach((freq, i) => {
      this.playTone(freq, 0.15, 'sine', i * 0.08);
    });
  }

  playEnd(): void {
    // Descending tone
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.3);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  }

  playWinner(): void {
    // Victory fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      this.playTone(freq, i === notes.length - 1 ? 0.4 : 0.12, 'sine', i * 0.12);
    });
  }

  playTick(): void {
    this.playTone(800, 0.05);
  }

  playCountdownTick(secondsLeft: number): void {
    const baseFreq = 600;
    const maxFreq = 1200;
    const freq = baseFreq + ((10 - Math.min(secondsLeft, 10)) / 10) * (maxFreq - baseFreq);
    this.playTone(freq, 0.08);
  }

  playCountdownFinal(): void {
    this.playTone(1000, 0.15, 'square');
  }

  playVote(): void {
    // Quick blip
    this.playTone(600, 0.03);
  }

  playMilestone(): void {
    // Celebration sound
    [523, 659, 784].forEach((freq, i) => {
      this.playTone(freq, 0.1, 'sine', i * 0.05);
    });
  }

  playAlert(): void {
    [880, 660, 880, 660].forEach((freq, i) => {
      this.playTone(freq, 0.1, 'sine', i * 0.12);
    });
  }

  playSuccess(): void {
    this.playTone(523, 0.1);
    this.playTone(659, 0.1, 'sine', 0.1);
    this.playTone(784, 0.2, 'sine', 0.2);
  }

  playError(): void {
    this.playTone(300, 0.15, 'sawtooth');
    this.playTone(250, 0.2, 'sawtooth', 0.15);
  }

  stopAll(): void {
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch {}
    });
    this.activeOscillators = [];
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

export function useActivitySound(options: UseActivitySoundOptions = {}): UseActivitySoundReturn {
  const { storageKey = 'activity_sound_config', defaultConfig = {} } = options;

  const [config, setConfigState] = useState<ActivitySoundConfig>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...DEFAULT_ACTIVITY_SOUND_CONFIG, ...defaultConfig, ...JSON.parse(saved) };
      }
    } catch {}
    return { ...DEFAULT_ACTIVITY_SOUND_CONFIG, ...defaultConfig };
  });

  const soundGenRef = useRef<ActivitySoundGenerator | null>(null);

  useEffect(() => {
    soundGenRef.current = new ActivitySoundGenerator();
    soundGenRef.current.setVolume(config.volume);
    return () => {
      soundGenRef.current?.dispose();
      soundGenRef.current = null;
    };
  }, []);

  useEffect(() => {
    soundGenRef.current?.setVolume(config.volume);
  }, [config.volume]);

  // Persist config
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
    } catch {}
  }, [config, storageKey]);

  const play = useCallback((type: ActivitySoundType): void => {
    if (!config.enabled || !soundGenRef.current) return;

    try {
      switch (type) {
        case 'start':
          soundGenRef.current.playStart();
          break;
        case 'end':
          soundGenRef.current.playEnd();
          break;
        case 'winner':
          soundGenRef.current.playWinner();
          break;
      case 'tick':
        soundGenRef.current.playTick();
        break;
      case 'countdown':
        if (config.countdownEnabled) {
          soundGenRef.current.playCountdownTick(5);
        }
        break;
      case 'vote':
        if (config.voteSound) {
          soundGenRef.current.playVote();
        }
        break;
      case 'milestone':
        if (config.milestoneSound) {
          soundGenRef.current.playMilestone();
        }
        break;
      case 'alert':
        soundGenRef.current.playAlert();
        break;
      case 'success':
        soundGenRef.current.playSuccess();
        break;
      case 'error':
        soundGenRef.current.playError();
        break;
      }
    } catch {
      // AudioContext not available in test environment
    }
  }, [config]);

  const playCountdown = useCallback((secondsLeft: number): void => {
    if (!config.enabled || !config.countdownEnabled || !soundGenRef.current) return;
    
    if (secondsLeft <= 3 && secondsLeft > 0) {
      soundGenRef.current.playCountdownFinal();
    } else if (secondsLeft <= 10 && secondsLeft > 0) {
      soundGenRef.current.playCountdownTick(secondsLeft);
    }
  }, [config.enabled, config.countdownEnabled]);

  const stop = useCallback((): void => {
    soundGenRef.current?.stopAll();
  }, []);

  const setConfig = useCallback((newConfig: Partial<ActivitySoundConfig>): void => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  const setEnabled = useCallback((enabled: boolean): void => {
    setConfigState(prev => ({ ...prev, enabled }));
    if (!enabled) soundGenRef.current?.stopAll();
  }, []);

  const setVolume = useCallback((volume: number): void => {
    const clampedVol = Math.max(0, Math.min(1, volume));
    setConfigState(prev => ({ ...prev, volume: clampedVol }));
  }, []);

  return {
    play,
    playCountdown,
    stop,
    config,
    setConfig,
    setEnabled,
    setVolume,
  };
}

export default useActivitySound;
