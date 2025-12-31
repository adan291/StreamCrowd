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
  validateCode: (code: string) => boolean;
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
      const pairingData = pairingService.parseQRCode(data);
      
      if (!pairingData) {
        setError('Código QR inválido');
        return null;
      }

      if (pairingService.isExpired(pairingData)) {
        setError('El código ha expirado');
        return null;
      }

      return pairingData;
    } catch (err) {
      setError('Error al procesar el código');
      return null;
    } finally {
      setIsParsing(false);
    }
  }, []);

  const validateCode = useCallback((code: string): boolean => {
    return pairingService.validateSessionCode(code);
  }, []);

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
