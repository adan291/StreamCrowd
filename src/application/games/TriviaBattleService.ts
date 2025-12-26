/**
 * TriviaBattleService - Juego de Trivia con múltiples modos
 * 
 * Soporta:
 * - Categorías predefinidas (8 categorías)
 * - Generación de preguntas con IA (Gemini/OpenAI)
 * - Categorías personalizadas guardadas
 * - Sistema de puntuación con streaks y bonus por tiempo
 */

import { BaseGameService, BaseGameState, GameConfig } from '../services/GameService';
import type { ChatMessage } from '../../domain/ports/IChatProvider';

// ============ Types ============

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
}

export interface TriviaPlayer {
  oderId: string;
  username: string;
  color: string;
  score: number;
  streak: number;
  lastAnswer: number | null;
  answeredCurrent: boolean;
}

export interface SavedCategory {
  id: string;
  name: string;
  topic: string;
  questions: TriviaQuestion[];
  createdAt: number;
}

export type TriviaPhase = 'setup' | 'question' | 'results' | 'final';
export type TriviaMode = 'manual' | 'category' | 'ai';

export interface TriviaState extends BaseGameState {
  phase: TriviaPhase;
  mode: TriviaMode;
  questions: TriviaQuestion[];
  currentQuestionIndex: number;
  timeLeft: number;
  triviaPlayers: Map<string, TriviaPlayer>;
  showCorrect: boolean;
  answerCounts: number[];
  selectedCategories: string[];
  selectedCustomCategories: string[];
  questionTime: number;
  questionsPerCategory: number;
}

// ============ Constants ============

const GAME_CONFIG: GameConfig = {
  gameId: 'trivia_battle',
  channelName: 'trivia_battle_sync',
  storageKey: 'trivia_battle_state',
  maxPlayers: 100,
  joinCommands: [],
  autoSync: true,
};

const CUSTOM_QUESTIONS_KEY = 'trivia_custom_questions';

const INITIAL_STATE: TriviaState = {
  gameState: 'idle',
  players: [],
  round: 1,
  startTime: null,
  endTime: null,
  phase: 'setup',
  mode: 'category',
  questions: [],
  currentQuestionIndex: 0,
  timeLeft: 0,
  triviaPlayers: new Map(),
  showCorrect: false,
  answerCounts: [0, 0, 0, 0],
  selectedCategories: ['general'],
  selectedCustomCategories: [],
  questionTime: 15,
  questionsPerCategory: 3,
};

// Banco de preguntas predefinidas
export const QUESTION_BANK: Array<{ id: string; name: string; questions: TriviaQuestion[] }> = [
  {
    id: 'general',
    name: 'Cultura General',
    questions: [
      { id: 'g1', question: '¿Cuál es el planeta más grande del sistema solar?', options: ['Marte', 'Júpiter', 'Saturno', 'Neptuno'], correctIndex: 1, timeLimit: 15 },
      { id: 'g2', question: '¿En qué año llegó el hombre a la Luna?', options: ['1965', '1969', '1972', '1975'], correctIndex: 1, timeLimit: 15 },
      { id: 'g3', question: '¿Cuál es el océano más grande?', options: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], correctIndex: 2, timeLimit: 15 },
      { id: 'g4', question: '¿Cuántos huesos tiene el cuerpo humano adulto?', options: ['186', '206', '226', '256'], correctIndex: 1, timeLimit: 15 },
      { id: 'g5', question: '¿Cuál es el país más grande del mundo?', options: ['China', 'Estados Unidos', 'Canadá', 'Rusia'], correctIndex: 3, timeLimit: 15 },
    ]
  },
  {
    id: 'gaming',
    name: 'Videojuegos',
    questions: [
      { id: 'vg1', question: '¿En qué año se lanzó el primer Super Mario Bros?', options: ['1983', '1985', '1987', '1989'], correctIndex: 1, timeLimit: 15 },
      { id: 'vg2', question: '¿Cuál es el videojuego más vendido de la historia?', options: ['GTA V', 'Minecraft', 'Tetris', 'Wii Sports'], correctIndex: 1, timeLimit: 15 },
      { id: 'vg3', question: '¿Qué empresa creó PlayStation?', options: ['Nintendo', 'Microsoft', 'Sony', 'Sega'], correctIndex: 2, timeLimit: 15 },
      { id: 'vg4', question: '¿Cómo se llama el protagonista de The Legend of Zelda?', options: ['Zelda', 'Link', 'Ganon', 'Epona'], correctIndex: 1, timeLimit: 15 },
      { id: 'vg5', question: '¿Qué juego popularizó el Battle Royale?', options: ['Fortnite', 'PUBG', 'Apex Legends', 'H1Z1'], correctIndex: 1, timeLimit: 15 },
    ]
  },
  {
    id: 'movies',
    name: 'Cine y Series',
    questions: [
      { id: 'm1', question: '¿Quién dirigió Titanic?', options: ['Steven Spielberg', 'James Cameron', 'Christopher Nolan', 'Martin Scorsese'], correctIndex: 1, timeLimit: 15 },
      { id: 'm2', question: '¿Cuántas películas hay de Harry Potter?', options: ['6', '7', '8', '9'], correctIndex: 2, timeLimit: 15 },
      { id: 'm3', question: '¿En qué año se estrenó El Señor de los Anillos: La Comunidad del Anillo?', options: ['1999', '2001', '2003', '2005'], correctIndex: 1, timeLimit: 15 },
      { id: 'm4', question: '¿Qué actor interpreta a Iron Man en el MCU?', options: ['Chris Evans', 'Chris Hemsworth', 'Robert Downey Jr.', 'Mark Ruffalo'], correctIndex: 2, timeLimit: 15 },
      { id: 'm5', question: '¿Cuál fue la primera película de Pixar?', options: ['Buscando a Nemo', 'Toy Story', 'Monsters Inc.', 'Bichos'], correctIndex: 1, timeLimit: 15 },
    ]
  },
  {
    id: 'music',
    name: 'Música',
    questions: [
      { id: 'mu1', question: '¿De qué país es originaria la banda Queen?', options: ['Estados Unidos', 'Reino Unido', 'Australia', 'Canadá'], correctIndex: 1, timeLimit: 15 },
      { id: 'mu2', question: '¿Quién es conocido como el "Rey del Pop"?', options: ['Elvis Presley', 'Prince', 'Michael Jackson', 'Freddie Mercury'], correctIndex: 2, timeLimit: 15 },
      { id: 'mu3', question: '¿Cuántos miembros tenía The Beatles?', options: ['3', '4', '5', '6'], correctIndex: 1, timeLimit: 15 },
      { id: 'mu4', question: '¿Qué instrumento toca Slash de Guns N\' Roses?', options: ['Batería', 'Bajo', 'Guitarra', 'Teclado'], correctIndex: 2, timeLimit: 15 },
      { id: 'mu5', question: '¿En qué década se popularizó el reggaetón?', options: ['1980s', '1990s', '2000s', '2010s'], correctIndex: 2, timeLimit: 15 },
    ]
  },
  {
    id: 'geography',
    name: 'Geografía',
    questions: [
      { id: 'geo1', question: '¿Cuál es la capital de Australia?', options: ['Sídney', 'Melbourne', 'Canberra', 'Brisbane'], correctIndex: 2, timeLimit: 15 },
      { id: 'geo2', question: '¿Cuál es el río más largo del mundo?', options: ['Amazonas', 'Nilo', 'Yangtsé', 'Misisipi'], correctIndex: 1, timeLimit: 15 },
      { id: 'geo3', question: '¿En qué continente está Egipto?', options: ['Asia', 'Europa', 'África', 'Oceanía'], correctIndex: 2, timeLimit: 15 },
      { id: 'geo4', question: '¿Cuál es el país con más habitantes?', options: ['India', 'China', 'Estados Unidos', 'Indonesia'], correctIndex: 0, timeLimit: 15 },
      { id: 'geo5', question: '¿Cuál es la montaña más alta del mundo?', options: ['K2', 'Everest', 'Kilimanjaro', 'Mont Blanc'], correctIndex: 1, timeLimit: 15 },
    ]
  },
  {
    id: 'tech',
    name: 'Tecnología',
    questions: [
      { id: 't1', question: '¿Quién fundó Microsoft?', options: ['Steve Jobs', 'Bill Gates', 'Mark Zuckerberg', 'Elon Musk'], correctIndex: 1, timeLimit: 15 },
      { id: 't2', question: '¿En qué año se lanzó el primer iPhone?', options: ['2005', '2007', '2009', '2011'], correctIndex: 1, timeLimit: 15 },
      { id: 't3', question: '¿Qué significa "HTML"?', options: ['HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Management Language'], correctIndex: 0, timeLimit: 20 },
      { id: 't4', question: '¿Cuál fue la primera red social masiva?', options: ['Facebook', 'MySpace', 'Twitter', 'LinkedIn'], correctIndex: 1, timeLimit: 15 },
      { id: 't5', question: '¿Qué empresa creó Android?', options: ['Apple', 'Microsoft', 'Google', 'Samsung'], correctIndex: 2, timeLimit: 15 },
    ]
  },
  {
    id: 'sports',
    name: 'Deportes',
    questions: [
      { id: 's1', question: '¿Cuántos jugadores tiene un equipo de fútbol en el campo?', options: ['9', '10', '11', '12'], correctIndex: 2, timeLimit: 15 },
      { id: 's2', question: '¿En qué país se inventó el baloncesto?', options: ['Estados Unidos', 'Canadá', 'Reino Unido', 'España'], correctIndex: 0, timeLimit: 15 },
      { id: 's3', question: '¿Cuántos Grand Slams hay en tenis?', options: ['3', '4', '5', '6'], correctIndex: 1, timeLimit: 15 },
      { id: 's4', question: '¿Cada cuántos años se celebran los Juegos Olímpicos?', options: ['2', '3', '4', '5'], correctIndex: 2, timeLimit: 15 },
      { id: 's5', question: '¿Quién tiene más Balones de Oro?', options: ['Cristiano Ronaldo', 'Lionel Messi', 'Johan Cruyff', 'Michel Platini'], correctIndex: 1, timeLimit: 15 },
    ]
  },
  {
    id: 'food',
    name: 'Gastronomía',
    questions: [
      { id: 'f1', question: '¿De qué país es originaria la pizza?', options: ['España', 'Francia', 'Italia', 'Grecia'], correctIndex: 2, timeLimit: 15 },
      { id: 'f2', question: '¿Cuál es el ingrediente principal del guacamole?', options: ['Tomate', 'Aguacate', 'Chile', 'Cebolla'], correctIndex: 1, timeLimit: 15 },
      { id: 'f3', question: '¿De qué país es el sushi?', options: ['China', 'Corea', 'Japón', 'Tailandia'], correctIndex: 2, timeLimit: 15 },
      { id: 'f4', question: '¿Qué fruta es conocida como "la reina de las frutas"?', options: ['Mango', 'Piña', 'Fresa', 'Mangostán'], correctIndex: 3, timeLimit: 15 },
      { id: 'f5', question: '¿Cuál es la especia más cara del mundo?', options: ['Vainilla', 'Azafrán', 'Canela', 'Cardamomo'], correctIndex: 1, timeLimit: 15 },
    ]
  },
];


// ============ Service Class ============

export class TriviaBattleService extends BaseGameService<TriviaState> {
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private customCategories: SavedCategory[] = [];
  
  constructor() {
    super(GAME_CONFIG, { ...INITIAL_STATE, triviaPlayers: new Map() });
    this.loadCustomCategories();
  }
  
  // ============ Getters ============
  
  getCurrentQuestion(): TriviaQuestion | null {
    return this.state.questions[this.state.currentQuestionIndex] ?? null;
  }
  
  getTriviaPlayers(): TriviaPlayer[] {
    return Array.from(this.state.triviaPlayers.values());
  }
  
  getSortedPlayers(): TriviaPlayer[] {
    return this.getTriviaPlayers().sort((a, b) => b.score - a.score);
  }
  
  getTopPlayers(count: number = 10): TriviaPlayer[] {
    return this.getSortedPlayers().slice(0, count);
  }
  
  getCustomCategories(): SavedCategory[] {
    return [...this.customCategories];
  }
  
  getQuestionBank(): typeof QUESTION_BANK {
    return QUESTION_BANK;
  }
  
  // ============ Configuration ============
  
  setMode(mode: TriviaMode): void {
    this.setState({ ...this.state, mode });
  }
  
  setQuestionTime(seconds: number): void {
    this.setState({
      ...this.state,
      questionTime: Math.max(5, Math.min(60, seconds)),
    });
  }
  
  setQuestionsPerCategory(count: number): void {
    this.setState({
      ...this.state,
      questionsPerCategory: Math.max(1, Math.min(10, count)),
    });
  }
  
  toggleCategory(categoryId: string): void {
    const { selectedCategories } = this.state;
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(c => c !== categoryId)
      : [...selectedCategories, categoryId];
    
    this.setState({ ...this.state, selectedCategories: newCategories });
  }
  
  toggleCustomCategory(categoryId: string): void {
    const { selectedCustomCategories } = this.state;
    const newCategories = selectedCustomCategories.includes(categoryId)
      ? selectedCustomCategories.filter(c => c !== categoryId)
      : [...selectedCustomCategories, categoryId];
    
    this.setState({ ...this.state, selectedCustomCategories: newCategories });
  }
  
  // ============ Question Management ============
  
  addQuestion(question: TriviaQuestion): void {
    this.setState({
      ...this.state,
      questions: [...this.state.questions, question],
    });
  }
  
  addQuestions(questions: TriviaQuestion[]): void {
    this.setState({
      ...this.state,
      questions: [...this.state.questions, ...questions],
    });
  }
  
  removeQuestion(questionId: string): void {
    this.setState({
      ...this.state,
      questions: this.state.questions.filter(q => q.id !== questionId),
    });
  }
  
  clearQuestions(): void {
    this.setState({ ...this.state, questions: [] });
  }
  
  generateFromCategories(): TriviaQuestion[] {
    const allQuestions: TriviaQuestion[] = [];
    const { selectedCategories, selectedCustomCategories, questionsPerCategory, questionTime } = this.state;
    
    // Default categories
    selectedCategories.forEach(catId => {
      const category = QUESTION_BANK.find(c => c.id === catId);
      if (category) {
        const shuffled = [...category.questions].sort(() => Math.random() - 0.5);
        const questionsWithTime = shuffled.slice(0, questionsPerCategory).map(q => ({
          ...q,
          timeLimit: questionTime,
        }));
        allQuestions.push(...questionsWithTime);
      }
    });
    
    // Custom categories
    selectedCustomCategories.forEach(catId => {
      const category = this.customCategories.find(c => c.id === catId);
      if (category) {
        const shuffled = [...category.questions].sort(() => Math.random() - 0.5);
        const questionsWithTime = shuffled.slice(0, questionsPerCategory).map(q => ({
          ...q,
          timeLimit: questionTime,
        }));
        allQuestions.push(...questionsWithTime);
      }
    });
    
    const shuffledAll = allQuestions.sort(() => Math.random() - 0.5);
    this.setState({ ...this.state, questions: shuffledAll });
    
    return shuffledAll;
  }
  
  // ============ AI Generation ============
  
  async generateWithAI(
    topic: string,
    count: number,
    apiCall: (prompt: string) => Promise<string>
  ): Promise<TriviaQuestion[]> {
    const prompt = `Genera ${count} preguntas de trivia sobre "${topic}" para un juego de stream.
Responde SOLO con un JSON válido con esta estructura exacta:
{
  "questions": [
    {
      "question": "¿Pregunta aquí?",
      "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
      "correctIndex": 0
    }
  ]
}
IMPORTANTE: 
- Cada pregunta debe tener exactamente 4 opciones
- correctIndex es el índice (0-3) de la respuesta correcta
- Las preguntas deben ser variadas y de dificultad media
- Responde SOLO el JSON, sin texto adicional`;

    const text = await apiCall(prompt);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo parsear la respuesta de la IA');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Formato de respuesta inválido');
    }
    
    const newQuestions: TriviaQuestion[] = parsed.questions.map((q: any, i: number) => ({
      id: `ai_${Date.now()}_${i}`,
      question: q.question,
      options: q.options.slice(0, 4),
      correctIndex: Math.min(q.correctIndex, 3),
      timeLimit: this.state.questionTime,
    }));
    
    // Add to current questions
    this.addQuestions(newQuestions);
    
    // Save as custom category
    this.saveCustomCategory(topic, newQuestions);
    
    return newQuestions;
  }
  
  // ============ Custom Categories ============
  
  private loadCustomCategories(): void {
    try {
      const saved = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
      this.customCategories = saved ? JSON.parse(saved) : [];
    } catch {
      this.customCategories = [];
    }
  }
  
  saveCustomCategory(topic: string, questions: TriviaQuestion[]): SavedCategory {
    const existingIndex = this.customCategories.findIndex(
      c => c.topic.toLowerCase() === topic.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      // Add to existing category
      this.customCategories[existingIndex].questions = [
        ...this.customCategories[existingIndex].questions,
        ...questions,
      ];
      localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(this.customCategories));
      return this.customCategories[existingIndex];
    }
    
    // Create new category
    const newCategory: SavedCategory = {
      id: `custom_${Date.now()}`,
      name: topic,
      topic,
      questions,
      createdAt: Date.now(),
    };
    
    this.customCategories.push(newCategory);
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(this.customCategories));
    
    return newCategory;
  }
  
  deleteCustomCategory(categoryId: string): void {
    this.customCategories = this.customCategories.filter(c => c.id !== categoryId);
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(this.customCategories));
    
    // Remove from selection if selected
    if (this.state.selectedCustomCategories.includes(categoryId)) {
      this.toggleCustomCategory(categoryId);
    }
  }
  
  // ============ Game Lifecycle ============
  
  startGame(): void {
    if (this.state.questions.length === 0) return;
    
    this.setState({
      ...this.state,
      gameState: 'playing',
      phase: 'question',
      currentQuestionIndex: 0,
      triviaPlayers: new Map(),
      timeLeft: this.state.questions[0].timeLimit,
      answerCounts: [0, 0, 0, 0],
      showCorrect: false,
      startTime: Date.now(),
    });
    
    this.startTimer();
  }
  
  nextQuestion(): void {
    const nextIndex = this.state.currentQuestionIndex + 1;
    
    if (nextIndex >= this.state.questions.length) {
      this.setState({
        ...this.state,
        phase: 'final',
        gameState: 'finished',
        endTime: Date.now(),
      });
      return;
    }
    
    // Reset answeredCurrent for all players
    const newPlayers = new Map(this.state.triviaPlayers);
    newPlayers.forEach((player, key) => {
      newPlayers.set(key, { ...player, answeredCurrent: false, lastAnswer: null });
    });
    
    this.setState({
      ...this.state,
      phase: 'question',
      currentQuestionIndex: nextIndex,
      timeLeft: this.state.questions[nextIndex].timeLimit,
      answerCounts: [0, 0, 0, 0],
      showCorrect: false,
      triviaPlayers: newPlayers,
    });
    
    this.startTimer();
  }
  
  override reset(): void {
    this.stopTimer();
    this.setState({
      ...INITIAL_STATE,
      triviaPlayers: new Map(),
      questionTime: this.state.questionTime,
      questionsPerCategory: this.state.questionsPerCategory,
      selectedCategories: this.state.selectedCategories,
      selectedCustomCategories: this.state.selectedCustomCategories,
    });
  }
  
  // ============ Timer ============
  
  private startTimer(): void {
    this.stopTimer();
    
    this.timerInterval = setInterval(() => {
      if (this.state.timeLeft <= 1) {
        this.timeUp();
      } else {
        this.setState({
          ...this.state,
          timeLeft: this.state.timeLeft - 1,
        });
      }
    }, 1000);
  }
  
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  private timeUp(): void {
    this.stopTimer();
    this.setState({
      ...this.state,
      showCorrect: true,
      phase: 'results',
    });
  }
  
  // ============ Answer Processing ============
  
  processAnswer(oderId: string, username: string, color: string, answerIndex: number): boolean {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion || this.state.phase !== 'question') return false;
    if (answerIndex < 0 || answerIndex >= currentQuestion.options.length) return false;
    
    const existing = this.state.triviaPlayers.get(oderId);
    if (existing?.answeredCurrent) return false; // Already answered
    
    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const timeBonus = Math.floor(this.state.timeLeft / 2);
    const streakBonus = existing?.streak ?? 0;
    const points = isCorrect ? 10 + timeBonus + (streakBonus * 2) : 0;
    
    const newPlayers = new Map(this.state.triviaPlayers);
    newPlayers.set(oderId, {
      oderId,
      username,
      color,
      score: (existing?.score ?? 0) + points,
      streak: isCorrect ? (existing?.streak ?? 0) + 1 : 0,
      lastAnswer: answerIndex,
      answeredCurrent: true,
    });
    
    const newAnswerCounts = [...this.state.answerCounts];
    newAnswerCounts[answerIndex]++;
    
    this.setState({
      ...this.state,
      triviaPlayers: newPlayers,
      answerCounts: newAnswerCounts,
    });
    
    return isCorrect;
  }
  
  // ============ Message Processing ============
  
  protected processGameMessage(message: ChatMessage): void {
    if (this.state.phase !== 'question') return;
    
    const msgLower = message.message.toLowerCase().trim();
    const oderId = message.userId || message.username;
    
    let answerIndex = -1;
    if (['1', 'a'].includes(msgLower)) answerIndex = 0;
    else if (['2', 'b'].includes(msgLower)) answerIndex = 1;
    else if (['3', 'c'].includes(msgLower)) answerIndex = 2;
    else if (['4', 'd'].includes(msgLower)) answerIndex = 3;
    
    if (answerIndex >= 0) {
      this.processAnswer(
        oderId,
        message.displayName || message.username,
        message.color || '#a970ff',
        answerIndex
      );
    }
  }
  
  // ============ Overlay Data ============
  
  protected getOverlayData(): Record<string, unknown> {
    return {
      gameState: this.state.gameState,
      phase: this.state.phase,
      currentQuestion: this.getCurrentQuestion(),
      questionIndex: this.state.currentQuestionIndex,
      totalQuestions: this.state.questions.length,
      timeLeft: this.state.timeLeft,
      showCorrect: this.state.showCorrect,
      answerCounts: this.state.answerCounts,
      topPlayers: this.getTopPlayers(10),
    };
  }
  
  // ============ Cleanup ============
  
  override dispose(): void {
    this.stopTimer();
    super.dispose();
  }
}

// ============ Singleton ============

let instance: TriviaBattleService | null = null;

export function getTriviaBattleService(): TriviaBattleService {
  if (!instance) {
    instance = new TriviaBattleService();
  }
  return instance;
}

export function resetTriviaBattleService(): void {
  if (instance) {
    instance.dispose();
    instance = null;
  }
}
