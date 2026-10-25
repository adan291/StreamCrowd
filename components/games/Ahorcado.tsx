import React, { useState, useEffect, useRef } from 'react';
import { TwitchMessage } from '../../types';
import { takeNewChatMessages, markChatMessagesRead } from '../../src/application/utils/chatCursor';
import { sortByKeyRandomTies } from '../../src/application/utils/shuffle';
import { Play, Trophy, RotateCcw, Skull, Heart, Sparkles, Loader2, RefreshCw, Globe, Timer, Settings } from 'lucide-react';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

interface AhorcadoProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

// Categorías de palabras en español
interface WordCategory {
  id: string;
  name: string;
  emoji: string;
  words: { word: string; hint: string }[];
}

const WORD_CATEGORIES: WordCategory[] = [
  {
    id: 'animales',
    name: 'Animales',
    emoji: '🐾',
    words: [
      { word: 'ELEFANTE', hint: 'El mamífero terrestre más grande' },
      { word: 'DELFIN', hint: 'Mamífero marino muy inteligente' },
      { word: 'JIRAFA', hint: 'El animal más alto del mundo' },
      { word: 'COCODRILO', hint: 'Reptil con mandíbulas poderosas' },
      { word: 'MARIPOSA', hint: 'Insecto con alas coloridas' },
      { word: 'CANGURO', hint: 'Salta y tiene bolsa' },
      { word: 'PINGUINO', hint: 'Ave que no vuela pero nada muy bien' },
      { word: 'MURCIELAGO', hint: 'Único mamífero que vuela' },
      { word: 'TORTUGA', hint: 'Lleva su casa a cuestas' },
      { word: 'RINOCERONTE', hint: 'Tiene un cuerno en la nariz' },
    ]
  },
  {
    id: 'paises',
    name: 'Países',
    emoji: '🌍',
    words: [
      { word: 'ARGENTINA', hint: 'País del tango y Messi' },
      { word: 'AUSTRALIA', hint: 'Continente y país a la vez' },
      { word: 'ALEMANIA', hint: 'País de la cerveza y los coches' },
      { word: 'BRASIL', hint: 'El país más grande de Sudamérica' },
      { word: 'CANADA', hint: 'Vecino del norte de USA' },
      { word: 'EGIPTO', hint: 'País de las pirámides' },
      { word: 'JAPON', hint: 'País del sol naciente' },
      { word: 'MEXICO', hint: 'País de los tacos y mariachis' },
      { word: 'NORUEGA', hint: 'País de los fiordos' },
      { word: 'PORTUGAL', hint: 'Vecino de España' },
    ]
  },
  {
    id: 'comida',
    name: 'Comida',
    emoji: '🍕',
    words: [
      { word: 'HAMBURGUESA', hint: 'Comida rápida americana' },
      { word: 'ESPAGUETI', hint: 'Pasta italiana larga' },
      { word: 'CHOCOLATE', hint: 'Dulce hecho de cacao' },
      { word: 'PAELLA', hint: 'Plato típico español con arroz' },
      { word: 'CROISSANT', hint: 'Bollería francesa en forma de luna' },
      { word: 'SUSHI', hint: 'Comida japonesa con arroz y pescado' },
      { word: 'TORTILLA', hint: 'Puede ser española o mexicana' },
      { word: 'LASAGNA', hint: 'Pasta italiana en capas' },
      { word: 'EMPANADA', hint: 'Masa rellena típica latina' },
      { word: 'GAZPACHO', hint: 'Sopa fría española' },
    ]
  },
  {
    id: 'tecnologia',
    name: 'Tecnología',
    emoji: '💻',
    words: [
      { word: 'ORDENADOR', hint: 'Máquina para procesar datos' },
      { word: 'INTERNET', hint: 'Red mundial de comunicación' },
      { word: 'SMARTPHONE', hint: 'Teléfono inteligente' },
      { word: 'BLUETOOTH', hint: 'Conexión inalámbrica de corto alcance' },
      { word: 'ALGORITMO', hint: 'Conjunto de instrucciones' },
      { word: 'STREAMING', hint: 'Ver contenido en tiempo real' },
      { word: 'VIDEOJUEGO', hint: 'Entretenimiento digital interactivo' },
      { word: 'PROGRAMACION', hint: 'Escribir código' },
      { word: 'INTELIGENCIA', hint: 'IA es su abreviatura' },
      { word: 'CIBERSEGURIDAD', hint: 'Protección en el mundo digital' },
    ]
  },
  {
    id: 'deportes',
    name: 'Deportes',
    emoji: '⚽',
    words: [
      { word: 'BALONCESTO', hint: 'Deporte con canasta' },
      { word: 'NATACION', hint: 'Deporte acuático' },
      { word: 'ATLETISMO', hint: 'Correr, saltar, lanzar' },
      { word: 'CICLISMO', hint: 'Deporte sobre dos ruedas' },
      { word: 'VOLEIBOL', hint: 'Deporte con red y balón' },
      { word: 'GIMNASIA', hint: 'Deporte de flexibilidad' },
      { word: 'ESGRIMA', hint: 'Deporte con espadas' },
      { word: 'BOXEO', hint: 'Deporte de combate con guantes' },
      { word: 'SNOWBOARD', hint: 'Deporte de nieve con tabla' },
      { word: 'SKATEBOARD', hint: 'Deporte urbano con tabla' },
    ]
  },
  {
    id: 'peliculas',
    name: 'Películas',
    emoji: '🎬',
    words: [
      { word: 'AVATAR', hint: 'Película de aliens azules' },
      { word: 'TITANIC', hint: 'Historia de un barco que se hunde' },
      { word: 'GLADIADOR', hint: 'Película de la antigua Roma' },
      { word: 'INCEPTION', hint: 'Sueños dentro de sueños' },
      { word: 'MATRIX', hint: 'Realidad virtual y pastillas' },
      { word: 'FROZEN', hint: 'Película de Disney con hielo' },
      { word: 'COCO', hint: 'Película de Pixar sobre México' },
      { word: 'JOKER', hint: 'Villano de Batman' },
      { word: 'INTERSTELLAR', hint: 'Viaje espacial y agujeros negros' },
      { word: 'SHREK', hint: 'Ogro verde y burro parlante' },
    ]
  },
];

// Sistema de uso de palabras (priorizar las menos usadas)
const WORD_USAGE_KEY = 'ahorcado_word_usage';

interface WordUsage {
  [word: string]: number;
}

const loadWordUsage = (): WordUsage => {
  try {
    const saved = localStorage.getItem(WORD_USAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveWordUsage = (usage: WordUsage): void => {
  localStorage.setItem(WORD_USAGE_KEY, JSON.stringify(usage));
};

const incrementWordUsage = (word: string): void => {
  const usage = loadWordUsage();
  usage[word] = (usage[word] || 0) + 1;
  saveWordUsage(usage);
};

// Obtener palabra menos usada de una categoría
const getLeastUsedWord = (category: WordCategory): { word: string; hint: string } => {
  const usage = loadWordUsage();
  // Menos usada primero; empates al azar de forma uniforme
  const sorted = sortByKeyRandomTies(category.words, w => usage[w.word] || 0);
  return sorted[0];
};

// API para palabras aleatorias en inglés (Random Word API)
const fetchRandomWordAPI = async (): Promise<{ word: string; hint: string } | null> => {
  try {
    // Usar Random Word API (gratuita, sin key)
    const response = await fetch('https://random-word-api.herokuapp.com/word?number=1&length=7');
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data[0]) {
      return {
        word: data[0].toUpperCase(),
        hint: 'Palabra en inglés'
      };
    }
    return null;
  } catch {
    return null;
  }
};

const GAME_CHANNEL = 'ahorcado_sync';
const STORAGE_KEY_AHORCADO = 'ahorcado_state';
const MAX_ERRORS = 6;

export const Ahorcado: React.FC<AhorcadoProps> = ({ chatMessages, isConnected = true }) => {
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'won' | 'lost'>('setup');
  const [secretWord, setSecretWord] = useState('');
  const [hint, setHint] = useState('');
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState(0);
  const [contributors, setContributors] = useState<{ username: string; color: string; letter: string; correct: boolean }[]>([]);
  
  // Nuevos estados para categorías y configuración
  const [wordMode, setWordMode] = useState<'manual' | 'category' | 'api'>('category');
  const [selectedCategory, setSelectedCategory] = useState<string>('animales');
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [maxErrors, setMaxErrors] = useState(MAX_ERRORS);
  
  const lastProcessedRef = useRef<TwitchMessage | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const normalizeChar = (char: string): string => {
    return char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  const getDisplayWord = (): string => {
    return secretWord.split('').map(char => {
      if (char === ' ') return '  ';
      const normalized = normalizeChar(char);
      return guessedLetters.has(normalized) ? char : '_';
    }).join(' ');
  };

  const isWordComplete = (): boolean => {
    return secretWord.split('').every(char => {
      if (char === ' ') return true;
      return guessedLetters.has(normalizeChar(char));
    });
  };

  const syncToOverlay = () => {
    const state = {
      type: 'ahorcado_state',
      gameState,
      displayWord: getDisplayWord(),
      hint,
      guessedLetters: [...guessedLetters],
      errors,
      maxErrors,
      contributors: contributors.slice(-10),
      secretWord: gameState === 'won' || gameState === 'lost' ? secretWord : null
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_AHORCADO, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('ahorcado', state).catch(() => {});
  };

  useEffect(() => { syncToOverlay(); }, [gameState, guessedLetters, errors, contributors, maxErrors]);

  // Generar palabra desde categoría
  const generateFromCategory = () => {
    const category = WORD_CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return;
    
    const wordData = getLeastUsedWord(category);
    setSecretWord(wordData.word);
    setHint(wordData.hint);
    incrementWordUsage(wordData.word);
  };

  // Generar palabra desde API
  const generateFromAPI = async () => {
    setIsLoadingWord(true);
    const wordData = await fetchRandomWordAPI();
    if (wordData) {
      setSecretWord(wordData.word);
      setHint(wordData.hint);
    } else {
      // Fallback a categoría si falla la API
      generateFromCategory();
    }
    setIsLoadingWord(false);
  };

  // Procesar letras del chat
  useEffect(() => {
    if (!isConnected || gameState !== 'playing') return;
    const newMessages = takeNewChatMessages(chatMessages, lastProcessedRef);

    newMessages.forEach((msg) => {
      const msgLower = msg.message.toLowerCase().trim();
      
      // Comando !letra X
      if (msgLower.startsWith('!letra ')) {
        const letter = normalizeChar(msgLower.slice(7).trim().charAt(0));
        if (!letter || !/[a-z]/.test(letter)) return;
        if (guessedLetters.has(letter)) return;
        
        const isCorrect = secretWord.split('').some(char => normalizeChar(char) === letter);
        
        setGuessedLetters(prev => new Set([...prev, letter]));
        setContributors(prev => [...prev, {
          username: msg.username,
          color: msg.color || '#a970ff',
          letter: letter.toUpperCase(),
          correct: isCorrect
        }].slice(-50));
        
        if (!isCorrect) {
          setErrors(prev => {
            const newErrors = prev + 1;
            if (newErrors >= maxErrors) {
              setTimeout(() => setGameState('lost'), 500);
            }
            return newErrors;
          });
        }
      }
      
      // Intentar adivinar palabra completa !palabra X
      if (msgLower.startsWith('!palabra ')) {
        const guess = msgLower.slice(9).trim();
        if (normalizeChar(guess) === normalizeChar(secretWord)) {
          // Revelar todas las letras
          secretWord.split('').forEach(char => {
            if (char !== ' ') {
              setGuessedLetters(prev => new Set([...prev, normalizeChar(char)]));
            }
          });
          setContributors(prev => [...prev, {
            username: msg.username,
            color: msg.color || '#a970ff',
            letter: '🎯 PALABRA',
            correct: true
          }]);
          setTimeout(() => setGameState('won'), 500);
        } else {
          setErrors(prev => {
            const newErrors = prev + 2; // Penalización por fallar palabra
            if (newErrors >= maxErrors) {
              setTimeout(() => setGameState('lost'), 500);
            }
            return newErrors;
          });
          setContributors(prev => [...prev, {
            username: msg.username,
            color: msg.color || '#a970ff',
            letter: '❌ ' + guess.slice(0, 10),
            correct: false
          }]);
        }
      }
    });
  }, [chatMessages, isConnected, gameState, secretWord, guessedLetters, maxErrors]);

  // Verificar victoria
  useEffect(() => {
    if (gameState === 'playing' && isWordComplete()) {
      setGameState('won');
    }
  }, [guessedLetters, gameState]);

  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  const startGame = async () => {
    // Generar palabra según el modo
    if (wordMode === 'category') {
      generateFromCategory();
    } else if (wordMode === 'api') {
      await generateFromAPI();
    }
    // Si es manual, ya tiene la palabra
    
    if (!secretWord.trim() && wordMode === 'manual') return;
    
    setGameState('playing');
    setGuessedLetters(new Set());
    setErrors(0);
    setContributors([]);
    markChatMessagesRead(chatMessages, lastProcessedRef);
    triggerGameStart();
  };

  const startGameWithWord = () => {
    if (!secretWord.trim()) return;
    setGameState('playing');
    setGuessedLetters(new Set());
    setErrors(0);
    setContributors([]);
    markChatMessagesRead(chatMessages, lastProcessedRef);
    triggerGameStart();
  };

  const resetGame = () => {
    setGameState('setup');
    setSecretWord('');
    setHint('');
    setGuessedLetters(new Set());
    setErrors(0);
    setContributors([]);
    triggerGameEnd();
  };

  // Dibujar ahorcado
  const renderHangman = () => {
    const parts = [
      errors >= 1 && <circle key="head" cx="150" cy="45" r="15" stroke="white" strokeWidth="3" fill="none" />,
      errors >= 2 && <line key="body" x1="150" y1="60" x2="150" y2="110" stroke="white" strokeWidth="3" />,
      errors >= 3 && <line key="leftArm" x1="150" y1="75" x2="125" y2="95" stroke="white" strokeWidth="3" />,
      errors >= 4 && <line key="rightArm" x1="150" y1="75" x2="175" y2="95" stroke="white" strokeWidth="3" />,
      errors >= 5 && <line key="leftLeg" x1="150" y1="110" x2="130" y2="145" stroke="white" strokeWidth="3" />,
      errors >= 6 && <line key="rightLeg" x1="150" y1="110" x2="170" y2="145" stroke="white" strokeWidth="3" />,
    ];

    return (
      <svg width="200" height="180" className="mx-auto">
        {/* Base */}
        <line x1="20" y1="170" x2="180" y2="170" stroke="#666" strokeWidth="4" />
        <line x1="60" y1="170" x2="60" y2="10" stroke="#666" strokeWidth="4" />
        <line x1="60" y1="10" x2="150" y2="10" stroke="#666" strokeWidth="4" />
        <line x1="150" y1="10" x2="150" y2="30" stroke="#666" strokeWidth="3" />
        {parts}
      </svg>
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skull className="text-red-400" size={24} />
          <h3 className="text-lg font-bold text-white">Ahorcado</h3>
        </div>
        <div className="flex items-center gap-2">
          <OBSOverlayUrl overlayParam="overlayAhorcado" title="el ahorcado" />
          <button 
            onClick={() => setShowSettings(!showSettings)} 
            className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-purple-500/30 text-purple-400' : 'bg-zinc-700/50 text-zinc-400 hover:text-white'}`}
            title="Configuración"
          >
            <Settings size={18} />
          </button>
          <button onClick={resetGame} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg" title="Reiniciar">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Configuración */}
      {showSettings && gameState === 'setup' && (
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Vidas (errores permitidos)</span>
            <div className="flex items-center gap-2">
              {[4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  onClick={() => setMaxErrors(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    maxErrors === n ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState === 'setup' && (
        <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
          {/* Selector de modo */}
          <div className="flex gap-1 bg-zinc-700/50 rounded-xl p-1">
            <button
              onClick={() => setWordMode('category')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                wordMode === 'category' ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-600'
              }`}
            >
              <Sparkles size={14} /> Categorías
            </button>
            <button
              onClick={() => setWordMode('api')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                wordMode === 'api' ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-600'
              }`}
            >
              <Globe size={14} /> Online
            </button>
            <button
              onClick={() => setWordMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                wordMode === 'manual' ? 'bg-red-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-600'
              }`}
            >
              ✏️ Manual
            </button>
          </div>

          {/* Modo Categorías */}
          {wordMode === 'category' && (
            <div className="space-y-3">
              <span className="text-xs text-zinc-400">Selecciona una categoría (palabras en español)</span>
              <div className="grid grid-cols-3 gap-2">
                {WORD_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-red-500 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={startGame}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 text-white font-bold rounded-lg flex items-center justify-center gap-2"
              >
                <Play size={18} /> ¡Empezar!
              </button>
            </div>
          )}

          {/* Modo API Online */}
          {wordMode === 'api' && (
            <div className="space-y-3">
              <div className="bg-zinc-700/50 rounded-lg p-3">
                <p className="text-zinc-300 text-sm">🌐 Palabra aleatoria de Internet</p>
                <p className="text-zinc-500 text-xs mt-1">Las palabras serán en inglés</p>
              </div>
              <button
                onClick={startGame}
                disabled={isLoadingWord}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
              >
                {isLoadingWord ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Globe size={18} /> ¡Palabra Aleatoria!
                  </>
                )}
              </button>
            </div>
          )}

          {/* Modo Manual */}
          {wordMode === 'manual' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="ahorcado-secret-word" className="text-sm text-zinc-400 mb-1 block">Palabra secreta</label>
                <input
                  type="text"
                  id="ahorcado-secret-word"
                  name="ahorcado-secret-word"
                  value={secretWord}
                  onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
                  placeholder="Ej: PROGRAMACION, TWITCH STREAMER..."
                  className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white uppercase"
                />
              </div>
              <div>
                <label htmlFor="ahorcado-hint" className="text-sm text-zinc-400 mb-1 block">Pista (opcional)</label>
                <input
                  type="text"
                  id="ahorcado-hint"
                  name="ahorcado-hint"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="Ej: Es un lenguaje de programación..."
                  className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white"
                />
              </div>
              <button
                onClick={startGameWithWord}
                disabled={!secretWord.trim()}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
              >
                <Play size={18} /> ¡Empezar!
              </button>
            </div>
          )}
          
          <p className="text-[10px] text-zinc-500 text-center">
            💡 Las palabras menos usadas se priorizan automáticamente
          </p>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="bg-zinc-800 rounded-xl p-4">
            {renderHangman()}
            
            {/* Vidas */}
            <div className="flex justify-center gap-1 mt-2">
              {[...Array(maxErrors)].map((_, i) => (
                <Heart
                  key={i}
                  size={20}
                  className={i < maxErrors - errors ? 'text-red-500 fill-red-500' : 'text-zinc-600'}
                />
              ))}
            </div>
          </div>

          {/* Palabra */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 text-center">
            <p className="text-white text-2xl font-mono tracking-widest mb-2">
              {getDisplayWord()}
            </p>
            {hint && (
              <p className="text-zinc-400 text-sm">💡 {hint}</p>
            )}
          </div>

          {/* Letras usadas */}
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <p className="text-xs text-zinc-500 mb-2">Letras usadas:</p>
            <div className="flex flex-wrap gap-1">
              {[...guessedLetters].map(letter => {
                const isCorrect = secretWord.split('').some(char => normalizeChar(char) === letter);
                return (
                  <span
                    key={letter}
                    className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold ${
                      isCorrect ? 'bg-green-500/30 text-green-400' : 'bg-red-500/30 text-red-400'
                    }`}
                  >
                    {letter.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
            <p className="text-zinc-400 text-sm">
              <span className="text-yellow-400">!letra X</span> para adivinar letra • 
              <span className="text-yellow-400 ml-2">!palabra XXXX</span> para adivinar palabra
            </p>
          </div>
        </>
      )}

      {(gameState === 'won' || gameState === 'lost') && (
        <div className={`rounded-xl p-4 text-center ${gameState === 'won' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          {gameState === 'won' ? (
            <>
              <Trophy size={48} className="text-yellow-400 mx-auto mb-2" />
              <p className="text-white text-xl font-bold">¡El chat ganó!</p>
            </>
          ) : (
            <>
              <Skull size={48} className="text-red-400 mx-auto mb-2" />
              <p className="text-white text-xl font-bold">¡El chat perdió!</p>
            </>
          )}
          <p className="text-zinc-300 mt-2">La palabra era: <span className="text-yellow-400 font-bold">{secretWord}</span></p>
          <button
            onClick={resetGame}
            className="mt-4 px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg"
          >
            Nueva Palabra
          </button>
        </div>
      )}

      {/* Contribuidores */}
      {contributors.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3 max-h-32 overflow-y-auto">
          <p className="text-xs text-zinc-500 mb-2">Últimas letras:</p>
          <div className="flex flex-wrap gap-1">
            {contributors.slice(-15).map((c, i) => (
              <span
                key={i}
                className={`text-xs px-2 py-1 rounded ${c.correct ? 'bg-green-500/20' : 'bg-red-500/20'}`}
                style={{ color: c.color }}
              >
                {c.username}: {c.letter}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ahorcado;
