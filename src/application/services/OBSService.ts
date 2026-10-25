/**
 * OBSService - Servicio de aplicación para controlar OBS
 * 
 * Orquesta el controlador OBS y gestiona automatizaciones
 * que conectan eventos de la app con acciones en OBS.
 */

import type { 
  IOBSController, 
  OBSScene, 
  OBSSource,
  OBSStreamStatus,
  OBSConnectionStatus,
  OBSVersion,
} from '../../domain/ports/IOBSController';
import { getOBSAdapter } from '../../infrastructure/adapters/OBSWebSocketAdapter';

/** Tipos de triggers para automatizaciones */
export type AutomationTrigger = 
  | 'game_start'
  | 'game_end'
  | 'poll_start'
  | 'poll_end'
  | 'poll_results'
  | 'giveaway_start'
  | 'giveaway_winner'
  | 'raid_incoming'
  | 'raid_outgoing'
  | 'brb_start'
  | 'brb_end'
  | 'stream_start'
  | 'stream_end'
  | 'prediction_start'
  | 'prediction_lock'
  | 'prediction_resolve'
  | 'reward_redeemed'
  | 'custom';

/** Configuración de una automatización */
export interface SceneAutomation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  /** Nombre personalizado del trigger (para 'custom') */
  customTriggerName?: string;
  /** Escena a la que cambiar */
  sceneName: string;
  /** Fuentes a mostrar */
  sourcesToShow?: string[];
  /** Fuentes a ocultar */
  sourcesToHide?: string[];
  /** Transición a usar */
  transition?: string;
  /** Delay antes de ejecutar (ms) */
  delay?: number;
  /** Si está habilitada */
  enabled: boolean;
}

/** Configuración de conexión guardada */
export interface OBSConnectionConfig {
  host: string;
  port: number;
  password?: string;
  autoConnect: boolean;
}

/** Tipos de acciones para comandos rápidos */
export type QuickCommandAction = 
  | { type: 'switch_scene'; sceneName: string }
  | { type: 'toggle_source'; sceneName: string; sourceName: string; visible: boolean }
  | { type: 'set_transition'; transitionName: string }
  | { type: 'start_recording' }
  | { type: 'stop_recording' }
  | { type: 'start_stream' }
  | { type: 'stop_stream' };

/** Comando rápido personalizado */
export interface QuickCommand {
  id: string;
  name: string;
  icon: string; // emoji o nombre de icono lucide
  actions: QuickCommandAction[];
}

const STORAGE_KEY_AUTOMATIONS = 'obs_automations';
const STORAGE_KEY_CONNECTION = 'obs_connection_config';

export class OBSService {
  private controller: IOBSController;
  private automations: SceneAutomation[] = [];
  private connectionConfig: OBSConnectionConfig | null = null;
  
  constructor(controller?: IOBSController) {
    this.controller = controller || getOBSAdapter();
    this.loadFromStorage();
  }
  
  // === CONEXIÓN ===
  
  async connect(password?: string, host?: string, port?: number): Promise<void> {
    const config = {
      host: host || this.connectionConfig?.host || 'localhost',
      port: port || this.connectionConfig?.port || 4455,
      password: password || this.connectionConfig?.password,
    };
    
    await this.controller.connect(config);
    
    // Guardar config si conexión exitosa
    this.connectionConfig = {
      ...config,
      autoConnect: this.connectionConfig?.autoConnect ?? false,
    };
    this.saveConnectionConfig();
  }
  
  async disconnect(): Promise<void> {
    await this.controller.disconnect();
  }
  
  getConnectionStatus(): OBSConnectionStatus {
    return this.controller.getConnectionStatus();
  }
  
  isConnected(): boolean {
    return this.controller.getConnectionStatus() === 'connected';
  }
  
  async getVersion(): Promise<OBSVersion | null> {
    return this.controller.getVersion();
  }
  
  getConnectionConfig(): OBSConnectionConfig | null {
    return this.connectionConfig;
  }
  
  setAutoConnect(enabled: boolean): void {
    if (this.connectionConfig) {
      this.connectionConfig.autoConnect = enabled;
      this.saveConnectionConfig();
    }
  }
  
  // === ESCENAS ===
  
  async getScenes(): Promise<OBSScene[]> {
    return this.controller.getScenes();
  }
  
  async getCurrentScene(): Promise<string | null> {
    return this.controller.getCurrentScene();
  }
  
  async switchScene(sceneName: string): Promise<void> {
    await this.controller.setScene(sceneName);
  }
  
  // === FUENTES ===
  
  async getSceneSources(sceneName: string): Promise<OBSSource[]> {
    return this.controller.getSceneSources(sceneName);
  }
  
  async setSourceVisible(sceneName: string, sourceName: string, visible: boolean): Promise<void> {
    await this.controller.setSourceVisible(sceneName, sourceName, visible);
  }
  
  async refreshBrowserSource(sourceName: string): Promise<void> {
    await this.controller.refreshBrowserSource(sourceName);
  }

  // === STREAMING ===
  
  async getStreamStatus(): Promise<OBSStreamStatus> {
    return this.controller.getStreamStatus();
  }
  
  async startStream(): Promise<void> {
    await this.controller.startStream();
  }
  
  async stopStream(): Promise<void> {
    await this.controller.stopStream();
  }
  
  async toggleStream(): Promise<void> {
    await this.controller.toggleStream();
  }
  
  async startRecording(): Promise<void> {
    await this.controller.startRecording();
  }
  
  async stopRecording(): Promise<void> {
    await this.controller.stopRecording();
  }
  
  async toggleRecording(): Promise<void> {
    await this.controller.toggleRecording();
  }
  
  // === TRANSICIONES ===
  
  async getCurrentTransition(): Promise<string | null> {
    return this.controller.getCurrentTransition();
  }

  async getTransitions(): Promise<string[]> {
    return this.controller.getTransitions();
  }
  
  async setTransition(transitionName: string): Promise<void> {
    await this.controller.setTransition(transitionName);
  }
  
  // === AUTOMATIZACIONES ===
  
  getAutomations(): SceneAutomation[] {
    return [...this.automations];
  }
  
  getAutomation(id: string): SceneAutomation | undefined {
    return this.automations.find(a => a.id === id);
  }
  
  getAutomationByTrigger(trigger: AutomationTrigger): SceneAutomation | undefined {
    return this.automations.find(a => a.trigger === trigger && a.enabled);
  }
  
  addAutomation(automation: Omit<SceneAutomation, 'id'>): SceneAutomation {
    const newAutomation: SceneAutomation = {
      ...automation,
      id: `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    
    this.automations.push(newAutomation);
    this.saveAutomations();
    return newAutomation;
  }
  
  updateAutomation(id: string, updates: Partial<Omit<SceneAutomation, 'id'>>): boolean {
    const index = this.automations.findIndex(a => a.id === id);
    if (index === -1) return false;
    
    this.automations[index] = { ...this.automations[index], ...updates };
    this.saveAutomations();
    return true;
  }
  
  removeAutomation(id: string): boolean {
    const index = this.automations.findIndex(a => a.id === id);
    if (index === -1) return false;
    
    this.automations.splice(index, 1);
    this.saveAutomations();
    return true;
  }
  
  toggleAutomation(id: string): boolean {
    const automation = this.automations.find(a => a.id === id);
    if (!automation) return false;
    
    automation.enabled = !automation.enabled;
    this.saveAutomations();
    return automation.enabled;
  }
  
  /**
   * Ejecutar automatización basada en un trigger
   * Llamar desde juegos/encuestas cuando ocurra el evento
   */
  async executeTrigger(trigger: AutomationTrigger, customName?: string): Promise<boolean> {
    if (!this.isConnected()) return false;
    
    const automation = this.automations.find(a => {
      if (!a.enabled) return false;
      if (a.trigger === 'custom') {
        return customName && a.customTriggerName === customName;
      }
      return a.trigger === trigger;
    });
    
    if (!automation) return false;
    
    return this.executeAutomation(automation);
  }
  
  /**
   * Ejecutar una automatización específica
   */
  async executeAutomation(automation: SceneAutomation): Promise<boolean> {
    if (!this.isConnected()) return false;
    
    try {
      // Delay opcional
      if (automation.delay && automation.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, automation.delay));
      }
      
      // Cambiar transición si está especificada
      if (automation.transition) {
        await this.controller.setTransition(automation.transition);
      }
      
      // Cambiar escena
      await this.controller.setScene(automation.sceneName);
      
      // Mostrar fuentes
      if (automation.sourcesToShow?.length) {
        for (const source of automation.sourcesToShow) {
          try {
            await this.controller.setSourceVisible(automation.sceneName, source, true);
          } catch (e) {
            console.warn(`Could not show source "${source}":`, e);
          }
        }
      }
      
      // Ocultar fuentes
      if (automation.sourcesToHide?.length) {
        for (const source of automation.sourcesToHide) {
          try {
            await this.controller.setSourceVisible(automation.sceneName, source, false);
          } catch (e) {
            console.warn(`Could not hide source "${source}":`, e);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error executing automation:', error);
      return false;
    }
  }
  
  // === CALLBACKS ===
  
  onStatusChange(callback: (status: OBSConnectionStatus, error?: string) => void): () => void {
    return this.controller.onStatusChange(callback);
  }
  
  onSceneChange(callback: (scene: OBSScene) => void): () => void {
    return this.controller.onSceneChange(callback);
  }
  
  onStreamStatusChange(callback: (status: OBSStreamStatus) => void): () => void {
    return this.controller.onStreamStatusChange(callback);
  }
  
  // === PERSISTENCIA ===
  
  private loadFromStorage(): void {
    try {
      const automationsJson = localStorage.getItem(STORAGE_KEY_AUTOMATIONS);
      if (automationsJson) {
        this.automations = JSON.parse(automationsJson);
      }
      
      const connectionJson = localStorage.getItem(STORAGE_KEY_CONNECTION);
      if (connectionJson) {
        this.connectionConfig = JSON.parse(connectionJson);
      }
    } catch (e) {
      console.error('Error loading OBS config from storage:', e);
    }
  }
  
  private saveAutomations(): void {
    try {
      localStorage.setItem(STORAGE_KEY_AUTOMATIONS, JSON.stringify(this.automations));
    } catch (e) {
      console.error('Error saving automations:', e);
    }
  }
  
  private saveConnectionConfig(): void {
    try {
      if (this.connectionConfig) {
        // No guardar password en localStorage por seguridad
        const configToSave = { ...this.connectionConfig };
        delete configToSave.password;
        localStorage.setItem(STORAGE_KEY_CONNECTION, JSON.stringify(configToSave));
      }
    } catch (e) {
      console.error('Error saving connection config:', e);
    }
  }
  
  dispose(): void {
    this.controller.dispose();
  }
}

// Singleton
let serviceInstance: OBSService | null = null;

export function getOBSService(): OBSService {
  if (!serviceInstance) {
    serviceInstance = new OBSService();
  }
  return serviceInstance;
}

export function resetOBSService(): void {
  if (serviceInstance) {
    serviceInstance.dispose();
    serviceInstance = null;
  }
}
