import { useState, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface KiroRequest {
  hook: 'chat-brain' | 'game-narrator' | 'highlight-editor' | 'stream-summarizer';
  input: string;
  metadata?: Record<string, unknown>;
}

export interface KiroResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: number;
}

interface UseKiroBridgeReturn {
  sendToKiro: (request: KiroRequest) => Promise<KiroResponse>;
  isLoading: boolean;
  error: string | null;
  lastResponse: KiroResponse | null;
  retryCount: number;
}

/**
 * El enlace con la API - Dado que no tendrás Kiro corriendo localmente, 
 * este hook hace el fetch a las APIs de Kiro/Vercel.
 * 
 * Misión: Enviar eventos del chat o de juegos a tus Agent Hooks de Kiro
 * Acción: Manejar estados de carga y errores de red al llamar a la IA
 */
export function useKiroBridge(): UseKiroBridgeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<KiroResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [kiroApiUrl] = useLocalStorage('kiroApiUrl', process.env.VITE_KIRO_API_URL || '');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendToKiro = useCallback(async (request: KiroRequest): Promise<KiroResponse> => {
    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      if (!kiroApiUrl) {
        throw new Error('Kiro API URL not configured');
      }

      const response = await fetch(`${kiroApiUrl}/hooks/${request.hook}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_KIRO_API_KEY || ''}`,
        },
        body: JSON.stringify({
          input: request.input,
          metadata: {
            timestamp: Date.now(),
            source: 'streamcrowd',
            ...request.metadata
          }
        }),
        signal: controller.signal,
        // Timeout de 30 segundos
        ...{ timeout: 30000 }
      });

      if (!response.ok) {
        throw new Error(`Kiro API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      const kiroResponse: KiroResponse = {
        success: true,
        data,
        timestamp: Date.now()
      };

      setLastResponse(kiroResponse);
      setRetryCount(0);
      
      return kiroResponse;

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request cancelado, no es un error
        throw err;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Kiro Bridge error:', errorMessage);
      
      const errorResponse: KiroResponse = {
        success: false,
        error: errorMessage,
        timestamp: Date.now()
      };

      setError(errorMessage);
      setLastResponse(errorResponse);
      setRetryCount(prev => prev + 1);

      // Retry automático con exponential backoff (máximo 3 intentos)
      if (retryCount < 2 && !errorMessage.includes('AbortError')) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        
        console.log(`Retrying Kiro request in ${delay}ms (attempt ${retryCount + 2}/3)`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return sendToKiro(request);
      }

      throw errorResponse;

    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [kiroApiUrl, retryCount]);

  return {
    sendToKiro,
    isLoading,
    error,
    lastResponse,
    retryCount
  };
}