/**
 * IAdvancedAnalyticsPort - Interfaz para estadísticas avanzadas de stream
 * 
 * Este puerto define el contrato para persistencia y gestión de sesiones
 * de stream con métricas detalladas y timeline de engagement.
 * 
 * @requirements 3.2 - WHEN a stream session ends THEN THE Analytics_Dashboard SHALL save session statistics
 * @requirements 3.3 - WHEN viewing history THEN THE Analytics_Dashboard SHALL show statistics from previous sessions
 */

/**
 * Punto en el timeline de una sesión
 * Captura el estado del stream en un momento específico
 */
export interface TimelinePoint {
  /** Timestamp del punto */
  timestamp: number;
  /** Número de viewers en ese momento */
  viewers: number;
  /** Mensajes en el último minuto */
  messages: number;
  /** Tipos de eventos que ocurrieron en ese momento */
  events: string[];
}

/**
 * Sesión de stream con métricas completas
 */
export interface StreamSession {
  /** ID único de la sesión */
  id: string;
  /** Timestamp de inicio */
  startTime: number;
  /** Timestamp de fin (undefined si está activa) */
  endTime?: number;
  /** Pico de viewers durante la sesión */
  peakViewers: number;
  /** Promedio de viewers */
  averageViewers: number;
  /** Total de mensajes de chat */
  totalMessages: number;
  /** Número de chatters únicos */
  uniqueChatters: number;
  /** Nuevos seguidores durante la sesión */
  newFollowers: number;
  /** Nuevas suscripciones durante la sesión */
  newSubs: number;
  /** Bits recibidos durante la sesión */
  bitsReceived: number;
  /** Timeline de la sesión con puntos de datos */
  timeline: TimelinePoint[];
}

/**
 * Puerto para gestión de estadísticas avanzadas
 * 
 * Los adapters que implementen esta interfaz deben proporcionar
 * persistencia y recuperación de sesiones de stream.
 */
export interface IAdvancedAnalyticsPort {
  /**
   * Guarda una sesión de stream
   * @param session - Sesión a guardar
   */
  saveSession(session: StreamSession): void;

  /**
   * Obtiene las sesiones guardadas
   * @param limit - Número máximo de sesiones a retornar (opcional)
   * @returns Array de sesiones ordenadas por fecha descendente
   */
  getSessions(limit?: number): StreamSession[];

  /**
   * Obtiene una sesión específica por ID
   * @param id - ID de la sesión
   * @returns La sesión o null si no existe
   */
  getSession(id: string): StreamSession | null;

  /**
   * Elimina una sesión
   * @param id - ID de la sesión a eliminar
   */
  deleteSession(id: string): void;
}
