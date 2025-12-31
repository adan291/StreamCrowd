/**
 * OBSDiscoveryService - Servicio para auto-descubrir instancias de OBS
 * 
 * Este servicio escanea puertos conocidos para detectar instancias de OBS
 * con WebSocket habilitado, facilitando la conexión automática.
 * 
 * @requirements 1.1, 1.3
 */

export interface OBSInstance {
  host: string;
  port: number;
  version?: string;
  requiresPassword: boolean;
  responseTime?: number;
}

export interface DiscoveryResult {
  found: boolean;
  instances: OBSInstance[];
  defaultInstance?: OBSInstance;
  scanDuration: number;
}

export interface ConnectionTestResult {
  success: boolean;
  requiresPassword: boolean;
  version?: string;
  error?: string;
  responseTime: number;
}

/**
 * Puertos estándar de OBS WebSocket
 * - 4455: OBS WebSocket 5.x (default)
 * - 4444: OBS WebSocket 4.x (legacy)
 * - 4456: Puerto alternativo común
 */
export const OBS_PORTS = [4455, 4444, 4456];

/**
 * Timeout para pruebas de conexión (ms)
 */
const CONNECTION_TIMEOUT = 3000;

/**
 * Clave de localStorage para la última conexión exitosa
 */
const LAST_CONNECTION_KEY = 'obs_last_successful_connection';

/**
 * Prueba la conexión a un puerto específico de OBS WebSocket
 */
export async function testConnection(
  host: string,
  port: number,
  password?: string
): Promise<ConnectionTestResult> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://${host}:${port}`);
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.close();
        resolve({
          success: false,
          requiresPassword: false,
          error: 'Connection timeout',
          responseTime: Date.now() - startTime,
        });
      }
    }, CONNECTION_TIMEOUT);
    
    ws.onopen = () => {
      // WebSocket conectado, enviar mensaje de identificación
      try {
        ws.send(JSON.stringify({
          op: 1, // Identify
          d: {
            rpcVersion: 1,
            authentication: password ? password : undefined,
          },
        }));
      } catch {
        // Si falla el envío, aún así la conexión fue exitosa
      }
    };
    
    ws.onmessage = (event) => {
      if (resolved) return;
      
      try {
        const data = JSON.parse(event.data);
        clearTimeout(timeout);
        resolved = true;
        ws.close();
        
        // Analizar respuesta de OBS WebSocket
        if (data.op === 0) { // Hello message
          resolve({
            success: true,
            requiresPassword: data.d?.authentication !== undefined,
            version: data.d?.obsWebSocketVersion,
            responseTime: Date.now() - startTime,
          });
        } else if (data.op === 2) { // Identified
          resolve({
            success: true,
            requiresPassword: false,
            version: data.d?.negotiatedRpcVersion?.toString(),
            responseTime: Date.now() - startTime,
          });
        } else {
          resolve({
            success: true,
            requiresPassword: false,
            responseTime: Date.now() - startTime,
          });
        }
      } catch {
        clearTimeout(timeout);
        resolved = true;
        ws.close();
        resolve({
          success: true,
          requiresPassword: false,
          responseTime: Date.now() - startTime,
        });
      }
    };
    
    ws.onerror = () => {
      if (resolved) return;
      clearTimeout(timeout);
      resolved = true;
      ws.close();
      resolve({
        success: false,
        requiresPassword: false,
        error: 'Connection failed',
        responseTime: Date.now() - startTime,
      });
    };
    
    ws.onclose = () => {
      if (resolved) return;
      clearTimeout(timeout);
      resolved = true;
      resolve({
        success: false,
        requiresPassword: false,
        error: 'Connection closed',
        responseTime: Date.now() - startTime,
      });
    };
  });
}

/**
 * Descubre instancias de OBS en la red local
 * @requirements 1.1, 1.3
 */
export async function discoverOBS(host: string = 'localhost'): Promise<DiscoveryResult> {
  const startTime = Date.now();
  const instances: OBSInstance[] = [];
  
  // Escanear todos los puertos en paralelo
  const results = await Promise.all(
    OBS_PORTS.map(async (port) => {
      const result = await testConnection(host, port);
      return { port, result };
    })
  );
  
  // Procesar resultados
  for (const { port, result } of results) {
    if (result.success) {
      instances.push({
        host,
        port,
        version: result.version,
        requiresPassword: result.requiresPassword,
        responseTime: result.responseTime,
      });
    }
  }
  
  // Ordenar por tiempo de respuesta (más rápido primero)
  instances.sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0));
  
  return {
    found: instances.length > 0,
    instances,
    defaultInstance: instances[0],
    scanDuration: Date.now() - startTime,
  };
}

/**
 * Guarda la última conexión exitosa
 * @requirements 1.5
 */
export function saveLastConnection(instance: OBSInstance): void {
  try {
    localStorage.setItem(LAST_CONNECTION_KEY, JSON.stringify({
      ...instance,
      timestamp: Date.now(),
    }));
  } catch {
    // Ignorar errores de localStorage
  }
}

/**
 * Obtiene la última conexión exitosa
 * @requirements 1.5
 */
export function getLastConnection(): (OBSInstance & { timestamp: number }) | null {
  try {
    const saved = localStorage.getItem(LAST_CONNECTION_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignorar errores de localStorage
  }
  return null;
}

/**
 * Limpia la última conexión guardada
 */
export function clearLastConnection(): void {
  try {
    localStorage.removeItem(LAST_CONNECTION_KEY);
  } catch {
    // Ignorar errores de localStorage
  }
}

/**
 * Intenta reconectar a la última conexión exitosa
 * @requirements 1.5
 */
export async function tryReconnectToLast(): Promise<OBSInstance | null> {
  const lastConnection = getLastConnection();
  if (!lastConnection) return null;
  
  // Verificar que la conexión aún funciona
  const result = await testConnection(lastConnection.host, lastConnection.port);
  
  if (result.success) {
    return {
      host: lastConnection.host,
      port: lastConnection.port,
      version: result.version || lastConnection.version,
      requiresPassword: result.requiresPassword,
      responseTime: result.responseTime,
    };
  }
  
  return null;
}

// Singleton service
class OBSDiscoveryService {
  private static instance: OBSDiscoveryService;
  private isScanning = false;
  private lastScanResult: DiscoveryResult | null = null;
  
  private constructor() {}
  
  static getInstance(): OBSDiscoveryService {
    if (!OBSDiscoveryService.instance) {
      OBSDiscoveryService.instance = new OBSDiscoveryService();
    }
    return OBSDiscoveryService.instance;
  }
  
  async discover(host: string = 'localhost'): Promise<DiscoveryResult> {
    if (this.isScanning) {
      // Si ya hay un escaneo en progreso, esperar y devolver el resultado
      while (this.isScanning) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.lastScanResult || { found: false, instances: [], scanDuration: 0 };
    }
    
    this.isScanning = true;
    try {
      this.lastScanResult = await discoverOBS(host);
      return this.lastScanResult;
    } finally {
      this.isScanning = false;
    }
  }
  
  async testPort(host: string, port: number, password?: string): Promise<ConnectionTestResult> {
    return testConnection(host, port, password);
  }
  
  saveConnection(instance: OBSInstance): void {
    saveLastConnection(instance);
  }
  
  getLastConnection(): (OBSInstance & { timestamp: number }) | null {
    return getLastConnection();
  }
  
  clearLastConnection(): void {
    clearLastConnection();
  }
  
  async tryReconnect(): Promise<OBSInstance | null> {
    return tryReconnectToLast();
  }
  
  getLastScanResult(): DiscoveryResult | null {
    return this.lastScanResult;
  }
  
  isCurrentlyScanning(): boolean {
    return this.isScanning;
  }
}

export const obsDiscoveryService = OBSDiscoveryService.getInstance();
export default obsDiscoveryService;
