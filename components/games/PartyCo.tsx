import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { 
  Play, Trophy, RotateCcw, Dice6, Users, ExternalLink, 
  Check, X, Timer, Sparkles, MessageCircle, Eye, Pencil, 
  Music, Brain, Zap, HelpCircle, Crown, Plus, Trash2
} from 'lucide-react';
import { loadAIConfig, getProviderForFunction } from '../../src/application/services/AnalyticsService';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

// Tipos de pruebas del Party & Co
type ChallengeType = 'trivia' | 'mimica' | 'dibujo' | 'palabras' | 'cultura' | 'rapidez';

interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  answer?: string; // Respuesta correcta (para trivia, palabras, cultura)
  hints?: string[]; // Pistas opcionales
  timeLimit: number; // Segundos
  points: number;
}

interface Player {
  oderId: string;
  username: string;
  color: string;
  score: number;
  wins: number;
  joinedAt: number;
}

interface PartyCoProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'party_co_sync';
const STORAGE_KEY_PARTYCO = 'party_co_state';
const CUSTOM_CHALLENGES_KEY = 'party_co_custom_challenges';

// Iconos por tipo de prueba
const CHALLENGE_ICONS: Record<ChallengeType, React.ReactNode> = {
  trivia: <Brain size={20} />,
  mimica: <Eye size={20} />,
  dibujo: <Pencil size={20} />,
  palabras: <MessageCircle size={20} />,
  cultura: <HelpCircle size={20} />,
  rapidez: <Zap size={20} />,
};

const CHALLENGE_COLORS: Record<ChallengeType, string> = {
  trivia: '#8b5cf6',    // Violeta
  mimica: '#f97316',    // Naranja
  dibujo: '#22c55e',    // Verde
  palabras: '#3b82f6',  // Azul
  cultura: '#eab308',   // Amarillo
  rapidez: '#ef4444',   // Rojo
};

const CHALLENGE_NAMES: Record<ChallengeType, string> = {
  trivia: 'Trivia',
  mimica: 'Mímica',
  dibujo: 'Dibujo',
  palabras: 'Palabras',
  cultura: 'Cultura',
  rapidez: 'Rapidez',
};

// Banco de pruebas predefinidas - EXPANDIDO
const DEFAULT_CHALLENGES: Challenge[] = [
  // ========== TRIVIA (15 preguntas) ==========
  { id: 't1', type: 'trivia', title: '¿Cuál es el planeta más cercano al Sol?', description: 'Responde en el chat', answer: 'mercurio', timeLimit: 20, points: 10 },
  { id: 't2', type: 'trivia', title: '¿En qué año cayó el Muro de Berlín?', description: 'Responde en el chat', answer: '1989', timeLimit: 20, points: 10 },
  { id: 't3', type: 'trivia', title: '¿Cuántos jugadores hay en un equipo de voleibol?', description: 'Responde en el chat', answer: '6', timeLimit: 15, points: 10 },
  { id: 't4', type: 'trivia', title: '¿Cuántos lados tiene un hexágono?', description: 'Responde en el chat', answer: '6', hints: ['seis'], timeLimit: 15, points: 10 },
  { id: 't5', type: 'trivia', title: '¿Cuál es el hueso más largo del cuerpo humano?', description: 'Responde en el chat', answer: 'femur', hints: ['fémur'], timeLimit: 20, points: 10 },
  { id: 't6', type: 'trivia', title: '¿Cuántos corazones tiene un pulpo?', description: 'Responde en el chat', answer: '3', hints: ['tres'], timeLimit: 20, points: 10 },
  { id: 't7', type: 'trivia', title: '¿En qué año se hundió el Titanic?', description: 'Responde en el chat', answer: '1912', timeLimit: 20, points: 10 },
  { id: 't8', type: 'trivia', title: '¿Cuál es el metal más abundante en la Tierra?', description: 'Responde en el chat', answer: 'aluminio', timeLimit: 20, points: 10 },
  { id: 't9', type: 'trivia', title: '¿Cuántos dientes tiene un adulto?', description: 'Responde en el chat', answer: '32', timeLimit: 15, points: 10 },
  { id: 't10', type: 'trivia', title: '¿Qué gas respiramos principalmente?', description: 'Responde en el chat', answer: 'nitrogeno', hints: ['nitrógeno'], timeLimit: 15, points: 10 },
  { id: 't11', type: 'trivia', title: '¿Cuántos minutos tiene una hora?', description: 'Responde en el chat', answer: '60', timeLimit: 10, points: 5 },
  { id: 't12', type: 'trivia', title: '¿Cuál es el animal terrestre más rápido?', description: 'Responde en el chat', answer: 'guepardo', hints: ['cheetah', 'leopardo'], timeLimit: 20, points: 10 },
  { id: 't13', type: 'trivia', title: '¿Cuántos continentes hay?', description: 'Responde en el chat', answer: '7', hints: ['siete'], timeLimit: 15, points: 10 },
  { id: 't14', type: 'trivia', title: '¿Qué planeta es conocido como el planeta rojo?', description: 'Responde en el chat', answer: 'marte', hints: ['mars'], timeLimit: 15, points: 10 },
  { id: 't15', type: 'trivia', title: '¿Cuántas patas tiene una araña?', description: 'Responde en el chat', answer: '8', hints: ['ocho'], timeLimit: 15, points: 10 },
  
  // ========== MÍMICA (15 pruebas) ==========
  { id: 'm1', type: 'mimica', title: 'Imita: Un pingüino', description: 'El streamer debe actuar sin hablar', answer: 'pinguino', hints: ['pingüino'], timeLimit: 45, points: 15 },
  { id: 'm2', type: 'mimica', title: 'Imita: Alguien cocinando', description: 'El streamer debe actuar sin hablar', answer: 'cocinar', hints: ['cocinando', 'cocina', 'chef'], timeLimit: 45, points: 15 },
  { id: 'm3', type: 'mimica', title: 'Imita: Un astronauta', description: 'El streamer debe actuar sin hablar', answer: 'astronauta', timeLimit: 45, points: 15 },
  { id: 'm4', type: 'mimica', title: 'Imita: Un mono', description: 'El streamer debe actuar sin hablar', answer: 'mono', hints: ['chimpance', 'gorila', 'simio'], timeLimit: 45, points: 15 },
  { id: 'm5', type: 'mimica', title: 'Imita: Alguien nadando', description: 'El streamer debe actuar sin hablar', answer: 'nadar', hints: ['nadando', 'natacion'], timeLimit: 45, points: 15 },
  { id: 'm6', type: 'mimica', title: 'Imita: Un robot', description: 'El streamer debe actuar sin hablar', answer: 'robot', timeLimit: 45, points: 15 },
  { id: 'm7', type: 'mimica', title: 'Imita: Alguien con frío', description: 'El streamer debe actuar sin hablar', answer: 'frio', hints: ['frío', 'congelado', 'temblando'], timeLimit: 45, points: 15 },
  { id: 'm8', type: 'mimica', title: 'Imita: Un futbolista', description: 'El streamer debe actuar sin hablar', answer: 'futbol', hints: ['fútbol', 'futbolista'], timeLimit: 45, points: 15 },
  { id: 'm9', type: 'mimica', title: 'Imita: Un zombie', description: 'El streamer debe actuar sin hablar', answer: 'zombie', hints: ['zombi', 'muerto viviente'], timeLimit: 45, points: 15 },
  { id: 'm10', type: 'mimica', title: 'Imita: Alguien pescando', description: 'El streamer debe actuar sin hablar', answer: 'pescar', hints: ['pescando', 'pesca'], timeLimit: 45, points: 15 },
  { id: 'm11', type: 'mimica', title: 'Imita: Un bebé', description: 'El streamer debe actuar sin hablar', answer: 'bebe', hints: ['bebé', 'niño'], timeLimit: 45, points: 15 },
  { id: 'm12', type: 'mimica', title: 'Imita: Alguien boxeando', description: 'El streamer debe actuar sin hablar', answer: 'boxeo', hints: ['boxear', 'boxeando', 'pelea'], timeLimit: 45, points: 15 },
  { id: 'm13', type: 'mimica', title: 'Imita: Un perro', description: 'El streamer debe actuar sin hablar', answer: 'perro', hints: ['can', 'cachorro'], timeLimit: 45, points: 15 },
  { id: 'm14', type: 'mimica', title: 'Imita: Alguien durmiendo', description: 'El streamer debe actuar sin hablar', answer: 'dormir', hints: ['durmiendo', 'sueño'], timeLimit: 45, points: 15 },
  { id: 'm15', type: 'mimica', title: 'Imita: Un vaquero', description: 'El streamer debe actuar sin hablar', answer: 'vaquero', hints: ['cowboy'], timeLimit: 45, points: 15 },
  
  // ========== DIBUJO (15 pruebas) ==========
  { id: 'd1', type: 'dibujo', title: 'Dibuja: Una pizza', description: 'El streamer dibuja, el chat adivina', answer: 'pizza', timeLimit: 60, points: 15 },
  { id: 'd2', type: 'dibujo', title: 'Dibuja: Un cohete', description: 'El streamer dibuja, el chat adivina', answer: 'cohete', hints: ['nave', 'espacial'], timeLimit: 60, points: 15 },
  { id: 'd3', type: 'dibujo', title: 'Dibuja: Un gato', description: 'El streamer dibuja, el chat adivina', answer: 'gato', hints: ['gatito', 'minino'], timeLimit: 60, points: 15 },
  { id: 'd4', type: 'dibujo', title: 'Dibuja: Una casa', description: 'El streamer dibuja, el chat adivina', answer: 'casa', hints: ['hogar', 'vivienda'], timeLimit: 60, points: 15 },
  { id: 'd5', type: 'dibujo', title: 'Dibuja: Un árbol', description: 'El streamer dibuja, el chat adivina', answer: 'arbol', hints: ['árbol'], timeLimit: 60, points: 15 },
  { id: 'd6', type: 'dibujo', title: 'Dibuja: Un helado', description: 'El streamer dibuja, el chat adivina', answer: 'helado', hints: ['ice cream'], timeLimit: 60, points: 15 },
  { id: 'd7', type: 'dibujo', title: 'Dibuja: Un avión', description: 'El streamer dibuja, el chat adivina', answer: 'avion', hints: ['avión', 'aeroplano'], timeLimit: 60, points: 15 },
  { id: 'd8', type: 'dibujo', title: 'Dibuja: Una guitarra', description: 'El streamer dibuja, el chat adivina', answer: 'guitarra', timeLimit: 60, points: 15 },
  { id: 'd9', type: 'dibujo', title: 'Dibuja: Un sol', description: 'El streamer dibuja, el chat adivina', answer: 'sol', timeLimit: 45, points: 10 },
  { id: 'd10', type: 'dibujo', title: 'Dibuja: Una hamburguesa', description: 'El streamer dibuja, el chat adivina', answer: 'hamburguesa', hints: ['burger'], timeLimit: 60, points: 15 },
  { id: 'd11', type: 'dibujo', title: 'Dibuja: Un elefante', description: 'El streamer dibuja, el chat adivina', answer: 'elefante', timeLimit: 60, points: 15 },
  { id: 'd12', type: 'dibujo', title: 'Dibuja: Una bicicleta', description: 'El streamer dibuja, el chat adivina', answer: 'bicicleta', hints: ['bici'], timeLimit: 60, points: 15 },
  { id: 'd13', type: 'dibujo', title: 'Dibuja: Un reloj', description: 'El streamer dibuja, el chat adivina', answer: 'reloj', timeLimit: 60, points: 15 },
  { id: 'd14', type: 'dibujo', title: 'Dibuja: Una flor', description: 'El streamer dibuja, el chat adivina', answer: 'flor', hints: ['rosa', 'margarita'], timeLimit: 60, points: 15 },
  { id: 'd15', type: 'dibujo', title: 'Dibuja: Un dinosaurio', description: 'El streamer dibuja, el chat adivina', answer: 'dinosaurio', hints: ['dino', 't-rex'], timeLimit: 60, points: 15 },
  
  // ========== PALABRAS (15 pruebas) ==========
  { id: 'p1', type: 'palabras', title: 'Describe sin decir: PLAYA', description: 'El streamer describe, el chat adivina', answer: 'playa', timeLimit: 45, points: 15 },
  { id: 'p2', type: 'palabras', title: 'Describe sin decir: ORDENADOR', description: 'El streamer describe, el chat adivina', answer: 'ordenador', hints: ['computadora', 'pc', 'computador'], timeLimit: 45, points: 15 },
  { id: 'p3', type: 'palabras', title: 'Describe sin decir: CHOCOLATE', description: 'El streamer describe, el chat adivina', answer: 'chocolate', timeLimit: 45, points: 15 },
  { id: 'p4', type: 'palabras', title: 'Describe sin decir: HOSPITAL', description: 'El streamer describe, el chat adivina', answer: 'hospital', hints: ['clinica', 'clínica'], timeLimit: 45, points: 15 },
  { id: 'p5', type: 'palabras', title: 'Describe sin decir: NAVIDAD', description: 'El streamer describe, el chat adivina', answer: 'navidad', hints: ['christmas'], timeLimit: 45, points: 15 },
  { id: 'p6', type: 'palabras', title: 'Describe sin decir: CINE', description: 'El streamer describe, el chat adivina', answer: 'cine', hints: ['pelicula', 'película', 'teatro'], timeLimit: 45, points: 15 },
  { id: 'p7', type: 'palabras', title: 'Describe sin decir: DENTISTA', description: 'El streamer describe, el chat adivina', answer: 'dentista', hints: ['odontologo', 'odontólogo'], timeLimit: 45, points: 15 },
  { id: 'p8', type: 'palabras', title: 'Describe sin decir: SUPERMERCADO', description: 'El streamer describe, el chat adivina', answer: 'supermercado', hints: ['super', 'tienda'], timeLimit: 45, points: 15 },
  { id: 'p9', type: 'palabras', title: 'Describe sin decir: CUMPLEAÑOS', description: 'El streamer describe, el chat adivina', answer: 'cumpleaños', hints: ['cumple', 'birthday'], timeLimit: 45, points: 15 },
  { id: 'p10', type: 'palabras', title: 'Describe sin decir: AEROPUERTO', description: 'El streamer describe, el chat adivina', answer: 'aeropuerto', hints: ['airport'], timeLimit: 45, points: 15 },
  { id: 'p11', type: 'palabras', title: 'Describe sin decir: BIBLIOTECA', description: 'El streamer describe, el chat adivina', answer: 'biblioteca', timeLimit: 45, points: 15 },
  { id: 'p12', type: 'palabras', title: 'Describe sin decir: PARAGUAS', description: 'El streamer describe, el chat adivina', answer: 'paraguas', hints: ['sombrilla'], timeLimit: 45, points: 15 },
  { id: 'p13', type: 'palabras', title: 'Describe sin decir: VIDEOJUEGO', description: 'El streamer describe, el chat adivina', answer: 'videojuego', hints: ['juego', 'game'], timeLimit: 45, points: 15 },
  { id: 'p14', type: 'palabras', title: 'Describe sin decir: MONTAÑA', description: 'El streamer describe, el chat adivina', answer: 'montaña', hints: ['montana', 'monte'], timeLimit: 45, points: 15 },
  { id: 'p15', type: 'palabras', title: 'Describe sin decir: RESTAURANTE', description: 'El streamer describe, el chat adivina', answer: 'restaurante', hints: ['restaurant'], timeLimit: 45, points: 15 },
  
  // ========== CULTURA (15 preguntas) ==========
  { id: 'c1', type: 'cultura', title: '¿Quién pintó La Mona Lisa?', description: 'Responde en el chat', answer: 'leonardo', hints: ['da vinci', 'davinci'], timeLimit: 20, points: 10 },
  { id: 'c2', type: 'cultura', title: '¿Cuál es la capital de Japón?', description: 'Responde en el chat', answer: 'tokio', hints: ['tokyo'], timeLimit: 15, points: 10 },
  { id: 'c3', type: 'cultura', title: '¿Qué elemento químico tiene el símbolo "Au"?', description: 'Responde en el chat', answer: 'oro', hints: ['gold'], timeLimit: 20, points: 10 },
  { id: 'c4', type: 'cultura', title: '¿Quién escribió Don Quijote?', description: 'Responde en el chat', answer: 'cervantes', hints: ['miguel de cervantes'], timeLimit: 20, points: 10 },
  { id: 'c5', type: 'cultura', title: '¿En qué país está la Torre Eiffel?', description: 'Responde en el chat', answer: 'francia', hints: ['france', 'paris'], timeLimit: 15, points: 10 },
  { id: 'c6', type: 'cultura', title: '¿Cuál es el río más largo del mundo?', description: 'Responde en el chat', answer: 'nilo', hints: ['amazonas'], timeLimit: 20, points: 10 },
  { id: 'c7', type: 'cultura', title: '¿Quién descubrió América?', description: 'Responde en el chat', answer: 'colon', hints: ['colón', 'cristobal colon'], timeLimit: 20, points: 10 },
  { id: 'c8', type: 'cultura', title: '¿Cuál es el océano más grande?', description: 'Responde en el chat', answer: 'pacifico', hints: ['pacífico'], timeLimit: 15, points: 10 },
  { id: 'c9', type: 'cultura', title: '¿En qué año comenzó la Segunda Guerra Mundial?', description: 'Responde en el chat', answer: '1939', timeLimit: 20, points: 10 },
  { id: 'c10', type: 'cultura', title: '¿Cuál es la montaña más alta del mundo?', description: 'Responde en el chat', answer: 'everest', hints: ['monte everest'], timeLimit: 20, points: 10 },
  { id: 'c11', type: 'cultura', title: '¿Quién fue el primer hombre en pisar la Luna?', description: 'Responde en el chat', answer: 'armstrong', hints: ['neil armstrong'], timeLimit: 20, points: 10 },
  { id: 'c12', type: 'cultura', title: '¿Cuál es el país más grande del mundo?', description: 'Responde en el chat', answer: 'rusia', hints: ['russia'], timeLimit: 15, points: 10 },
  { id: 'c13', type: 'cultura', title: '¿Quién pintó La Noche Estrellada?', description: 'Responde en el chat', answer: 'van gogh', hints: ['vangogh', 'vincent'], timeLimit: 20, points: 10 },
  { id: 'c14', type: 'cultura', title: '¿Cuál es la capital de Australia?', description: 'Responde en el chat', answer: 'canberra', timeLimit: 20, points: 10 },
  { id: 'c15', type: 'cultura', title: '¿Qué instrumento tocaba Mozart?', description: 'Responde en el chat', answer: 'piano', hints: ['clavicordio'], timeLimit: 20, points: 10 },
  
  // ========== RAPIDEZ (10 pruebas) ==========
  { id: 'r1', type: 'rapidez', title: 'Escribe 5 países que empiecen por "A"', description: 'El primero en escribir 5 correctos gana', timeLimit: 30, points: 20 },
  { id: 'r2', type: 'rapidez', title: 'Escribe 3 colores en inglés', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'r3', type: 'rapidez', title: 'Escribe el nombre de 4 frutas', description: 'El primero en escribir 4 correctas gana', timeLimit: 25, points: 15 },
  { id: 'r4', type: 'rapidez', title: 'Escribe 3 capitales europeas', description: 'El primero en escribir 3 correctas gana', timeLimit: 25, points: 15 },
  { id: 'r5', type: 'rapidez', title: 'Escribe 4 animales que vuelen', description: 'El primero en escribir 4 correctos gana', timeLimit: 25, points: 15 },
  { id: 'r6', type: 'rapidez', title: 'Escribe 3 marcas de coches', description: 'El primero en escribir 3 correctas gana', timeLimit: 20, points: 15 },
  { id: 'r7', type: 'rapidez', title: 'Escribe 5 números primos', description: 'El primero en escribir 5 correctos gana', timeLimit: 25, points: 15 },
  { id: 'r8', type: 'rapidez', title: 'Escribe 3 deportes olímpicos', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'r9', type: 'rapidez', title: 'Escribe 4 instrumentos musicales', description: 'El primero en escribir 4 correctos gana', timeLimit: 25, points: 15 },
  { id: 'r10', type: 'rapidez', title: 'Escribe 3 planetas del sistema solar', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
];

// Funciones de persistencia
const loadCustomChallenges = (): Challenge[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_CHALLENGES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveCustomChallenges = (challenges: Challenge[]): void => {
  localStorage.setItem(CUSTOM_CHALLENGES_KEY, JSON.stringify(challenges));
};

export const PartyCo: React.FC<PartyCoProps> = ({ chatMessages, isConnected = true }) => {
  // Estados del juego
  const [gameState, setGameState] = useState<'lobby' | 'rolling' | 'challenge' | 'results' | 'final'>('lobby');
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [diceValue, setDiceValue] = useState<number>(1);
  const [isRolling, setIsRolling] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [usedChallenges, setUsedChallenges] = useState<Set<string>>(new Set());
  
  // Configuración
  const [challenges, setChallenges] = useState<Challenge[]>([...DEFAULT_CHALLENGES]);
  const [customChallenges, setCustomChallenges] = useState<Challenge[]>([]);
  const [pointsToWin, setPointsToWin] = useState(50);
  const [timeMultiplier, setTimeMultiplier] = useState(1); // 0.5x, 1x, 1.5x, 2x
  const [maxPlayers, setMaxPlayers] = useState(0); // 0 = sin límite
  const [enabledTypes, setEnabledTypes] = useState<Set<ChallengeType>>(
    new Set(['trivia', 'mimica', 'dibujo', 'palabras', 'cultura', 'rapidez'])
  );
  
  // Editor de pruebas
  const [showEditor, setShowEditor] = useState(false);
  const [editType, setEditType] = useState<ChallengeType>('trivia');
  const [editTitle, setEditTitle] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editTime, setEditTime] = useState(30);
  const [editPoints, setEditPoints] = useState(10);
  
  // IA
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const diceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  const playersArray = [...players.values()];
  const sortedPlayers = playersArray.sort((a, b) => b.score - a.score);

  // Cargar pruebas personalizadas
  useEffect(() => {
    const custom = loadCustomChallenges();
    setCustomChallenges(custom);
    setChallenges([...DEFAULT_CHALLENGES, ...custom]);
  }, []);

  // Setup BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(() => {
    const state = {
      type: 'party_co_state',
      gameState,
      currentChallenge,
      timeLeft,
      diceValue,
      isRolling,
      winner,
      roundNumber,
      topPlayers: sortedPlayers.slice(0, 10),
      pointsToWin
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_PARTYCO, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('partyco', state).catch(() => {});
  }, [gameState, currentChallenge, timeLeft, diceValue, isRolling, winner, roundNumber, sortedPlayers, pointsToWin]);

  useEffect(() => {
    syncToOverlay();
  }, [syncToOverlay]);

  // Procesar mensajes del chat
  useEffect(() => {
    if (!isConnected) return;
    const newMessages = chatMessages.slice(lastProcessedRef.current);
    lastProcessedRef.current = chatMessages.length;

    newMessages.forEach((msg: TwitchMessage) => {
      const msgLower = msg.message.toLowerCase().trim();
      const oderId = msg.userId || msg.username;
      
      // Unirse al juego con !CO - permitido en lobby, rolling, challenge y results
      // Solo bloqueado en 'final' (cuando ya hay un ganador del juego completo)
      if (gameState !== 'final' && (msgLower === '!co' || msgLower === '!party' || msgLower === '!join')) {
        setPlayers(prev => {
          if (prev.has(oderId)) return prev;
          // Verificar límite de jugadores (0 = sin límite)
          if (maxPlayers > 0 && prev.size >= maxPlayers) return prev;
          const newPlayers = new Map(prev);
          newPlayers.set(oderId, {
            oderId,
            username: msg.username,
            color: msg.color || '#a970ff',
            score: 0,
            wins: 0,
            joinedAt: Date.now()
          });
          return newPlayers;
        });
      }
      
      // Responder durante una prueba
      if (gameState === 'challenge' && currentChallenge && !winner) {
        const answer = currentChallenge.answer?.toLowerCase();
        const hints = currentChallenge.hints?.map(h => h.toLowerCase()) || [];
        const allAnswers = answer ? [answer, ...hints] : [];
        
        // Verificar si la respuesta es correcta
        const isCorrect = allAnswers.some(ans => 
          msgLower.includes(ans) || ans.includes(msgLower)
        );
        
        if (isCorrect) {
          const player = players.get(oderId);
          if (player) {
            // ¡Ganador de la ronda!
            const updatedPlayer = {
              ...player,
              score: player.score + currentChallenge.points,
              wins: player.wins + 1
            };
            setPlayers(prev => {
              const newPlayers = new Map(prev);
              newPlayers.set(oderId, updatedPlayer);
              return newPlayers;
            });
            setWinner(updatedPlayer);
            
            // Verificar si ganó el juego
            if (updatedPlayer.score >= pointsToWin) {
              setTimeout(() => {
                setGameState('final');
                triggerGameEnd();
              }, 2000);
            } else {
              setTimeout(() => setGameState('results'), 2000);
            }
          }
        }
      }
    });
  }, [chatMessages, isConnected, gameState, currentChallenge, winner, players, pointsToWin, maxPlayers]);

  // Timer de la prueba
  useEffect(() => {
    if (gameState !== 'challenge') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Tiempo agotado sin ganador
          if (!winner) {
            setGameState('results');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, winner]);

  // Lanzar dado
  const rollDice = () => {
    if (players.size < 1) return;
    
    setIsRolling(true);
    setGameState('rolling');
    // OBS Trigger: Game start
    triggerGameStart();
    
    // Animación del dado
    let rolls = 0;
    diceIntervalRef.current = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      rolls++;
      
      if (rolls >= 15) {
        clearInterval(diceIntervalRef.current!);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalValue);
        setIsRolling(false);
        
        // Seleccionar prueba según el dado
        setTimeout(() => selectChallenge(finalValue), 500);
      }
    }, 100);
  };

  // Seleccionar prueba basada en el dado
  const selectChallenge = (diceResult: number) => {
    const types: ChallengeType[] = ['trivia', 'mimica', 'dibujo', 'palabras', 'cultura', 'rapidez'];
    const selectedType = types[(diceResult - 1) % types.length];
    
    // Filtrar pruebas disponibles del tipo seleccionado
    const availableChallenges = challenges.filter(c => 
      c.type === selectedType && 
      enabledTypes.has(c.type) &&
      !usedChallenges.has(c.id)
    );
    
    if (availableChallenges.length === 0) {
      // Si no hay pruebas del tipo, resetear usadas y buscar cualquiera
      setUsedChallenges(new Set());
      const anyChallenge = challenges.filter(c => enabledTypes.has(c.type));
      if (anyChallenge.length > 0) {
        const random = anyChallenge[Math.floor(Math.random() * anyChallenge.length)];
        startChallenge(random);
      }
      return;
    }
    
    const randomChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
    startChallenge(randomChallenge);
  };

  const startChallenge = (challenge: Challenge) => {
    setCurrentChallenge(challenge);
    setTimeLeft(Math.round(challenge.timeLimit * timeMultiplier));
    setWinner(null);
    setRoundNumber(prev => prev + 1);
    setUsedChallenges(prev => new Set([...prev, challenge.id]));
    setGameState('challenge');
  };

  const nextRound = () => {
    setCurrentChallenge(null);
    setWinner(null);
    setGameState('lobby');
  };

  const resetGame = () => {
    setGameState('lobby');
    setCurrentChallenge(null);
    setTimeLeft(0);
    setWinner(null);
    setRoundNumber(0);
    setUsedChallenges(new Set());
    if (timerRef.current) clearInterval(timerRef.current);
    if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
    // Note: Players are preserved - use clearPlayers() to reset them
  };

  const clearPlayers = () => {
    setPlayers(new Map());
  };

  const newGame = () => {
    // Full reset including players
    resetGame();
    clearPlayers();
    lastProcessedRef.current = chatMessages.length; // Reset to start fresh
  };

  const toggleChallengeType = (type: ChallengeType) => {
    setEnabledTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        if (newSet.size > 1) newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const addCustomChallenge = () => {
    if (!editTitle.trim()) return;
    
    const newChallenge: Challenge = {
      id: `custom_${Date.now()}`,
      type: editType,
      title: editTitle,
      description: editType === 'mimica' || editType === 'dibujo' || editType === 'palabras' 
        ? 'El streamer actúa, el chat adivina' 
        : 'Responde en el chat',
      answer: editAnswer.toLowerCase() || undefined,
      timeLimit: editTime,
      points: editPoints
    };
    
    const updated = [...customChallenges, newChallenge];
    setCustomChallenges(updated);
    setChallenges([...DEFAULT_CHALLENGES, ...updated]);
    saveCustomChallenges(updated);
    
    // Reset editor
    setEditTitle('');
    setEditAnswer('');
  };

  const removeCustomChallenge = (id: string) => {
    const updated = customChallenges.filter(c => c.id !== id);
    setCustomChallenges(updated);
    setChallenges([...DEFAULT_CHALLENGES, ...updated]);
    saveCustomChallenges(updated);
  };

  // Generar pruebas con IA
  const generateWithAI = async () => {
    const config = loadAIConfig();
    const providerInfo = config ? getProviderForFunction(config, 'games') : null;
    
    if (!providerInfo || !aiTopic.trim()) return;
    
    setIsGenerating(true);
    const { provider, apiKey } = providerInfo;
    
    const prompt = `Genera 5 pruebas variadas para un juego tipo Party & Co sobre "${aiTopic}".
Incluye diferentes tipos: trivia (preguntas), mimica (cosas para actuar), dibujo (cosas para dibujar), palabras (palabras para describir sin decirlas).
Responde SOLO con JSON:
{
  "challenges": [
    { "type": "trivia", "title": "¿Pregunta?", "answer": "respuesta", "timeLimit": 20, "points": 10 },
    { "type": "mimica", "title": "Imita: algo", "answer": "algo", "timeLimit": 45, "points": 15 },
    { "type": "dibujo", "title": "Dibuja: algo", "answer": "algo", "timeLimit": 60, "points": 15 },
    { "type": "palabras", "title": "Describe sin decir: PALABRA", "answer": "palabra", "timeLimit": 45, "points": 15 }
  ]
}`;

    try {
      let text = '';
      
      if (provider === 'gemini') {
        const model = localStorage.getItem('gemini_working_model') || 'gemini-2.0-flash-exp';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
            }),
          }
        );
        const data = await response.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
          }),
        });
        const data = await response.json();
        text = data.choices?.[0]?.message?.content || '';
      }
      
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.challenges) {
            const newChallenges: Challenge[] = parsed.challenges.map((c: any, i: number) => ({
              id: `ai_${Date.now()}_${i}`,
              type: c.type as ChallengeType,
              title: c.title,
              description: c.type === 'trivia' ? 'Responde en el chat' : 'El streamer actúa, el chat adivina',
              answer: c.answer?.toLowerCase(),
              timeLimit: c.timeLimit || 30,
              points: c.points || 10
            }));
            
            const updated = [...customChallenges, ...newChallenges];
            setCustomChallenges(updated);
            setChallenges([...DEFAULT_CHALLENGES, ...updated]);
            saveCustomChallenges(updated);
          }
        }
      }
    } catch (error) {
      console.error('AI generation error:', error);
    }
    setIsGenerating(false);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header con controles */}
      <div className="flex flex-wrap items-center gap-2">
        {gameState === 'lobby' && (
          <>
            <button
              onClick={rollDice}
              disabled={players.size < 1}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg transition-all"
            >
              <Dice6 size={18} />
              ¡Lanzar! ({players.size})
            </button>
            
            <div className="flex items-center gap-2">
              <label htmlFor="partyco-time-multiplier" className="text-zinc-400 text-xs">Tiempo:</label>
              <select
                id="partyco-time-multiplier"
                name="timeMultiplier"
                value={timeMultiplier}
                onChange={(e) => setTimeMultiplier(parseFloat(e.target.value))}
                className="px-2 py-1 bg-zinc-700 rounded text-white text-xs"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
              </select>
              
              <label htmlFor="partyco-points-to-win" className="text-zinc-400 text-xs">Meta:</label>
              <input
                id="partyco-points-to-win"
                name="pointsToWin"
                type="number"
                min="20"
                max="200"
                step="10"
                value={pointsToWin}
                onChange={(e) => setPointsToWin(Math.max(20, parseInt(e.target.value) || 50))}
                className="w-14 px-2 py-1 bg-zinc-700 rounded text-white text-center text-xs"
              />
              
              <label htmlFor="partyco-max-players" className="text-zinc-400 text-xs">Máx:</label>
              <select
                id="partyco-max-players"
                name="maxPlayers"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="px-2 py-1 bg-zinc-700 rounded text-white text-xs"
                title="Límite de jugadores (0 = sin límite)"
              >
                <option value={0}>∞</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </>
        )}
        
        {gameState === 'results' && (
          <button
            onClick={nextRound}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold rounded-lg transition-all"
          >
            <Dice6 size={18} />
            Siguiente
          </button>
        )}
        
        {gameState === 'final' && (
          <button
            onClick={newGame}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white font-bold rounded-lg transition-all"
          >
            <Trophy size={18} />
            Nueva Partida
          </button>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          {gameState === 'lobby' && players.size > 0 && (
            <button
              onClick={clearPlayers}
              className="p-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-all"
              title="Limpiar jugadores"
            >
              <Users size={18} />
            </button>
          )}
          <OBSOverlayUrl overlayParam="overlayPartyCo" title="el Party & Co" />
          <button
            onClick={newGame}
            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
            title="Reiniciar todo"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>
      {/* Estado: Lobby */}
      {gameState === 'lobby' && (
        <>
          <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
            <p className="text-zinc-300 mb-2">
              Escribe <span className="text-purple-400 font-bold">!CO</span>, <span className="text-purple-400 font-bold">!party</span> o <span className="text-purple-400 font-bold">!join</span> para unirte
            </p>
            <p className="text-zinc-500 text-xs">Puedes unirte en cualquier momento durante el juego</p>
          </div>
          
          {/* Tipos de prueba habilitados */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-sm font-medium text-zinc-300 mb-3">Tipos de prueba activos:</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CHALLENGE_NAMES) as ChallengeType[]).map(type => (
                <button
                  key={type}
                  onClick={() => toggleChallengeType(type)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    enabledTypes.has(type)
                      ? 'text-white'
                      : 'bg-zinc-700/50 text-zinc-500'
                  }`}
                  style={{ 
                    backgroundColor: enabledTypes.has(type) ? CHALLENGE_COLORS[type] : undefined 
                  }}
                >
                  {CHALLENGE_ICONS[type]}
                  {CHALLENGE_NAMES[type]}
                </button>
              ))}
            </div>
          </div>
          
          {/* Editor de pruebas personalizadas */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              <Plus size={16} />
              {showEditor ? 'Ocultar editor' : 'Añadir pruebas personalizadas'}
            </button>
            
            {showEditor && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <label htmlFor="partyco-edit-type" className="sr-only">Tipo de prueba</label>
                  <select
                    id="partyco-edit-type"
                    name="editType"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as ChallengeType)}
                    className="px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                    aria-label="Tipo de prueba"
                  >
                    {(Object.keys(CHALLENGE_NAMES) as ChallengeType[]).map(type => (
                      <option key={type} value={type}>{CHALLENGE_NAMES[type]}</option>
                    ))}
                  </select>
                  <label htmlFor="partyco-edit-title" className="sr-only">Título de la prueba</label>
                  <input
                    id="partyco-edit-title"
                    name="editTitle"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Título de la prueba..."
                    className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                  />
                </div>
                
                <div className="flex gap-2">
                  <label htmlFor="partyco-edit-answer" className="sr-only">Respuesta correcta</label>
                  <input
                    id="partyco-edit-answer"
                    name="editAnswer"
                    type="text"
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    placeholder="Respuesta correcta..."
                    className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                  />
                  <label htmlFor="partyco-edit-time" className="sr-only">Tiempo en segundos</label>
                  <input
                    id="partyco-edit-time"
                    name="editTime"
                    type="number"
                    value={editTime}
                    onChange={(e) => setEditTime(parseInt(e.target.value) || 30)}
                    className="w-16 px-2 py-2 bg-zinc-700 rounded-lg text-white text-sm text-center"
                    title="Tiempo (seg)"
                    aria-label="Tiempo en segundos"
                  />
                  <label htmlFor="partyco-edit-points" className="sr-only">Puntos</label>
                  <input
                    id="partyco-edit-points"
                    name="editPoints"
                    type="number"
                    value={editPoints}
                    onChange={(e) => setEditPoints(parseInt(e.target.value) || 10)}
                    className="w-16 px-2 py-2 bg-zinc-700 rounded-lg text-white text-sm text-center"
                    title="Puntos"
                    aria-label="Puntos"
                  />
                  <button
                    onClick={addCustomChallenge}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
                    aria-label="Añadir prueba"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* Generador IA */}
                <div className="flex gap-2 pt-2 border-t border-zinc-700">
                  <label htmlFor="partyco-ai-topic" className="sr-only">Tema para generar con IA</label>
                  <input
                    id="partyco-ai-topic"
                    name="aiTopic"
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Tema para generar con IA..."
                    className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={generateWithAI}
                    disabled={isGenerating || !aiTopic.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-sm"
                  >
                    <Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
                    {isGenerating ? 'Generando...' : 'Generar'}
                  </button>
                </div>
                
                {/* Lista de pruebas personalizadas */}
                {customChallenges.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {customChallenges.map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-xs bg-zinc-700/50 rounded px-2 py-1">
                        <span style={{ color: CHALLENGE_COLORS[c.type] }}>{CHALLENGE_ICONS[c.type]}</span>
                        <span className="flex-1 truncate text-zinc-300">{c.title}</span>
                        <button
                          onClick={() => removeCustomChallenge(c.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Estado: Lanzando dado */}
      {gameState === 'rolling' && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-8 text-center">
          <div className={`text-8xl mb-4 ${isRolling ? 'animate-bounce' : ''}`}>
            🎲
          </div>
          <div className="text-6xl font-bold text-white mb-2">
            {diceValue}
          </div>
          <p className="text-zinc-400">
            {isRolling ? 'Lanzando...' : `¡${CHALLENGE_NAMES[(Object.keys(CHALLENGE_NAMES) as ChallengeType[])[(diceValue - 1) % 6]]}!`}
          </p>
        </div>
      )}

      {/* Estado: Prueba activa */}
      {gameState === 'challenge' && currentChallenge && (
        <div 
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: `${CHALLENGE_COLORS[currentChallenge.type]}20` }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={{ color: CHALLENGE_COLORS[currentChallenge.type] }}>
                {CHALLENGE_ICONS[currentChallenge.type]}
              </span>
              <span className="text-sm font-medium" style={{ color: CHALLENGE_COLORS[currentChallenge.type] }}>
                {CHALLENGE_NAMES[currentChallenge.type]}
              </span>
              <span className="text-zinc-500 text-sm">• Ronda {roundNumber}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'
            }`}>
              <Timer size={16} className="text-white" />
              <span className="text-white font-bold">{timeLeft}s</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentChallenge.title}
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            {currentChallenge.description}
          </p>
          
          <div className="text-lg font-medium text-yellow-400">
            🏆 {currentChallenge.points} puntos
          </div>
          
          {winner && (
            <div className="mt-4 p-4 bg-green-500/20 rounded-lg animate-pulse">
              <Check size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-bold text-xl">
                ¡{winner.username} ha acertado!
              </p>
              <p className="text-green-300 text-sm">+{currentChallenge.points} puntos</p>
            </div>
          )}
        </div>
      )}

      {/* Estado: Resultados de ronda */}
      {gameState === 'results' && (
        <div className="bg-zinc-800/50 rounded-xl p-6 text-center">
          {winner ? (
            <>
              <Trophy size={48} className="text-yellow-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-1">
                ¡{winner.username} gana la ronda!
              </h2>
              <p className="text-zinc-400">
                Puntuación: <span className="text-purple-400 font-bold">{winner.score}</span> / {pointsToWin}
              </p>
            </>
          ) : (
            <>
              <X size={48} className="text-red-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-1">
                ¡Tiempo agotado!
              </h2>
              <p className="text-zinc-400">Nadie acertó esta ronda</p>
              {currentChallenge?.answer && (
                <p className="text-zinc-500 text-sm mt-2">
                  La respuesta era: <span className="text-white">{currentChallenge.answer}</span>
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Estado: Final del juego */}
      {gameState === 'final' && winner && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-8 text-center">
          <Crown size={64} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-2">
            🎉 ¡{winner.username} GANA! 🎉
          </h2>
          <p className="text-yellow-400 text-xl font-bold mb-4">
            {winner.score} puntos
          </p>
          <p className="text-zinc-400">
            {winner.wins} pruebas ganadas en {roundNumber} rondas
          </p>
        </div>
      )}

      {/* Tabla de jugadores */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">
            Jugadores ({players.size})
          </span>
        </div>
        
        {players.size === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            Esperando jugadores... (!CO, !party o !join para unirse)
          </p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.oderId}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  index === 0 && player.score > 0 ? 'bg-yellow-500/10' : 'bg-zinc-700/30'
                }`}
              >
                <span className="text-zinc-500 text-sm w-6">
                  {index === 0 && player.score > 0 ? '👑' : `#${index + 1}`}
                </span>
                <span 
                  className="flex-1 font-medium truncate"
                  style={{ color: player.color }}
                >
                  {player.username}
                </span>
                <span className="text-purple-400 font-bold">
                  {player.score} pts
                </span>
                <span className="text-zinc-500 text-xs">
                  ({player.wins} wins)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default PartyCo;
