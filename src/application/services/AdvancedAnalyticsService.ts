/**
 * AdvancedAnalyticsService - Servicio de estadísticas avanzadas de stream
 * 
 * Este servicio gestiona sesiones de stream con métricas detalladas,
 * timeline de engagement, cálculos de retención y exportación CSV.
 * 
 * @requirements 3.1 - Display peak viewers, average viewers, chat messages per minute, unique chatters
 * @requirements 3.2 - Save session statistics when stream ends
 * @requirements 3.6 - Export data in CSV format
 * @requirements 3.7 - Calculate viewer retention metrics
 */

import type { 
  IAdvancedAnalyticsPort, 
  StreamSession, 
  TimelinePoint 
} from '../../domain/ports/IAdvancedAnalyticsPort';
import { getLocalStorageAnalyticsAdapter } from '../../infrastructure/adapters/LocalStorageAnalyticsAdapter';

// Re-export types for convenience
export type { StreamSession, TimelinePoint };

/** Intervalo de actualización del timeline (1 minuto) */
const TIMELINE_INTERVAL_MS = 60000;

/**
 * Genera un ID único para sesiones
 */
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Servicio de estadísticas avanzadas de stream
 */
export class AdvancedAnalyticsService {
  private port: IAdvancedAnalyticsPort;
  private currentSession: StreamSession | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private viewerHistory: number[] = [];
  private chattersSet: Set<string> = new Set();
  private messageCount: number = 0;
  private lastMinuteMessages: number = 0;

  constructor(port?: IAdvancedAnalyticsPort) {
    this.port = port || getLocalStorageAnalyticsAdapter();
  }

  // ==================== Session Management ====================

  /**
   * Inicia una nueva sesión de stream
   */
  startSession(): StreamSession {
    // End any existing session first
    if (this.currentSession) {
      this.endSession();
    }

    this.currentSession = {
      id: generateSessionId(),
      startTime: Date.now(),
      peakViewers: 0,
      averageViewers: 0,
      totalMessages: 0,
      uniqueChatters: 0,
      newFollowers: 0,
      newSubs: 0,
      bitsReceived: 0,
      timeline: []
    };

    // Reset tracking state
    this.viewerHistory = [];
    this.chattersSet.clear();
    this.messageCount = 0;
    this.lastMinuteMessages = 0;

    // Start timeline recording
    this.startTimelineRecording();

    return this.currentSession;
  }

  /**
   * Finaliza la sesión actual y la guarda
   */
  endSession(): StreamSession | null {
    if (!this.currentSession) {
      return null;
    }

    // Stop timeline recording
    this.stopTimelineRecording();

    // Finalize session data
    this.currentSession.endTime = Date.now();
    this.currentSession.totalMessages = this.messageCount;
    this.currentSession.uniqueChatters = this.chattersSet.size;
    this.currentSession.averageViewers = this.calculateAverageViewers();

    // Record final timeline point
    this.recordTimelinePoint();

    // Save session
    this.port.saveSession(this.currentSession);

    const session = this.currentSession;
    this.currentSession = null;
    return session;
  }

  /**
   * Obtiene la sesión actual
   */
  getCurrentSession(): StreamSession | null {
    return this.currentSession;
  }

  // ==================== Real-time Updates ====================

  /**
   * Actualiza el conteo de viewers
   */
  updateViewerCount(count: number): void {
    if (!this.currentSession) return;

    this.viewerHistory.push(count);
    
    // Update peak
    if (count > this.currentSession.peakViewers) {
      this.currentSession.peakViewers = count;
    }

    // Update average
    this.currentSession.averageViewers = this.calculateAverageViewers();
  }

  /**
   * Registra un mensaje de chat
   */
  recordMessage(username: string): void {
    if (!this.currentSession) return;

    this.messageCount++;
    this.lastMinuteMessages++;
    this.chattersSet.add(username.toLowerCase());
    
    this.currentSession.totalMessages = this.messageCount;
    this.currentSession.uniqueChatters = this.chattersSet.size;
  }

  /**
   * Registra un evento de stream
   */
  recordEvent(type: string, data?: { bits?: number }): void {
    if (!this.currentSession) return;

    switch (type) {
      case 'follow':
        this.currentSession.newFollowers++;
        break;
      case 'sub':
      case 'resub':
      case 'subgift':
        this.currentSession.newSubs++;
        break;
      case 'cheer':
      case 'bits':
        if (data?.bits) {
          this.currentSession.bitsReceived += data.bits;
        }
        break;
    }
  }

  // ==================== Timeline Recording ====================

  /**
   * Inicia la grabación del timeline
   */
  private startTimelineRecording(): void {
    // Record initial point
    this.recordTimelinePoint();

    // Set up interval for periodic recording
    this.updateInterval = setInterval(() => {
      this.recordTimelinePoint();
      this.lastMinuteMessages = 0; // Reset for next minute
    }, TIMELINE_INTERVAL_MS);
  }

  /**
   * Detiene la grabación del timeline
   */
  private stopTimelineRecording(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Registra un punto en el timeline
   */
  private recordTimelinePoint(): void {
    if (!this.currentSession) return;

    const point: TimelinePoint = {
      timestamp: Date.now(),
      viewers: this.viewerHistory.length > 0 
        ? this.viewerHistory[this.viewerHistory.length - 1] 
        : 0,
      messages: this.lastMinuteMessages,
      events: [] // Events are tracked separately
    };

    this.currentSession.timeline.push(point);
  }

  // ==================== Calculations ====================

  /**
   * Calcula el promedio de viewers
   */
  private calculateAverageViewers(): number {
    if (this.viewerHistory.length === 0) return 0;
    
    const sum = this.viewerHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.viewerHistory.length);
  }

  /**
   * Calcula la retención de viewers (porcentaje)
   * @requirements 3.7
   */
  calculateRetention(session?: StreamSession): number {
    const s = session || this.currentSession;
    if (!s || s.timeline.length < 2) return 100;

    const firstViewers = s.timeline[0].viewers;
    const lastViewers = s.timeline[s.timeline.length - 1].viewers;

    if (firstViewers === 0) return 100;

    const retention = (lastViewers / firstViewers) * 100;
    return Math.max(0, Math.min(100, Math.round(retention)));
  }

  /**
   * Calcula la tasa de engagement
   */
  calculateEngagementRate(session?: StreamSession): number {
    const s = session || this.currentSession;
    if (!s || s.averageViewers === 0) return 0;

    // Engagement = (unique chatters / average viewers) * 100
    const rate = (s.uniqueChatters / s.averageViewers) * 100;
    return Math.min(100, Math.round(rate));
  }

  /**
   * Obtiene los chatters más activos
   */
  getTopChatters(): { username: string; count: number }[] {
    // This would need message tracking per user
    // For now, return empty - can be enhanced later
    return [];
  }

  // ==================== History ====================

  /**
   * Obtiene el historial de sesiones
   */
  getSessionHistory(limit?: number): StreamSession[] {
    return this.port.getSessions(limit);
  }

  /**
   * Obtiene una sesión específica
   */
  getSession(id: string): StreamSession | null {
    return this.port.getSession(id);
  }

  /**
   * Elimina una sesión
   */
  deleteSession(id: string): void {
    this.port.deleteSession(id);
  }

  // ==================== Export ====================

  /**
   * Exporta una sesión a CSV
   * @requirements 3.6
   */
  exportToCSV(sessionId: string): string {
    const session = this.port.getSession(sessionId);
    if (!session) return '';

    return this.sessionToCSV(session);
  }

  /**
   * Exporta todas las sesiones a CSV
   * @requirements 3.6
   */
  exportAllToCSV(): string {
    const sessions = this.port.getSessions();
    if (sessions.length === 0) {
      return this.getCSVHeaders();
    }

    const lines = [this.getCSVHeaders()];
    sessions.forEach(session => {
      lines.push(this.sessionToCSVRow(session));
    });

    return lines.join('\n');
  }

  /**
   * Obtiene los headers del CSV
   */
  private getCSVHeaders(): string {
    return 'id,startTime,endTime,peakViewers,averageViewers,totalMessages,uniqueChatters,newFollowers,newSubs,bitsReceived,retention';
  }

  /**
   * Convierte una sesión a una fila CSV
   */
  private sessionToCSVRow(session: StreamSession): string {
    const retention = this.calculateRetention(session);
    return [
      session.id,
      session.startTime,
      session.endTime || '',
      session.peakViewers,
      session.averageViewers,
      session.totalMessages,
      session.uniqueChatters,
      session.newFollowers,
      session.newSubs,
      session.bitsReceived,
      retention
    ].join(',');
  }

  /**
   * Convierte una sesión completa a CSV (con headers)
   */
  private sessionToCSV(session: StreamSession): string {
    return `${this.getCSVHeaders()}\n${this.sessionToCSVRow(session)}`;
  }
}

// Singleton instance
let instance: AdvancedAnalyticsService | null = null;

/**
 * Obtiene la instancia singleton del servicio
 */
export function getAdvancedAnalyticsService(): AdvancedAnalyticsService {
  if (!instance) {
    instance = new AdvancedAnalyticsService();
  }
  return instance;
}
