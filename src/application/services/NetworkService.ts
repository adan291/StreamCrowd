/**
 * NetworkService - Servicio de detección de estado de red
 * 
 * Este servicio implementa la detección del estado online/offline
 * y notifica a los suscriptores cuando el estado cambia.
 * 
 * @requirements 2.1, 2.2, 2.3, 2.4
 */

// ============ TYPES ============

/**
 * Estado de la conexión de red
 */
export interface NetworkStatus {
  isOnline: boolean;
  lastOnline: number | null;
  lastOffline: number | null;
}

/**
 * Callback para suscriptores de cambios de estado
 */
export type NetworkStatusCallback = (status: NetworkStatus) => void;

/**
 * Interfaz del servicio de red
 */
export interface INetworkService {
  getStatus(): NetworkStatus;
  subscribe(callback: NetworkStatusCallback): () => void;
  checkConnection(): Promise<boolean>;
  destroy(): void;
}

// ============ CONSTANTS ============

/**
 * URL para verificación activa de conexión
 * Usamos un endpoint pequeño y confiable
 */
const CONNECTION_CHECK_URL = 'https://www.google.com/generate_204';

/**
 * Timeout para verificación de conexión (ms)
 */
const CONNECTION_CHECK_TIMEOUT = 5000;

// ============ NETWORK SERVICE CLASS ============

/**
 * Servicio de detección de estado de red
 * 
 * Proporciona detección de estado online/offline usando navigator.onLine
 * y un sistema de suscripción para notificar cambios a los componentes.
 */
export class NetworkService implements INetworkService {
  private status: NetworkStatus;
  private subscribers: Set<NetworkStatusCallback>;
  private boundHandleOnline: () => void;
  private boundHandleOffline: () => void;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize status based on current navigator.onLine
    const isOnline = this.getNavigatorOnlineStatus();
    
    this.status = {
      isOnline,
      lastOnline: isOnline ? Date.now() : null,
      lastOffline: isOnline ? null : Date.now()
    };
    
    this.subscribers = new Set();
    
    // Bind event handlers
    this.boundHandleOnline = this.handleOnline.bind(this);
    this.boundHandleOffline = this.handleOffline.bind(this);
    
    // Set up event listeners
    this.setupEventListeners();
    this.isInitialized = true;
  }

  // ============ PRIVATE METHODS ============

  /**
   * Obtiene el estado online del navegador de forma segura
   */
  private getNavigatorOnlineStatus(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return true; // Assume online in non-browser environments
    }
    return navigator.onLine;
  }

  /**
   * Configura los event listeners para detectar cambios de red
   * 
   * @requirements 2.1, 2.2
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', this.boundHandleOnline);
    window.addEventListener('offline', this.boundHandleOffline);
  }

  /**
   * Elimina los event listeners
   */
  private removeEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    window.removeEventListener('online', this.boundHandleOnline);
    window.removeEventListener('offline', this.boundHandleOffline);
  }

  /**
   * Maneja el evento de conexión restablecida
   * 
   * @requirements 2.2
   */
  private handleOnline(): void {
    const previousStatus = this.status.isOnline;
    
    this.status = {
      ...this.status,
      isOnline: true,
      lastOnline: Date.now()
    };
    
    // Only notify if status actually changed
    if (!previousStatus) {
      this.notifySubscribers();
    }
  }

  /**
   * Maneja el evento de pérdida de conexión
   * 
   * @requirements 2.1
   */
  private handleOffline(): void {
    const previousStatus = this.status.isOnline;
    
    this.status = {
      ...this.status,
      isOnline: false,
      lastOffline: Date.now()
    };
    
    // Only notify if status actually changed
    if (previousStatus) {
      this.notifySubscribers();
    }
  }

  /**
   * Notifica a todos los suscriptores del cambio de estado
   * 
   * @requirements 2.4
   */
  private notifySubscribers(): void {
    const currentStatus = { ...this.status };
    
    this.subscribers.forEach(callback => {
      try {
        callback(currentStatus);
      } catch (error) {
        console.error('Error in network status subscriber:', error);
      }
    });
  }

  // ============ PUBLIC API ============

  /**
   * Obtiene el estado actual de la conexión
   * 
   * @requirements 2.3
   */
  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  /**
   * Suscribe un callback para recibir notificaciones de cambios de estado
   * Retorna una función para cancelar la suscripción
   * 
   * @requirements 2.4
   */
  subscribe(callback: NetworkStatusCallback): () => void {
    this.subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Verifica activamente la conexión haciendo una petición de red
   * Útil para confirmar que hay conectividad real, no solo que
   * navigator.onLine es true
   * 
   * @requirements 2.1, 2.2
   */
  async checkConnection(): Promise<boolean> {
    // First check navigator.onLine
    if (!this.getNavigatorOnlineStatus()) {
      if (this.status.isOnline) {
        this.handleOffline();
      }
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONNECTION_CHECK_TIMEOUT);

      const response = await fetch(CONNECTION_CHECK_URL, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // If we get here, we have connectivity
      if (!this.status.isOnline) {
        this.handleOnline();
      }
      
      return true;
    } catch (error) {
      // Network error or timeout - we're offline
      if (this.status.isOnline) {
        this.handleOffline();
      }
      return false;
    }
  }

  /**
   * Limpia los recursos del servicio
   */
  destroy(): void {
    this.removeEventListeners();
    this.subscribers.clear();
    this.isInitialized = false;
  }

  /**
   * Verifica si el servicio está inicializado
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// ============ SINGLETON INSTANCE ============

let networkServiceInstance: NetworkService | null = null;

/**
 * Obtiene la instancia singleton del servicio de red
 */
export function getNetworkService(): NetworkService {
  if (!networkServiceInstance) {
    networkServiceInstance = new NetworkService();
  }
  return networkServiceInstance;
}

/**
 * Resetea la instancia singleton (útil para tests)
 */
export function resetNetworkService(): void {
  if (networkServiceInstance) {
    networkServiceInstance.destroy();
    networkServiceInstance = null;
  }
}
