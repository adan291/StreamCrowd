/**
 * AlertProviderService - Servicio para gestionar proveedores de alertas externos
 * 
 * Este servicio coordina múltiples proveedores de alertas (StreamElements, Streamlabs)
 * y los integra con el AlertService existente.
 * 
 * @requirements 1.5 - THE System SHALL allow switching between alert providers without losing configuration
 * @requirements 1.7 - WHEN saving provider configuration THEN THE System SHALL persist credentials securely
 * @requirements 1.8 - THE System SHALL support using both providers simultaneously if desired
 */

import type {
  IAlertProvider,
  AlertProviderConfig,
  AlertProviderStatus,
  AlertProviderType,
  ExternalAlert,
  AlertCallback,
  AlertProviderStatusCallback,
} from '../../domain/ports/IAlertProvider';
import type { AlertService } from './AlertService';
import type { AlertEventType } from '../../domain/ports/IAlertPort';

const STORAGE_KEY = 'alert_providers_config';

/**
 * Estado de un proveedor
 */
export interface ProviderState {
  name: AlertProviderType;
  status: AlertProviderStatus;
  error?: string;
}

/**
 * Callback para cambios de estado de proveedores
 */
export type ProviderStateCallback = (states: ProviderState[]) => void;

/**
 * Mapeo de tipos de alerta externa a tipos de alerta interna
 */
const EXTERNAL_TO_INTERNAL_TYPE: Record<string, AlertEventType> = {
  'donation': 'bits', // Map donations to bits for now
  'follow': 'follow',
  'subscription': 'sub',
  'cheer': 'bits',
  'raid': 'raid',
};

/**
 * AlertProviderService class
 * 
 * Gestiona múltiples proveedores de alertas externos y los integra
 * con el sistema de alertas existente.
 */
export class AlertProviderService {
  private providers = new Map<AlertProviderType, IAlertProvider>();
  private configs: AlertProviderConfig[] = [];
  private alertCallbacks = new Set<AlertCallback>();
  private stateCallbacks = new Set<ProviderStateCallback>();
  private alertService: AlertService | null = null;
  private unsubscribers = new Map<AlertProviderType, () => void>();

  constructor() {
    this.loadConfigs();
  }

  /**
   * Registra un proveedor de alertas
   * @param provider - Instancia del proveedor
   */
  addProvider(provider: IAlertProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  /**
   * Integra con el AlertService existente
   * @param alertService - Instancia del AlertService
   */
  setAlertService(alertService: AlertService): void {
    this.alertService = alertService;
  }

  /**
   * Conecta un proveedor con la configuración dada
   * @param providerName - Nombre del proveedor
   * @param config - Configuración del proveedor
   */
  async connectProvider(providerName: AlertProviderType, config: AlertProviderConfig): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not registered`);
    }

    // Desconectar si ya está conectado
    if (provider.isConnected()) {
      await this.disconnectProvider(providerName);
    }

    // Conectar
    await provider.connect(config);

    // Suscribirse a alertas
    const unsubscribe = provider.onAlert((alert) => {
      this.handleExternalAlert(alert);
    });
    this.unsubscribers.set(providerName, unsubscribe);

    // Guardar configuración
    this.saveProviderConfig(config);
    this.notifyStateChange();
  }

  /**
   * Desconecta un proveedor
   * @param providerName - Nombre del proveedor
   */
  async disconnectProvider(providerName: AlertProviderType): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return;
    }

    // Cancelar suscripción a alertas
    const unsubscribe = this.unsubscribers.get(providerName);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(providerName);
    }

    await provider.disconnect();
    this.notifyStateChange();
  }

  /**
   * Desconecta todos los proveedores
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];
    
    for (const [name] of this.providers) {
      disconnectPromises.push(this.disconnectProvider(name));
    }

    await Promise.all(disconnectPromises);
  }

  /**
   * Obtiene el estado de todos los proveedores
   */
  getProviderStates(): ProviderState[] {
    const states: ProviderState[] = [];
    
    for (const [name, provider] of this.providers) {
      states.push({
        name,
        status: provider.getStatus(),
      });
    }

    return states;
  }

  /**
   * Verifica si un proveedor está conectado
   */
  isProviderConnected(providerName: AlertProviderType): boolean {
    const provider = this.providers.get(providerName);
    return provider?.isConnected() ?? false;
  }

  /**
   * Obtiene el estado de un proveedor específico
   */
  getProviderStatus(providerName: AlertProviderType): AlertProviderStatus {
    const provider = this.providers.get(providerName);
    return provider?.getStatus() ?? 'disconnected';
  }

  // ==================== Config Management ====================

  /**
   * Guarda la configuración de un proveedor
   */
  saveProviderConfig(config: AlertProviderConfig): void {
    const existingIndex = this.configs.findIndex(c => c.provider === config.provider);
    
    if (existingIndex >= 0) {
      this.configs[existingIndex] = config;
    } else {
      this.configs.push(config);
    }

    this.persistConfigs();
  }

  /**
   * Obtiene la configuración de un proveedor
   */
  getProviderConfig(providerName: AlertProviderType): AlertProviderConfig | null {
    return this.configs.find(c => c.provider === providerName) ?? null;
  }

  /**
   * Obtiene todas las configuraciones
   */
  getConfigs(): AlertProviderConfig[] {
    return [...this.configs];
  }

  /**
   * Elimina la configuración de un proveedor
   */
  deleteProviderConfig(providerName: AlertProviderType): void {
    this.configs = this.configs.filter(c => c.provider !== providerName);
    this.persistConfigs();
  }

  /**
   * Carga las configuraciones desde localStorage
   */
  private loadConfigs(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.configs && Array.isArray(data.configs)) {
          this.configs = data.configs;
        }
      }
    } catch (error) {
      console.error('Error loading alert provider configs:', error);
      this.configs = [];
    }
  }

  /**
   * Persiste las configuraciones en localStorage
   */
  private persistConfigs(): void {
    try {
      const data = {
        version: 1,
        configs: this.configs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving alert provider configs:', error);
    }
  }

  // ==================== Alert Handling ====================

  /**
   * Maneja una alerta externa y la integra con el sistema
   */
  private handleExternalAlert(alert: ExternalAlert): void {
    // Notificar a los listeners directos
    this.alertCallbacks.forEach(cb => cb(alert));

    // Integrar con AlertService si está disponible
    if (this.alertService) {
      const internalType = EXTERNAL_TO_INTERNAL_TYPE[alert.type];
      if (internalType) {
        this.alertService.enqueue({
          type: internalType,
          username: alert.username,
          amount: alert.amount,
          message: alert.message,
          timestamp: alert.timestamp,
        });
      }
    }
  }

  // ==================== Listeners ====================

  /**
   * Registra un callback para recibir alertas externas
   * @returns Función para cancelar la suscripción
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  /**
   * Registra un callback para cambios de estado de proveedores
   * @returns Función para cancelar la suscripción
   */
  onStateChange(callback: ProviderStateCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * Notifica cambios de estado a los listeners
   */
  private notifyStateChange(): void {
    const states = this.getProviderStates();
    this.stateCallbacks.forEach(cb => cb(states));
  }

  /**
   * Limpia recursos
   */
  dispose(): void {
    this.disconnectAll();
    this.alertCallbacks.clear();
    this.stateCallbacks.clear();
    this.unsubscribers.clear();
  }
}
