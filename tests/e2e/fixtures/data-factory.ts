/**
 * Data Factory for E2E Tests
 * Generates test data with sensible defaults
 */

// Poll data
export interface PollData {
  question: string;
  options: string[];
  duration?: number;
  maxVotesPerUser?: number;
}

// Prediction data
export interface PredictionData {
  title: string;
  outcomes: string[];
  duration: number;
}

// Giveaway data
export interface GiveawayData {
  title: string;
  keyword?: string;
  duration?: number;
  mode: 'viewers' | 'keyword' | 'subs';
  requireFollow?: boolean;
}

// Timer data
export interface TimerData {
  name: string;
  duration: number;
  autoStart?: boolean;
}

// Macro data
export interface MacroData {
  name: string;
  description?: string;
  trigger: {
    type: 'manual' | 'chat' | 'timer' | 'event';
    config?: Record<string, unknown>;
  };
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
}

/**
 * Data Factory with builder pattern
 */
export const DataFactory = {
  /**
   * Generate poll data
   */
  poll: (overrides: Partial<PollData> = {}): PollData => ({
    question: `Test Poll ${Date.now()}`,
    options: ['Opción A', 'Opción B', 'Opción C'],
    duration: 60,
    maxVotesPerUser: 1,
    ...overrides,
  }),

  /**
   * Generate prediction data
   */
  prediction: (overrides: Partial<PredictionData> = {}): PredictionData => ({
    title: `Test Prediction ${Date.now()}`,
    outcomes: ['Victoria', 'Derrota'],
    duration: 120,
    ...overrides,
  }),

  /**
   * Generate giveaway data
   */
  giveaway: (overrides: Partial<GiveawayData> = {}): GiveawayData => ({
    title: `Test Giveaway ${Date.now()}`,
    keyword: '!sorteo',
    duration: 300,
    mode: 'keyword',
    requireFollow: false,
    ...overrides,
  }),

  /**
   * Generate timer data
   */
  timer: (overrides: Partial<TimerData> = {}): TimerData => ({
    name: `Timer ${Date.now()}`,
    duration: 60,
    autoStart: false,
    ...overrides,
  }),

  /**
   * Generate macro data
   */
  macro: (overrides: Partial<MacroData> = {}): MacroData => ({
    name: `Macro ${Date.now()}`,
    description: 'Test macro description',
    trigger: {
      type: 'manual',
    },
    actions: [
      {
        type: 'notification',
        config: { message: 'Macro executed!' },
      },
    ],
    ...overrides,
  }),

  /**
   * Generate chat message
   */
  chatMessage: (overrides: Partial<{
    username: string;
    message: string;
    isMod: boolean;
    isSub: boolean;
  }> = {}) => ({
    username: `user_${Date.now()}`,
    message: 'Test message',
    isMod: false,
    isSub: false,
    ...overrides,
  }),

  /**
   * Generate multiple items
   */
  many: <T>(factory: (index: number) => T, count: number): T[] => {
    return Array.from({ length: count }, (_, i) => factory(i));
  },

  /**
   * Generate unique ID
   */
  id: (): string => {
    return `test_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  },
};

export default DataFactory;
