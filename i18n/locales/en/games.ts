/**
 * English (EN) Games Translations
 * 
 * Games translations for interactive gaming functionality.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { GamesTranslations } from '../../types';

/**
 * Games English translations
 * Interactive games and entertainment features
 */
export const games: GamesTranslations = {
  title: 'Games',
  subtitle: 'Interactive games for your stream',
  piumBall: 'Pium Ball',
  piumDesc: 'Interactive ball game with chat participation',
  casinoRoulette: 'Casino Roulette',
  rouletteDesc: 'Betting roulette with chat integration',
  active: 'Active',
  paused: 'Paused',
  balls: 'Balls',
  bets: 'Bets',
  openOverlay: 'Open Overlay',
  clearBalls: 'Clear Balls',
  spin: 'Spin',
  spinning: 'Spinning',
  reset: 'Reset',
  autoSpin: 'Auto Spin',
  bettingOpen: 'Betting Open',
  bettingClosed: 'Betting Closed',
  winners: 'Winners',
  waitingBets: 'Waiting for bets',
  waitingPium: 'Waiting for pium',
  
  // New games
  chatFishing: 'Chat Fishing',
  fishingDesc: 'Fishing game with chat commands',
  hotPotato: 'Hot Potato',
  potatoDesc: 'Pass the potato before time runs out',
  triviaBattle: 'Trivia Battle',
  triviaDesc: 'Knowledge competition with multiple rounds',
  fish: 'Fish',
  fishing: 'Fishing',
  cast: 'Cast',
  catch: 'Catch',
  points: 'Points',
  round: 'Round',
  join: 'Join',
  pass: 'Pass',
  eliminated: 'Eliminated',
  waiting: 'Waiting',
  question: 'Question',
  answer: 'Answer',
  correct: 'Correct',
  wrong: 'Wrong',
  streak: 'Streak',
  leaderboard: 'Leaderboard',
  startGame: 'Start Game',
  nextRound: 'Next Round',
  finalResults: 'Final Results',
  
  // Battleship & Duck Hunt
  battleship: 'Battleship',
  battleshipDesc: 'Classic battleship game with chat',
  duckHunt: 'Duck Hunt',
  duckHuntDesc: 'Hunt ducks with chat commands',
  ships: 'Ships',
  shipsRemaining: 'Ships remaining',
  hit: 'Hit',
  miss: 'Miss',
  sunk: 'Sunk',
  allShipsSunk: 'All ships sunk',
  shots: 'Shots',
  ducks: 'Ducks',
  shoot: 'Shoot',
  accuracy: 'Accuracy',
};

export default games;