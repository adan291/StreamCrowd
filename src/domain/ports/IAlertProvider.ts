/**
 * IAlertProvider - Puerto para proveedores de alertas externos
 * 
 * Este puerto define el contrato para integrar proveedores de alertas
 * externos como StreamElements y Streamlabs. Permite recibir alertas
 * en tiempo real de donaciones, follows, subs, cheers y raids.
 * 
 * @requirements 1.1 - WHEN connecting to StreamElements THEN THE System SHALL authenticate using JWT token
 * @requirements 1.3 - WHEN connecting to Streamlabs THEN THE System SHALL authenticate using OAuth
 */

/**
 * Tipos de proveedores de alertas soportados
 */
export type AlertProviderType = 'streamelements' | 'streamlabs';

/**
 * Estado de conexión del proveedor
 */
export type AlertProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Configuración para un proveedor de alertas
 */
export interface AlertProviderConfig {
  /** Tipo de proveedor */
  provider: AlertProviderType;
  /** Si el proveedor está habilitado */
  enabled: boolean;
  /** Token JWT para StreamElements */
  jwtToken?: string;
  /** Token de socket para Streamlabs */
  socketToken?: string;
}

/**
 * Tipos de alertas externas que pueden recibirse
 */
export type ExternalAlertType = 'donation' | 'follow' | 'subscription' | 'cheer' | 'raid';

/**
 * Alerta recibida de un proveedor externo
 */
export interface ExternalAlert {
  /** Identificador único de la alerta */
  id: string;
  /** Tipo de alerta */
  type: ExternalAlertType;
  /** Nombre de usuario que generó la alerta */
  username: string;
  /** Cantidad asociada (donación, bits, viewers en raid) */
  amount?: number;
  /** Moneda de la donación */
  currency?: string;
  /** Mensaje del usuario */
  message?: string;
  /** Timestamp del evento */
  timestamp: number;
  /** Proveedor de origen */
  provider: AlertProviderType;
  /** Datos adicionales específicos del proveedor */
  metadata?: Record<string, unknown>;
}

/**
 * Callback para recibir alertas
 */
export type AlertCallback = (alert: ExternalAlert) => void;

/**
 * Callback para cambios de estado de conexión
 */
export type AlertProviderStatusCallback = (status: AlertProviderStatus, error?: string) => void;

/**
 * Puerto para proveedores de alertas externos
 * 
 * Los adapters que implementen esta interfaz deben manejar
 * la conexión WebSocket/Socket con el proveedor externo.
 */
export interface IAlertProvider {
  /**
   * Nombre del proveedor
   */
  readonly providerName: AlertProviderType;

  /**
   * Conectar al proveedor con la configuración dada
   * @param config - Configuración del proveedor
   * @throws Error si la autenticación falla
   */
  connect(config: AlertProviderConfig): Promise<void>;

  /**
   * Desconectar del proveedor
   */
  disconnect(): Promise<void>;

  /**
   * Verificar si está conectado
   * @returns true si está conectado
   */
  isConnected(): boolean;

  /**
   * Obtener estado actual de conexión
   * @returns Estado de conexión
   */
  getStatus(): AlertProviderStatus;

  /**
   * Registrar callback para recibir alertas
   * @param callback - Función a llamar cuando llegue una alerta
   * @returns Función para desregistrar el callback
   */
  onAlert(callback: AlertCallback): () => void;

  /**
   * Registrar callback para cambios de estado
   * @param callback - Función a llamar cuando cambie el estado
   * @returns Función para desregistrar el callback
   */
  onStatusChange(callback: AlertProviderStatusCallback): () => void;

  /**
   * Limpiar recursos
   */
  dispose(): void;
}
