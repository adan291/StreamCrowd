import React, { useState, useEffect, useRef } from 'react';
import { getPairingService, PairingService } from '../services/PairingService';
import type { PairingData, MobileConnectionStatus } from '../../types/mobile';

/**
 * PairingScreen - QR scanner and manual code input for pairing
 * @requirements Task 5 - Crear PairingScreen
 */

interface PairingScreenProps {
  onPaired: (data: PairingData) => void;
  connectionStatus: MobileConnectionStatus;
  error: string | null;
}

export const PairingScreen: React.FC<PairingScreenProps> = ({
  onPaired,
  connectionStatus,
  error,
}) => {
  const [mode, setMode] = useState<'qr' | 'code'>('code');
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  
  const pairingService = useRef(getPairingService());
  const inputRef = useRef<HTMLInputElement>(null);

  // Try to load saved pairing data on mount
  useEffect(() => {
    const saved = pairingService.current.loadPairingData();
    if (saved) {
      onPaired(saved);
    }
  }, [onPaired]);

  // Focus input on mount
  useEffect(() => {
    if (mode === 'code') {
      inputRef.current?.focus();
    }
  }, [mode]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setCode(value);
      setLocalError(null);
    }
  };

  const handleSubmitCode = async () => {
    if (code.length !== 6) {
      setLocalError('El código debe tener 6 caracteres');
      return;
    }

    if (!serverUrl) {
      setLocalError('Ingresa la URL del servidor');
      return;
    }

    setIsLoading(true);
    setLocalError(null);

    try {
      const result = await pairingService.current.validateCode(code, serverUrl);
      
      if (result.success && result.data) {
        pairingService.current.savePairingData(result.data);
        onPaired(result.data);
      } else {
        setLocalError(result.error || 'Código inválido');
      }
    } catch (err) {
      setLocalError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    setIsLoading(true);
    setLocalError(null);

    const result = pairingService.current.parseQRCode(qrData);
    
    if (result.success && result.data) {
      pairingService.current.savePairingData(result.data);
      onPaired(result.data);
    } else {
      setLocalError(result.error || 'QR inválido');
    }
    
    setIsLoading(false);
  };

  const displayError = localError || error;
  const isConnecting = connectionStatus === 'connecting' || connectionStatus === 'reconnecting';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="pt-safe px-6 py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">TwitchVote Companion</h1>
        <p className="text-zinc-400 text-sm">Conecta con tu escritorio para controlar el stream</p>
      </div>

      {/* Mode Tabs */}
      <div className="px-6 mb-6">
        <div className="flex bg-zinc-900 rounded-xl p-1">
          <button
            onClick={() => setMode('code')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'code'
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Código
          </button>
          <button
            onClick={() => setMode('qr')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              mode === 'qr'
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Escanear QR
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6">
        {mode === 'code' ? (
          <div className="space-y-4">
            {/* Server URL */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                URL del servidor
              </label>
              <input
                type="url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="https://tu-servidor.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Código de emparejamiento
              </label>
              <input
                ref={inputRef}
                type="text"
                value={PairingService.formatCode(code)}
                onChange={handleCodeChange}
                placeholder="ABC-123"
                maxLength={7}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-center text-2xl font-mono tracking-widest text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 uppercase"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
              />
            </div>

            {/* Instructions */}
            <div className="bg-zinc-900/50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">¿Cómo obtener el código?</h3>
              <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
                <li>Abre TwitchVote en tu escritorio</li>
                <li>Ve a Configuración → Companion App</li>
                <li>Copia el código de 6 dígitos</li>
              </ol>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitCode}
              disabled={code.length !== 6 || isLoading || isConnecting}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isLoading || isConnecting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Conectando...
                </>
              ) : (
                'Conectar'
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Scanner Placeholder */}
            <div className="aspect-square bg-zinc-900 rounded-2xl flex items-center justify-center border-2 border-dashed border-zinc-700">
              <div className="text-center p-6">
                <svg className="w-16 h-16 mx-auto text-zinc-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <p className="text-zinc-400 text-sm mb-2">Escanea el código QR</p>
                <p className="text-zinc-600 text-xs">Muestra el QR desde la app de escritorio</p>
              </div>
            </div>

            {/* Manual QR input for testing */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                O pega los datos del QR
              </label>
              <textarea
                placeholder='{"sessionId": "...", "wsUrl": "...", "token": "..."}'
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 text-xs font-mono h-24 resize-none"
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  handleQRScan(text);
                }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {displayError && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm text-center">{displayError}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-6 pb-safe text-center">
        <p className="text-zinc-600 text-xs">
          TwitchVote Live Companion v1.0
        </p>
      </div>
    </div>
  );
};

export default PairingScreen;
