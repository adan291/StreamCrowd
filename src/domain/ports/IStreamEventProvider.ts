/**
 * IStreamEventProvider Port - Interfaz para proveedores de eventos de stream
 * 
 * Este puerto define el contrato para recibir eventos de stream
 * como suscripciones, raids, cheers, bans, etc.
 * 
 * @requirements 2.2 - THE Domain SHALL include an `IStreamEventProvider` port for receiving stream events
 */

import type { StreamEvent } from '../entities/StreamEvent';

/**
 * Callback para recibir eventos de stream
 */
export type StreamEventCallback = (event: StreamEvent) => void;

/**
 * Interfaz para proveedores de eventos de stream
 * 
 * Los adapters que implementen esta interfaz deben emitir eventos
 * cuando ocurran suscripciones, raids, cheers, bans, etc.
 */
export interface IStreamEventProvider {
  /**
   * Registra un callback para recibir eventos de stream
   * @param callback - Función a llamar cuando ocurra un evento
   * @returns Función para cancelar la suscripción
   */
  onStreamEvent(callback: StreamEventCallback): () => void;

  /**
   * Elimina un callback previamente registrado
   * @param callback - Callback a eliminar
   */
  offStreamEvent(callback: StreamEventCallback): void;
}
