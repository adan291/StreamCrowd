import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Wind,
  Clock,
  Laugh,
  Drum,
  Bell,
  Zap,
  Heart,
  Skull,
  PartyPopper,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Music,
  Sparkles,
  Upload,
  Trash2,
  Cpu,
  FolderOpen,
} from 'lucide-react';

interface BitSound {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

interface CustomSound {
  id: string;
  name: string;
  file: string;
  color: string;
  duration?: number;
}

interface SoundBoardProps {
  onClose: () => void;
}

const STORAGE_KEY = 'soundboard_custom_sounds';
const MAX_DURATION_SECONDS = 30;

export const SoundBoard: React.FC<SoundBoardProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'bit' | 'custom'>('bit');
  const [isMuted, setIsMuted] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCustomSounds(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading custom sounds', e);
      }
    }
  }, []);

  // Actualizar volumen dinámicamente mientras suena
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = isMuted ? 0 : volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const bitSounds: BitSound[] = [
    { id: 'fart', name: 'Pedorreta', icon: <Wind size={24} />, color: '#8B4513' },
    { id: 'timer', name: 'Tiempo', icon: <Clock size={24} />, color: '#FF6B6B' },
    { id: 'laugh', name: 'Risa', icon: <Laugh size={24} />, color: '#FFD93D' },
    { id: 'drumroll', name: 'Redoble', icon: <Drum size={24} />, color: '#6BCB77' },
    { id: 'bell', name: 'Campana', icon: <Bell size={24} />, color: '#4D96FF' },
    { id: 'buzzer', name: 'Buzzer', icon: <Zap size={24} />, color: '#FF4444' },
    { id: 'heart', name: 'Corazón', icon: <Heart size={24} />, color: '#FF69B4' },
    { id: 'fail', name: 'Fail', icon: <Skull size={24} />, color: '#333333' },
    { id: 'party', name: 'Fiesta', icon: <PartyPopper size={24} />, color: '#A970FF' },
    { id: 'alert', name: 'Alerta', icon: <AlertTriangle size={24} />, color: '#FFA500' },
    { id: 'correct', name: 'Correcto', icon: <ThumbsUp size={24} />, color: '#00C851' },
    { id: 'wrong', name: 'Incorrecto', icon: <ThumbsDown size={24} />, color: '#FF4444' },
    { id: 'tada', name: 'Ta-dá!', icon: <Sparkles size={24} />, color: '#FFD700' },
    { id: 'suspense', name: 'Suspenso', icon: <Music size={24} />, color: '#9B59B6' },
  ];

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playBitSound = useCallback(
    (soundId: string) => {
      if (isMuted) return;

      setPlayingId(soundId);
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.value = volume;
      masterGainRef.current = masterGain; // Guardar referencia para control dinámico

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
      };

      let duration = 1;

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
          duration = 0.6;
          break;
        case 'laugh':
          [0, 0.12, 0.24, 0.4, 0.52, 0.68, 0.84, 1.0, 1.16, 1.3, 1.45, 1.6].forEach((t, i) => {
            playTone(260 + Math.random() * 140 + (i % 2) * 70, t, 0.1, 'sine');
          });
          duration = 1.8;
          break;
        case 'timer':
          [0, 0.3, 0.6, 0.9].forEach((t, i) => playTone(i % 2 === 0 ? 1000 : 800, t, 0.15));
          duration = 1.1;
          break;
        case 'drumroll':
          for (let i = 0; i < 35; i++) playTone(100 + Math.random() * 50, i * 0.045, 0.04, 'triangle');
          playTone(80, 1.6, 0.4, 'triangle');
          duration = 2;
          break;
        case 'bell':
          playTone(830, 0, 1);
          playTone(1660, 0, 0.5);
          playTone(2490, 0, 0.3);
          duration = 1;
          break;
        case 'buzzer':
          playTone(150, 0, 0.6, 'sawtooth');
          playTone(148, 0.05, 0.55, 'square');
          duration = 0.6;
          break;
        case 'heart':
          [0, 0.15, 0.6, 0.75].forEach((t, i) => playTone(i % 2 === 0 ? 80 : 60, t, 0.12));
          duration = 1;
          break;
        case 'fail':
          [0, 0.15, 0.3, 0.45, 0.6].forEach((t, i) => playTone(450 - i * 70, t, 0.14, 'sawtooth'));
          duration = 0.8;
          break;
        case 'party':
          [0, 0.08, 0.16, 0.28, 0.4, 0.55, 0.7, 0.85].forEach((t, i) => playTone(300 + i * 80, t, 0.1));
          duration = 1;
          break;
        case 'correct':
          playTone(523, 0, 0.2);
          playTone(659, 0.12, 0.15);
          playTone(784, 0.25, 0.3);
          duration = 0.6;
          break;
        case 'wrong':
          playTone(400, 0, 0.2, 'square');
          playTone(350, 0.12, 0.15, 'square');
          playTone(300, 0.25, 0.3, 'square');
          duration = 0.6;
          break;
        case 'tada':
          [523, 587, 659, 784, 880, 1047].forEach((f, i) => playTone(f, i * 0.1, i === 5 ? 0.5 : 0.08));
          duration = 1;
          break;
        case 'alert':
          [0, 0.15, 0.3, 0.45, 0.6, 0.75].forEach((t, i) => playTone(i % 2 === 0 ? 880 : 660, t, 0.12));
          duration = 0.9;
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
          duration = 2.8;
          break;
        default:
          playTone(440, 0, 0.3);
          duration = 0.3;
      }

      setTimeout(() => setPlayingId(null), duration * 1000);
    },
    [isMuted, volume, getAudioContext]
  );

  const playCustomSound = useCallback(
    (sound: CustomSound) => {
      if (isMuted) return;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setPlayingId(sound.id);
      const audio = new Audio(sound.file);
      audio.volume = volume;
      audioRef.current = audio;
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audio.play().catch(() => setPlayingId(null));
    },
    [isMuted, volume]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    if (!file.type.startsWith('audio/')) {
      setUploadError('Solo se permiten archivos de audio');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Verificar duración del audio
    const audioUrl = URL.createObjectURL(file);
    const tempAudio = new Audio(audioUrl);

    tempAudio.onloadedmetadata = () => {
      const duration = tempAudio.duration;
      URL.revokeObjectURL(audioUrl);

      if (duration > MAX_DURATION_SECONDS) {
        setUploadError(`El audio debe durar máximo ${MAX_DURATION_SECONDS} segundos (este dura ${Math.round(duration)}s)`);
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Leer archivo como base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const newSound: CustomSound = {
          id: Date.now().toString(),
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 20),
          file: base64,
          color: colors[customSounds.length % colors.length],
          duration: Math.round(duration),
        };
        const updated = [...customSounds, newSound];
        setCustomSounds(updated);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (err) {
          setUploadError('Error al guardar: el archivo es muy grande');
          setCustomSounds(customSounds);
        }
        setIsUploading(false);
      };
      reader.onerror = () => {
        setUploadError('Error al leer el archivo');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    };

    tempAudio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      setUploadError('No se pudo leer el archivo de audio');
      setIsUploading(false);
    };

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteCustomSound = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customSounds.filter((s) => s.id !== id);
    setCustomSounds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">🔊 Panel de Sonidos</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Volume2 size={16} className="text-zinc-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-twitch-brand"
              />
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-2">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700 mb-4 shrink-0">
          <button
            onClick={() => setActiveTab('bit')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'bit' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Cpu size={16} /> Sonidos BIT
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'custom' ? 'text-twitch-brand border-b-2 border-twitch-brand' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FolderOpen size={16} /> Personalizados
            {customSounds.length > 0 && (
              <span className="bg-twitch-brand/20 text-twitch-brand text-xs px-1.5 rounded-full">{customSounds.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'bit' ? (
            <>
              <p className="text-zinc-500 text-xs mb-3 text-center">Sonidos generados digitalmente (8-bit style)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {bitSounds.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => playBitSound(sound.id)}
                    disabled={isMuted}
                    className={`
                      relative p-4 rounded-xl transition-all transform
                      ${playingId === sound.id ? 'scale-95 ring-2 ring-white' : 'hover:scale-105'}
                      ${isMuted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    style={{ backgroundColor: sound.color }}
                  >
                    <div className="flex flex-col items-center gap-2 text-white">
                      <div className={playingId === sound.id ? 'animate-bounce' : ''}>{sound.icon}</div>
                      <span className="text-sm font-bold drop-shadow-lg">{sound.name}</span>
                    </div>
                    {playingId === sound.id && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Upload area */}
              <div className="mb-4">
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full py-4 border-2 border-dashed border-zinc-700 hover:border-twitch-brand rounded-xl text-zinc-400 hover:text-twitch-brand transition-colors flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Upload size={24} />
                  <span className="text-sm">{isUploading ? 'Cargando...' : 'Subir archivo de audio'}</span>
                  <span className="text-xs text-zinc-600">MP3, WAV, OGG (máx. {MAX_DURATION_SECONDS}s)</span>
                </button>
                {uploadError && (
                  <p className="text-red-400 text-xs mt-2 text-center bg-red-500/10 py-2 px-3 rounded-lg">{uploadError}</p>
                )}
              </div>

              {customSounds.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No hay sonidos personalizados</p>
                  <p className="text-xs mt-1">Sube archivos de audio para usarlos en tu stream</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {customSounds.map((sound) => (
                    <button
                      key={sound.id}
                      onClick={() => playCustomSound(sound)}
                      disabled={isMuted}
                      className={`
                        relative p-4 rounded-xl transition-all transform group
                        ${playingId === sound.id ? 'scale-95 ring-2 ring-white' : 'hover:scale-105'}
                        ${isMuted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      style={{ backgroundColor: sound.color }}
                    >
                      <div className="flex flex-col items-center gap-2 text-white">
                        <div className={playingId === sound.id ? 'animate-bounce' : ''}>
                          <Music size={24} />
                        </div>
                        <span className="text-sm font-bold drop-shadow-lg truncate w-full text-center">{sound.name}</span>
                        {sound.duration && <span className="text-[10px] opacity-70">{sound.duration}s</span>}
                      </div>
                      {playingId === sound.id && <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />}
                      <button
                        onClick={(e) => deleteCustomSound(sound.id, e)}
                        className="absolute top-1 right-1 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4 shrink-0">
          {activeTab === 'bit' ? '🎮 Generados con Web Audio API' : '📁 Guardados en tu navegador'}
        </p>
      </div>
    </div>
  );
};
