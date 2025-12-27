/**
 * IAnalyticsProvider Port - Interfaz para proveedores de análisis con IA
 * 
 * Este puerto define el contrato para análisis de chat usando
 * proveedores de IA como Gemini, OpenAI o Anthropic.
 * 
 * @requirements 3.7 - THE Domain SHALL include an `AIProvider` port for AI-powered analysis
 */

import type { ChatMetrics } from '../entities/ChatMetrics';

/**
 * Proveedores de IA soportados
 */
export type AIProvider = 'gemini' | 'openai' | 'anthropic';

/**
 * Configuración del proveedor de IA
 */
export interface AIProviderConfig {
  /** Proveedor de IA seleccionado */
  provider: AIProvider;
  /** API key del proveedor */
  apiKey: string;
}

/**
 * Mensaje para análisis
 */
export interface AnalyticsMessage {
  /** Contenido del mensaje */
  message: string;
  /** Nombre de usuario del autor */
  username: string;
}

/**
 * Interfaz para proveedores de análisis con IA
 * 
 * Los adapters que implementen esta interfaz deben proporcionar
 * análisis de chat usando servicios de IA externos.
 */
export interface IAnalyticsProvider {
  /**
   * Analiza un conjunto de mensajes de chat
   * @param messages - Array de mensajes a analizar
   * @returns Métricas del chat calculadas
   */
  analyzeChat(messages: AnalyticsMessage[]): Promise<ChatMetrics>;

  /**
   * Verifica si el proveedor está configurado correctamente
   * @returns true si el proveedor tiene una API key válida
   */
  isConfigured(): boolean;
}
