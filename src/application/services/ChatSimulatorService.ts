/**
 * ChatSimulatorService - Servicio para simular mensajes de chat
 * 
 * Permite probar dinámicas, juegos, encuestas, etc. sin conexión real a Twitch.
 * Genera mensajes aleatorios con diferentes patrones de comportamiento.
 */

import { TwitchMessage } from '../../../types';

// Nombres de usuario simulados
const FAKE_USERNAMES = [
  'StreamFan123', 'GamerPro99', 'TwitchViewer', 'ChatLurker', 'HypeMan2024',
  'NightOwl_TV', 'PixelWarrior', 'StreamSniper', 'CoolCat_Gaming', 'EpicGamer42',
  'ViewerOne', 'ChatMaster', 'StreamLover', 'GamingQueen', 'ProPlayer_X',
  'TwitchKing', 'StreamHero', 'ChatNinja', 'GamerGirl_', 'ViewerPrime',
  'LuckyViewer', 'StreamBoss', 'ChatChamp', 'GamingLegend', 'TwitchStar',
  'ViewerElite', 'StreamAce', 'ChatWizard', 'GamerDude', 'TwitchFan_',
  'StreamPunk', 'ChatRocker', 'GamingNerd', 'ViewerMax', 'TwitchPro',
  'StreamKid', 'ChatBeast', 'GamerZone', 'ViewerX99', 'TwitchLive',
];

// Colores de chat
const CHAT_COLORS = [
  '#FF0000', '#0000FF', '#008000', '#B22222', '#FF7F50',
  '#9ACD32', '#FF4500', '#2E8B57', '#DAA520', '#D2691E',
  '#5F9EA0', '#1E90FF', '#FF69B4', '#8A2BE2', '#00FF7F',
];

// Mensajes genéricos de chat
const GENERIC_MESSAGES = [
  'Hola!', 'Buenas!', 'Qué tal?', 'Vamos!', 'Dale!',
  'Jajaja', 'LOL', 'xD', 'KEKW', 'PogChamp',
  'Increíble!', 'Wow', 'GG', 'EZ', 'Nice',
  'Vamos streamer!', 'Eres el mejor', 'Me encanta', 'Genial', 'Top',
];

export interface SimulatorConfig {
  /** Mensajes por minuto (promedio) */
  messagesPerMinute: number;
  /** Probabilidad de que un mensaje sea un voto/respuesta relevante (0-1) */
  relevantMessageProbability: number;
  /** Número de usuarios únicos simulados */
  uniqueUsers: number;
  /** Variación en el timing (0-1, donde 0 es constante y 1 es muy variable) */
  timingVariation: number;
}

export interface SimulatorContext {
  /** Tipo de dinámica activa */
  type: 'poll' | 'game' | 'giveaway' | 'trivia' | 'generic';
  /** Opciones válidas para votos (ej: ['+1', '+2', '+3']) */
  voteOptions?: string[];
  /** Respuestas válidas para juegos (ej: ['pizza', 'hamburguesa']) */
  validAnswers?: string[];
  /** Comando para unirse (ej: '!co', '!join') */
  joinCommand?: string;
  /** Prefijo de voto (ej: '+', '#') */
  votePrefix?: string;
}

type MessageCallback = (message: TwitchMessage) => void;

export class ChatSimulatorService {
  private config: SimulatorConfig;
  private context: SimulatorContext;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private callbacks: Set<MessageCallback> = new Set();
  private usedUserIds: Map<string, { username: string; color: string }> = new Map();
  private messageCount: number = 0;

  constructor(config?: Partial<SimulatorConfig>) {
    this.config = {
      messagesPerMinute: config?.messagesPerMinute ?? 30,
      relevantMessageProbability: config?.relevantMessageProbability ?? 0.6,
      uniqueUsers: config?.uniqueUsers ?? 20,
      timingVariation: config?.timingVariation ?? 0.5,
    };
    this.context = { type: 'generic' };
  }

  /**
   * Configura el contexto de la simulación
   */
  setContext(context: SimulatorContext): void {
    this.context = context;
  }

  /**
   * Actualiza la configuración
   */
  setConfig(config: Partial<SimulatorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Si está corriendo, reiniciar con nueva config
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Suscribirse a mensajes simulados
   */
  onMessage(callback: MessageCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Iniciar simulación
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    
    const baseInterval = 60000 / this.config.messagesPerMinute;
    
    const scheduleNext = () => {
      if (!this.isRunning) return;
      
      // Calcular delay con variación
      const variation = this.config.timingVariation;
      const minDelay = baseInterval * (1 - variation);
      const maxDelay = baseInterval * (1 + variation);
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      
      this.intervalId = setTimeout(() => {
        this.generateMessage();
        scheduleNext();
      }, delay);
    };
    
    scheduleNext();
  }

  /**
   * Detener simulación
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Generar un mensaje único manualmente
   */
  generateSingleMessage(overrideMessage?: string): TwitchMessage {
    const user = this.getRandomUser();
    const message = overrideMessage || this.generateMessageContent();
    
    const msg: TwitchMessage = {
      id: `sim_${Date.now()}_${this.messageCount++}`,
      userId: user.oderId,
      username: user.username,
      message,
      color: user.color,
      timestamp: Date.now(),
      isSubscriber: Math.random() > 0.7,
    };
    
    this.notifyCallbacks(msg);
    return msg;
  }

  /**
   * Generar múltiples mensajes de golpe (burst)
   */
  generateBurst(count: number, delayBetween: number = 100): void {
    let i = 0;
    const sendNext = () => {
      if (i >= count) return;
      this.generateSingleMessage();
      i++;
      setTimeout(sendNext, delayBetween);
    };
    sendNext();
  }

  /**
   * Simular que varios usuarios se unen a un juego
   */
  simulateJoins(count: number, command: string = '!join'): void {
    const usersToJoin = Math.min(count, this.config.uniqueUsers);
    for (let i = 0; i < usersToJoin; i++) {
      setTimeout(() => {
        this.generateSingleMessage(command);
      }, i * 200 + Math.random() * 300);
    }
  }

  /**
   * Simular votos para una encuesta
   */
  simulateVotes(options: string[], count: number): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        this.generateSingleMessage(randomOption);
      }, i * 150 + Math.random() * 200);
    }
  }

  /**
   * Simular respuestas para un juego de trivia
   */
  simulateAnswers(correctAnswer: string, wrongAnswers: string[], correctProbability: number = 0.3): void {
    // Generar varias respuestas
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        const isCorrect = Math.random() < correctProbability;
        const answer = isCorrect 
          ? correctAnswer 
          : wrongAnswers[Math.floor(Math.random() * wrongAnswers.length)];
        this.generateSingleMessage(answer);
      }, i * 500 + Math.random() * 1000);
    }
  }

  // ============ Private Methods ============

  private generateMessage(): void {
    const message = this.generateMessageContent();
    this.generateSingleMessage(message);
  }

  private generateMessageContent(): string {
    const isRelevant = Math.random() < this.config.relevantMessageProbability;
    
    if (isRelevant) {
      return this.generateRelevantMessage();
    }
    
    return this.generateGenericMessage();
  }

  private generateRelevantMessage(): string {
    switch (this.context.type) {
      case 'poll':
        if (this.context.voteOptions && this.context.voteOptions.length > 0) {
          return this.context.voteOptions[Math.floor(Math.random() * this.context.voteOptions.length)];
        }
        const prefix = this.context.votePrefix || '+';
        return `${prefix}${Math.floor(Math.random() * 4) + 1}`;
        
      case 'game':
      case 'trivia':
        if (this.context.validAnswers && this.context.validAnswers.length > 0) {
          return this.context.validAnswers[Math.floor(Math.random() * this.context.validAnswers.length)];
        }
        if (this.context.joinCommand) {
          return this.context.joinCommand;
        }
        return GENERIC_MESSAGES[Math.floor(Math.random() * GENERIC_MESSAGES.length)];
        
      case 'giveaway':
        if (this.context.joinCommand) {
          return this.context.joinCommand;
        }
        return '!join';
        
      default:
        return this.generateGenericMessage();
    }
  }

  private generateGenericMessage(): string {
    return GENERIC_MESSAGES[Math.floor(Math.random() * GENERIC_MESSAGES.length)];
  }

  private getRandomUser(): { oderId: string; username: string; color: string } {
    // Reutilizar usuarios existentes o crear nuevos
    const existingUsers = Array.from(this.usedUserIds.entries());
    
    if (existingUsers.length < this.config.uniqueUsers && Math.random() > 0.7) {
      // Crear nuevo usuario
      const username = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)] + 
        Math.floor(Math.random() * 100);
      const oderId = `sim_user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const color = CHAT_COLORS[Math.floor(Math.random() * CHAT_COLORS.length)];
      
      this.usedUserIds.set(oderId, { username, color });
      return { oderId, username, color };
    }
    
    if (existingUsers.length > 0) {
      // Reutilizar usuario existente
      const [oderId, user] = existingUsers[Math.floor(Math.random() * existingUsers.length)];
      return { oderId, ...user };
    }
    
    // Fallback: crear usuario
    const username = FAKE_USERNAMES[0];
    const oderId = `sim_user_fallback`;
    const color = CHAT_COLORS[0];
    this.usedUserIds.set(oderId, { username, color });
    return { oderId, username, color };
  }

  private notifyCallbacks(message: TwitchMessage): void {
    this.callbacks.forEach(cb => cb(message));
  }

  /**
   * Resetear estado del simulador
   */
  reset(): void {
    this.stop();
    this.usedUserIds.clear();
    this.messageCount = 0;
    this.context = { type: 'generic' };
  }

  /**
   * Obtener estadísticas del simulador
   */
  getStats(): { isRunning: boolean; messageCount: number; uniqueUsers: number } {
    return {
      isRunning: this.isRunning,
      messageCount: this.messageCount,
      uniqueUsers: this.usedUserIds.size,
    };
  }
}

// Singleton instance
let simulatorInstance: ChatSimulatorService | null = null;

export function getChatSimulator(): ChatSimulatorService {
  if (!simulatorInstance) {
    simulatorInstance = new ChatSimulatorService();
  }
  return simulatorInstance;
}

export function resetChatSimulator(): void {
  if (simulatorInstance) {
    simulatorInstance.reset();
    simulatorInstance = null;
  }
}
