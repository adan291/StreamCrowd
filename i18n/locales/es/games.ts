/**
 * Spanish translations for Games feature
 * 
 * Contains all translations related to interactive games functionality.
 * Includes: Pium Ball, Casino Roulette, Chat Fishing, Hot Potato, Trivia Battle,
 * Battleship, Duck Hunt, and other interactive stream games.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { GamesTranslations } from '../../types';

export const games: GamesTranslations = {
  // General games UI
  title: 'Juegos del Stream',
  subtitle: 'Juegos interactivos para tu stream',
  
  // Pium Ball game
  piumBall: 'Pium Ball',
  piumDesc: 'Los viewers lanzan bolas con !pium',
  
  // Casino Roulette game
  casinoRoulette: 'Ruleta Casino',
  rouletteDesc: 'Apuesta con !ruleta-27',
  
  // Game states
  active: 'Activo',
  paused: 'Pausado',
  
  // Game elements
  balls: 'bolas',
  bets: 'apuestas',
  
  // Actions
  openOverlay: 'Abrir Overlay OBS',
  clearBalls: 'Limpiar bolas',
  spin: 'Girar',
  spinning: 'Girando...',
  reset: 'Reiniciar',
  autoSpin: 'Auto-spin',
  
  // Betting states
  bettingOpen: 'Apuestas abiertas',
  bettingClosed: 'Apuestas cerradas',
  
  // Results
  winners: 'ganador(es)',
  
  // Waiting states
  waitingBets: 'Esperando apuestas...',
  waitingPium: 'Esperando !pium del chat...',
  
  // Chat Fishing game
  chatFishing: 'Pesca de Chat',
  fishingDesc: 'Pesca mensajes del chat',
  fish: 'peces',
  fishing: 'Pescando...',
  cast: '¡Pescar!',
  catch: '¡Captura!',
  
  // Hot Potato game
  hotPotato: 'Patata Caliente',
  potatoDesc: 'Pasa la papa con !pass',
  pass: 'Pasar',
  
  // Trivia Battle game
  triviaBattle: 'Trivia Battle',
  triviaDesc: 'Responde preguntas con 1-4',
  question: 'Pregunta',
  answer: 'Respuesta',
  correct: '¡Correcto!',
  wrong: 'Incorrecto',
  streak: 'Racha',
  
  // Game mechanics
  points: 'pts',
  round: 'Ronda',
  join: 'Unirse',
  eliminated: 'eliminado',
  waiting: 'Esperando',
  leaderboard: 'Ranking',
  startGame: '¡Empezar!',
  nextRound: 'Siguiente',
  finalResults: '¡Resultados!',
  
  // Battleship game
  battleship: 'Hundir la Flota',
  battleshipDesc: 'Dispara con coordenadas A1-J10',
  ships: 'barcos',
  shipsRemaining: 'barcos restantes',
  hit: '¡Tocado!',
  miss: 'Agua',
  sunk: '¡Hundido!',
  allShipsSunk: '¡Todos los barcos hundidos!',
  shots: 'disparos',
  
  // Duck Hunt game
  duckHunt: 'Caza de Patos',
  duckHuntDesc: 'Escribe !pato para jugar',
  ducks: 'patos',
  shoot: 'Disparar',
  accuracy: 'Precisión',
};