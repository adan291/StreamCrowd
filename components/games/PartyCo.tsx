import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { 
  Play, Trophy, RotateCcw, Users, Pause,
  Check, X, Timer, Sparkles, MessageCircle, Eye, Pencil, 
  Brain, Zap, Crown, Plus, Trash2, Settings, SkipForward, Ban
} from 'lucide-react';
import { loadAIConfig, getProviderForFunction } from '../../src/application/services/AnalyticsService';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { useGameSync } from '../../src/application/hooks/useGameSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

// Tipos de pruebas del Party & Co
type ChallengeType = 'trivia' | 'mimica' | 'dibujo' | 'tabu' | 'rapidez';

interface TabuChallenge {
  word: string;
  forbidden: string[]; // Palabras prohibidas
}

interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  answer?: string;
  hints?: string[];
  forbidden?: string[]; // Para Tabú
  timeLimit: number;
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
  tabu: <Ban size={20} />,
  rapidez: <Zap size={20} />,
};

const CHALLENGE_COLORS: Record<ChallengeType, string> = {
  trivia: '#8b5cf6',    // Violeta
  mimica: '#f97316',    // Naranja
  dibujo: '#22c55e',    // Verde
  tabu: '#3b82f6',      // Azul
  rapidez: '#ef4444',   // Rojo
};

const CHALLENGE_NAMES: Record<ChallengeType, string> = {
  trivia: 'Memoria',
  mimica: 'Mímica',
  dibujo: 'Dibujo',
  tabu: 'Tabú',
  rapidez: 'Rapidez',
};

// Sistema de contador de uso de pruebas
const CHALLENGE_USAGE_KEY = 'party_co_challenge_usage';

interface ChallengeUsage {
  [challengeId: string]: number;
}

const loadChallengeUsage = (): ChallengeUsage => {
  try {
    const saved = localStorage.getItem(CHALLENGE_USAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveChallengeUsage = (usage: ChallengeUsage): void => {
  localStorage.setItem(CHALLENGE_USAGE_KEY, JSON.stringify(usage));
};

const incrementChallengeUsage = (challengeId: string): void => {
  const usage = loadChallengeUsage();
  usage[challengeId] = (usage[challengeId] || 0) + 1;
  saveChallengeUsage(usage);
};

const sortChallengesByUsage = (challenges: Challenge[]): Challenge[] => {
  const usage = loadChallengeUsage();
  return [...challenges].sort((a, b) => {
    const usageA = usage[a.id] || 0;
    const usageB = usage[b.id] || 0;
    if (usageA !== usageB) return usageA - usageB;
    return Math.random() - 0.5;
  });
};


// ========== BANCO DE PRUEBAS MEJORADO ==========

// MEMORIA - Preguntas variadas (30)
const TRIVIA_CHALLENGES: Challenge[] = [
  { id: 'tr1', type: 'trivia', title: '¿Cuál es el planeta más cercano al Sol?', description: 'Responde en el chat', answer: 'mercurio', timeLimit: 20, points: 10 },
  { id: 'tr2', type: 'trivia', title: '¿En qué año cayó el Muro de Berlín?', description: 'Responde en el chat', answer: '1989', timeLimit: 20, points: 10 },
  { id: 'tr3', type: 'trivia', title: '¿Cuántos jugadores hay en un equipo de fútbol?', description: 'Responde en el chat', answer: '11', hints: ['once'], timeLimit: 15, points: 10 },
  { id: 'tr4', type: 'trivia', title: '¿Cuál es el hueso más largo del cuerpo?', description: 'Responde en el chat', answer: 'femur', hints: ['fémur'], timeLimit: 20, points: 10 },
  { id: 'tr5', type: 'trivia', title: '¿Cuántos corazones tiene un pulpo?', description: 'Responde en el chat', answer: '3', hints: ['tres'], timeLimit: 20, points: 10 },
  { id: 'tr6', type: 'trivia', title: '¿En qué año se hundió el Titanic?', description: 'Responde en el chat', answer: '1912', timeLimit: 20, points: 10 },
  { id: 'tr7', type: 'trivia', title: '¿Cuál es el animal terrestre más rápido?', description: 'Responde en el chat', answer: 'guepardo', hints: ['cheetah'], timeLimit: 20, points: 10 },
  { id: 'tr8', type: 'trivia', title: '¿Qué planeta es el más grande del sistema solar?', description: 'Responde en el chat', answer: 'jupiter', hints: ['júpiter'], timeLimit: 15, points: 10 },
  { id: 'tr9', type: 'trivia', title: '¿Cuántas patas tiene una araña?', description: 'Responde en el chat', answer: '8', hints: ['ocho'], timeLimit: 15, points: 10 },
  { id: 'tr10', type: 'trivia', title: '¿Cuál es el videojuego más vendido de la historia?', description: 'Responde en el chat', answer: 'minecraft', timeLimit: 20, points: 10 },
  { id: 'tr11', type: 'trivia', title: '¿En qué año se lanzó el primer iPhone?', description: 'Responde en el chat', answer: '2007', timeLimit: 20, points: 10 },
  { id: 'tr12', type: 'trivia', title: '¿Qué empresa creó PlayStation?', description: 'Responde en el chat', answer: 'sony', timeLimit: 15, points: 10 },
  { id: 'tr13', type: 'trivia', title: '¿Cuántos Balones de Oro tiene Messi?', description: 'Responde en el chat', answer: '8', hints: ['ocho'], timeLimit: 20, points: 10 },
  { id: 'tr14', type: 'trivia', title: '¿Qué animal es Sonic?', description: 'Responde en el chat', answer: 'erizo', hints: ['hedgehog'], timeLimit: 15, points: 10 },
  { id: 'tr15', type: 'trivia', title: '¿Cuántos Pokemon había en la primera generación?', description: 'Responde en el chat', answer: '151', timeLimit: 20, points: 10 },
  { id: 'tr16', type: 'trivia', title: '¿Quién pintó La Mona Lisa?', description: 'Responde en el chat', answer: 'leonardo', hints: ['da vinci'], timeLimit: 20, points: 10 },
  { id: 'tr17', type: 'trivia', title: '¿Cuál es la capital de Japón?', description: 'Responde en el chat', answer: 'tokio', hints: ['tokyo'], timeLimit: 15, points: 10 },
  { id: 'tr18', type: 'trivia', title: '¿Quién escribió Don Quijote?', description: 'Responde en el chat', answer: 'cervantes', timeLimit: 20, points: 10 },
  { id: 'tr19', type: 'trivia', title: '¿Cuál es el océano más grande?', description: 'Responde en el chat', answer: 'pacifico', hints: ['pacífico'], timeLimit: 15, points: 10 },
  { id: 'tr20', type: 'trivia', title: '¿Cuál es la montaña más alta del mundo?', description: 'Responde en el chat', answer: 'everest', timeLimit: 20, points: 10 },
  { id: 'tr21', type: 'trivia', title: '¿Quién fue el primer hombre en la Luna?', description: 'Responde en el chat', answer: 'armstrong', hints: ['neil'], timeLimit: 20, points: 10 },
  { id: 'tr22', type: 'trivia', title: '¿Cuál es el país más grande del mundo?', description: 'Responde en el chat', answer: 'rusia', timeLimit: 15, points: 10 },
  { id: 'tr23', type: 'trivia', title: '¿Qué gas necesitan las plantas para la fotosíntesis?', description: 'Responde en el chat', answer: 'co2', hints: ['dioxido de carbono', 'carbono'], timeLimit: 20, points: 10 },
  { id: 'tr24', type: 'trivia', title: '¿Cuántos Harry Potter hay?', description: 'Responde en el chat', answer: '7', hints: ['siete'], timeLimit: 15, points: 10 },
  { id: 'tr25', type: 'trivia', title: '¿Qué personaje de Nintendo usa un gorro rojo?', description: 'Responde en el chat', answer: 'mario', timeLimit: 15, points: 10 },
  { id: 'tr26', type: 'trivia', title: '¿En qué año comenzó la Segunda Guerra Mundial?', description: 'Responde en el chat', answer: '1939', timeLimit: 20, points: 10 },
  { id: 'tr27', type: 'trivia', title: '¿Cuál es el río más largo del mundo?', description: 'Responde en el chat', answer: 'nilo', hints: ['amazonas'], timeLimit: 20, points: 10 },
  { id: 'tr28', type: 'trivia', title: '¿Qué elemento químico tiene el símbolo Au?', description: 'Responde en el chat', answer: 'oro', timeLimit: 20, points: 10 },
  { id: 'tr29', type: 'trivia', title: '¿Cuántos dientes tiene un adulto?', description: 'Responde en el chat', answer: '32', timeLimit: 15, points: 10 },
  { id: 'tr30', type: 'trivia', title: '¿Qué compañía creó Fortnite?', description: 'Responde en el chat', answer: 'epic', hints: ['epic games'], timeLimit: 20, points: 10 },
];


// MÍMICA - Cosas para actuar (40)
const MIMICA_CHALLENGES: Challenge[] = [
  // Animales
  { id: 'mi1', type: 'mimica', title: 'Imita: Un pingüino', description: 'Actúa sin hablar', answer: 'pinguino', hints: ['pingüino'], timeLimit: 45, points: 15 },
  { id: 'mi2', type: 'mimica', title: 'Imita: Un mono', description: 'Actúa sin hablar', answer: 'mono', hints: ['gorila', 'simio'], timeLimit: 45, points: 15 },
  { id: 'mi3', type: 'mimica', title: 'Imita: Un gato', description: 'Actúa sin hablar', answer: 'gato', hints: ['gatito'], timeLimit: 45, points: 15 },
  { id: 'mi4', type: 'mimica', title: 'Imita: Una serpiente', description: 'Actúa sin hablar', answer: 'serpiente', hints: ['culebra'], timeLimit: 45, points: 15 },
  { id: 'mi5', type: 'mimica', title: 'Imita: Un elefante', description: 'Actúa sin hablar', answer: 'elefante', timeLimit: 45, points: 15 },
  { id: 'mi6', type: 'mimica', title: 'Imita: Un canguro', description: 'Actúa sin hablar', answer: 'canguro', timeLimit: 45, points: 15 },
  { id: 'mi7', type: 'mimica', title: 'Imita: Un pájaro', description: 'Actúa sin hablar', answer: 'pajaro', hints: ['ave'], timeLimit: 45, points: 15 },
  { id: 'mi8', type: 'mimica', title: 'Imita: Un perro', description: 'Actúa sin hablar', answer: 'perro', timeLimit: 45, points: 15 },
  // Profesiones
  { id: 'mi9', type: 'mimica', title: 'Imita: Un chef cocinando', description: 'Actúa sin hablar', answer: 'chef', hints: ['cocinero', 'cocinar'], timeLimit: 45, points: 15 },
  { id: 'mi10', type: 'mimica', title: 'Imita: Un médico', description: 'Actúa sin hablar', answer: 'medico', hints: ['doctor'], timeLimit: 45, points: 15 },
  { id: 'mi11', type: 'mimica', title: 'Imita: Un bombero', description: 'Actúa sin hablar', answer: 'bombero', timeLimit: 45, points: 15 },
  { id: 'mi12', type: 'mimica', title: 'Imita: Un policía', description: 'Actúa sin hablar', answer: 'policia', timeLimit: 45, points: 15 },
  { id: 'mi13', type: 'mimica', title: 'Imita: Un DJ', description: 'Actúa sin hablar', answer: 'dj', hints: ['disc jockey'], timeLimit: 45, points: 15 },
  { id: 'mi14', type: 'mimica', title: 'Imita: Un cantante', description: 'Actúa sin hablar', answer: 'cantante', hints: ['cantar'], timeLimit: 45, points: 15 },
  // Acciones
  { id: 'mi15', type: 'mimica', title: 'Imita: Alguien nadando', description: 'Actúa sin hablar', answer: 'nadar', hints: ['nadando'], timeLimit: 45, points: 15 },
  { id: 'mi16', type: 'mimica', title: 'Imita: Alguien durmiendo', description: 'Actúa sin hablar', answer: 'dormir', hints: ['durmiendo'], timeLimit: 45, points: 15 },
  { id: 'mi17', type: 'mimica', title: 'Imita: Alguien con mucho frío', description: 'Actúa sin hablar', answer: 'frio', hints: ['congelado'], timeLimit: 45, points: 15 },
  { id: 'mi18', type: 'mimica', title: 'Imita: Alguien llorando', description: 'Actúa sin hablar', answer: 'llorar', hints: ['llorando'], timeLimit: 45, points: 15 },
  { id: 'mi19', type: 'mimica', title: 'Imita: Alguien estornudando', description: 'Actúa sin hablar', answer: 'estornudar', hints: ['estornudo'], timeLimit: 45, points: 15 },
  { id: 'mi20', type: 'mimica', title: 'Imita: Alguien haciendo yoga', description: 'Actúa sin hablar', answer: 'yoga', hints: ['meditando'], timeLimit: 45, points: 15 },
  { id: 'mi21', type: 'mimica', title: 'Imita: Alguien boxeando', description: 'Actúa sin hablar', answer: 'boxeo', hints: ['boxear'], timeLimit: 45, points: 15 },
  { id: 'mi22', type: 'mimica', title: 'Imita: Alguien pescando', description: 'Actúa sin hablar', answer: 'pescar', hints: ['pescando'], timeLimit: 45, points: 15 },
  // Personajes
  { id: 'mi23', type: 'mimica', title: 'Imita: Un zombie', description: 'Actúa sin hablar', answer: 'zombie', hints: ['zombi'], timeLimit: 45, points: 15 },
  { id: 'mi24', type: 'mimica', title: 'Imita: Un robot', description: 'Actúa sin hablar', answer: 'robot', timeLimit: 45, points: 15 },
  { id: 'mi25', type: 'mimica', title: 'Imita: Un astronauta', description: 'Actúa sin hablar', answer: 'astronauta', timeLimit: 45, points: 15 },
  { id: 'mi26', type: 'mimica', title: 'Imita: Un ninja', description: 'Actúa sin hablar', answer: 'ninja', timeLimit: 45, points: 15 },
  { id: 'mi27', type: 'mimica', title: 'Imita: Un superhéroe volando', description: 'Actúa sin hablar', answer: 'superheroe', hints: ['superman', 'volar'], timeLimit: 45, points: 15 },
  { id: 'mi28', type: 'mimica', title: 'Imita: Un pirata', description: 'Actúa sin hablar', answer: 'pirata', timeLimit: 45, points: 15 },
  { id: 'mi29', type: 'mimica', title: 'Imita: Un vaquero', description: 'Actúa sin hablar', answer: 'vaquero', hints: ['cowboy'], timeLimit: 45, points: 15 },
  { id: 'mi30', type: 'mimica', title: 'Imita: Un fantasma', description: 'Actúa sin hablar', answer: 'fantasma', timeLimit: 45, points: 15 },
  // Videojuegos
  { id: 'mi31', type: 'mimica', title: 'Imita: Mario saltando', description: 'Actúa sin hablar', answer: 'mario', hints: ['super mario'], timeLimit: 45, points: 15 },
  { id: 'mi32', type: 'mimica', title: 'Imita: Sonic corriendo', description: 'Actúa sin hablar', answer: 'sonic', timeLimit: 45, points: 15 },
  { id: 'mi33', type: 'mimica', title: 'Imita: Un gamer jugando', description: 'Actúa sin hablar', answer: 'gamer', hints: ['videojuego'], timeLimit: 45, points: 15 },
  { id: 'mi34', type: 'mimica', title: 'Imita: Baile de Fortnite', description: 'Actúa sin hablar', answer: 'fortnite', hints: ['baile', 'floss'], timeLimit: 45, points: 15 },
  { id: 'mi35', type: 'mimica', title: 'Imita: Minecraft picando', description: 'Actúa sin hablar', answer: 'minecraft', hints: ['picar', 'minar'], timeLimit: 45, points: 15 },
  { id: 'mi36', type: 'mimica', title: 'Imita: Un bebé', description: 'Actúa sin hablar', answer: 'bebe', hints: ['bebé'], timeLimit: 45, points: 15 },
  { id: 'mi37', type: 'mimica', title: 'Imita: Un mago', description: 'Actúa sin hablar', answer: 'mago', hints: ['magia'], timeLimit: 45, points: 15 },
  { id: 'mi38', type: 'mimica', title: 'Imita: Darth Vader', description: 'Actúa sin hablar', answer: 'darth vader', hints: ['vader', 'star wars'], timeLimit: 45, points: 15 },
  { id: 'mi39', type: 'mimica', title: 'Imita: Un futbolista celebrando gol', description: 'Actúa sin hablar', answer: 'futbolista', hints: ['gol', 'futbol'], timeLimit: 45, points: 15 },
  { id: 'mi40', type: 'mimica', title: 'Imita: Un borracho', description: 'Actúa sin hablar', answer: 'borracho', hints: ['ebrio'], timeLimit: 45, points: 15 },
];


// DIBUJO - Cosas para dibujar (40)
const DIBUJO_CHALLENGES: Challenge[] = [
  // Objetos
  { id: 'di1', type: 'dibujo', title: 'Dibuja: Una pizza', description: 'Dibuja en la pizarra', answer: 'pizza', timeLimit: 60, points: 15 },
  { id: 'di2', type: 'dibujo', title: 'Dibuja: Un cohete', description: 'Dibuja en la pizarra', answer: 'cohete', hints: ['nave'], timeLimit: 60, points: 15 },
  { id: 'di3', type: 'dibujo', title: 'Dibuja: Una casa', description: 'Dibuja en la pizarra', answer: 'casa', timeLimit: 60, points: 15 },
  { id: 'di4', type: 'dibujo', title: 'Dibuja: Un coche', description: 'Dibuja en la pizarra', answer: 'coche', hints: ['carro', 'auto'], timeLimit: 60, points: 15 },
  { id: 'di5', type: 'dibujo', title: 'Dibuja: Una guitarra', description: 'Dibuja en la pizarra', answer: 'guitarra', timeLimit: 60, points: 15 },
  { id: 'di6', type: 'dibujo', title: 'Dibuja: Un avión', description: 'Dibuja en la pizarra', answer: 'avion', hints: ['avión'], timeLimit: 60, points: 15 },
  { id: 'di7', type: 'dibujo', title: 'Dibuja: Una bicicleta', description: 'Dibuja en la pizarra', answer: 'bicicleta', hints: ['bici'], timeLimit: 60, points: 15 },
  { id: 'di8', type: 'dibujo', title: 'Dibuja: Un reloj', description: 'Dibuja en la pizarra', answer: 'reloj', timeLimit: 60, points: 15 },
  { id: 'di9', type: 'dibujo', title: 'Dibuja: Un teléfono', description: 'Dibuja en la pizarra', answer: 'telefono', hints: ['movil', 'celular'], timeLimit: 60, points: 15 },
  { id: 'di10', type: 'dibujo', title: 'Dibuja: Una televisión', description: 'Dibuja en la pizarra', answer: 'television', hints: ['tele', 'tv'], timeLimit: 60, points: 15 },
  // Animales
  { id: 'di11', type: 'dibujo', title: 'Dibuja: Un gato', description: 'Dibuja en la pizarra', answer: 'gato', timeLimit: 60, points: 15 },
  { id: 'di12', type: 'dibujo', title: 'Dibuja: Un elefante', description: 'Dibuja en la pizarra', answer: 'elefante', timeLimit: 60, points: 15 },
  { id: 'di13', type: 'dibujo', title: 'Dibuja: Un dinosaurio', description: 'Dibuja en la pizarra', answer: 'dinosaurio', hints: ['dino'], timeLimit: 60, points: 15 },
  { id: 'di14', type: 'dibujo', title: 'Dibuja: Un tiburón', description: 'Dibuja en la pizarra', answer: 'tiburon', timeLimit: 60, points: 15 },
  { id: 'di15', type: 'dibujo', title: 'Dibuja: Una mariposa', description: 'Dibuja en la pizarra', answer: 'mariposa', timeLimit: 60, points: 15 },
  { id: 'di16', type: 'dibujo', title: 'Dibuja: Un león', description: 'Dibuja en la pizarra', answer: 'leon', timeLimit: 60, points: 15 },
  { id: 'di17', type: 'dibujo', title: 'Dibuja: Un pulpo', description: 'Dibuja en la pizarra', answer: 'pulpo', timeLimit: 60, points: 15 },
  { id: 'di18', type: 'dibujo', title: 'Dibuja: Un pingüino', description: 'Dibuja en la pizarra', answer: 'pinguino', timeLimit: 60, points: 15 },
  { id: 'di19', type: 'dibujo', title: 'Dibuja: Un dragón', description: 'Dibuja en la pizarra', answer: 'dragon', timeLimit: 60, points: 15 },
  { id: 'di20', type: 'dibujo', title: 'Dibuja: Una araña', description: 'Dibuja en la pizarra', answer: 'araña', hints: ['arana'], timeLimit: 60, points: 15 },
  // Comida
  { id: 'di21', type: 'dibujo', title: 'Dibuja: Una hamburguesa', description: 'Dibuja en la pizarra', answer: 'hamburguesa', hints: ['burger'], timeLimit: 60, points: 15 },
  { id: 'di22', type: 'dibujo', title: 'Dibuja: Un helado', description: 'Dibuja en la pizarra', answer: 'helado', timeLimit: 60, points: 15 },
  { id: 'di23', type: 'dibujo', title: 'Dibuja: Un taco', description: 'Dibuja en la pizarra', answer: 'taco', timeLimit: 60, points: 15 },
  { id: 'di24', type: 'dibujo', title: 'Dibuja: Un pastel', description: 'Dibuja en la pizarra', answer: 'pastel', hints: ['tarta', 'torta'], timeLimit: 60, points: 15 },
  { id: 'di25', type: 'dibujo', title: 'Dibuja: Una manzana', description: 'Dibuja en la pizarra', answer: 'manzana', timeLimit: 45, points: 10 },
  // Lugares
  { id: 'di26', type: 'dibujo', title: 'Dibuja: La Torre Eiffel', description: 'Dibuja en la pizarra', answer: 'torre eiffel', hints: ['eiffel', 'paris'], timeLimit: 60, points: 15 },
  { id: 'di27', type: 'dibujo', title: 'Dibuja: Una pirámide', description: 'Dibuja en la pizarra', answer: 'piramide', hints: ['egipto'], timeLimit: 60, points: 15 },
  { id: 'di28', type: 'dibujo', title: 'Dibuja: Un castillo', description: 'Dibuja en la pizarra', answer: 'castillo', timeLimit: 60, points: 15 },
  { id: 'di29', type: 'dibujo', title: 'Dibuja: Una playa', description: 'Dibuja en la pizarra', answer: 'playa', hints: ['mar'], timeLimit: 60, points: 15 },
  { id: 'di30', type: 'dibujo', title: 'Dibuja: Una montaña', description: 'Dibuja en la pizarra', answer: 'montaña', hints: ['montana'], timeLimit: 60, points: 15 },
  // Videojuegos/Personajes
  { id: 'di31', type: 'dibujo', title: 'Dibuja: Un Creeper', description: 'Dibuja en la pizarra', answer: 'creeper', hints: ['minecraft'], timeLimit: 60, points: 15 },
  { id: 'di32', type: 'dibujo', title: 'Dibuja: Pikachu', description: 'Dibuja en la pizarra', answer: 'pikachu', hints: ['pokemon'], timeLimit: 60, points: 15 },
  { id: 'di33', type: 'dibujo', title: 'Dibuja: Among Us', description: 'Dibuja en la pizarra', answer: 'among us', hints: ['impostor'], timeLimit: 60, points: 15 },
  { id: 'di34', type: 'dibujo', title: 'Dibuja: Mario', description: 'Dibuja en la pizarra', answer: 'mario', hints: ['nintendo'], timeLimit: 60, points: 15 },
  { id: 'di35', type: 'dibujo', title: 'Dibuja: Un corazón', description: 'Dibuja en la pizarra', answer: 'corazon', timeLimit: 45, points: 10 },
  { id: 'di36', type: 'dibujo', title: 'Dibuja: Una estrella', description: 'Dibuja en la pizarra', answer: 'estrella', timeLimit: 45, points: 10 },
  { id: 'di37', type: 'dibujo', title: 'Dibuja: Un fantasma', description: 'Dibuja en la pizarra', answer: 'fantasma', timeLimit: 60, points: 15 },
  { id: 'di38', type: 'dibujo', title: 'Dibuja: Un árbol', description: 'Dibuja en la pizarra', answer: 'arbol', timeLimit: 45, points: 10 },
  { id: 'di39', type: 'dibujo', title: 'Dibuja: Un sol', description: 'Dibuja en la pizarra', answer: 'sol', timeLimit: 45, points: 10 },
  { id: 'di40', type: 'dibujo', title: 'Dibuja: Una flor', description: 'Dibuja en la pizarra', answer: 'flor', timeLimit: 45, points: 10 },
];


// TABÚ - Palabras con palabras prohibidas (40)
const TABU_CHALLENGES: Challenge[] = [
  // Lugares
  { id: 'ta1', type: 'tabu', title: 'PLAYA', description: 'Describe sin usar las palabras prohibidas', answer: 'playa', forbidden: ['mar', 'arena', 'sol', 'agua', 'costa'], timeLimit: 60, points: 20 },
  { id: 'ta2', type: 'tabu', title: 'HOSPITAL', description: 'Describe sin usar las palabras prohibidas', answer: 'hospital', forbidden: ['médico', 'doctor', 'enfermo', 'salud', 'cama'], timeLimit: 60, points: 20 },
  { id: 'ta3', type: 'tabu', title: 'AEROPUERTO', description: 'Describe sin usar las palabras prohibidas', answer: 'aeropuerto', forbidden: ['avión', 'volar', 'viaje', 'maleta', 'vuelo'], timeLimit: 60, points: 20 },
  { id: 'ta4', type: 'tabu', title: 'SUPERMERCADO', description: 'Describe sin usar las palabras prohibidas', answer: 'supermercado', forbidden: ['comprar', 'tienda', 'comida', 'carrito', 'productos'], timeLimit: 60, points: 20 },
  { id: 'ta5', type: 'tabu', title: 'GIMNASIO', description: 'Describe sin usar las palabras prohibidas', answer: 'gimnasio', forbidden: ['ejercicio', 'pesas', 'deporte', 'músculo', 'entrenar'], timeLimit: 60, points: 20 },
  { id: 'ta6', type: 'tabu', title: 'CINE', description: 'Describe sin usar las palabras prohibidas', answer: 'cine', forbidden: ['película', 'pantalla', 'palomitas', 'butaca', 'ver'], timeLimit: 60, points: 20 },
  { id: 'ta7', type: 'tabu', title: 'BIBLIOTECA', description: 'Describe sin usar las palabras prohibidas', answer: 'biblioteca', forbidden: ['libro', 'leer', 'silencio', 'estudio', 'estantería'], timeLimit: 60, points: 20 },
  { id: 'ta8', type: 'tabu', title: 'RESTAURANTE', description: 'Describe sin usar las palabras prohibidas', answer: 'restaurante', forbidden: ['comer', 'comida', 'mesa', 'camarero', 'menú'], timeLimit: 60, points: 20 },
  { id: 'ta9', type: 'tabu', title: 'ESTADIO', description: 'Describe sin usar las palabras prohibidas', answer: 'estadio', forbidden: ['fútbol', 'partido', 'gradas', 'equipo', 'deporte'], timeLimit: 60, points: 20 },
  { id: 'ta10', type: 'tabu', title: 'DISCOTECA', description: 'Describe sin usar las palabras prohibidas', answer: 'discoteca', forbidden: ['bailar', 'música', 'fiesta', 'noche', 'DJ'], timeLimit: 60, points: 20 },
  // Tecnología
  { id: 'ta11', type: 'tabu', title: 'ORDENADOR', description: 'Describe sin usar las palabras prohibidas', answer: 'ordenador', forbidden: ['pantalla', 'teclado', 'ratón', 'internet', 'programa'], timeLimit: 60, points: 20 },
  { id: 'ta12', type: 'tabu', title: 'TELÉFONO', description: 'Describe sin usar las palabras prohibidas', answer: 'telefono', forbidden: ['llamar', 'móvil', 'pantalla', 'app', 'mensaje'], timeLimit: 60, points: 20 },
  { id: 'ta13', type: 'tabu', title: 'VIDEOJUEGO', description: 'Describe sin usar las palabras prohibidas', answer: 'videojuego', forbidden: ['jugar', 'consola', 'mando', 'pantalla', 'gamer'], timeLimit: 60, points: 20 },
  { id: 'ta14', type: 'tabu', title: 'NETFLIX', description: 'Describe sin usar las palabras prohibidas', answer: 'netflix', forbidden: ['serie', 'película', 'streaming', 'ver', 'suscripción'], timeLimit: 60, points: 20 },
  { id: 'ta15', type: 'tabu', title: 'TWITCH', description: 'Describe sin usar las palabras prohibidas', answer: 'twitch', forbidden: ['streaming', 'directo', 'streamer', 'chat', 'videojuegos'], timeLimit: 60, points: 20 },
  // Comida
  { id: 'ta16', type: 'tabu', title: 'PIZZA', description: 'Describe sin usar las palabras prohibidas', answer: 'pizza', forbidden: ['Italia', 'queso', 'tomate', 'masa', 'redonda'], timeLimit: 60, points: 20 },
  { id: 'ta17', type: 'tabu', title: 'CHOCOLATE', description: 'Describe sin usar las palabras prohibidas', answer: 'chocolate', forbidden: ['dulce', 'cacao', 'marrón', 'bombón', 'leche'], timeLimit: 60, points: 20 },
  { id: 'ta18', type: 'tabu', title: 'HAMBURGUESA', description: 'Describe sin usar las palabras prohibidas', answer: 'hamburguesa', forbidden: ['carne', 'pan', 'McDonald', 'lechuga', 'queso'], timeLimit: 60, points: 20 },
  { id: 'ta19', type: 'tabu', title: 'SUSHI', description: 'Describe sin usar las palabras prohibidas', answer: 'sushi', forbidden: ['Japón', 'arroz', 'pescado', 'alga', 'palillos'], timeLimit: 60, points: 20 },
  { id: 'ta20', type: 'tabu', title: 'HELADO', description: 'Describe sin usar las palabras prohibidas', answer: 'helado', forbidden: ['frío', 'dulce', 'verano', 'bola', 'cucurucho'], timeLimit: 60, points: 20 },
  // Eventos
  { id: 'ta21', type: 'tabu', title: 'NAVIDAD', description: 'Describe sin usar las palabras prohibidas', answer: 'navidad', forbidden: ['regalo', 'árbol', 'Papá Noel', 'diciembre', 'familia'], timeLimit: 60, points: 20 },
  { id: 'ta22', type: 'tabu', title: 'CUMPLEAÑOS', description: 'Describe sin usar las palabras prohibidas', answer: 'cumpleaños', forbidden: ['tarta', 'vela', 'regalo', 'fiesta', 'años'], timeLimit: 60, points: 20 },
  { id: 'ta23', type: 'tabu', title: 'BODA', description: 'Describe sin usar las palabras prohibidas', answer: 'boda', forbidden: ['casarse', 'novio', 'novia', 'anillo', 'iglesia'], timeLimit: 60, points: 20 },
  { id: 'ta24', type: 'tabu', title: 'HALLOWEEN', description: 'Describe sin usar las palabras prohibidas', answer: 'halloween', forbidden: ['calabaza', 'disfraz', 'miedo', 'octubre', 'fantasma'], timeLimit: 60, points: 20 },
  { id: 'ta25', type: 'tabu', title: 'CONCIERTO', description: 'Describe sin usar las palabras prohibidas', answer: 'concierto', forbidden: ['música', 'cantante', 'escenario', 'público', 'entrada'], timeLimit: 60, points: 20 },
  // Objetos
  { id: 'ta26', type: 'tabu', title: 'PARAGUAS', description: 'Describe sin usar las palabras prohibidas', answer: 'paraguas', forbidden: ['lluvia', 'agua', 'mojarse', 'abrir', 'mango'], timeLimit: 60, points: 20 },
  { id: 'ta27', type: 'tabu', title: 'GAFAS', description: 'Describe sin usar las palabras prohibidas', answer: 'gafas', forbidden: ['ver', 'ojos', 'cristal', 'montura', 'sol'], timeLimit: 60, points: 20 },
  { id: 'ta28', type: 'tabu', title: 'RELOJ', description: 'Describe sin usar las palabras prohibidas', answer: 'reloj', forbidden: ['hora', 'tiempo', 'manecillas', 'muñeca', 'segundos'], timeLimit: 60, points: 20 },
  { id: 'ta29', type: 'tabu', title: 'CAMA', description: 'Describe sin usar las palabras prohibidas', answer: 'cama', forbidden: ['dormir', 'colchón', 'almohada', 'sábana', 'descansar'], timeLimit: 60, points: 20 },
  { id: 'ta30', type: 'tabu', title: 'ESPEJO', description: 'Describe sin usar las palabras prohibidas', answer: 'espejo', forbidden: ['reflejo', 'ver', 'cristal', 'imagen', 'baño'], timeLimit: 60, points: 20 },
  // Profesiones
  { id: 'ta31', type: 'tabu', title: 'BOMBERO', description: 'Describe sin usar las palabras prohibidas', answer: 'bombero', forbidden: ['fuego', 'incendio', 'manguera', 'rescate', 'camión'], timeLimit: 60, points: 20 },
  { id: 'ta32', type: 'tabu', title: 'POLICÍA', description: 'Describe sin usar las palabras prohibidas', answer: 'policia', forbidden: ['ley', 'delito', 'uniforme', 'pistola', 'coche'], timeLimit: 60, points: 20 },
  { id: 'ta33', type: 'tabu', title: 'PROFESOR', description: 'Describe sin usar las palabras prohibidas', answer: 'profesor', forbidden: ['enseñar', 'clase', 'alumno', 'escuela', 'pizarra'], timeLimit: 60, points: 20 },
  { id: 'ta34', type: 'tabu', title: 'ASTRONAUTA', description: 'Describe sin usar las palabras prohibidas', answer: 'astronauta', forbidden: ['espacio', 'cohete', 'Luna', 'NASA', 'traje'], timeLimit: 60, points: 20 },
  { id: 'ta35', type: 'tabu', title: 'STREAMER', description: 'Describe sin usar las palabras prohibidas', answer: 'streamer', forbidden: ['Twitch', 'directo', 'jugar', 'cámara', 'suscriptor'], timeLimit: 60, points: 20 },
  // Naturaleza
  { id: 'ta36', type: 'tabu', title: 'VOLCÁN', description: 'Describe sin usar las palabras prohibidas', answer: 'volcan', forbidden: ['lava', 'erupción', 'montaña', 'fuego', 'ceniza'], timeLimit: 60, points: 20 },
  { id: 'ta37', type: 'tabu', title: 'ARCOÍRIS', description: 'Describe sin usar las palabras prohibidas', answer: 'arcoiris', forbidden: ['colores', 'lluvia', 'sol', 'cielo', 'siete'], timeLimit: 60, points: 20 },
  { id: 'ta38', type: 'tabu', title: 'TERREMOTO', description: 'Describe sin usar las palabras prohibidas', answer: 'terremoto', forbidden: ['tierra', 'temblar', 'destrucción', 'escala', 'sismo'], timeLimit: 60, points: 20 },
  { id: 'ta39', type: 'tabu', title: 'TORNADO', description: 'Describe sin usar las palabras prohibidas', answer: 'tornado', forbidden: ['viento', 'girar', 'destruir', 'tormenta', 'embudo'], timeLimit: 60, points: 20 },
  { id: 'ta40', type: 'tabu', title: 'TSUNAMI', description: 'Describe sin usar las palabras prohibidas', answer: 'tsunami', forbidden: ['ola', 'mar', 'agua', 'terremoto', 'costa'], timeLimit: 60, points: 20 },
];


// RAPIDEZ - Retos de velocidad (30)
const RAPIDEZ_CHALLENGES: Challenge[] = [
  { id: 'ra1', type: 'rapidez', title: 'Escribe 5 países que empiecen por "A"', description: 'El primero en escribir 5 correctos gana', timeLimit: 30, points: 20 },
  { id: 'ra2', type: 'rapidez', title: 'Escribe 3 colores en inglés', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra3', type: 'rapidez', title: 'Escribe 4 frutas', description: 'El primero en escribir 4 correctas gana', timeLimit: 25, points: 15 },
  { id: 'ra4', type: 'rapidez', title: 'Escribe 3 capitales europeas', description: 'El primero en escribir 3 correctas gana', timeLimit: 25, points: 15 },
  { id: 'ra5', type: 'rapidez', title: 'Escribe 4 animales que vuelen', description: 'El primero en escribir 4 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra6', type: 'rapidez', title: 'Escribe 3 marcas de coches', description: 'El primero en escribir 3 correctas gana', timeLimit: 20, points: 15 },
  { id: 'ra7', type: 'rapidez', title: 'Escribe 5 números primos', description: 'El primero en escribir 5 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra8', type: 'rapidez', title: 'Escribe 3 deportes olímpicos', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra9', type: 'rapidez', title: 'Escribe 4 instrumentos musicales', description: 'El primero en escribir 4 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra10', type: 'rapidez', title: 'Escribe 3 planetas del sistema solar', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra11', type: 'rapidez', title: 'Escribe 4 videojuegos de Nintendo', description: 'El primero en escribir 4 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra12', type: 'rapidez', title: 'Escribe 3 películas de Disney', description: 'El primero en escribir 3 correctas gana', timeLimit: 25, points: 15 },
  { id: 'ra13', type: 'rapidez', title: 'Escribe 5 animales marinos', description: 'El primero en escribir 5 correctos gana', timeLimit: 30, points: 20 },
  { id: 'ra14', type: 'rapidez', title: 'Escribe 3 superhéroes de Marvel', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra15', type: 'rapidez', title: 'Escribe 4 países de Sudamérica', description: 'El primero en escribir 4 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra16', type: 'rapidez', title: 'Escribe 3 tipos de pasta', description: 'El primero en escribir 3 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra17', type: 'rapidez', title: 'Escribe 4 emotes de Twitch', description: 'El primero en escribir 4 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra18', type: 'rapidez', title: 'Escribe 3 redes sociales', description: 'El primero en escribir 3 correctas gana', timeLimit: 15, points: 10 },
  { id: 'ra19', type: 'rapidez', title: 'Escribe 5 palabras que empiecen por "Z"', description: 'El primero en escribir 5 correctas gana', timeLimit: 35, points: 20 },
  { id: 'ra20', type: 'rapidez', title: 'Escribe 3 equipos de fútbol', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra21', type: 'rapidez', title: 'Escribe 4 tipos de Pokemon', description: 'El primero en escribir 4 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra22', type: 'rapidez', title: 'Escribe 3 personajes de anime', description: 'El primero en escribir 3 correctos gana', timeLimit: 25, points: 15 },
  { id: 'ra23', type: 'rapidez', title: 'Escribe 4 comidas mexicanas', description: 'El primero en escribir 4 correctas gana', timeLimit: 25, points: 15 },
  { id: 'ra24', type: 'rapidez', title: 'Escribe 3 streamers famosos', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra25', type: 'rapidez', title: 'Escribe 5 palabras en inglés', description: 'El primero en escribir 5 correctas gana', timeLimit: 25, points: 15 },
  { id: 'ra26', type: 'rapidez', title: 'Escribe 3 bebidas con alcohol', description: 'El primero en escribir 3 correctas gana', timeLimit: 20, points: 15 },
  { id: 'ra27', type: 'rapidez', title: 'Escribe 4 marcas de ropa', description: 'El primero en escribir 4 correctas gana', timeLimit: 25, points: 15 },
  { id: 'ra28', type: 'rapidez', title: 'Escribe 3 cantantes latinos', description: 'El primero en escribir 3 correctos gana', timeLimit: 20, points: 15 },
  { id: 'ra29', type: 'rapidez', title: 'Escribe 4 verduras', description: 'El primero en escribir 4 correctas gana', timeLimit: 25, points: 15 },
  { id: 'ra30', type: 'rapidez', title: 'Escribe 3 consolas de videojuegos', description: 'El primero en escribir 3 correctas gana', timeLimit: 20, points: 15 },
];

// Combinar todas las pruebas
const DEFAULT_CHALLENGES: Challenge[] = [
  ...TRIVIA_CHALLENGES,
  ...MIMICA_CHALLENGES,
  ...DIBUJO_CHALLENGES,
  ...TABU_CHALLENGES,
  ...RAPIDEZ_CHALLENGES,
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


// ========== COMPONENTE PIZARRA DE DIBUJO ==========
const DRAWING_SYNC_CHANNEL = 'party_co_drawing_sync';

interface DrawingBoardProps {
  onClose: () => void;
  onFirstDraw?: () => void; // Callback when user starts drawing
  onPauseTimer?: () => void; // Callback to pause timer (when switching to mode with pending tutorial)
}

type DrawingMode = 'mouse' | 'camera';

// Canvas size presets
interface CanvasSize {
  name: string;
  width: number;
  height: number;
}

// Canvas presets with different aspect ratios for visual distinction
const CANVAS_PRESETS: CanvasSize[] = [
  { name: 'Cuadrado', width: 600, height: 600 },    // 1:1
  { name: 'Clásico', width: 800, height: 600 },     // 4:3
  { name: 'Ancho', width: 1000, height: 600 },      // 5:3
  { name: 'Panorámico', width: 1280, height: 720 }, // 16:9
];

const DrawingBoard: React.FC<DrawingBoardProps> = ({ onClose, onFirstDraw, onPauseTimer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const smallPreviewVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastSyncRef = useRef<string>('');
  const streamRef = useRef<MediaStream | null>(null);
  const isActivelyDrawingRef = useRef(false);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(6);
  const [mode, setMode] = useState<DrawingMode>('mouse');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  // Tutorial state - separate for each mode, only shown once
  const [mouseTutorialDone, setMouseTutorialDone] = useState(false);
  const [cameraTutorialDone, setCameraTutorialDone] = useState(false);
  const [hasStartedDrawing, setHasStartedDrawing] = useState(false);
  
  // Camera tutorial progress - must complete steps before can skip
  const [tutorialPinchDone, setTutorialPinchDone] = useState(false);
  
  // Cursor position for visual indicator
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [handCursorPos, setHandCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHandPinching, setIsHandPinching] = useState(false);
  const mouseCursorRef = useRef<HTMLDivElement>(null);
  
  // Canvas size state
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [selectedPreset, setSelectedPreset] = useState(1); // Default to "Clásico" (4:3)
  
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lastHandPosRef = useRef({ x: 0, y: 0 });
  const isHandDrawingRef = useRef(false);
  const hasCalledFirstDrawRef = useRef(false);
  const onFirstDrawRef = useRef(onFirstDraw);
  
  // Check if current mode tutorial is pending
  const showTutorial = mode === 'mouse' ? !mouseTutorialDone : !cameraTutorialDone;
  
  // Pause timer when switching to a mode with pending tutorial
  useEffect(() => {
    if (showTutorial && onPauseTimer) {
      onPauseTimer();
    }
  }, [mode, showTutorial, onPauseTimer]);
  
  // Keep ref updated
  useEffect(() => {
    onFirstDrawRef.current = onFirstDraw;
  }, [onFirstDraw]);

  // Change canvas size
  const changeCanvasSize = useCallback((presetIndex: number) => {
    const preset = CANVAS_PRESETS[presetIndex];
    if (!preset) return;
    
    setSelectedPreset(presetIndex);
    setCanvasWidth(preset.width);
    setCanvasHeight(preset.height);
    
    // Clear and reinitialize canvas with new size
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(0, 0, preset.width, preset.height);
    }, 50);
  }, []);

  // Sync stream to preview videos (prevents flickering from ref callbacks)
  useEffect(() => {
    const stream = streamRef.current;
    if (!stream || !cameraReady) return;
    
    if (previewVideoRef.current && previewVideoRef.current.srcObject !== stream) {
      previewVideoRef.current.srcObject = stream;
      previewVideoRef.current.play().catch(() => {});
    }
    if (smallPreviewVideoRef.current && smallPreviewVideoRef.current.srcObject !== stream) {
      smallPreviewVideoRef.current.srcObject = stream;
      smallPreviewVideoRef.current.play().catch(() => {});
    }
  }, [cameraReady, hasStartedDrawing]);

  const colors = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#000000'];

  // Load available cameras
  useEffect(() => {
    const loadCameras = async () => {
      try {
        // Request permission first to get full device labels
        await navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
          s.getTracks().forEach(t => t.stop());
        }).catch(() => {});
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(cameras);
        
        // Prefer virtual cameras (NVIDIA Broadcast, OBS Virtual, etc.)
        const virtualCamera = cameras.find(c => 
          c.label.toLowerCase().includes('nvidia') ||
          c.label.toLowerCase().includes('broadcast') ||
          c.label.toLowerCase().includes('virtual') ||
          c.label.toLowerCase().includes('obs')
        );
        
        if (virtualCamera) {
          setSelectedCameraId(virtualCamera.deviceId);
        } else if (cameras.length > 0) {
          setSelectedCameraId(cameras[0].deviceId);
        }
      } catch (err) {
        console.error('Error loading cameras:', err);
      }
    };
    loadCameras();
  }, []);

  // Optimized sync - only sync when canvas actually changed
  const syncCanvas = useCallback((force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Use JPEG for faster encoding, lower quality for speed
    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
    
    // Only sync if changed or forced
    if (!force && dataUrl === lastSyncRef.current) return;
    lastSyncRef.current = dataUrl;
    
    channelRef.current?.postMessage({ type: 'drawing_update', dataUrl, canvasWidth, canvasHeight });
    try {
      localStorage.setItem('party_co_drawing', dataUrl);
      localStorage.setItem('party_co_canvas_size', JSON.stringify({ width: canvasWidth, height: canvasHeight }));
    } catch { /* ignore */ }
  }, [canvasWidth, canvasHeight]);

  // Sync loop - only runs when actively drawing or periodically for Firebase
  useEffect(() => {
    let lastFirebaseSync = 0;
    let frameId: number;
    
    const syncLoop = () => {
      // Only sync canvas if actively drawing
      if (isActivelyDrawingRef.current) {
        syncCanvas();
      }
      
      // Firebase sync every 2 seconds (reduced frequency)
      const now = Date.now();
      if (now - lastFirebaseSync > 2000) {
        const canvas = canvasRef.current;
        if (canvas && lastSyncRef.current) {
          gameSync.update('partyco_drawing', { dataUrl: lastSyncRef.current }).catch(() => {});
        }
        lastFirebaseSync = now;
      }
      
      frameId = requestAnimationFrame(syncLoop);
    };
    
    frameId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(frameId);
  }, [syncCanvas]);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(DRAWING_SYNC_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  // Initialize canvas when size changes
  useEffect(() => {
    // Small delay to ensure canvas is mounted after key change
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      syncCanvas(true);
    }, 50);
    return () => clearTimeout(timer);
  }, [canvasWidth, canvasHeight, syncCanvas]);

  // Camera mode with hand detection
  useEffect(() => {
    if (mode !== 'camera') {
      // Cleanup camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
      setCameraError(null);
      return;
    }

    let handsModule: any = null;
    let camera: any = null;
    let isMounted = true;

    const initCamera = async () => {
      try {
        setCameraError(null);
        
        // Build video constraints with selected camera
        const videoConstraints: MediaTrackConstraints = {
          width: 640,
          height: 480
        };
        
        // Use selected camera if available
        if (selectedCameraId) {
          videoConstraints.deviceId = { exact: selectedCameraId };
        } else {
          videoConstraints.facingMode = 'user';
        }
        
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: videoConstraints
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Load MediaPipe Hands dynamically
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!isMounted) return;

        handsModule = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        // Optimized settings for better detection
        handsModule.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,  // 0=lite, 1=full - full is more accurate
          minDetectionConfidence: 0.7,  // Lowered for easier initial detection
          minTrackingConfidence: 0.6    // Lowered for smoother tracking
        });

        // Enhanced smoothing and stability
        const positionBuffer: { x: number; y: number; t: number }[] = [];
        const BUFFER_SIZE = 6; // More samples for smoother movement
        let consecutivePinchFrames = 0;
        let consecutiveNoPinchFrames = 0;
        const PINCH_FRAMES_TO_START = 3; // Reduced - faster response to start
        const PINCH_FRAMES_TO_STOP = 4;  // Increased - harder to accidentally stop
        let lastDrawTime = 0;
        let lastValidPosition = { x: 0, y: 0 };
        let isCurrentlyDrawing = false;

        handsModule.onResults((results: any) => {
          if (!isMounted) return;
          
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            // Validate hand structure - more lenient
            const wrist = landmarks[0];
            const indexMCP = landmarks[5];
            const middleMCP = landmarks[9];
            
            const handWidth = Math.abs(indexMCP.x - landmarks[17].x);
            const handHeight = Math.abs(wrist.y - middleMCP.y);
            
            // More lenient hand proportion check
            if (handWidth < 0.03 || handHeight < 0.04 || handWidth > 0.5 || handHeight > 0.5) {
              setHandDetected(false);
              setIsHandPinching(false);
              consecutivePinchFrames = 0;
              consecutiveNoPinchFrames++;
              if (consecutiveNoPinchFrames > PINCH_FRAMES_TO_STOP) {
                isCurrentlyDrawing = false;
                isHandDrawingRef.current = false;
                isActivelyDrawingRef.current = false;
              }
              return;
            }
            setHandDetected(true);
            
            // Key landmarks
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const indexPIP = landmarks[6];
            const middleTip = landmarks[12];
            const middlePIP = landmarks[10];
            
            const canvas = canvasRef.current;
            if (!canvas) return;
            
            const now = Date.now();
            
            // Mirror and scale coordinates
            const rawX = (1 - indexTip.x) * canvas.width;
            const rawY = indexTip.y * canvas.height;
            
            // Ignore edges (reduced margin for more drawing area)
            const margin = 0.08;
            if (indexTip.x < margin || indexTip.x > (1 - margin) || 
                indexTip.y < margin || indexTip.y > (1 - margin)) {
              consecutivePinchFrames = 0;
              consecutiveNoPinchFrames++;
              if (consecutiveNoPinchFrames > PINCH_FRAMES_TO_STOP && isCurrentlyDrawing) {
                isCurrentlyDrawing = false;
                isHandDrawingRef.current = false;
                isActivelyDrawingRef.current = false;
                setIsHandPinching(false);
              }
              return;
            }
            
            // Add to buffer with timestamp
            positionBuffer.push({ x: rawX, y: rawY, t: now });
            while (positionBuffer.length > BUFFER_SIZE) {
              positionBuffer.shift();
            }
            
            // Exponential weighted average (recent positions have much more weight)
            let totalWeight = 0;
            let weightedX = 0;
            let weightedY = 0;
            positionBuffer.forEach((p, i) => {
              const weight = Math.pow(2, i); // Exponential: 1, 2, 4, 8, 16
              weightedX += p.x * weight;
              weightedY += p.y * weight;
              totalWeight += weight;
            });
            const smoothedX = weightedX / totalWeight;
            const smoothedY = weightedY / totalWeight;
            
            // Calculate velocity to detect erratic movement
            let velocity = 0;
            if (positionBuffer.length >= 2) {
              const prev = positionBuffer[positionBuffer.length - 2];
              const curr = positionBuffer[positionBuffer.length - 1];
              const dt = Math.max(1, curr.t - prev.t);
              velocity = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)) / dt;
            }
            
            // Reject if moving too fast (likely noise) - increased threshold
            const MAX_VELOCITY = 4; // pixels per ms
            if (velocity > MAX_VELOCITY) {
              return;
            }
            
            // Pinch detection with hysteresis - more generous thresholds
            const pinchDist = Math.sqrt(
              Math.pow(indexTip.x - thumbTip.x, 2) + 
              Math.pow(indexTip.y - thumbTip.y, 2)
            );
            
            // Also consider Z depth for more accurate pinch detection
            const zDiff = Math.abs((indexTip.z || 0) - (thumbTip.z || 0));
            const isCloseInZ = zDiff < 0.05; // Tips are at similar depth
            
            // Different thresholds for starting vs stopping (hysteresis)
            // More generous thresholds for easier detection
            const PINCH_START_THRESHOLD = 0.10; // Easier to start pinch
            const PINCH_STOP_THRESHOLD = 0.14;  // Much easier to maintain pinch
            
            const isPinching = isCurrentlyDrawing 
              ? pinchDist < PINCH_STOP_THRESHOLD  // Easier to maintain
              : pinchDist < PINCH_START_THRESHOLD && isCloseInZ; // Need Z proximity to start
            
            // Relaxed index finger check - just needs to not be fully curled
            const indexExtended = indexTip.y < indexPIP.y + 0.08;
            
            const shouldDraw = isPinching && indexExtended;
            
            // Update pinching state for cursor indicator
            setIsHandPinching(shouldDraw);
            
            // Track pinch for tutorial completion
            if (shouldDraw && !cameraTutorialDone) {
              setTutorialPinchDone(true);
            }
            
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            // Always update hand position for cursor
            lastHandPosRef.current = { x: smoothedX, y: smoothedY };
            setHandCursorPos({ x: smoothedX, y: smoothedY });
            
            if (shouldDraw) {
              consecutivePinchFrames++;
              consecutiveNoPinchFrames = 0;
              
              if (consecutivePinchFrames >= PINCH_FRAMES_TO_START || isCurrentlyDrawing) {
                // Dead zone - don't draw if barely moved
                const distFromLast = Math.sqrt(
                  Math.pow(smoothedX - lastValidPosition.x, 2) + 
                  Math.pow(smoothedY - lastValidPosition.y, 2)
                );
                
                const DEAD_ZONE = 2; // Minimum pixels to move
                const MAX_JUMP = 50; // Increased for smoother tracking
                
                if (distFromLast > DEAD_ZONE && distFromLast < MAX_JUMP) {
                  if (isCurrentlyDrawing) {
                    // Draw smooth line with interpolation for large gaps
                    const steps = Math.max(1, Math.floor(distFromLast / 4)); // More interpolation
                    for (let i = 1; i <= steps; i++) {
                      const t = i / steps;
                      const interpX = lastValidPosition.x + (smoothedX - lastValidPosition.x) * t;
                      const interpY = lastValidPosition.y + (smoothedY - lastValidPosition.y) * t;
                      
                      ctx.beginPath();
                      ctx.strokeStyle = color;
                      ctx.lineWidth = brushSize;
                      ctx.lineCap = 'round';
                      ctx.lineJoin = 'round';
                      
                      const prevT = (i - 1) / steps;
                      const prevX = lastValidPosition.x + (smoothedX - lastValidPosition.x) * prevT;
                      const prevY = lastValidPosition.y + (smoothedY - lastValidPosition.y) * prevT;
                      
                      ctx.moveTo(prevX, prevY);
                      ctx.lineTo(interpX, interpY);
                      ctx.stroke();
                    }
                  } else {
                    // Start drawing
                    ctx.beginPath();
                    ctx.fillStyle = color;
                    ctx.arc(smoothedX, smoothedY, brushSize / 2, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Complete camera tutorial on first draw
                    if (!hasCalledFirstDrawRef.current) {
                      hasCalledFirstDrawRef.current = true;
                      setHasStartedDrawing(true);
                      setCameraTutorialDone(true);
                      onFirstDrawRef.current?.();
                    }
                  }
                  
                  lastValidPosition = { x: smoothedX, y: smoothedY };
                  isCurrentlyDrawing = true;
                  isHandDrawingRef.current = true;
                  isActivelyDrawingRef.current = true;
                  lastDrawTime = now;
                } else if (distFromLast >= MAX_JUMP) {
                  // Jump detected - just update position without drawing
                  lastValidPosition = { x: smoothedX, y: smoothedY };
                }
              }
            } else {
              consecutiveNoPinchFrames++;
              consecutivePinchFrames = 0;
              
              if (consecutiveNoPinchFrames >= PINCH_FRAMES_TO_STOP) {
                isCurrentlyDrawing = false;
                isHandDrawingRef.current = false;
                isActivelyDrawingRef.current = false;
              }
            }
          } else {
            setHandDetected(false);
            setIsHandPinching(false);
            consecutiveNoPinchFrames++;
            if (consecutiveNoPinchFrames > 5) {
              isCurrentlyDrawing = false;
              isHandDrawingRef.current = false;
              isActivelyDrawingRef.current = false;
            }
          }
        });

        if (videoRef.current) {
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && isMounted) {
                await handsModule.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480
          });
          await camera.start();
        }

        if (isMounted) {
          setCameraReady(true);
        }
      } catch (error: any) {
        console.error('Camera/Hand detection error:', error);
        if (isMounted) {
          // Provide user-friendly error messages
          if (error.name === 'NotReadableError' || error.message?.includes('in use')) {
            setCameraError('La cámara está siendo usada por otra aplicación (OBS, otra pestaña, etc.)');
          } else if (error.name === 'NotAllowedError') {
            setCameraError('Permiso de cámara denegado. Permite el acceso en tu navegador.');
          } else if (error.name === 'NotFoundError') {
            setCameraError('No se encontró ninguna cámara conectada.');
          } else {
            setCameraError('Error al iniciar la cámara. Intenta de nuevo.');
          }
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (camera) {
        try { camera.stop(); } catch {}
      }
      if (handsModule) {
        try { handsModule.close(); } catch {}
      }
    };
  }, [mode, color, brushSize, selectedCameraId]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Complete tutorial for current mode
  const completeTutorial = useCallback(() => {
    if (mode === 'mouse') {
      setMouseTutorialDone(true);
    } else {
      setCameraTutorialDone(true);
    }
    // Trigger first draw callback (starts timer) - only once per session
    if (!hasCalledFirstDrawRef.current) {
      hasCalledFirstDrawRef.current = true;
      setHasStartedDrawing(true);
      onFirstDraw?.();
    }
  }, [mode, onFirstDraw]);

  // Legacy trigger for compatibility
  const triggerFirstDraw = useCallback(() => {
    completeTutorial();
  }, [completeTutorial]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'camera') return;
    if (!mouseTutorialDone) return; // Don't draw until tutorial is done
    e.preventDefault();
    setIsDrawing(true);
    isActivelyDrawingRef.current = true;
    const pos = getPos(e);
    lastPosRef.current = pos;
    setCursorPos(pos);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Update mouse cursor position directly (no re-render)
  const updateMouseCursor = useCallback((pos: { x: number; y: number }) => {
    if (mouseCursorRef.current && canvasWidth && canvasHeight) {
      mouseCursorRef.current.style.left = `${(pos.x / canvasWidth) * 100}%`;
      mouseCursorRef.current.style.top = `${(pos.y / canvasHeight) * 100}%`;
      mouseCursorRef.current.style.display = 'block';
    }
  }, [canvasWidth, canvasHeight]);

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'camera') return;
    e.preventDefault();
    
    const pos = getPos(e);
    
    // Update cursor directly without re-render
    updateMouseCursor(pos);
    
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    isActivelyDrawingRef.current = false;
    // Final sync when stopping
    syncCanvas(true);
  };
  
  // Handle mouse move for cursor tracking (even when not drawing)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === 'camera') return;
    const pos = getPos(e);
    updateMouseCursor(pos);
    if (isDrawing) {
      draw(e);
    }
  };
  
  // Hide cursor when mouse leaves canvas
  const handleMouseLeave = () => {
    if (mouseCursorRef.current) {
      mouseCursorRef.current.style.display = 'none';
    }
    stopDrawing();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.fillStyle = '#1f1f1f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    syncCanvas(true);
  };

  return (
    <div className="bg-zinc-900 rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-white font-medium text-sm sm:text-base">🎨 Pizarra</span>
          {/* Mode toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setMode('mouse')}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs transition-colors ${
                mode === 'mouse' ? 'bg-purple-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              🖱️ <span className="hidden sm:inline">Ratón</span>
            </button>
            <button
              onClick={() => setMode('camera')}
              className={`px-2 sm:px-3 py-1 rounded-md text-xs transition-colors ${
                mode === 'camera' ? 'bg-green-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              📷 <span className="hidden sm:inline">Cámara</span>
            </button>
          </div>
          {/* Canvas size selector */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5">
            {CANVAS_PRESETS.map((preset, idx) => (
              <button
                key={preset.name}
                onClick={() => changeCanvasSize(idx)}
                className={`px-2 py-1 rounded-md text-xs transition-colors ${
                  selectedPreset === idx ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-white'
                }`}
                title={`${preset.width}x${preset.height}`}
              >
                <span className="hidden sm:inline">{preset.name}</span>
                <span className="sm:hidden">{preset.name.charAt(0)}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl p-1">✕</button>
      </div>

      {/* Canvas size info */}
      <div className="text-xs text-zinc-500 text-center">
        📐 {canvasWidth}×{canvasHeight}px
      </div>

      {/* Camera mode indicator - only show when drawing has started */}
      {/* Camera selector - always visible in camera mode */}
      {mode === 'camera' && availableCameras.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Cámara:</span>
          <select
            value={selectedCameraId}
            onChange={(e) => setSelectedCameraId(e.target.value)}
            className="flex-1 px-2 py-1 bg-zinc-800 rounded text-xs text-white border border-zinc-700"
          >
            {availableCameras.map(cam => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `Cámara ${availableCameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Camera error message */}
      {mode === 'camera' && cameraError && (
        <div className="text-xs px-3 py-1.5 rounded-lg flex items-center justify-between bg-red-500/20 text-red-400">
          <span>❌ {cameraError}</span>
          <button
            onClick={() => {
              setCameraError(null);
              setMode('mouse');
              setTimeout(() => setMode('camera'), 100);
            }}
            className="ml-2 px-2 py-0.5 bg-red-500/30 hover:bg-red-500/50 rounded text-red-300"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Camera status - only show after drawing started */}
      {mode === 'camera' && hasStartedDrawing && !cameraError && (
        <div className={`text-xs px-3 py-1.5 rounded-lg ${
          cameraReady 
            ? handDetected 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {!cameraReady ? '📷 Iniciando...' :
           handDetected ? '✋ Mano detectada - Pinch para dibujar' :
           '👀 Muestra tu mano'}
        </div>
      )}
      
      <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${canvasWidth}/${canvasHeight}`, minHeight: '300px' }}>
        {/* Hidden video for camera mode */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
        />
        
        <canvas
          key={`canvas-${canvasWidth}-${canvasHeight}`}
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className={`w-full h-full rounded-lg touch-none ${mode === 'mouse' ? 'cursor-none' : 'cursor-default'}`}
          style={{ backgroundColor: '#1f1f1f' }}
          onMouseDown={startDrawing}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={handleMouseLeave}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        {/* Cursor indicator - pencil icon (uses ref for instant updates without re-render) */}
        {mode === 'mouse' && mouseTutorialDone && (
          <div 
            ref={mouseCursorRef}
            className="absolute pointer-events-none z-10"
            style={{ 
              display: 'none',
              transform: 'translate(-2px, -20px)',
              willChange: 'left, top'
            }}
          >
            <div className="relative">
              <span className="text-2xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>✏️</span>
              {isDrawing && (
                <div 
                  className="absolute -bottom-1 left-1 rounded-full"
                  style={{ 
                    width: Math.min(brushSize, 16), 
                    height: Math.min(brushSize, 16), 
                    backgroundColor: color,
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                  }}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Camera mode cursor indicator - only show pencil (no transitions for instant response) */}
        {mode === 'camera' && cameraTutorialDone && handDetected && (
          <div 
            className="absolute pointer-events-none z-10"
            style={{ 
              left: `${(handCursorPos.x / canvasWidth) * 100}%`, 
              top: `${(handCursorPos.y / canvasHeight) * 100}%`,
              transform: 'translate(-12px, -24px)',
              opacity: isHandPinching ? 1 : 0.5,
              willChange: 'left, top'
            }}
          >
            <div className="relative">
              {/* Only show pencil icon - cleaner look */}
              <span 
                className="text-2xl"
                style={{ 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                  transform: isHandPinching ? 'scale(1.1)' : 'scale(1)'
                }}
              >
                ✏️
              </span>
              {/* Color indicator when drawing */}
              {isHandPinching && (
                <div 
                  className="absolute -bottom-1 left-2 rounded-full"
                  style={{ 
                    width: Math.min(brushSize + 4, 20), 
                    height: Math.min(brushSize + 4, 20), 
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${color}, 0 0 4px ${color}`
                  }}
                />
              )}
            </div>
          </div>
        )}
        
        {/* Tutorial overlay - shown based on mode */}
        {showTutorial && (
          <div 
            className={`absolute inset-0 bg-black/90 rounded-lg flex items-center justify-center p-4 ${mode === 'mouse' ? 'cursor-pointer' : ''}`}
            onClick={mode === 'mouse' ? () => completeTutorial() : undefined}
          >
            {mode === 'camera' ? (
              /* Camera tutorial with live preview */
              <div className="flex flex-col lg:flex-row items-center gap-6 w-full max-w-4xl">
                {/* Camera preview - large */}
                <div className="relative flex-shrink-0">
                  <div className="w-64 h-48 sm:w-80 sm:h-60 rounded-xl overflow-hidden border-4 border-zinc-700 bg-black">
                    {cameraReady ? (
                      <video
                        ref={previewVideoRef}
                        className="w-full h-full object-cover transform scale-x-[-1]"
                        playsInline
                        muted
                        autoPlay
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-4xl animate-pulse">📷</div>
                      </div>
                    )}
                  </div>
                  {/* Status indicator on camera */}
                  <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                    !cameraReady ? 'bg-blue-500/80 text-white' :
                    tutorialPinchDone ? 'bg-green-500/80 text-white' :
                    handDetected ? 'bg-purple-500/80 text-white' :
                    'bg-yellow-500/80 text-black'
                  }`}>
                    {!cameraReady ? '📷 Iniciando...' :
                     tutorialPinchDone ? '✅ ¡Perfecto!' :
                     handDetected ? '🤏 Ahora junta los dedos' :
                     '👀 Muestra tu mano'}
                  </div>
                </div>
                
                {/* Instructions */}
                <div className="flex-1 text-center lg:text-left">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
                    🎨 Dibuja con tu mano
                  </h3>
                  <div className="space-y-3">
                    {/* Step 1: Show hand */}
                    <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      handDetected ? 'bg-green-500/20' : 
                      cameraReady ? 'bg-yellow-500/20 animate-pulse' : 'bg-zinc-800/50'
                    }`}>
                      <span className="text-2xl">{handDetected ? '✅' : '👋'}</span>
                      <span className={`text-sm sm:text-base ${handDetected ? 'text-green-400' : cameraReady ? 'text-yellow-400' : 'text-zinc-500'}`}>
                        {handDetected ? '✓ Mano detectada' : '1. Muestra tu mano abierta'}
                      </span>
                    </div>
                    {/* Step 2: Pinch */}
                    <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      tutorialPinchDone ? 'bg-green-500/20' :
                      handDetected ? 'bg-purple-500/20 animate-pulse' : 'bg-zinc-800/50'
                    }`}>
                      <span className="text-2xl">{tutorialPinchDone ? '✅' : '🤏'}</span>
                      <span className={`text-sm sm:text-base ${
                        tutorialPinchDone ? 'text-green-400' : 
                        handDetected ? 'text-purple-400' : 'text-zinc-500'
                      }`}>
                        {tutorialPinchDone ? '✓ Gesto detectado' : '2. Junta pulgar e índice'}
                      </span>
                    </div>
                    {/* Step 3: Release */}
                    <div className={`flex items-center gap-3 p-2 rounded-lg ${
                      tutorialPinchDone ? 'bg-blue-500/20' : 'bg-zinc-800/50'
                    }`}>
                      <span className="text-2xl">✋</span>
                      <span className={`text-sm sm:text-base ${tutorialPinchDone ? 'text-blue-400' : 'text-zinc-500'}`}>
                        3. Separa los dedos para parar
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress indicator */}
                  {!tutorialPinchDone && (
                    <p className="mt-4 text-sm text-yellow-400 animate-pulse">
                      ⏸️ Completa los pasos para empezar
                    </p>
                  )}
                  
                  {/* Button only shows after completing tutorial steps */}
                  {tutorialPinchDone && (
                    <button 
                      className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg transition-colors animate-pulse"
                      onClick={() => completeTutorial()}
                    >
                      ▶️ ¡Listo, empezar a dibujar!
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Mouse tutorial - clickeable to start drawing */
              <div 
                className="text-center cursor-pointer select-none"
                onClick={(e) => {
                  e.stopPropagation();
                  completeTutorial();
                }}
              >
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-2xl font-bold text-white mb-3">¡Empieza a dibujar!</h3>
                <div className="space-y-3 text-zinc-300">
                  <p className="text-lg">Haz clic aquí o en el canvas para empezar</p>
                  <div className="mt-4 text-4xl">🖱️ ✏️</div>
                </div>
                <p className="mt-6 text-sm text-yellow-400 animate-pulse">
                  ⏸️ El tiempo está pausado hasta que empieces
                </p>
                <button 
                  className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    completeTutorial();
                  }}
                >
                  ▶️ Comenzar
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Camera preview overlay - small, shown after tutorial done */}
        {mode === 'camera' && cameraReady && cameraTutorialDone && (
          <div className="absolute bottom-2 right-2 w-32 h-24 rounded-lg overflow-hidden border-2 border-green-500/50 bg-black">
            <video
              ref={smallPreviewVideoRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
              playsInline
              muted
              autoPlay
            />
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 flex-wrap">
          {colors.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="range"
            min="2"
            max="30"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-16 sm:w-24 accent-purple-500"
          />
          <span className="text-zinc-400 text-xs w-5">{brushSize}</span>
          <button
            onClick={clearCanvas}
            className="px-2 sm:px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs sm:text-sm hover:bg-red-500/30"
          >
            Borrar
          </button>
        </div>
      </div>
    </div>
  );
};


// ========== COMPONENTE PRINCIPAL ==========
export const PartyCo: React.FC<PartyCoProps> = ({ chatMessages, isConnected = true }) => {
  // Game sync hook for hexagonal architecture
  const { publishGameState } = useGameSync();

  // Estados del juego
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'paused' | 'final'>('lobby');
  const [players, setPlayers] = useState<Map<string, Player>>(new Map());
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [usedChallenges, setUsedChallenges] = useState<Set<string>>(new Set());
  
  // Configuración - Tiempo en segundos directos
  const [challenges, setChallenges] = useState<Challenge[]>([...DEFAULT_CHALLENGES]);
  const [customChallenges, setCustomChallenges] = useState<Challenge[]>([]);
  const [pointsToWin, setPointsToWin] = useState(100);
  const [pointsPerWin, setPointsPerWin] = useState(15);
  const [defaultTime, setDefaultTime] = useState(45); // Segundos por defecto
  const [maxPlayers, setMaxPlayers] = useState(0);
  const [enabledTypes, setEnabledTypes] = useState<Set<ChallengeType>>(
    new Set(['trivia', 'mimica', 'dibujo', 'tabu', 'rapidez'])
  );
  
  // UI States
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawingBoard, setShowDrawingBoard] = useState(false);
  
  // Tabú - Selector de 3 opciones
  const [tabuOptions, setTabuOptions] = useState<Challenge[]>([]);
  const [showTabuSelector, setShowTabuSelector] = useState(false);
  
  // Track last challenge type to avoid consecutive repeats
  const [lastChallengeType, setLastChallengeType] = useState<ChallengeType | null>(null);
  
  // Editor de pruebas
  const [showEditor, setShowEditor] = useState(false);
  const [editType, setEditType] = useState<ChallengeType>('trivia');
  const [editTitle, setEditTitle] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editForbidden, setEditForbidden] = useState('');
  
  // IA
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  
  // Drawing state - pause timer until drawing starts
  const [isWaitingForDraw, setIsWaitingForDraw] = useState(false);
  
  const lastProcessedRef = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoNextRef = useRef<NodeJS.Timeout | null>(null);
  
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
      winner,
      roundNumber,
      topPlayers: sortedPlayers.slice(0, 10),
      pointsToWin,
      pointsPerWin
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_PARTYCO, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('partyco', state).catch(() => {});
  }, [gameState, currentChallenge, timeLeft, winner, roundNumber, sortedPlayers, pointsToWin, pointsPerWin]);

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
      
      // Unirse al juego
      if (gameState !== 'final' && (msgLower === '!co' || msgLower === '!party' || msgLower === '!join')) {
        setPlayers(prev => {
          if (prev.has(oderId)) return prev;
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
      if (gameState === 'playing' && currentChallenge && !winner) {
        const answer = currentChallenge.answer?.toLowerCase();
        const hints = currentChallenge.hints?.map(h => h.toLowerCase()) || [];
        const allAnswers = answer ? [answer, ...hints] : [];
        
        const isCorrect = allAnswers.some(ans => 
          msgLower.includes(ans) || ans.includes(msgLower)
        );
        
        if (isCorrect) {
          const player = players.get(oderId);
          if (player) {
            const updatedPlayer = {
              ...player,
              score: player.score + pointsPerWin,
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
              // Auto-siguiente prueba después de 2 segundos
              autoNextRef.current = setTimeout(() => {
                nextChallenge();
              }, 2500);
            }
          }
        }
      }
    });
  }, [chatMessages, isConnected, gameState, currentChallenge, winner, players, pointsToWin, maxPlayers, pointsPerWin]);

  // Timer de la prueba
  useEffect(() => {
    if (gameState !== 'playing' || !currentChallenge) return;
    
    // Pause timer for drawing challenges until streamer starts drawing
    if (currentChallenge.type === 'dibujo' && isWaitingForDraw) {
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Tiempo agotado - auto siguiente
          if (!winner) {
            autoNextRef.current = setTimeout(() => {
              nextChallenge();
            }, 1500);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, currentChallenge, winner, isWaitingForDraw]);

  // Seleccionar siguiente prueba automáticamente
  const nextChallenge = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoNextRef.current) clearTimeout(autoNextRef.current);
    
    // Filtrar pruebas disponibles
    let availableChallenges = challenges.filter(c => 
      enabledTypes.has(c.type) && !usedChallenges.has(c.id)
    );
    
    // Evitar repetir el mismo tipo consecutivamente si hay más de un tipo activo
    if (lastChallengeType && enabledTypes.size > 1) {
      const differentType = availableChallenges.filter(c => c.type !== lastChallengeType);
      if (differentType.length > 0) {
        availableChallenges = differentType;
      }
    }
    
    if (availableChallenges.length === 0) {
      // Resetear usadas si se acabaron
      setUsedChallenges(new Set());
      const allEnabled = challenges.filter(c => enabledTypes.has(c.type));
      if (allEnabled.length > 0) {
        const sorted = sortChallengesByUsage(allEnabled);
        startChallenge(sorted[0]);
      }
      return;
    }
    
    // Ordenar por uso y seleccionar
    const sorted = sortChallengesByUsage(availableChallenges);
    
    // Si es Tabú, mostrar selector de 3 opciones
    if (sorted[0].type === 'tabu') {
      const tabuChallenges = sorted.filter(c => c.type === 'tabu').slice(0, 3);
      if (tabuChallenges.length >= 3) {
        setTabuOptions(tabuChallenges);
        setShowTabuSelector(true);
        return;
      }
    }
    
    startChallenge(sorted[0]);
  };

  const startChallenge = (challenge: Challenge) => {
    setCurrentChallenge(challenge);
    setTimeLeft(challenge.timeLimit || defaultTime);
    setWinner(null);
    setRoundNumber(prev => prev + 1);
    setUsedChallenges(prev => new Set([...prev, challenge.id]));
    setLastChallengeType(challenge.type);
    incrementChallengeUsage(challenge.id);
    setShowTabuSelector(false);
    
    // Mostrar pizarra automáticamente para dibujo y pausar timer
    if (challenge.type === 'dibujo') {
      setShowDrawingBoard(true);
      setIsWaitingForDraw(true); // Pause timer until drawing starts
    } else {
      setShowDrawingBoard(false);
      setIsWaitingForDraw(false);
    }
    
    setGameState('playing');
  };

  const selectTabuOption = (challenge: Challenge) => {
    startChallenge(challenge);
  };

  const startGame = () => {
    if (players.size < 1) return;
    setRoundNumber(0);
    setUsedChallenges(new Set());
    triggerGameStart();
    nextChallenge();
  };

  const pauseGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoNextRef.current) clearTimeout(autoNextRef.current);
    setGameState('paused');
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  const skipChallenge = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoNextRef.current) clearTimeout(autoNextRef.current);
    nextChallenge();
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoNextRef.current) clearTimeout(autoNextRef.current);
    setGameState('lobby');
    setCurrentChallenge(null);
    setTimeLeft(0);
    setWinner(null);
    setRoundNumber(0);
    setUsedChallenges(new Set());
    setShowDrawingBoard(false);
    setShowTabuSelector(false);
    triggerGameEnd();
  };

  const clearPlayers = () => {
    setPlayers(new Map());
  };

  const removePlayer = (oderId: string) => {
    setPlayers(prev => {
      const newPlayers = new Map(prev);
      newPlayers.delete(oderId);
      return newPlayers;
    });
  };

  const newGame = () => {
    resetGame();
    clearPlayers();
    lastProcessedRef.current = chatMessages.length;
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
      description: editType === 'tabu' ? 'Describe sin usar las palabras prohibidas' : 
                   editType === 'mimica' ? 'Actúa sin hablar' :
                   editType === 'dibujo' ? 'Dibuja en la pizarra' : 'Responde en el chat',
      answer: editAnswer.toLowerCase() || undefined,
      forbidden: editType === 'tabu' ? editForbidden.split(',').map(w => w.trim()) : undefined,
      timeLimit: defaultTime,
      points: pointsPerWin
    };
    
    const updated = [...customChallenges, newChallenge];
    setCustomChallenges(updated);
    setChallenges([...DEFAULT_CHALLENGES, ...updated]);
    saveCustomChallenges(updated);
    
    setEditTitle('');
    setEditAnswer('');
    setEditForbidden('');
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
Incluye diferentes tipos: memoria (preguntas de conocimiento), mimica (cosas para actuar), dibujo (cosas para dibujar), tabu (palabras con 5 palabras prohibidas).
Responde SOLO con JSON:
{
  "challenges": [
    { "type": "trivia", "title": "¿Pregunta?", "answer": "respuesta" },
    { "type": "mimica", "title": "Imita: algo", "answer": "algo" },
    { "type": "dibujo", "title": "Dibuja: algo", "answer": "algo" },
    { "type": "tabu", "title": "PALABRA", "answer": "palabra", "forbidden": ["prohibida1", "prohibida2", "prohibida3", "prohibida4", "prohibida5"] }
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
              description: c.type === 'tabu' ? 'Describe sin usar las palabras prohibidas' :
                           c.type === 'mimica' ? 'Actúa sin hablar' :
                           c.type === 'dibujo' ? 'Dibuja en la pizarra' : 'Responde en el chat',
              answer: c.answer?.toLowerCase(),
              forbidden: c.forbidden,
              timeLimit: defaultTime,
              points: pointsPerWin
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
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        {gameState === 'lobby' && (
          <button
            onClick={startGame}
            disabled={players.size < 1}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg"
          >
            <Play size={18} />
            ¡Empezar! ({players.size})
          </button>
        )}
        
        {gameState === 'playing' && (
          <>
            <button onClick={pauseGame} className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
              <Pause size={18} /> Pausar
            </button>
            <button onClick={skipChallenge} className="flex items-center gap-2 px-3 py-2 bg-zinc-700 text-zinc-300 rounded-lg">
              <SkipForward size={18} /> Saltar
            </button>
          </>
        )}
        
        {gameState === 'paused' && (
          <div className="flex items-center gap-2">
            <button onClick={resumeGame} className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors">
              <Play size={18} /> Continuar
            </button>
            <button onClick={resetGame} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors">
              <X size={18} /> Finalizar
            </button>
          </div>
        )}
        
        {gameState === 'final' && (
          <button onClick={newGame} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-lg">
            <Trophy size={18} /> Nueva Partida
          </button>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          {gameState === 'lobby' && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${showSettings ? 'bg-purple-500/30 text-purple-400' : 'bg-zinc-700/50 text-zinc-400 hover:text-white'}`}
            >
              <Settings size={18} />
            </button>
          )}
          <OBSOverlayUrl overlayParam="overlayPartyCo" title="el Party & Co" />
          <button onClick={newGame} className="p-2 bg-red-500/20 text-red-400 rounded-lg">
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Panel de pausa */}
      {gameState === 'paused' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
          <div className="text-5xl mb-3">⏸️</div>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">Juego Pausado</h3>
          <p className="text-zinc-400 mb-4">Ronda {roundNumber} • {sortedPlayers[0]?.username || 'Nadie'} lidera con {sortedPlayers[0]?.score || 0} pts</p>
          <div className="flex justify-center gap-3">
            <button 
              onClick={resumeGame} 
              className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
            >
              <Play size={20} /> Continuar Jugando
            </button>
            <button 
              onClick={resetGame} 
              className="flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium rounded-xl transition-colors"
            >
              <RotateCcw size={20} /> Volver al Inicio
            </button>
          </div>
        </div>
      )}

      {/* Info de puntuación */}
      {gameState !== 'lobby' && gameState !== 'paused' && (
        <div className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-4 py-2">
          <span className="text-zinc-400 text-sm">Ronda {roundNumber}</span>
          <span className="text-zinc-300 text-sm">
            <span className="text-yellow-400">{pointsPerWin} pts</span> por acierto • Meta: <span className="text-green-400">{pointsToWin} pts</span>
          </span>
        </div>
      )}

      {/* Configuración */}
      {showSettings && gameState === 'lobby' && (
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings size={16} className="text-purple-400" />
            <span className="text-sm font-medium text-white">Configuración</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Timer size={12} /> Tiempo (seg)
              </label>
              <input
                type="number"
                min="10"
                max="120"
                value={defaultTime}
                onChange={(e) => setDefaultTime(Math.max(10, parseInt(e.target.value) || 45))}
                className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-center"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Trophy size={12} /> Puntos por acierto
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={pointsPerWin}
                onChange={(e) => setPointsPerWin(Math.max(5, parseInt(e.target.value) || 15))}
                className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-center"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Crown size={12} /> Meta de puntos
              </label>
              <input
                type="number"
                min="20"
                max="500"
                step="10"
                value={pointsToWin}
                onChange={(e) => setPointsToWin(Math.max(20, parseInt(e.target.value) || 100))}
                className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-center"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Users size={12} /> Máx. jugadores
              </label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white"
              >
                <option value={0}>Sin límite</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      )}


      {/* Lobby */}
      {gameState === 'lobby' && (
        <>
          <div className="bg-zinc-800/50 rounded-xl p-4 text-center">
            <p className="text-zinc-300 mb-2">
              Escribe <span className="text-purple-400 font-bold">!CO</span> o <span className="text-purple-400 font-bold">!party</span> para unirte
            </p>
            <p className="text-zinc-500 text-xs">El juego continúa automáticamente hasta llegar a {pointsToWin} puntos</p>
          </div>
          
          {/* Tipos de prueba */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-300">Tipos de prueba:</p>
              <p className="text-[10px] text-zinc-500">{challenges.filter(c => enabledTypes.has(c.type)).length} pruebas activas</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CHALLENGE_NAMES) as ChallengeType[]).map(type => {
                const count = challenges.filter(c => c.type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => toggleChallengeType(type)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      enabledTypes.has(type) ? 'text-white' : 'bg-zinc-700/50 text-zinc-500'
                    }`}
                    style={{ backgroundColor: enabledTypes.has(type) ? CHALLENGE_COLORS[type] : undefined }}
                  >
                    {CHALLENGE_ICONS[type]}
                    {CHALLENGE_NAMES[type]}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${enabledTypes.has(type) ? 'bg-white/20' : 'bg-zinc-600'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Editor */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <button
              onClick={() => setShowEditor(!showEditor)}
              className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white"
            >
              <Plus size={16} />
              {showEditor ? 'Ocultar editor' : 'Añadir pruebas'}
            </button>
            
            {showEditor && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as ChallengeType)}
                    className="px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                  >
                    {(Object.keys(CHALLENGE_NAMES) as ChallengeType[]).map(type => (
                      <option key={type} value={type}>{CHALLENGE_NAMES[type]}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={editType === 'tabu' ? 'PALABRA' : 'Título...'}
                    className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                  />
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    placeholder="Respuesta..."
                    className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                  />
                  {editType === 'tabu' && (
                    <input
                      type="text"
                      value={editForbidden}
                      onChange={(e) => setEditForbidden(e.target.value)}
                      placeholder="Prohibidas (separadas por coma)"
                      className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                    />
                  )}
                  <button onClick={addCustomChallenge} className="px-4 py-2 bg-purple-500 text-white rounded-lg">
                    <Plus size={16} />
                  </button>
                </div>
                
                {/* IA Generator */}
                <div className="flex gap-2 pt-2 border-t border-zinc-700">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Tema para generar con IA..."
                    className="flex-1 px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                  />
                  <button
                    onClick={generateWithAI}
                    disabled={isGenerating || !aiTopic.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-50 text-white rounded-lg text-sm"
                  >
                    <Sparkles size={16} className={isGenerating ? 'animate-spin' : ''} />
                    {isGenerating ? '...' : 'IA'}
                  </button>
                </div>
                
                {customChallenges.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {customChallenges.map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-xs bg-zinc-700/50 rounded px-2 py-1">
                        <span style={{ color: CHALLENGE_COLORS[c.type] }}>{CHALLENGE_ICONS[c.type]}</span>
                        <span className="flex-1 truncate text-zinc-300">{c.title}</span>
                        <button onClick={() => removeCustomChallenge(c.id)} className="text-red-400">
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


      {/* Selector de Tabú (3 opciones) */}
      {showTabuSelector && (
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl p-4">
          <p className="text-white font-medium mb-3 text-center">🎯 Elige una palabra para describir:</p>
          <div className="grid grid-cols-3 gap-3">
            {tabuOptions.map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => selectTabuOption(opt)}
                className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-center transition-all"
              >
                <span className="text-2xl font-bold text-white block mb-2">{opt.title}</span>
                <div className="flex flex-wrap gap-1 justify-center">
                  {opt.forbidden?.slice(0, 3).map((f, j) => (
                    <span key={j} className="text-xs px-2 py-0.5 bg-red-500/30 text-red-300 rounded">
                      {f}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prueba activa */}
      {gameState === 'playing' && currentChallenge && !showTabuSelector && (
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
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              isWaitingForDraw ? 'bg-yellow-500/50' :
              timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-zinc-700'
            }`}>
              <Timer size={16} className="text-white" />
              <span className="text-white font-bold">
                {isWaitingForDraw ? '⏸️' : `${timeLeft}s`}
              </span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentChallenge.title}
          </h2>
          
          {/* Palabras prohibidas para Tabú */}
          {currentChallenge.type === 'tabu' && currentChallenge.forbidden && (
            <div className="mb-4">
              <p className="text-red-400 text-xs mb-2">🚫 Palabras prohibidas:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {currentChallenge.forbidden.map((word, i) => (
                  <span key={i} className="px-3 py-1 bg-red-500/30 text-red-300 rounded-lg text-sm font-medium">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-zinc-400 text-sm mb-4">
            {currentChallenge.description}
          </p>
          
          {winner && (
            <div className="mt-4 p-4 bg-green-500/20 rounded-lg animate-pulse">
              <Check size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-bold text-xl">
                ¡{winner.username} ha acertado!
              </p>
              <p className="text-green-300 text-sm">+{pointsPerWin} puntos</p>
            </div>
          )}
          
          {!winner && timeLeft === 0 && (
            <div className="mt-4 p-4 bg-red-500/20 rounded-lg">
              <X size={32} className="text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-bold">¡Tiempo agotado!</p>
              {currentChallenge.answer && (
                <p className="text-zinc-400 text-sm mt-1">Era: {currentChallenge.answer}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pizarra de dibujo */}
      {showDrawingBoard && gameState === 'playing' && currentChallenge?.type === 'dibujo' && (
        <DrawingBoard 
          onClose={() => setShowDrawingBoard(false)} 
          onFirstDraw={() => setIsWaitingForDraw(false)}
          onPauseTimer={() => setIsWaitingForDraw(true)}
        />
      )}

      {/* Final */}
      {gameState === 'final' && sortedPlayers[0] && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-8 text-center">
          <Crown size={64} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-3xl font-bold text-white mb-2">
            🎉 ¡{sortedPlayers[0].username} GANA! 🎉
          </h2>
          <p className="text-yellow-400 text-xl font-bold mb-4">
            {sortedPlayers[0].score} puntos
          </p>
          <p className="text-zinc-400">
            {sortedPlayers[0].wins} pruebas ganadas en {roundNumber} rondas
          </p>
        </div>
      )}

      {/* Tabla de jugadores */}
      <div className="bg-zinc-800/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">Jugadores ({players.size})</span>
          {gameState !== 'lobby' && sortedPlayers[0] && (
            <span className="ml-auto text-xs text-zinc-500">
              Líder: <span style={{ color: sortedPlayers[0].color }}>{sortedPlayers[0].username}</span> ({sortedPlayers[0].score}/{pointsToWin})
            </span>
          )}
          {players.size > 0 && gameState === 'lobby' && (
            <button 
              onClick={clearPlayers} 
              className="ml-auto p-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs flex items-center gap-1"
              title="Limpiar jugadores"
            >
              <Trash2 size={14} /> Limpiar
            </button>
          )}
        </div>
        
        {players.size === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">
            Esperando jugadores... (!CO o !party)
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
                <span className="flex-1 font-medium truncate" style={{ color: player.color }}>
                  {player.username}
                </span>
                <span className="text-purple-400 font-bold">{player.score}</span>
                <span className="text-zinc-500 text-xs">({player.wins})</span>
                {gameState === 'lobby' && (
                  <button
                    onClick={() => removePlayer(player.oderId)}
                    className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded transition-colors"
                    title="Eliminar jugador"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyCo;
