/**
 * OBSConnectionWizard - Wizard paso a paso para conectar OBS
 * 
 * Guía a usuarios nuevos a través del proceso de configuración de OBS WebSocket.
 * 
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, 
  X, 
  Loader2, 
  ChevronRight,
  ChevronLeft,
  Monitor,
  Wifi,
  Lock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Circle,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { 
  discoverOBS, 
  testConnection,
  saveLastConnection,
  type OBSInstance,
} from '../src/application/services/OBSDiscoveryService';

export type WizardStepStatus = 'pending' | 'checking' | 'success' | 'error' | 'skipped';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  status: WizardStepStatus;
  errorMessage?: string;
}

interface OBSConnectionWizardProps {
  onComplete: (host: string, port: number, password?: string) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
}

const INITIAL_STEPS: WizardStep[] = [
  {
    id: 'obs-running',
    title: 'OBS Ejecutándose',
    description: 'Verificar que OBS Studio está abierto',
    status: 'pending',
  },
  {
    id: 'websocket-enabled',
    title: 'WebSocket Habilitado',
    description: 'Verificar que el servidor WebSocket está activo',
    status: 'pending',
  },
  {
    id: 'connection-test',
    title: 'Prueba de Conexión',
    description: 'Verificar que la conexión funciona correctamente',
    status: 'pending',
  },
];

export const OBSConnectionWizard: React.FC<OBSConnectionWizardProps> = ({
  onComplete,
  onSkip,
  onClose,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<WizardStep[]>(INITIAL_STEPS);
  const [detectedInstance, setDetectedInstance] = useState<OBSInstance | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [manualHost, setManualHost] = useState('localhost');
  const [manualPort, setManualPort] = useState('4455');

  const currentStep = steps[currentStepIndex];

  // Update step status
  const updateStepStatus = useCallback((stepId: string, status: WizardStepStatus, errorMessage?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, errorMessage } 
        : step
    ));
  }, []);

  // Step 1: Check if OBS is running
  const checkOBSRunning = useCallback(async () => {
    updateStepStatus('obs-running', 'checking');
    
    try {
      const result = await discoverOBS('localhost');
      
      if (result.found && result.defaultInstance) {
        setDetectedInstance(result.defaultInstance);
        updateStepStatus('obs-running', 'success');
        return true;
      } else {
        updateStepStatus('obs-running', 'error', 'No se detectó OBS en los puertos estándar');
        return false;
      }
    } catch (error) {
      updateStepStatus('obs-running', 'error', 'Error al buscar OBS');
      return false;
    }
  }, [updateStepStatus]);

  // Step 2: Check WebSocket is enabled
  const checkWebSocketEnabled = useCallback(async () => {
    updateStepStatus('websocket-enabled', 'checking');
    
    const host = detectedInstance?.host || manualHost;
    const port = detectedInstance?.port || parseInt(manualPort);
    
    try {
      const result = await testConnection(host, port);
      
      if (result.success) {
        updateStepStatus('websocket-enabled', 'success');
        return true;
      } else {
        updateStepStatus('websocket-enabled', 'error', result.error || 'WebSocket no responde');
        return false;
      }
    } catch (error) {
      updateStepStatus('websocket-enabled', 'error', 'Error al verificar WebSocket');
      return false;
    }
  }, [detectedInstance, manualHost, manualPort, updateStepStatus]);

  // Step 3: Test full connection
  const testFullConnection = useCallback(async () => {
    updateStepStatus('connection-test', 'checking');
    setIsConnecting(true);
    
    const host = detectedInstance?.host || manualHost;
    const port = detectedInstance?.port || parseInt(manualPort);
    
    try {
      await onComplete(host, port, password || undefined);
      
      // Save successful connection
      saveLastConnection({
        host,
        port,
        requiresPassword: !!password,
        version: detectedInstance?.version,
      });
      
      updateStepStatus('connection-test', 'success');
      setIsConnecting(false);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error de conexión';
      updateStepStatus('connection-test', 'error', errorMsg);
      setIsConnecting(false);
      return false;
    }
  }, [detectedInstance, manualHost, manualPort, password, onComplete, updateStepStatus]);

  // Auto-run current step check
  useEffect(() => {
    if (currentStep.status === 'pending') {
      const runCheck = async () => {
        switch (currentStep.id) {
          case 'obs-running':
            await checkOBSRunning();
            break;
          case 'websocket-enabled':
            await checkWebSocketEnabled();
            break;
          // connection-test requires user action (clicking connect)
        }
      };
      runCheck();
    }
  }, [currentStepIndex, currentStep.status, currentStep.id, checkOBSRunning, checkWebSocketEnabled]);

  // Handle next step
  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, steps.length]);

  // Handle previous step
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Handle retry current step
  const handleRetry = useCallback(() => {
    updateStepStatus(currentStep.id, 'pending');
  }, [currentStep.id, updateStepStatus]);

  // Handle skip step
  const handleSkipStep = useCallback(() => {
    updateStepStatus(currentStep.id, 'skipped');
    handleNext();
  }, [currentStep.id, updateStepStatus, handleNext]);

  // Render step indicator
  const renderStepIndicator = (step: WizardStep, index: number) => {
    const isActive = index === currentStepIndex;
    const isPast = index < currentStepIndex;
    
    let icon;
    let bgColor = 'bg-zinc-200 dark:bg-zinc-700';
    let textColor = 'text-zinc-500';
    
    switch (step.status) {
      case 'success':
        icon = <Check size={14} />;
        bgColor = 'bg-green-500';
        textColor = 'text-white';
        break;
      case 'error':
        icon = <X size={14} />;
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        break;
      case 'checking':
        icon = <Loader2 size={14} className="animate-spin" />;
        bgColor = 'bg-purple-500';
        textColor = 'text-white';
        break;
      case 'skipped':
        icon = <ChevronRight size={14} />;
        bgColor = 'bg-zinc-400';
        textColor = 'text-white';
        break;
      default:
        icon = <span className="text-xs font-medium">{index + 1}</span>;
        if (isActive) {
          bgColor = 'bg-purple-500';
          textColor = 'text-white';
        }
    }
    
    return (
      <div key={step.id} className="flex items-center">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${bgColor} ${textColor} transition-colors`}>
          {icon}
        </div>
        {index < steps.length - 1 && (
          <div className={`w-8 h-0.5 ${isPast || step.status === 'success' ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
        )}
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'obs-running':
        return (
          <div className="space-y-4">
            {currentStep.status === 'checking' && (
              <div className="flex flex-col items-center py-6">
                <Loader2 size={32} className="text-purple-500 animate-spin" />
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Buscando OBS Studio...
                </p>
              </div>
            )}
            
            {currentStep.status === 'success' && detectedInstance && (
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    OBS Detectado
                  </span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Puerto: {detectedInstance.port}
                  {detectedInstance.version && ` • v${detectedInstance.version}`}
                </p>
              </div>
            )}
            
            {currentStep.status === 'error' && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={18} className="text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      OBS no detectado
                    </span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {currentStep.errorMessage}
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Asegúrate de que:
                  </p>
                  <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                    <li>OBS Studio está abierto</li>
                    <li>El servidor WebSocket está habilitado</li>
                    <li>No hay firewall bloqueando la conexión</li>
                  </ul>
                </div>
                
                {/* Manual configuration option */}
                <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">Configuración manual:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={manualHost}
                      onChange={(e) => setManualHost(e.target.value)}
                      placeholder="Host"
                      className="px-2 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                    />
                    <input
                      type="text"
                      value={manualPort}
                      onChange={(e) => setManualPort(e.target.value)}
                      placeholder="Puerto"
                      className="px-2 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'websocket-enabled':
        return (
          <div className="space-y-4">
            {currentStep.status === 'checking' && (
              <div className="flex flex-col items-center py-6">
                <Loader2 size={32} className="text-purple-500 animate-spin" />
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Verificando WebSocket...
                </p>
              </div>
            )}
            
            {currentStep.status === 'success' && (
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    WebSocket funcionando correctamente
                  </span>
                </div>
              </div>
            )}
            
            {currentStep.status === 'error' && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={18} className="text-red-500" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      WebSocket no disponible
                    </span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {currentStep.errorMessage}
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                    📋 Cómo habilitar WebSocket en OBS:
                  </p>
                  <ol className="text-sm text-blue-600 dark:text-blue-300 space-y-1 list-decimal list-inside">
                    <li>Abre OBS Studio</li>
                    <li>Ve a <strong>Herramientas → Configuración de WebSocket Server</strong></li>
                    <li>Marca <strong>"Habilitar servidor WebSocket"</strong></li>
                    <li>Click en <strong>Aplicar</strong></li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        );
        
      case 'connection-test':
        return (
          <div className="space-y-4">
            {/* Password input if required */}
            {detectedInstance?.requiresPassword && (
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Lock size={16} className="text-amber-500" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Se requiere contraseña
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña de WebSocket"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            
            {currentStep.status === 'checking' && (
              <div className="flex flex-col items-center py-6">
                <Loader2 size={32} className="text-purple-500 animate-spin" />
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Conectando a OBS...
                </p>
              </div>
            )}
            
            {currentStep.status === 'success' && (
              <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    ¡Conexión exitosa!
                  </span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-300">
                  OBS está conectado y listo para usar.
                </p>
              </div>
            )}
            
            {currentStep.status === 'error' && (
              <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={18} className="text-red-500" />
                  <span className="font-medium text-red-700 dark:text-red-400">
                    Error de conexión
                  </span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-300">
                  {currentStep.errorMessage}
                </p>
              </div>
            )}
            
            {currentStep.status === 'pending' && (
              <div className="text-center py-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Click en "Conectar" para probar la conexión
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Monitor className="text-purple-500" size={20} />
              <h3 className="font-bold text-zinc-900 dark:text-white">
                Configurar OBS
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center justify-center">
            {steps.map((step, index) => renderStepIndicator(step, index))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <h4 className="font-medium text-zinc-900 dark:text-white">
              {currentStep.title}
            </h4>
            <p className="text-sm text-zinc-500">
              {currentStep.description}
            </p>
          </div>
          
          {renderStepContent()}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
          <div>
            {currentStepIndex > 0 && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {currentStep.status === 'error' && (
              <>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg"
                >
                  <RefreshCw size={14} />
                  Reintentar
                </button>
                <button
                  onClick={handleSkipStep}
                  className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Saltar
                </button>
              </>
            )}
            
            {currentStep.status === 'success' && currentStepIndex < steps.length - 1 && (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            )}
            
            {currentStep.id === 'connection-test' && currentStep.status !== 'success' && currentStep.status !== 'checking' && (
              <button
                onClick={testFullConnection}
                disabled={isConnecting || (detectedInstance?.requiresPassword && !password)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white font-medium rounded-lg"
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Wifi size={14} />
                    Conectar
                  </>
                )}
              </button>
            )}
            
            {currentStep.status === 'success' && currentStepIndex === steps.length - 1 && (
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
              >
                <Check size={14} />
                Completado
              </button>
            )}
          </div>
        </div>
        
        {/* Skip wizard link */}
        <div className="px-4 pb-4 text-center">
          <button
            onClick={onSkip}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Saltar configuración guiada
          </button>
        </div>
      </div>
    </div>
  );
};

export default OBSConnectionWizard;
