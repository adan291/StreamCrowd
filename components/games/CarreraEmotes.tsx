import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Trophy, RotateCcw, ExternalLink, Flag, Plus, Trash2, Download, Upload, Loader2, Sparkles } from 'lucide-react';
import { getTwitchService } from '../../src/application/services/TwitchService';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

interface Racer {
  id: string;
  emote: string;
  name: string;
  position: number; // 0-100
  speed: number;
  bets: { username: string; color: string }[];
}

interface CarreraEmotesProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
  authToken?: string;
  channelName?: string;
}

const GAME_CHANNEL = 'carrera_emotes_sync';
const STORAGE_KEY_CARRERA = 'carrera_emotes_state';
const DEFAULT_EMOTES = ['🐎', '🦄', '🐢', '🐇', '🦊', '🐼'];
const SAVED_EMOTES_KEY = 'carrera_saved_emotes';

interface EmoteData {
  code: string;
  url: string;
  source: '7tv' | 'bttv' | 'ffz' | 'twitch';
}

// Helper para fetch con timeout
const fetchWithTimeout = async (url: string, timeout = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Funciones para obtener emotes de diferentes proveedores
const fetch7TVEmotes = async (channelName: string): Promise<EmoteData[]> => {
  try {
    const userRes = await fetchWithTimeout(`https://7tv.io/v3/users/twitch/${channelName}`);
    if (!userRes.ok) return [];
    const userData = await userRes.json();
    
    const emotes: EmoteData[] = [];
    
    if (userData.emote_set?.emotes) {
      userData.emote_set.emotes.forEach((e: any) => {
        const file = e.data?.host?.files?.find((f: any) => f.name === '1x.webp' || f.name === '1x.png');
        if (file && e.data?.host?.url) {
          emotes.push({
            code: e.name,
            url: `https:${e.data.host.url}/${file.name}`,
            source: '7tv'
          });
        }
      });
    }
    
    return emotes;
  } catch {
    return [];
  }
};

const fetchBTTVEmotes = async (channelName: string): Promise<EmoteData[]> => {
  try {
    const res = await fetchWithTimeout(`https://api.betterttv.net/3/cached/users/twitch/${channelName}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    const emotes: EmoteData[] = [];
    
    if (data.channelEmotes) {
      data.channelEmotes.forEach((e: any) => {
        emotes.push({
          code: e.code,
          url: `https://cdn.betterttv.net/emote/${e.id}/1x`,
          source: 'bttv'
        });
      });
    }
    
    if (data.sharedEmotes) {
      data.sharedEmotes.forEach((e: any) => {
        emotes.push({
          code: e.code,
          url: `https://cdn.betterttv.net/emote/${e.id}/1x`,
          source: 'bttv'
        });
      });
    }
    
    return emotes;
  } catch {
    return [];
  }
};

const fetchFFZEmotes = async (channelName: string): Promise<EmoteData[]> => {
  try {
    const res = await fetchWithTimeout(`https://api.frankerfacez.com/v1/room/${channelName}`);
    if (!res.ok) return [];
    const data = await res.json();
    
    const emotes: EmoteData[] = [];
    
    if (data.sets) {
      Object.values(data.sets).forEach((set: any) => {
        if (set.emoticons) {
          set.emoticons.forEach((e: any) => {
            emotes.push({
              code: e.name,
              url: e.urls['1'] || e.urls['2'],
              source: 'ffz'
            });
          });
        }
      });
    }
    
    return emotes;
  } catch {
    return [];
  }
};

// Obtener emotes de Twitch usando la API Helix (requiere token)
const fetchTwitchEmotesWithToken = async (channelName: string, token: string): Promise<EmoteData[]> => {
  try {
    const twitchService = getTwitchService();
    // Obtener el broadcaster_id
    const broadcasterId = await twitchService.getUserId(token, channelName);
    if (!broadcasterId) return [];
    
    // Obtener emotes del canal
    const emotes = await twitchService.getChannelEmotes(token, broadcasterId);
    if (!emotes) return [];
    
    return emotes.map(e => ({
      code: e.code,
      url: e.url,
      source: 'twitch' as const
    }));
  } catch (err) {
    console.error('Error fetching Twitch emotes with token:', err);
    return [];
  }
};

// Obtener emotes de Twitch sin token (fallback con APIs públicas)
const fetchTwitchEmotes = async (channelName: string): Promise<EmoteData[]> => {
  try {
    // Intentar obtener el ID del canal con decapi
    let broadcasterId: string | null = null;
    
    try {
      const decapiRes = await fetchWithTimeout(`https://decapi.me/twitch/id/${channelName}`);
      if (decapiRes.ok) {
        const id = await decapiRes.text();
        if (id && !id.includes('User not found') && /^\d+$/.test(id.trim())) {
          broadcasterId = id.trim();
        }
      }
    } catch {}
    
    if (!broadcasterId) {
      // Intentar con 7TV
      try {
        const sevenTvRes = await fetchWithTimeout(`https://7tv.io/v3/users/twitch/${channelName}`);
        if (sevenTvRes.ok) {
          const data = await sevenTvRes.json();
          broadcasterId = data.user?.id;
        }
      } catch {}
    }
    
    if (!broadcasterId) return [];
    
    // Sin token no podemos obtener emotes de suscriptor de Twitch
    // Solo podemos obtener emotes públicos/globales
    return [];
  } catch (err) {
    console.error('Error fetching Twitch emotes:', err);
    return [];
  }
};

// Guardar/cargar emotes
const saveEmotesToStorage = (emotes: { emote: string; name: string; url?: string }[]) => {
  localStorage.setItem(SAVED_EMOTES_KEY, JSON.stringify(emotes));
};

const loadEmotesFromStorage = (): { emote: string; name: string; url?: string }[] => {
  try {
    const saved = localStorage.getItem(SAVED_EMOTES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const CarreraEmotes: React.FC<CarreraEmotesProps> = ({ chatMessages, isConnected = true, authToken, channelName: propChannelName }) => {
  const [gameState, setGameState] = useState<'setup' | 'betting' | 'racing' | 'finished'>('setup');
  const [racers, setRacers] = useState<Racer[]>([]);
  const [winner, setWinner] = useState<Racer | null>(null);
  const [bettingTime, setBettingTime] = useState(15);
  const [timeLeft, setTimeLeft] = useState(0);
  const [newEmote, setNewEmote] = useState('');
  const [newName, setNewName] = useState('');
  const [channelName, setChannelName] = useState(propChannelName || '');
  const [fetchedEmotes, setFetchedEmotes] = useState<EmoteData[]>([]);
  const [isFetchingEmotes, setIsFetchingEmotes] = useState(false);
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [emoteError, setEmoteError] = useState<string | null>(null);
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const animationRef = useRef<number>();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  // Actualizar channelName cuando cambie propChannelName
  useEffect(() => {
    if (propChannelName && !channelName) {
      setChannelName(propChannelName);
    }
  }, [propChannelName]);

  const syncToOverlay = useCallback(() => {
    const state = {
      type: 'carrera_state',
      gameState,
      racers,
      winner,
      timeLeft
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_CARRERA, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('carrera', state).catch(() => {});
  }, [gameState, racers, winner, timeLeft]);

  useEffect(() => { syncToOverlay(); }, [syncToOverlay]);

  // Procesar apuestas del chat
  useEffect(() => {
    if (!isConnected || gameState !== 'betting') return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      
      // !apostar 1, !apostar 2, etc. o !bet
      if (msgLower.startsWith('!apostar ') || msgLower.startsWith('!bet ')) {
        const num = parseInt(msgLower.split(' ')[1]);
        if (isNaN(num) || num < 1 || num > racers.length) return;
        
        const racerIndex = num - 1;
        const oderId = msg.userId || msg.username;
        
        setRacers(prev => {
          // Quitar apuesta anterior si existe
          const newRacers = prev.map(r => ({
            ...r,
            bets: r.bets.filter(b => b.username !== msg.username)
          }));
          
          // Añadir nueva apuesta
          newRacers[racerIndex] = {
            ...newRacers[racerIndex],
            bets: [...newRacers[racerIndex].bets, { username: msg.username, color: msg.color || '#a970ff' }]
          };
          
          return newRacers;
        });
      }
    });
  }, [chatMessages, isConnected, gameState, racers.length]);

  // Timer de apuestas
  useEffect(() => {
    if (gameState !== 'betting') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          startRace();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  // Animación de carrera
  useEffect(() => {
    if (gameState !== 'racing') return;

    const animate = () => {
      setRacers(prev => {
        const newRacers = prev.map(r => {
          // Velocidad base + variación aleatoria
          const boost = Math.random() * 2;
          const newPosition = Math.min(100, r.position + r.speed + boost);
          return { ...r, position: newPosition };
        });

        // Verificar ganador
        const finisher = newRacers.find(r => r.position >= 100);
        if (finisher) {
          setWinner(finisher);
          setGameState('finished');
          // OBS Trigger: Game end
          triggerGameEnd();
          return newRacers;
        }

        return newRacers;
      });

      if (gameState === 'racing') {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // Delay inicial
    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, 500);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState]);

  const initializeRacers = () => {
    const defaultRacers: Racer[] = DEFAULT_EMOTES.slice(0, 4).map((emote, i) => ({
      id: `racer_${i}`,
      emote,
      name: `Corredor ${i + 1}`,
      position: 0,
      speed: 0.3 + Math.random() * 0.4, // Velocidad base aleatoria
      bets: []
    }));
    setRacers(defaultRacers);
  };

  const addRacer = () => {
    if (!newEmote.trim()) return;
    const newRacer: Racer = {
      id: `racer_${Date.now()}`,
      emote: newEmote,
      name: newName || `Corredor ${racers.length + 1}`,
      position: 0,
      speed: 0.3 + Math.random() * 0.4,
      bets: []
    };
    setRacers(prev => [...prev, newRacer]);
    setNewEmote('');
    setNewName('');
  };

  const removeRacer = (id: string) => {
    setRacers(prev => prev.filter(r => r.id !== id));
  };

  // Obtener emotes del canal
  const fetchChannelEmotes = async () => {
    const targetChannel = channelName.trim() || propChannelName || '';
    if (!targetChannel) {
      setEmoteError('Introduce el nombre del canal');
      return;
    }
    
    setIsFetchingEmotes(true);
    setFetchedEmotes([]);
    setEmoteError(null);
    
    try {
      // Usar Promise.allSettled para que no falle si una API falla
      const fetchPromises = [
        fetch7TVEmotes(targetChannel.toLowerCase()),
        fetchBTTVEmotes(targetChannel.toLowerCase()),
        fetchFFZEmotes(targetChannel.toLowerCase()),
      ];
      
      // Si tenemos token, usar la API de Twitch autenticada
      if (authToken) {
        fetchPromises.push(fetchTwitchEmotesWithToken(targetChannel.toLowerCase(), authToken));
      } else {
        fetchPromises.push(fetchTwitchEmotes(targetChannel.toLowerCase()));
      }
      
      const results = await Promise.allSettled(fetchPromises);
      
      const allEmotes: EmoteData[] = [];
      const sources: string[] = [];
      
      const sourceNames = ['7TV', 'BTTV', 'FFZ', 'Twitch'];
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allEmotes.push(...result.value);
          sources.push(sourceNames[i]);
        }
      });
      
      if (allEmotes.length === 0) {
        const noTokenMsg = !authToken ? ' Para emotes de Twitch, conecta con OAuth.' : '';
        setEmoteError(`No se encontraron emotes para "${targetChannel}".${noTokenMsg}`);
      } else {
        setFetchedEmotes(allEmotes);
        setShowEmotePicker(true);
        setEmoteError(null);
      }
    } catch (error) {
      console.error('Error fetching emotes:', error);
      setEmoteError('Error al obtener emotes. Intenta de nuevo.');
    }
    
    setIsFetchingEmotes(false);
  };

  const addEmoteFromPicker = (emote: EmoteData) => {
    const newRacer: Racer = {
      id: `racer_${Date.now()}_${Math.random()}`,
      emote: emote.code,
      name: emote.code,
      position: 0,
      speed: 0.3 + Math.random() * 0.4,
      bets: []
    };
    setRacers(prev => [...prev, newRacer]);
  };

  // Exportar configuración
  const exportConfig = () => {
    const config = {
      racers: racers.map(r => ({ emote: r.emote, name: r.name })),
      bettingTime
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carrera_emotes_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar configuración
  const importConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const config = JSON.parse(ev.target?.result as string);
          if (config.racers && Array.isArray(config.racers)) {
            const newRacers: Racer[] = config.racers.map((r: any, i: number) => ({
              id: `racer_${Date.now()}_${i}`,
              emote: r.emote || '🎮',
              name: r.name || `Corredor ${i + 1}`,
              position: 0,
              speed: 0.3 + Math.random() * 0.4,
              bets: []
            }));
            setRacers(newRacers);
          }
          if (config.bettingTime) {
            setBettingTime(config.bettingTime);
          }
        } catch (err) {
          console.error('Error importing config:', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Guardar emotes actuales
  const saveCurrentEmotes = () => {
    const emotesToSave = racers.map(r => ({ emote: r.emote, name: r.name }));
    saveEmotesToStorage(emotesToSave);
  };

  // Cargar emotes guardados
  const loadSavedEmotes = () => {
    const saved = loadEmotesFromStorage();
    if (saved.length > 0) {
      const newRacers: Racer[] = saved.map((e, i) => ({
        id: `racer_${Date.now()}_${i}`,
        emote: e.emote,
        name: e.name,
        position: 0,
        speed: 0.3 + Math.random() * 0.4,
        bets: []
      }));
      setRacers(newRacers);
    }
  };

  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  const startBetting = () => {
    if (racers.length < 2) return;
    setTimeLeft(bettingTime);
    setGameState('betting');
    lastProcessedRef.current = chatMessages.length;
    // OBS Trigger: Game start (betting phase)
    triggerGameStart();
  };

  const startRace = () => {
    // Resetear posiciones y asignar velocidades
    setRacers(prev => prev.map(r => ({
      ...r,
      position: 0,
      speed: 0.3 + Math.random() * 0.4
    })));
    setGameState('racing');
  };

  const resetGame = () => {
    setGameState('setup');
    setRacers([]);
    setWinner(null);
    setTimeLeft(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const totalBets = racers.reduce((sum, r) => sum + r.bets.length, 0);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="text-green-400" size={24} />
          <h3 className="text-lg font-bold text-white">Carrera de Emotes</h3>
        </div>
        <div className="flex items-center gap-2">
          <OBSOverlayUrl overlayParam="overlayCarrera" title="la carrera de emotes" />
          <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg" title="Reiniciar">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      {gameState === 'setup' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          {/* Botones de carga rápida */}
          <div className="flex flex-wrap gap-2">
            {racers.length === 0 && (
              <>
                <button
                  onClick={initializeRacers}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
                >
                  🎲 Emotes por defecto
                </button>
                <button
                  onClick={loadSavedEmotes}
                  className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
                >
                  💾 Cargar guardados
                </button>
              </>
            )}
            <button
              onClick={importConfig}
              className="flex items-center gap-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
            >
              <Upload size={14} /> Importar
            </button>
            {racers.length > 0 && (
              <>
                <button
                  onClick={exportConfig}
                  className="flex items-center gap-1 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm"
                >
                  <Download size={14} /> Exportar
                </button>
                <button
                  onClick={saveCurrentEmotes}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  💾 Guardar
                </button>
              </>
            )}
          </div>

          {/* Obtener emotes del canal */}
          <div className="bg-zinc-700/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <span className="text-sm text-white font-medium">Obtener emotes del canal</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Nombre del canal de Twitch"
                className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                onKeyDown={(e) => e.key === 'Enter' && fetchChannelEmotes()}
              />
              <button
                onClick={fetchChannelEmotes}
                disabled={isFetchingEmotes || !channelName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-lg text-sm"
              >
                {isFetchingEmotes ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Download size={16} /> Obtener
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Obtiene emotes de Twitch{authToken ? ' ✓' : ' (conecta con OAuth)'}, 7TV, BTTV y FFZ
            </p>
            
            {emoteError && (
              <p className="text-xs text-yellow-400 bg-yellow-500/10 rounded p-2">{emoteError}</p>
            )}
          </div>

          {/* Emote Picker */}
          {showEmotePicker && fetchedEmotes.length > 0 && (
            <div className="bg-zinc-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">{fetchedEmotes.length} emotes encontrados</span>
                <button
                  onClick={() => setShowEmotePicker(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Cerrar
                </button>
              </div>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {fetchedEmotes.map((emote, i) => (
                  <button
                    key={`${emote.source}_${emote.code}_${i}`}
                    onClick={() => addEmoteFromPicker(emote)}
                    className="group relative p-1 bg-zinc-600 hover:bg-zinc-500 rounded transition-all"
                    title={`${emote.code} (${emote.source})`}
                  >
                    <img 
                      src={emote.url} 
                      alt={emote.code} 
                      className="w-7 h-7 object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Lista de corredores */}
          {racers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-zinc-400">Corredores ({racers.length}):</p>
              {racers.map((r, i) => (
                <div key={r.id} className="flex items-center gap-2 bg-zinc-700/50 rounded-lg p-2">
                  <span className="text-2xl">{r.emote}</span>
                  <span className="text-white flex-1">{i + 1}. {r.name}</span>
                  <button onClick={() => removeRacer(r.id)} className="p-1 text-red-400 hover:text-red-300">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Añadir corredor */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newEmote}
              onChange={(e) => setNewEmote(e.target.value)}
              placeholder="Emote 🎮"
              className="w-20 px-2 py-2 bg-zinc-700 rounded-lg text-white text-center text-xl"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre (opcional)"
              className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white"
            />
            <button onClick={addRacer} className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg">
              <Plus size={18} />
            </button>
          </div>

          {/* Tiempo de apuestas */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Tiempo para apostar:</span>
            <select
              value={bettingTime}
              onChange={(e) => setBettingTime(parseInt(e.target.value))}
              className="px-2 py-1 bg-zinc-700 rounded text-white"
            >
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={20}>20s</option>
              <option value={30}>30s</option>
            </select>
          </div>

          <button
            onClick={startBetting}
            disabled={racers.length < 2}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            <Play size={18} /> ¡Abrir Apuestas!
          </button>
        </div>
      )}

      {gameState === 'betting' && (
        <>
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-3">
            <span className="text-white font-medium">¡Hagan sus apuestas!</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500">
              <span className="text-black font-bold">{timeLeft}s</span>
            </div>
          </div>

          <div className="space-y-2">
            {racers.map((r, i) => (
              <div key={r.id} className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{r.emote}</span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{i + 1}. {r.name}</p>
                    <p className="text-xs text-zinc-500">{r.bets.length} apuestas</p>
                  </div>
                </div>
                {r.bets.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.bets.slice(0, 10).map((b, j) => (
                      <span key={j} className="text-xs px-1.5 py-0.5 bg-zinc-700 rounded" style={{ color: b.color }}>
                        {b.username}
                      </span>
                    ))}
                    {r.bets.length > 10 && <span className="text-xs text-zinc-500">+{r.bets.length - 10}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <p className="text-zinc-400 text-sm">
              Escribe <span className="text-yellow-400">!apostar 1</span>, <span className="text-yellow-400">!apostar 2</span>, etc.
            </p>
            <p className="text-zinc-500 text-xs mt-1">Total apuestas: {totalBets}</p>
          </div>
        </>
      )}

      {gameState === 'racing' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
          <p className="text-center text-white font-bold text-lg animate-pulse">🏁 ¡CARRERA EN CURSO! 🏁</p>
          
          {racers.map((r, i) => (
            <div key={r.id} className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-zinc-500 w-4">{i + 1}</span>
                <span className="text-sm text-white">{r.name}</span>
              </div>
              <div className="h-8 bg-zinc-700 rounded-full relative overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500/30 to-green-500/10 transition-all duration-100"
                  style={{ width: `${r.position}%` }}
                />
                <span 
                  className="absolute text-2xl transition-all duration-100"
                  style={{ left: `calc(${r.position}% - 15px)`, top: '2px' }}
                >
                  {r.emote}
                </span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-lg">🏁</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {gameState === 'finished' && winner && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center">
          <Trophy size={48} className="text-yellow-400 mx-auto mb-2" />
          <p className="text-4xl mb-2">{winner.emote}</p>
          <p className="text-white text-xl font-bold">¡{winner.name} gana!</p>
          
          {winner.bets.length > 0 && (
            <div className="mt-3">
              <p className="text-zinc-400 text-sm mb-2">🎉 Ganadores ({winner.bets.length}):</p>
              <div className="flex flex-wrap justify-center gap-1">
                {winner.bets.map((b, i) => (
                  <span key={i} className="text-sm px-2 py-1 bg-yellow-500/20 rounded" style={{ color: b.color }}>
                    {b.username}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={resetGame}
            className="mt-4 px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
          >
            Nueva Carrera
          </button>
        </div>
      )}
    </div>
  );
};

export default CarreraEmotes;
