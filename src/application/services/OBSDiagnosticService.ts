/**
 * OBSDiagnosticService - Servicio de diagnóstico para problemas de conexión OBS
 * 
 * Ejecuta una serie de checks para identificar problemas de conexión
 * y proporciona sugerencias de solución.
 * 
 * @requirements 4.2
 */

import { testConnection, OBS_PORTS } from './OBSDiscoveryService';

export type DiagnosticCheckStatus = 'pending' | 'checking' | 'pass' | 'fail' | 'warning' | 'skipped';

export interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  status: DiagnosticCheckStatus;
  message?: string;
  fix?: string;
  details?: string;
}

export interface DiagnosticResult {
  checks: DiagnosticCheck[];
  overallStatus: 'healthy' | 'issues' | 'critical';
  summary: string;
  timestamp: number;
}

/**
 * Definición de los checks de diagnóstico
 */
const DIAGNOSTIC_CHECKS: Omit<DiagnosticCheck, 'status' | 'message' | 'fix' | 'details'>[] = [
  {
    id: 'port-accessible',
    name: 'Puerto accesible',
    description: 'Verificar que el puerto de OBS WebSocket está accesible',
  },
  {
    id: 'websocket-responds',
    name: 'WebSocket responde',
    description: 'Verificar que el servidor WebSocket responde correctamente',
  },
  {
    id: 'authentication',
    name: 'Autenticación',
    description: 'Verificar que las credenciales son correctas',
  },
  {
    id: 'version-compatible',
    name: 'Versión compatible',
    description: 'Verificar que la versión de OBS WebSocket es compatible',
  },
];

/**
 * Versiones mínimas soportadas
 */
const MIN_WEBSOCKET_VERSION = '5.0.0';

/**
 * Compara versiones semánticas
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Check: Puerto accesible
 */
async function checkPortAccessible(host: string, port: number): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    ...DIAGNOSTIC_CHECKS[0],
    status: 'checking',
  };
  
  try {
    const result = await testConnection(host, port);
    
    if (result.success || result.requiresPassword) {
      check.status = 'pass';
      check.message = `Puerto ${port} accesible`;
      check.details = `Tiempo de respuesta: ${result.responseTime}ms`;
    } else {
      check.status = 'fail';
      check.message = `No se puede acceder al puerto ${port}`;
      check.fix = 'Verifica que OBS esté abierto y el WebSocket habilitado. También revisa que no haya un firewall bloqueando el puerto.';
    }
  } catch (error) {
    check.status = 'fail';
    check.message = 'Error al verificar el puerto';
    check.fix = 'Verifica tu conexión de red y que OBS esté ejecutándose.';
  }
  
  return check;
}

/**
 * Check: WebSocket responde
 */
async function checkWebSocketResponds(host: string, port: number): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    ...DIAGNOSTIC_CHECKS[1],
    status: 'checking',
  };
  
  try {
    const result = await testConnection(host, port);
    
    if (result.success) {
      check.status = 'pass';
      check.message = 'WebSocket funcionando correctamente';
      if (result.version) {
        check.details = `Versión: ${result.version}`;
      }
    } else if (result.requiresPassword) {
      check.status = 'pass';
      check.message = 'WebSocket responde (requiere autenticación)';
    } else {
      check.status = 'fail';
      check.message = result.error || 'WebSocket no responde';
      check.fix = 'Reinicia OBS y verifica la configuración del WebSocket en Herramientas → Configuración de WebSocket Server.';
    }
  } catch (error) {
    check.status = 'fail';
    check.message = 'Error al conectar con WebSocket';
    check.fix = 'Verifica que el servidor WebSocket esté habilitado en OBS.';
  }
  
  return check;
}

/**
 * Check: Autenticación
 */
async function checkAuthentication(
  host: string, 
  port: number, 
  password?: string
): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    ...DIAGNOSTIC_CHECKS[2],
    status: 'checking',
  };
  
  try {
    const result = await testConnection(host, port, password);
    
    if (result.success) {
      if (result.requiresPassword && !password) {
        check.status = 'warning';
        check.message = 'Se requiere contraseña';
        check.fix = 'Ingresa la contraseña configurada en OBS: Herramientas → Configuración de WebSocket Server.';
      } else {
        check.status = 'pass';
        check.message = password ? 'Contraseña correcta' : 'Sin autenticación requerida';
      }
    } else if (result.requiresPassword && password) {
      check.status = 'fail';
      check.message = 'Contraseña incorrecta';
      check.fix = 'Verifica la contraseña en OBS: Herramientas → Configuración de WebSocket Server → Mostrar información de conexión.';
    } else if (result.requiresPassword) {
      check.status = 'warning';
      check.message = 'Se requiere contraseña';
      check.fix = 'Ingresa la contraseña del WebSocket.';
    } else {
      check.status = 'skipped';
      check.message = 'No se pudo verificar (conexión fallida)';
    }
  } catch (error) {
    check.status = 'skipped';
    check.message = 'No se pudo verificar';
  }
  
  return check;
}

/**
 * Check: Versión compatible
 */
async function checkVersionCompatible(host: string, port: number): Promise<DiagnosticCheck> {
  const check: DiagnosticCheck = {
    ...DIAGNOSTIC_CHECKS[3],
    status: 'checking',
  };
  
  try {
    const result = await testConnection(host, port);
    
    if (result.version) {
      const comparison = compareVersions(result.version, MIN_WEBSOCKET_VERSION);
      
      if (comparison >= 0) {
        check.status = 'pass';
        check.message = `Versión ${result.version} compatible`;
      } else {
        check.status = 'warning';
        check.message = `Versión ${result.version} puede tener limitaciones`;
        check.fix = `Se recomienda actualizar a OBS WebSocket ${MIN_WEBSOCKET_VERSION} o superior para mejor compatibilidad.`;
      }
    } else {
      check.status = 'warning';
      check.message = 'No se pudo determinar la versión';
      check.details = 'La conexión funciona pero no se pudo obtener información de versión.';
    }
  } catch (error) {
    check.status = 'skipped';
    check.message = 'No se pudo verificar';
  }
  
  return check;
}

/**
 * Ejecuta todos los diagnósticos
 * @requirements 4.2
 */
export async function runDiagnostics(
  host: string,
  port: number,
  password?: string,
  onProgress?: (check: DiagnosticCheck) => void
): Promise<DiagnosticResult> {
  const checks: DiagnosticCheck[] = [];
  
  // Check 1: Puerto accesible
  const portCheck = await checkPortAccessible(host, port);
  checks.push(portCheck);
  onProgress?.(portCheck);
  
  // Si el puerto no es accesible, no continuar con los demás checks
  if (portCheck.status === 'fail') {
    // Marcar los demás como skipped
    for (let i = 1; i < DIAGNOSTIC_CHECKS.length; i++) {
      const skippedCheck: DiagnosticCheck = {
        ...DIAGNOSTIC_CHECKS[i],
        status: 'skipped',
        message: 'Omitido (puerto no accesible)',
      };
      checks.push(skippedCheck);
      onProgress?.(skippedCheck);
    }
  } else {
    // Check 2: WebSocket responde
    const wsCheck = await checkWebSocketResponds(host, port);
    checks.push(wsCheck);
    onProgress?.(wsCheck);
    
    // Check 3: Autenticación
    const authCheck = await checkAuthentication(host, port, password);
    checks.push(authCheck);
    onProgress?.(authCheck);
    
    // Check 4: Versión compatible
    const versionCheck = await checkVersionCompatible(host, port);
    checks.push(versionCheck);
    onProgress?.(versionCheck);
  }
  
  // Calcular estado general
  const failedChecks = checks.filter(c => c.status === 'fail').length;
  const warningChecks = checks.filter(c => c.status === 'warning').length;
  
  let overallStatus: 'healthy' | 'issues' | 'critical';
  let summary: string;
  
  if (failedChecks === 0 && warningChecks === 0) {
    overallStatus = 'healthy';
    summary = 'Todos los checks pasaron correctamente';
  } else if (failedChecks === 0) {
    overallStatus = 'issues';
    summary = `${warningChecks} advertencia(s) detectada(s)`;
  } else {
    overallStatus = 'critical';
    summary = `${failedChecks} problema(s) crítico(s) detectado(s)`;
  }
  
  return {
    checks,
    overallStatus,
    summary,
    timestamp: Date.now(),
  };
}

/**
 * Genera un reporte de diagnóstico en texto
 */
export function generateDiagnosticReport(result: DiagnosticResult): string {
  const lines: string[] = [
    '=== Diagnóstico de Conexión OBS ===',
    `Fecha: ${new Date(result.timestamp).toLocaleString()}`,
    `Estado: ${result.overallStatus.toUpperCase()}`,
    `Resumen: ${result.summary}`,
    '',
    '--- Checks ---',
  ];
  
  for (const check of result.checks) {
    const statusIcon = {
      pass: '✓',
      fail: '✗',
      warning: '⚠',
      skipped: '○',
      pending: '...',
      checking: '...',
    }[check.status];
    
    lines.push(`${statusIcon} ${check.name}: ${check.message || check.status}`);
    if (check.details) {
      lines.push(`   ${check.details}`);
    }
    if (check.fix) {
      lines.push(`   Fix: ${check.fix}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Obtiene las sugerencias de fix para todos los checks fallidos
 */
export function getFixSuggestions(result: DiagnosticResult): string[] {
  return result.checks
    .filter(c => c.status === 'fail' || c.status === 'warning')
    .filter(c => c.fix)
    .map(c => c.fix!);
}

// Singleton service
class OBSDiagnosticService {
  private static instance: OBSDiagnosticService;
  private lastResult: DiagnosticResult | null = null;
  private isRunning = false;
  
  private constructor() {}
  
  static getInstance(): OBSDiagnosticService {
    if (!OBSDiagnosticService.instance) {
      OBSDiagnosticService.instance = new OBSDiagnosticService();
    }
    return OBSDiagnosticService.instance;
  }
  
  async runDiagnostics(
    host: string,
    port: number,
    password?: string,
    onProgress?: (check: DiagnosticCheck) => void
  ): Promise<DiagnosticResult> {
    if (this.isRunning) {
      throw new Error('Diagnóstico ya en progreso');
    }
    
    this.isRunning = true;
    try {
      this.lastResult = await runDiagnostics(host, port, password, onProgress);
      return this.lastResult;
    } finally {
      this.isRunning = false;
    }
  }
  
  getLastResult(): DiagnosticResult | null {
    return this.lastResult;
  }
  
  generateReport(): string | null {
    if (!this.lastResult) return null;
    return generateDiagnosticReport(this.lastResult);
  }
  
  getFixSuggestions(): string[] {
    if (!this.lastResult) return [];
    return getFixSuggestions(this.lastResult);
  }
  
  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }
}

export const obsDiagnosticService = OBSDiagnosticService.getInstance();
export default obsDiagnosticService;
