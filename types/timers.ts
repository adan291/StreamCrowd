/**
 * Timer Types
 * 
 * Type definitions for the Chat Timers System.
 * Timers send automatic messages to chat at regular intervals.
 */

/**
 * A timer that sends messages to chat periodically
 */
export interface Timer {
  id: string;
  name: string;
  message: string;
  intervalMinutes: number;      // 1-120 minutes
  minChatLines: number;         // 0-100 minimum chat lines before sending
  enabled: boolean;
  groupId: string | null;       // null = "General" group
  lastExecuted: number | null;  // timestamp of last execution
  createdAt: number;
  updatedAt: number;
}

/**
 * A group to organize timers
 */
export interface TimerGroup {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

/**
 * Predefined timer template
 */
export interface TimerTemplate {
  id: string;
  name: string;
  message: string;
  intervalMinutes: number;
  minChatLines: number;
  category: 'social' | 'rules' | 'discord' | 'donations' | 'commands';
  icon: string;
}

/**
 * Log entry for timer execution
 */
export interface TimerExecutionLog {
  id: string;
  timerId: string;
  timerName: string;
  message: string;
  executedAt: number;
  success: boolean;
  error?: string;
}

/**
 * State of the timer execution engine
 */
export interface TimerEngineState {
  isRunning: boolean;
  chatLineCount: number;
  lastCheck: number;
  executionLog: TimerExecutionLog[];
}

/**
 * Timer form data (for create/edit)
 */
export type TimerFormData = Omit<Timer, 'id' | 'createdAt' | 'updatedAt' | 'lastExecuted'>;

/**
 * Timer group form data
 */
export type TimerGroupFormData = Omit<TimerGroup, 'id'>;
