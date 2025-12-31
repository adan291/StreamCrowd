/**
 * useOBSTriggers - Hook para disparar automatizaciones OBS desde cualquier componente
 * 
 * Este hook proporciona funciones simples para disparar eventos OBS
 * sin necesidad de importar todo el sistema OBS en cada componente.
 * 
 * @example
 * ```tsx
 * const { triggerGameStart, triggerGameEnd } = useOBSTriggers();
 * 
 * // Al iniciar un juego
 * triggerGameStart();
 * 
 * // Al terminar
 * triggerGameEnd();
 * ```
 */

import { useCallback, useRef } from 'react';
import { getOBSService, type AutomationTrigger } from '../services/OBSService';

export interface UseOBSTriggersReturn {
  // Juegos
  triggerGameStart: () => Promise<boolean>;
  triggerGameEnd: () => Promise<boolean>;
  
  // Encuestas
  triggerPollStart: () => Promise<boolean>;
  triggerPollEnd: () => Promise<boolean>;
  triggerPollResults: () => Promise<boolean>;
  
  // Sorteos
  triggerGiveawayStart: () => Promise<boolean>;
  triggerGiveawayWinner: () => Promise<boolean>;
  
  // Raids
  triggerRaidIncoming: () => Promise<boolean>;
  triggerRaidOutgoing: () => Promise<boolean>;
  
  // BRB
  triggerBRBStart: () => Promise<boolean>;
  triggerBRBEnd: () => Promise<boolean>;
  
  // Stream
  triggerStreamStart: () => Promise<boolean>;
  triggerStreamEnd: () => Promise<boolean>;
  
  // Predicciones
  triggerPredictionStart: () => Promise<boolean>;
  triggerPredictionLock: () => Promise<boolean>;
  triggerPredictionResolve: () => Promise<boolean>;
  
  // Channel Points / Recompensas
  triggerRewardRedeemed: () => Promise<boolean>;
  
  // Custom
  triggerCustom: (name: string) => Promise<boolean>;
  
  // Generic
  trigger: (type: AutomationTrigger, customName?: string) => Promise<boolean>;
  
  // Estado
  isOBSConnected: () => boolean;
}

export function useOBSTriggers(): UseOBSTriggersReturn {
  const serviceRef = useRef(getOBSService());
  
  const trigger = useCallback(async (type: AutomationTrigger, customName?: string): Promise<boolean> => {
    try {
      return await serviceRef.current.executeTrigger(type, customName);
    } catch (error) {
      console.warn('OBS trigger failed:', error);
      return false;
    }
  }, []);
  
  const isOBSConnected = useCallback(() => {
    return serviceRef.current.isConnected();
  }, []);
  
  return {
    // Juegos
    triggerGameStart: useCallback(() => trigger('game_start'), [trigger]),
    triggerGameEnd: useCallback(() => trigger('game_end'), [trigger]),
    
    // Encuestas
    triggerPollStart: useCallback(() => trigger('poll_start'), [trigger]),
    triggerPollEnd: useCallback(() => trigger('poll_end'), [trigger]),
    triggerPollResults: useCallback(() => trigger('poll_results'), [trigger]),
    
    // Sorteos
    triggerGiveawayStart: useCallback(() => trigger('giveaway_start'), [trigger]),
    triggerGiveawayWinner: useCallback(() => trigger('giveaway_winner'), [trigger]),
    
    // Raids
    triggerRaidIncoming: useCallback(() => trigger('raid_incoming'), [trigger]),
    triggerRaidOutgoing: useCallback(() => trigger('raid_outgoing'), [trigger]),
    
    // BRB
    triggerBRBStart: useCallback(() => trigger('brb_start'), [trigger]),
    triggerBRBEnd: useCallback(() => trigger('brb_end'), [trigger]),
    
    // Stream
    triggerStreamStart: useCallback(() => trigger('stream_start'), [trigger]),
    triggerStreamEnd: useCallback(() => trigger('stream_end'), [trigger]),
    
    // Predicciones
    triggerPredictionStart: useCallback(() => trigger('prediction_start'), [trigger]),
    triggerPredictionLock: useCallback(() => trigger('prediction_lock'), [trigger]),
    triggerPredictionResolve: useCallback(() => trigger('prediction_resolve'), [trigger]),
    
    // Channel Points / Recompensas
    triggerRewardRedeemed: useCallback(() => trigger('reward_redeemed'), [trigger]),
    
    // Custom
    triggerCustom: useCallback((name: string) => trigger('custom', name), [trigger]),
    
    // Generic
    trigger,
    isOBSConnected,
  };
}

export default useOBSTriggers;
