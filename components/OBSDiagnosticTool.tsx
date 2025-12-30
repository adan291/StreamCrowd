/**
 * OBSDiagnosticTool - Herramienta de diagnóstico para problemas de conexión OBS
 * 
 * Ejecuta checks de diagnóstico y muestra resultados con sugerencias de fix.
 * 
 * @requirements 4.1, 4.3, 4.5
 */

import React, { useState, useCallback } from 'react';
import { 
  Activity,
  Check, 
  X, 
  AlertTriangle,
  Loader2, 
  Copy,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Circle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import { 
  runDiagnostics,
  generateDiagnosticReport,
  type DiagnosticCheck,
  type DiagnosticResult,
  type DiagnosticCheckStatus,
} from '../src/application/services/OBSDiagnosticService';

interface OBSDiagnosticToolProps {
  host: string;
  port: number;
  password?: string;
  onNotification?: (type: 'success' | 'info' | 'error', message: string) => void;
}

export const OBSDiagnosticTool: React.FC<OBSDiagnosticToolProps> = ({
  host,
  port,
  password,
  onNotification,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Run diagnostics
  const handleRunDiagnostics = useCallback(async () => {
    setIsRunning(true);
    setResult(null);
    setChecks([]);
    
    try {
      const diagnosticResult = await runDiagnostics(
        host,
        port,
        password,
        (check) => {
          setChecks(prev => {
            const existing = prev.findIndex(c => c.id === check.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = check;
              return updated;
            }
            return [...prev, check];
          });
        }
      );
      
      setResult(diagnosticResult);
      
      if (diagnosticResult.overallStatus === 'healthy') {
        onNotification?.('success', '✓ Todos los diagnósticos pasaron');
      } else if (diagnosticResult.overallStatus === 'issues') {
        onNotification?.('info', '⚠ Se encontraron algunas advertencias');
      } else {
        onNotification?.('error', '✗ Se encontraron problemas críticos');
      }
    } catch (error) {
      onNotification?.('error', 'Error al ejecutar diagnósticos');
    } finally {
      setIsRunning(false);
    }
  }, [host, port, password, onNotification]);

  // Copy report to clipboard
  const handleCopyReport = useCallback(async () => {
    if (!result) return;
    
    const report = generateDiagnosticReport(result);
    
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      onNotification?.('success', '✓ Reporte copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = report;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result, onNotification]);

  // Get status icon
  const getStatusIcon = (status: DiagnosticCheckStatus) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'fail':
        return <XCircle size={16} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-500" />;
      case 'checking':
        return <Loader2 size={16} className="text-purple-500 animate-spin" />;
      case 'skipped':
        return <Circle size={16} className="text-zinc-400" />;
      default:
        return <Circle size={16} className="text-zinc-300" />;
    }
  };

  // Get status color class
  const getStatusColorClass = (status: DiagnosticCheckStatus) => {
    switch (status) {
      case 'pass':
        return 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10';
      case 'fail':
        return 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10';
      case 'warning':
        return 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10';
      case 'checking':
        return 'border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10';
      default:
        return 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800';
    }
  };

  // Get overall status display
  const getOverallStatusDisplay = () => {
    if (!result) return null;
    
    switch (result.overallStatus) {
      case 'healthy':
        return (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
            <CheckCircle2 size={20} className="text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Todo funciona correctamente
              </p>
              <p className="text-xs text-green-600 dark:text-green-300">
                {result.summary}
              </p>
            </div>
          </div>
        );
      case 'issues':
        return (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
            <AlertTriangle size={20} className="text-amber-500" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Advertencias detectadas
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                {result.summary}
              </p>
            </div>
          </div>
        );
      case 'critical':
        return (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
            <XCircle size={20} className="text-red-500" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">
                Problemas críticos
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                {result.summary}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-purple-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Diagnóstico de Conexión
          </span>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={handleCopyReport}
              className={`p-1.5 rounded transition-colors ${
                copied
                  ? 'bg-green-100 dark:bg-green-500/20 text-green-600'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
              title="Copiar reporte"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          )}
          <button
            onClick={handleRunDiagnostics}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-500 hover:bg-purple-600 disabled:bg-purple-400 text-white rounded-lg transition-colors"
          >
            {isRunning ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                {result ? 'Repetir' : 'Iniciar'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Connection info */}
      <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800 p-2 rounded">
        Analizando: <span className="font-mono">{host}:{port}</span>
        {password && <span className="ml-2">(con contraseña)</span>}
      </div>

      {/* Overall status */}
      {result && getOverallStatusDisplay()}

      {/* Checks list */}
      {checks.length > 0 && (
        <div className="space-y-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`border rounded-lg overflow-hidden transition-colors ${getStatusColorClass(check.status)}`}
            >
              <button
                onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
                className="w-full flex items-center justify-between p-3 text-left"
                disabled={check.status === 'checking'}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {check.name}
                    </p>
                    {check.message && (
                      <p className="text-xs text-zinc-500">
                        {check.message}
                      </p>
                    )}
                  </div>
                </div>
                {(check.fix || check.details) && check.status !== 'checking' && (
                  expandedCheck === check.id 
                    ? <ChevronDown size={14} className="text-zinc-400" />
                    : <ChevronRight size={14} className="text-zinc-400" />
                )}
              </button>
              
              {/* Expanded details */}
              {expandedCheck === check.id && (check.fix || check.details) && (
                <div className="px-3 pb-3 pt-0 border-t border-zinc-200 dark:border-zinc-700">
                  {check.details && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                      {check.details}
                    </p>
                  )}
                  {check.fix && (
                    <div className="mt-2 p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-start gap-2">
                        <Wrench size={12} className="text-purple-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-zinc-700 dark:text-zinc-300">
                          {check.fix}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isRunning && checks.length === 0 && (
        <div className="text-center py-6">
          <Activity size={32} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500">
            Click en "Iniciar" para ejecutar el diagnóstico
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Se verificará la conexión con OBS
          </p>
        </div>
      )}
    </div>
  );
};

export default OBSDiagnosticTool;
