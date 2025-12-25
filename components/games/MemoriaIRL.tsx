import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { Play, Trophy, RotateCcw, ExternalLink, Camera, Eye, EyeOff, Plus, Trash2, Check, Sparkles, Loader2 } from 'lucide-react';
import { loadAIConfig, AIConfig, getProviderForFunction } from '../../services/aiAnalyticsService';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../services/firebaseSync';

interface MemoryObject {
  id: string;
  name: string;
  found: boolean;
  foundBy?: { username: string; color: string };
}

interface MemoriaIRLProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'memoria_irl_sync';
const STORAGE_KEY_MEMORIA = 'memoria_irl_state';

export const MemoriaIRL: React.FC<MemoriaIRLProps> = ({ chatMessages, isConnected = true }) => {
  const [gameState, setGameState] = useState<'setup' | 'viewing' | 'guessing' | 'results'>('setup');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [objects, setObjects] = useState<MemoryObject[]>([]);
  const [newObject, setNewObject] = useState('');
  const [viewingTime, setViewingTime] = useState(15);
  const [guessingTime, setGuessingTime] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);
  const [scores, setScores] = useState<Map<string, { username: string; color: string; points: number }>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    const config = loadAIConfig();
    setAiConfig(config);
    return () => channelRef.current?.close();
  }, []);

  // Recargar config de IA cuando el componente está en setup (por si se configuró después)
  useEffect(() => {
    if (gameState === 'setup') {
      const config = loadAIConfig();
      setAiConfig(config);
    }
  }, [gameState]);

  const syncToOverlay = useCallback(() => {
    const state = {
      type: 'memoria_state',
      gameState,
      imageUrl: gameState === 'viewing' ? imageUrl : null,
      objects: gameState === 'results' ? objects : objects.map(o => ({ ...o, name: o.found ? o.name : '???' })),
      timeLeft,
      totalObjects: objects.length,
      foundCount: objects.filter(o => o.found).length
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_MEMORIA, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('memoria', state).catch(() => {});
  }, [gameState, imageUrl, objects, timeLeft]);

  useEffect(() => { syncToOverlay(); }, [syncToOverlay]);

  // Procesar respuestas del chat
  useEffect(() => {
    if (!isConnected || gameState !== 'guessing') return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      const oderId = msg.userId || msg.username;
      
      // Buscar si el mensaje contiene algún objeto
      objects.forEach(obj => {
        if (obj.found) return;
        
        const objLower = obj.name.toLowerCase();
        // Coincidencia flexible: contiene la palabra o es muy similar
        if (msgLower.includes(objLower) || objLower.includes(msgLower) || 
            levenshteinDistance(msgLower, objLower) <= 2) {
          
          setObjects(prev => prev.map(o => 
            o.id === obj.id ? { ...o, found: true, foundBy: { username: msg.username, color: msg.color || '#a970ff' } } : o
          ));
          
          setScores(prev => {
            const newScores = new Map(prev);
            const existing = prev.get(oderId);
            newScores.set(oderId, {
              username: msg.username,
              color: msg.color || '#a970ff',
              points: (existing?.points || 0) + 10
            });
            return newScores;
          });
        }
      });
    });
  }, [chatMessages, isConnected, gameState, objects]);

  // Distancia de Levenshtein para coincidencias aproximadas
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
      }
    }
    return matrix[b.length][a.length];
  };

  // Timer
  useEffect(() => {
    if (gameState !== 'viewing' && gameState !== 'guessing') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (gameState === 'viewing') {
            setGameState('guessing');
            setTimeLeft(guessingTime);
          } else {
            setGameState('results');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, guessingTime]);

  // Verificar si todos los objetos fueron encontrados
  useEffect(() => {
    if (gameState === 'guessing' && objects.length > 0 && objects.every(o => o.found)) {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState('results');
    }
  }, [objects, gameState]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        setImageUrl(url);
        
        // Auto-analizar con IA si hay proveedor configurado para juegos
        const config = loadAIConfig();
        const providerInfo = config ? getProviderForFunction(config, 'games') : null;
        if (providerInfo) {
          await analyzeImageWithAIAuto(url);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImageWithAIAuto = async (imgUrl: string) => {
    const config = loadAIConfig();
    const providerInfo = config ? getProviderForFunction(config, 'games') : null;
    
    if (!providerInfo || !imgUrl) {
      setAiError('No hay IA configurada para juegos');
      return;
    }
    
    setIsAnalyzing(true);
    setAiError(null);
    setObjects([]); // Limpiar objetos anteriores
    
    const { provider, apiKey } = providerInfo;
    
    try {
      if (provider === 'gemini') {
        const savedModel = localStorage.getItem('gemini_working_model') || 'gemini-2.0-flash-exp';
        
        // Extraer base64 de la imagen
        const base64Data = imgUrl.split(',')[1];
        const mimeType = imgUrl.split(';')[0].split(':')[1];
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${savedModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Lista exactamente 8-12 objetos visibles en esta imagen. Responde SOLO con un JSON: {"objects": ["objeto1", "objeto2", ...]}. Usa nombres simples en español (ej: "coche", "árbol", "persona", "semáforo"). Sin explicaciones.' },
                  { inline_data: { mime_type: mimeType, data: base64Data } }
                ]
              }],
              generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
            }),
          }
        );

        if (!response.ok) {
          setAiError('Error en la API de Gemini');
          setIsAnalyzing(false);
          return;
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.objects && Array.isArray(parsed.objects)) {
              const newObjects: MemoryObject[] = parsed.objects.slice(0, 12).map((name: string, i: number) => ({
                id: `obj_${i}`,
                name: name.toLowerCase(),
                found: false
              }));
              setObjects(newObjects);
              setIsAnalyzing(false);
              return;
            }
          }
        }
        setAiError('No se pudieron detectar objetos');
      } else if (provider === 'openai') {
        // OpenAI Vision API
        const base64Data = imgUrl.split(',')[1];
        const mimeType = imgUrl.split(';')[0].split(':')[1];
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: 'Lista exactamente 8-12 objetos visibles en esta imagen. Responde SOLO con un JSON: {"objects": ["objeto1", "objeto2", ...]}. Usa nombres simples en español.' },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } }
              ]
            }],
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          setAiError('Error en la API de OpenAI');
          setIsAnalyzing(false);
          return;
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        
        if (text) {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.objects && Array.isArray(parsed.objects)) {
              const newObjects: MemoryObject[] = parsed.objects.slice(0, 12).map((name: string, i: number) => ({
                id: `obj_${i}`,
                name: name.toLowerCase(),
                found: false
              }));
              setObjects(newObjects);
              setIsAnalyzing(false);
              return;
            }
          }
        }
        setAiError('No se pudieron detectar objetos');
      } else {
        setAiError('Proveedor no soportado para análisis de imágenes');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAiError('Error al analizar la imagen');
    }
    
    setIsAnalyzing(false);
  };

  const addObject = () => {
    if (!newObject.trim()) return;
    const obj: MemoryObject = {
      id: `obj_${Date.now()}`,
      name: newObject.toLowerCase().trim(),
      found: false
    };
    setObjects(prev => [...prev, obj]);
    setNewObject('');
  };

  const removeObject = (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
  };

  const startGame = () => {
    if (!imageUrl || objects.length < 3) return;
    setTimeLeft(viewingTime);
    setScores(new Map());
    setObjects(prev => prev.map(o => ({ ...o, found: false, foundBy: undefined })));
    setGameState('viewing');
    lastProcessedRef.current = chatMessages.length;
  };

  const resetGame = () => {
    setGameState('setup');
    setImageUrl('');
    setObjects([]);
    setScores(new Map());
    setTimeLeft(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const sortedScores = [...scores.values()].sort((a, b) => b.points - a.points);
  const foundCount = objects.filter(o => o.found).length;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="text-cyan-400" size={24} />
          <h3 className="text-lg font-bold text-white">Memoria IRL</h3>
        </div>
        <div className="flex items-center gap-2">
          <OBSOverlayUrl overlayParam="overlayMemoria" title="el juego de memoria" />
          <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg" title="Reiniciar">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      {gameState === 'setup' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          {/* Subir imagen */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Imagen (foto del IRL)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {imageUrl ? (
              <div className="relative">
                <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                <button
                  onClick={() => setImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-zinc-600 rounded-lg flex flex-col items-center justify-center text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
              >
                <Camera size={32} className="mb-2" />
                <span>Subir imagen</span>
              </button>
            )}
          </div>

          {/* Analizar con IA */}
          {imageUrl && (
            <>
              {(() => {
                const config = loadAIConfig();
                const providerInfo = config ? getProviderForFunction(config, 'games') : null;
                return providerInfo ? (
                  <>
                    <button
                      onClick={() => analyzeImageWithAIAuto(imageUrl)}
                      disabled={isAnalyzing}
                      className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
                    >
                      {isAnalyzing ? (
                        <><Loader2 size={18} className="animate-spin" /> Analizando imagen...</>
                      ) : (
                        <><Sparkles size={18} /> {objects.length > 0 ? 'Re-analizar con IA' : '🔍 Detectar objetos automáticamente'}</>
                      )}
                    </button>
                    {aiError && (
                      <p className="text-red-400 text-xs text-center">{aiError}</p>
                    )}
                  </>
                ) : (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
                    <p className="text-yellow-300 text-sm">
                      <Sparkles size={14} className="inline mr-1" />
                      Configura la IA en Analytics para detectar objetos automáticamente
                    </p>
                    <p className="text-yellow-200/60 text-xs mt-1">
                      O añádelos manualmente abajo
                    </p>
                  </div>
                );
              })()}
            </>
          )}

          {/* Lista de objetos */}
          <div>
            <label className="text-sm text-zinc-400 mb-2 block">Objetos a recordar ({objects.length})</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newObject}
                onChange={(e) => setNewObject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addObject()}
                placeholder="Añadir objeto..."
                className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white"
              />
              <button onClick={addObject} className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg">
                <Plus size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {objects.map(obj => (
                <span key={obj.id} className="flex items-center gap-1 px-2 py-1 bg-zinc-700 rounded text-white text-sm">
                  {obj.name}
                  <button onClick={() => removeObject(obj.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Tiempos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tiempo para ver</label>
              <select
                value={viewingTime}
                onChange={(e) => setViewingTime(parseInt(e.target.value))}
                className="w-full px-2 py-1 bg-zinc-700 rounded text-white"
              >
                <option value={10}>10s</option>
                <option value={15}>15s</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tiempo para adivinar</label>
              <select
                value={guessingTime}
                onChange={(e) => setGuessingTime(parseInt(e.target.value))}
                className="w-full px-2 py-1 bg-zinc-700 rounded text-white"
              >
                <option value={20}>20s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
              </select>
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={!imageUrl || objects.length < 3}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            <Play size={18} /> ¡Empezar!
          </button>
        </div>
      )}

      {gameState === 'viewing' && (
        <>
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Eye className="text-green-400" />
              <span className="text-white font-medium">¡Memoriza la imagen!</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500">
              <span className="text-white font-bold">{timeLeft}s</span>
            </div>
          </div>
          
          <div className="rounded-xl overflow-hidden">
            <img src={imageUrl} alt="Memoriza" className="w-full" />
          </div>
          
          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <p className="text-zinc-400">Hay <span className="text-yellow-400 font-bold">{objects.length}</span> objetos que recordar</p>
          </div>
        </>
      )}

      {gameState === 'guessing' && (
        <>
          <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <EyeOff className="text-orange-400" />
              <span className="text-white font-medium">¿Qué había en la imagen?</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
              <span className="text-white font-bold">{timeLeft}s</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 text-center">
            <p className="text-white text-lg mb-2">Encontrados: {foundCount} / {objects.length}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {objects.map(obj => (
                <span
                  key={obj.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    obj.found ? 'bg-green-500/30 text-green-400' : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {obj.found ? (
                    <><Check size={14} className="inline mr-1" />{obj.name}</>
                  ) : '???'}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <p className="text-zinc-400 text-sm">
              Escribe en el chat los objetos que recuerdes
            </p>
          </div>
        </>
      )}

      {gameState === 'results' && (
        <>
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 text-center">
            <Trophy size={32} className="text-yellow-400 mx-auto mb-2" />
            <p className="text-white text-xl font-bold">
              {foundCount === objects.length ? '¡Todos encontrados!' : `${foundCount} de ${objects.length} encontrados`}
            </p>
          </div>

          {/* Objetos */}
          <div className="bg-zinc-800 rounded-xl p-3">
            <p className="text-sm text-zinc-400 mb-2">Objetos:</p>
            <div className="space-y-1">
              {objects.map(obj => (
                <div key={obj.id} className="flex items-center gap-2 text-sm">
                  {obj.found ? (
                    <Check size={14} className="text-green-400" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500/50" />
                  )}
                  <span className={obj.found ? 'text-green-400' : 'text-red-400'}>{obj.name}</span>
                  {obj.foundBy && (
                    <span className="text-xs" style={{ color: obj.foundBy.color }}>
                      - {obj.foundBy.username}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ranking */}
          {sortedScores.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <p className="text-sm text-zinc-400 mb-2">🏆 Ranking:</p>
              <div className="space-y-1">
                {sortedScores.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <span style={{ color: s.color }}>{s.username}</span>
                    <span className="text-yellow-400">{s.points}pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={resetGame}
            className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
          >
            Nueva Ronda
          </button>
        </>
      )}
    </div>
  );
};

export default MemoriaIRL;
