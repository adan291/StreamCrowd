/**
 * SchedulerService
 * Manages scheduled giveaways
 */

import type { ScheduledGiveaway, RaffleConfig } from '../types';

const STORAGE_KEY = 'giveaway_scheduled';

export class SchedulerService {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static onExecuteCallback: ((scheduled: ScheduledGiveaway) => void) | null = null;

  // ============================================
  // STORAGE
  // ============================================

  static getScheduled(): ScheduledGiveaway[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveScheduled(scheduled: ScheduledGiveaway[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scheduled));
  }

  static addScheduled(config: RaffleConfig, scheduledAt: number, repeatConfig?: ScheduledGiveaway['repeatConfig']): ScheduledGiveaway {
    const scheduled: ScheduledGiveaway = {
      id: Math.random().toString(36).substring(2, 9),
      config,
      scheduledAt,
      repeatConfig,
      status: 'pending',
      nextExecutionAt: scheduledAt,
      createdAt: Date.now(),
    };

    const all = this.getScheduled();
    all.push(scheduled);
    this.saveScheduled(all);
    return scheduled;
  }

  static updateScheduled(id: string, updates: Partial<ScheduledGiveaway>): void {
    const all = this.getScheduled();
    const index = all.findIndex(s => s.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], ...updates };
      this.saveScheduled(all);
    }
  }

  static deleteScheduled(id: string): void {
    const all = this.getScheduled().filter(s => s.id !== id);
    this.saveScheduled(all);
  }

  static cancelScheduled(id: string): void {
    this.updateScheduled(id, { status: 'cancelled' });
  }

  // ============================================
  // SCHEDULER
  // ============================================

  static start(onExecute: (scheduled: ScheduledGiveaway) => void): void {
    this.onExecuteCallback = onExecute;
    
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.checkScheduled();
    }, 60000);

    // Initial check
    this.checkScheduled();
  }

  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.onExecuteCallback = null;
  }

  private static checkScheduled(): void {
    const now = Date.now();
    const all = this.getScheduled();
    let updated = false;

    all.forEach(scheduled => {
      if (scheduled.status !== 'pending') return;
      if (!scheduled.nextExecutionAt) return;

      // Check if it's time to execute
      if (scheduled.nextExecutionAt <= now) {
        // Execute
        if (this.onExecuteCallback) {
          this.onExecuteCallback(scheduled);
        }

        // Update status
        scheduled.lastExecutedAt = now;

        // Handle repeat
        if (scheduled.repeatConfig) {
          const { type, interval, maxExecutions, executionCount } = scheduled.repeatConfig;
          scheduled.repeatConfig.executionCount = executionCount + 1;

          // Check max executions
          if (maxExecutions && scheduled.repeatConfig.executionCount >= maxExecutions) {
            scheduled.status = 'completed';
          } else {
            // Calculate next execution
            let nextMs = 0;
            if (type === 'minutes') nextMs = interval * 60 * 1000;
            else if (type === 'hours') nextMs = interval * 60 * 60 * 1000;
            else if (type === 'daily') nextMs = 24 * 60 * 60 * 1000;
            
            if (nextMs > 0) {
              scheduled.nextExecutionAt = now + nextMs;
            } else {
              scheduled.status = 'completed';
            }
          }
        } else {
          scheduled.status = 'completed';
        }

        updated = true;
      }
    });

    if (updated) {
      this.saveScheduled(all);
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  static getPending(): ScheduledGiveaway[] {
    return this.getScheduled().filter(s => s.status === 'pending');
  }

  static getNextScheduled(): ScheduledGiveaway | null {
    const pending = this.getPending()
      .filter(s => s.nextExecutionAt)
      .sort((a, b) => (a.nextExecutionAt || 0) - (b.nextExecutionAt || 0));
    return pending[0] || null;
  }

  static formatNextExecution(scheduled: ScheduledGiveaway): string {
    if (!scheduled.nextExecutionAt) return 'No programado';
    
    const date = new Date(scheduled.nextExecutionAt);
    const now = new Date();
    const diff = scheduled.nextExecutionAt - now.getTime();

    if (diff < 0) return 'Ejecutando...';
    if (diff < 60000) return 'En menos de 1 minuto';
    if (diff < 3600000) return `En ${Math.floor(diff / 60000)} minutos`;
    if (diff < 86400000) return `En ${Math.floor(diff / 3600000)} horas`;
    
    return date.toLocaleString('es-ES', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    });
  }
}

export default SchedulerService;
