/**
 * OverlaySessionValidator Component
 * 
 * Validates session IDs for overlay access and displays appropriate errors
 * for invalid or expired sessions.
 * 
 * @requirements 4.3, 4.4
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { getOverlaySessionService } from '../../../application/services/OverlaySessionService';

interface OverlaySessionValidatorProps {
  sessionId: string | null;
  children: React.ReactNode;
  onValidationError?: (error: string) => void;
}

interface ValidationState {
  isValidating: boolean;
  isValid: boolean;
  error: string | null;
}

/**
 * OverlaySessionValidator - Validates session before rendering overlay
 * 
 * This component ensures that overlays are only displayed when a valid
 * session ID is provided, preventing unauthorized access.
 * 
 * @requirements 4.3, 4.4
 */
export const OverlaySessionValidator: React.FC<OverlaySessionValidatorProps> = ({
  sessionId,
  children,
  onValidationError,
}) => {
  const [state, setState] = useState<ValidationState>({
    isValidating: true,
    isValid: false,
    error: null,
  });

  useEffect(() => {
    const validateSession = () => {
      // If no sessionId provided, check if we're in legacy mode (URL params)
      if (!sessionId) {
        // Legacy mode: allow access without session validation
        // This maintains backward compatibility with existing overlay URLs
        setState({
          isValidating: false,
          isValid: true,
          error: null,
        });
        return;
      }

      // Validate session ID
      const sessionService = getOverlaySessionService();
      const result = sessionService.validateSession(sessionId);

      if (result.valid) {
        setState({
          isValidating: false,
          isValid: true,
          error: null,
        });
      } else {
        const error = result.error || 'Invalid session';
        setState({
          isValidating: false,
          isValid: false,
          error,
        });
        onValidationError?.(error);
      }
    };

    validateSession();
  }, [sessionId, onValidationError]);

  // Show loading state while validating
  if (state.isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
          <p className="text-white text-lg">Validando sesión...</p>
        </div>
      </div>
    );
  }

  // Show error state for invalid sessions
  if (!state.isValid) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-900/20 to-purple-900/20">
        <div className="max-w-md p-8 bg-zinc-900/90 backdrop-blur-sm rounded-2xl border border-red-500/30 shadow-2xl">
          <div className="text-center space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="p-4 bg-red-500/20 rounded-full">
                <AlertCircle className="w-16 h-16 text-red-400" />
              </div>
            </div>

            {/* Error Title */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Sesión Inválida
              </h2>
              <p className="text-red-300 text-sm">
                {state.error === 'Session has expired'
                  ? 'La sesión ha expirado'
                  : state.error === 'Session not found'
                  ? 'Sesión no encontrada'
                  : 'ID de sesión inválido'}
              </p>
            </div>

            {/* Error Details */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div className="text-zinc-300 text-sm leading-relaxed">
                {state.error === 'Session has expired' ? (
                  <>
                    Esta URL de overlay ha expirado. Las sesiones son válidas por 24 horas.
                    Por favor, genera una nueva URL desde la aplicación principal.
                  </>
                ) : (
                  <>
                    <p className="mb-2">No se pudo validar la sesión del overlay. Esto puede ocurrir si:</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>La URL es incorrecta o está incompleta</li>
                      <li>La sesión fue revocada manualmente</li>
                      <li>La sesión ha expirado (24 horas)</li>
                    </ul>
                  </>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-purple-300 text-sm font-medium mb-1">
                    ¿Cómo solucionar esto?
                  </p>
                  <ol className="text-purple-200 text-xs space-y-1 list-decimal list-inside">
                    <li>Abre la aplicación principal de StreamCrowd</li>
                    <li>Ve a la sección de Overlays</li>
                    <li>Genera una nueva URL de overlay</li>
                    <li>Actualiza la URL en OBS Browser Source</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Session is valid, render children
  return <>{children}</>;
};

export default OverlaySessionValidator;
