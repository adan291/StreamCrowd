/**
 * StreamEvent Entity - Representa eventos de stream (subs, raids, cheers, etc.)
 * 
 * Esta entidad modela todos los tipos de eventos que pueden ocurrir
 * durante un stream de Twitch.
 */

/**
 * Tipos de eventos de stream soportados
 */
export type StreamEventType = 
  | 'sub' 
  | 'resub' 
  | 'subgift' 
  | 'submysterygift' 
  | 'primepaidupgrade' 
  | 'giftpaidupgrade' 
  | 'raid' 
  | 'cheer' 
  | 'hosted' 
  | 'ban' 
  | 'timeout';

/**
 * Niveles de suscripción de Twitch
 */
export type SubTier = 'Prime' | '1000' | '2000' | '3000';

/**
 * Interfaz principal para eventos de stream
 */
export interface StreamEvent {
  /** Identificador único del evento */
  id: string;
  /** Tipo de evento */
  type: StreamEventType;
  /** Nombre de usuario del actor principal */
  username: string;
  /** Nombre para mostrar del actor principal */
  displayName: string;
  /** ID de usuario de Twitch (opcional) */
  userId?: string;
  /** Canal donde ocurrió el evento */
  channel: string;
  /** Timestamp del evento en milisegundos */
  timestamp: number;
  
  // Campos específicos de suscripción
  /** Nivel de suscripción */
  tier?: SubTier;
  /** Meses de la suscripción actual */
  months?: number;
  /** Total de meses suscritos */
  cumulativeMonths?: number;
  /** Meses consecutivos de suscripción */
  streakMonths?: number;
  /** Mensaje del suscriptor */
  message?: string;
  
  // Campos específicos de regalo
  /** Usuario que recibe el regalo */
  recipientUsername?: string;
  /** Cantidad de regalos */
  giftCount?: number;
  
  // Campos específicos de raid
  /** Cantidad de viewers en el raid */
  viewerCount?: number;
  
  // Campos específicos de cheer
  /** Cantidad de bits */
  bits?: number;
  
  // Campos específicos de ban/timeout
  /** Duración del timeout en segundos */
  duration?: number;
  /** Razón del ban/timeout */
  reason?: string;
}
