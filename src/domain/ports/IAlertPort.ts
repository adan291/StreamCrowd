/**
 * IAlertPort - Puerto para el sistema de alertas personalizadas
 * 
 * Este puerto define el contrato para gestionar configuraciones de alertas
 * y persistirlas. Permite crear alertas visuales y sonoras para eventos
 * del stream como follows, subs, raids, bits, y gifts.
 * 
 * @requirements 1.6 - WHEN saving alert configuration THEN THE Alert_System SHALL persist to localStorage
 * @requirements 1.7 - WHEN loading the application THEN THE Alert_System SHALL restore saved alert configurations
 */

/**
 * Tipos de eventos que pueden disparar alertas
 */
export type AlertEventType = 'follow' | 'sub' | 'raid' | 'bits' | 'gift';

/**
 * Templates visuales disponibles para alertas
 */
export type AlertTemplate = 'default' | 'minimal' | 'fancy';

/**
 * Animaciones disponibles para alertas
 */
export type AlertAnimation = 'fade' | 'slide' | 'bounce' | 'zoom';

/**
 * Configuración de una alerta personalizada
 */
export interface AlertConfig {
  /** Identificador único de la configuración */
  id: string;
  /** Tipo de evento que dispara esta alerta */
  eventType: AlertEventType;
  /** Si la alerta está habilitada */
  enabled: boolean;
  
  // Visual
  /** Template visual a usar */
  template: AlertTemplate;
  /** Duración de la alerta en milisegundos */
  duration: number;
  /** Tipo de animación */
  animation: AlertAnimation;
  
  // Audio
  /** URL del sonido a reproducir (opcional) */
  soundUrl?: string;
  /** Volumen del sonido (0-100) */
  soundVolume: number;
  
  // Personalización
  /** Mensaje personalizado (opcional) */
  customMessage?: string;
  /** Imagen personalizada (opcional) */
  customImage?: string;
}

/**
 * Evento de alerta que se encola para mostrar
 */
export interface AlertEvent {
  /** Tipo de evento */
  type: AlertEventType;
  /** Nombre de usuario que disparó el evento */
  username: string;
  /** Cantidad asociada (bits, meses, viewers) */
  amount?: number;
  /** Mensaje del usuario (opcional) */
  message?: string;
  /** Tier de suscripción (opcional) */
  tier?: string;
  /** Timestamp del evento */
  timestamp: number;
}

/**
 * Puerto para gestión de alertas
 * 
 * Los adapters que implementen esta interfaz deben manejar
 * la persistencia de configuraciones de alertas.
 */
export interface IAlertPort {
  /**
   * Obtiene todas las configuraciones de alertas
   * @returns Array de configuraciones
   */
  getConfigs(): AlertConfig[];

  /**
   * Guarda una configuración de alerta
   * @param config - Configuración a guardar
   */
  saveConfig(config: AlertConfig): void;

  /**
   * Elimina una configuración de alerta
   * @param id - ID de la configuración a eliminar
   */
  deleteConfig(id: string): void;

  /**
   * Obtiene la configuración para un tipo de evento específico
   * @param eventType - Tipo de evento
   * @returns Configuración o null si no existe
   */
  getConfigByEvent(eventType: AlertEventType): AlertConfig | null;
}
