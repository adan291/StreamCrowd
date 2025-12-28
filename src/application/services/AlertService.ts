/**
 * AlertService - Servicio de aplicación para alertas personalizadas
 * 
 * Este servicio gestiona la cola de alertas, configuraciones y reproducción.
 * Implementa procesamiento FIFO para evitar solapamiento de alertas.
 * 
 * @requirements 1.1 - WHEN a stream event occurs THEN THE Alert_System SHALL display the configured alert
 * @requirements 1.3 - WHEN an alert is triggered THEN THE Alert_System SHALL queue multiple alerts to avoid overlap
 */

import type { 
  IAlertPort, 
  AlertConfig, 
  AlertEvent, 
  AlertEventType 
} from '../../domain/ports/IAlertPort';
import type { StreamEvent } from '../../domain/entities/StreamEvent';

/**
 * Callback para recibir alertas
 */
export type AlertListener = (event: AlertEvent, config: AlertConfig) => void;

/**
 * Estado de la cola de alertas
 */
export interface AlertQueueState {
  /** Alerta actualmente en reproducción */
  current: { event: AlertEvent; config: AlertConfig } | null;
  /** Alertas pendientes en cola */
  pending: AlertEvent[];
  /** Si está procesando la cola */
  isProcessing: boolean;
}

/**
 * Mapeo de tipos de StreamEvent a AlertEventType
 */
const STREAM_EVENT_TO_ALERT_TYPE: Record<string, AlertEventType | null> = {
  'sub': 'sub',
  'resub': 'sub',
  'subgift': 'gift',
  'submysterygift': 'gift',
  'primepaidupgrade': 'sub',
  'giftpaidupgrade': 'sub',
  'raid': 'raid',
  'cheer': 'bits',
  // follow no viene de StreamEvent, se maneja por separado
};

/**
 * AlertService class
 * 
 * Gestiona alertas con cola FIFO y configuraciones personalizables.
 */
export class AlertService {
  private port: IAlertPort;
  private queue: AlertEvent[] = [];
  private isProcessing: boolean = false;
  private currentAlert: { event: AlertEvent; config: AlertConfig } | null = null;
  private listeners: Set<AlertListener> = new Set();
  private stateListeners: Set<(state: AlertQueueState) => void> = new Set();
  private processedOrder: AlertEvent[] = []; // Track order for testing

  constructor(port: IAlertPort) {
    this.port = port;
  }

  // ==================== Queue Management ====================

  /**
   * Encola un evento de alerta
   * @param event - Evento a encolar
   */
  enqueue(event: AlertEvent): void {
    const config = this.port.getConfigByEvent(event.type);
    
    // Solo encolar si hay una configuración habilitada
    if (!config || !config.enabled) {
      return;
    }

    this.queue.push(event);
    this.notifyStateChange();
    
    // Iniciar procesamiento si no está activo
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Procesa la cola de alertas en orden FIFO
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.notifyStateChange();

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      const config = this.port.getConfigByEvent(event.type);

      if (config && config.enabled) {
        this.currentAlert = { event, config };
        this.processedOrder.push(event);
        this.notifyStateChange();
        
        // Notificar a los listeners
        this.notifyListeners(event, config);

        // Esperar la duración de la alerta
        await this.delay(config.duration);
        
        this.currentAlert = null;
        this.notifyStateChange();
      }
    }

    this.isProcessing = false;
    this.notifyStateChange();
  }

  /**
   * Obtiene el orden de procesamiento (para testing)
   */
  getProcessedOrder(): AlertEvent[] {
    return [...this.processedOrder];
  }

  /**
   * Limpia el historial de procesamiento (para testing)
   */
  clearProcessedOrder(): void {
    this.processedOrder = [];
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene el estado actual de la cola
   */
  getQueueState(): AlertQueueState {
    return {
      current: this.currentAlert,
      pending: [...this.queue],
      isProcessing: this.isProcessing
    };
  }

  /**
   * Limpia la cola de alertas pendientes
   */
  clearQueue(): void {
    this.queue = [];
    this.notifyStateChange();
  }

  // ==================== Config Management ====================

  /**
   * Obtiene la configuración para un tipo de evento
   */
  getConfig(eventType: AlertEventType): AlertConfig | null {
    return this.port.getConfigByEvent(eventType);
  }

  /**
   * Guarda una configuración de alerta
   */
  saveConfig(config: AlertConfig): void {
    this.port.saveConfig(config);
  }

  /**
   * Elimina una configuración de alerta
   */
  deleteConfig(id: string): void {
    this.port.deleteConfig(id);
  }

  /**
   * Obtiene todas las configuraciones
   */
  getAllConfigs(): AlertConfig[] {
    return this.port.getConfigs();
  }

  // ==================== Preview ====================

  /**
   * Previsualiza una alerta sin encolarla
   */
  previewAlert(config: AlertConfig): void {
    const previewEvent: AlertEvent = {
      type: config.eventType,
      username: 'PreviewUser',
      amount: config.eventType === 'bits' ? 100 : 
              config.eventType === 'raid' ? 50 : 
              config.eventType === 'sub' ? 1 : undefined,
      message: 'This is a preview alert!',
      tier: config.eventType === 'sub' ? '1000' : undefined,
      timestamp: Date.now()
    };

    // Notificar directamente sin encolar
    this.notifyListeners(previewEvent, config);
  }

  // ==================== Stream Event Integration ====================

  /**
   * Procesa un evento de stream y lo convierte en alerta si corresponde
   */
  handleStreamEvent(streamEvent: StreamEvent): void {
    const alertType = STREAM_EVENT_TO_ALERT_TYPE[streamEvent.type];
    
    if (!alertType) {
      return;
    }

    const alertEvent: AlertEvent = {
      type: alertType,
      username: streamEvent.displayName || streamEvent.username,
      amount: streamEvent.bits || streamEvent.viewerCount || streamEvent.months,
      message: streamEvent.message,
      tier: streamEvent.tier,
      timestamp: streamEvent.timestamp
    };

    this.enqueue(alertEvent);
  }

  /**
   * Crea un evento de follow (no viene de StreamEvent)
   */
  triggerFollowAlert(username: string): void {
    const alertEvent: AlertEvent = {
      type: 'follow',
      username,
      timestamp: Date.now()
    };

    this.enqueue(alertEvent);
  }

  // ==================== Listeners ====================

  /**
   * Registra un listener para alertas
   * @returns Función para cancelar la suscripción
   */
  onAlert(callback: AlertListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Registra un listener para cambios de estado
   * @returns Función para cancelar la suscripción
   */
  onStateChange(callback: (state: AlertQueueState) => void): () => void {
    this.stateListeners.add(callback);
    return () => this.stateListeners.delete(callback);
  }

  /**
   * Notifica a los listeners de alerta
   */
  private notifyListeners(event: AlertEvent, config: AlertConfig): void {
    for (const listener of this.listeners) {
      try {
        listener(event, config);
      } catch (error) {
        console.error('Error in alert listener:', error);
      }
    }
  }

  /**
   * Notifica cambios de estado
   */
  private notifyStateChange(): void {
    const state = this.getQueueState();
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    }
  }
}
