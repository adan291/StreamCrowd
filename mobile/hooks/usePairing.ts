/**
 * usePairing - Hook for mobile pairing functionality
 * @requirements Task 3 - PairingService integration
 */

import { useState, useCallback } from 'react';
import { getPairingService } from '../services/PairingService';
import type { PairingData } from '../../types/mobile';

export interface UsePairingReturn {
  isParsing: boolean;
  error: string | null;
  parseQRCode: (data: string) => Promise<PairingData | null>;
  validateCode: (code: string, serverUrl: string) => Promise<PairingData | null>;
  clearError: () => void;
}

export function usePairing(): UsePairingReturn {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pairingService = getPairingService();

  const parseQRCode = useCallback(async (data: string): Promise<PairingData | null> => {
    setIsParsing(true);
    setError(null);

    try {
      const result = pairingService.parseQRCode(data);
      
      if (!result.success || !result.data) {
        setError(result.error || 'Código QR inválido');
        return null;
      }

      return result.data;
    } catch (err) {
      setError('Error al procesar el código');
      return null;
    } finally {
      setIsParsing(false);
    }
  }, [pairingService]);

  const validateCode = useCallback(async (code: string, serverUrl: string): Promise<PairingData | null> => {
    setIsParsing(true);
    setError(null);

    try {
      const result = await pairingService.validateCode(code, serverUrl);
      
      if (!result.success || !result.data) {
        setError(result.error || 'Código inválido');
        return null;
      }

      return result.data;
    } catch (err) {
      setError('Error al validar el código');
      return null;
    } finally {
      setIsParsing(false);
    }
  }, [pairingService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isParsing,
    error,
    parseQRCode,
    validateCode,
    clearError,
  };
}

export default usePairing;
