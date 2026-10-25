/**
 * OBSAutoDiscovery - Componente para auto-descubrir instancias de OBS
 * 
 * Muestra el estado del escaneo y permite seleccionar una instancia detectada.
 * 
 * @requirements 1.2, 1.4
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Wifi, 
  WifiOff, 
  Check, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { 
  discoverOBS, 
  type OBSInstance, 
  type DiscoveryResult,
} from '../src/application/services/OBSDiscoveryService';

interface OBSAutoDiscoveryProps {
  onInstanceSelect: (instance: OBSInstance) => void;
  onManualConnect: () => void;
  isConnecting?: boolean;
}

type DiscoveryState = 'idle' | 'scanning' | 'found' | 'not-found';

export const OBSAutoDiscovery: React.FC<OBSAutoDiscoveryProps> = ({
  onInstanceSelect,
  onManualConnect,
  isConnecting = false,
}) => {
  const [state, setState] = useState<DiscoveryState>('idle');
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<OBSInstance | null>(null);
  const [showAllInstances, setShowAllInstances] = useState(false);

  // Don't auto-scan on mount - let user choose
  const startScan = useCallback(async () => {
    setState('scanning');
    setResult(null);
    setSelectedInstance(null);
    
    try {
      const discoveryResult = await discoverOBS('localhost');
      setResult(discoveryResult);
      
      if (discoveryResult.found) {
        setState('found');
        // Auto-select the default instance
        if (discoveryResult.defaultInstance) {
          setSelectedInstance(discoveryResult.defaultInstance);
        }
      } else {
        setState('not-found');
      }
    } catch (error) {
      setState('not-found');
    }
  }, []);

  const handleConnect = useCallback(() => {
    if (selectedInstance) {
      onInstanceSelect(selectedInstance);
    }
  }, [selectedInstance, onInstanceSelect]);

  const handleInstanceClick = useCallback((instance: OBSInstance) => {
    setSelectedInstance(instance);
  }, []);

  return (
    <div className="space-y-3">
      {/* Idle State - Show both options */}
      {state === 'idle' && (
        <div className="space-y-4">
          <div className="text-center py-2">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              ¿Cómo quieres conectar a OBS?
            </p>
            <p className="text-xs text-zinc-500">
              Elige una opción para configurar la conexión
            </p>
          </div>

          {/* Auto-detect button */}
          <button
            onClick={startScan}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Search size={18} />
            Buscar OBS automáticamente
          </button>

          {/* Manual connect button */}
          <button
            onClick={onManualConnect}
            className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-700"
          >
            <Wifi size={18} />
            Configurar manualmente
          </button>

          {/* Help text */}
          <p className="text-[10px] text-zinc-400 text-center">
            La búsqueda automática escanea los puertos 4455, 4444 y 4456
          </p>
        </div>
      )}

      {/* Scanning State */}
      {state === 'scanning' && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="relative">
            <Search size={32} className="text-purple-500 animate-pulse" />
            <Loader2 size={16} className="absolute -bottom-1 -right-1 text-purple-400 animate-spin" />
          </div>
          <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Buscando OBS...
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Escaneando puertos 4455, 4444, 4456
          </p>
        </div>
      )}

      {/* Found State */}
      {state === 'found' && result && (
        <div className="space-y-3">
          {/* Success message */}
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
            <Check size={16} className="text-green-500" />
            <span className="text-xs text-green-700 dark:text-green-400">
              {result.instances.length === 1 
                ? 'OBS detectado' 
                : `${result.instances.length} instancias de OBS detectadas`}
            </span>
          </div>

          {/* Single instance - show connect button directly */}
          {result.instances.length === 1 && selectedInstance && (
            <div className="p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi size={16} className="text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {selectedInstance.host}:{selectedInstance.port}
                    </p>
                    {selectedInstance.version && (
                      <p className="text-xs text-zinc-500">
                        WebSocket v{selectedInstance.version}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedInstance.requiresPassword ? (
                    <span title="Requiere contraseña" className="inline-flex"><Lock size={14} className="text-amber-500" aria-hidden="true" /></span>
                  ) : (
                    <span title="Sin contraseña" className="inline-flex"><Unlock size={14} className="text-green-500" aria-hidden="true" /></span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Multiple instances - show list */}
          {result.instances.length > 1 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowAllInstances(!showAllInstances)}
                className="w-full flex items-center justify-between p-2 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <span>Seleccionar instancia</span>
                {showAllInstances ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              {showAllInstances && (
                <div className="space-y-1">
                  {result.instances.map((instance, index) => (
                    <button
                      key={`${instance.host}:${instance.port}`}
                      onClick={() => handleInstanceClick(instance)}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        selectedInstance?.port === instance.port
                          ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/50'
                          : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-purple-300 dark:hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wifi size={14} className={
                            selectedInstance?.port === instance.port 
                              ? 'text-purple-500' 
                              : 'text-zinc-400'
                          } />
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              Puerto {instance.port}
                            </p>
                            {instance.version && (
                              <p className="text-xs text-zinc-500">
                                v{instance.version}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {instance.requiresPassword ? (
                            <Lock size={12} className="text-amber-500" />
                          ) : (
                            <Unlock size={12} className="text-green-500" />
                          )}
                          {selectedInstance?.port === instance.port && (
                            <Check size={14} className="text-purple-500" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Password warning */}
          {selectedInstance?.requiresPassword && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
              <Lock size={14} className="text-amber-500" />
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Esta instancia requiere contraseña
              </span>
            </div>
          )}

          {/* Connect button */}
          <button
            onClick={handleConnect}
            disabled={!selectedInstance || isConnecting}
            className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-zinc-400 disabled:to-zinc-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Wifi size={16} />
                Conectar a OBS detectado
              </>
            )}
          </button>

          {/* Manual connect option */}
          <button
            onClick={onManualConnect}
            className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Configurar manualmente
          </button>
        </div>
      )}

      {/* Not Found State */}
      {state === 'not-found' && (
        <div className="space-y-3">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <WifiOff size={32} className="text-zinc-400" />
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              No se detectó OBS
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Asegúrate de que OBS esté abierto y el WebSocket habilitado
            </p>
          </div>

          {/* Retry button */}
          <button
            onClick={startScan}
            className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            Buscar de nuevo
          </button>

          {/* Manual connect option */}
          <button
            onClick={onManualConnect}
            className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Wifi size={16} />
            Configurar manualmente
          </button>

          {/* Help text */}
          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
              ¿Cómo habilitar WebSocket en OBS?
            </summary>
            <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-1">
              <p>1. Abre OBS Studio</p>
              <p>2. Ve a <strong>Herramientas → Configuración de WebSocket Server</strong></p>
              <p>3. Marca <strong>"Habilitar servidor WebSocket"</strong></p>
              <p>4. Opcionalmente, configura una contraseña</p>
              <p>5. Click en <strong>Aplicar</strong></p>
            </div>
          </details>
        </div>
      )}

      {/* Scan duration info */}
      {result && state !== 'scanning' && (
        <p className="text-[10px] text-zinc-400 text-center">
          Escaneo completado en {result.scanDuration}ms
        </p>
      )}
    </div>
  );
};

export default OBSAutoDiscovery;
