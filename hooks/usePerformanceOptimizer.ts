import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Type declarations for browser APIs
declare global {
  interface Navigator {
    connection?: {
      effectiveType?: string;
      downlink?: number;
    };
  }
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  bundleSize: number;
  networkLatency: number;
  cpuUsage: number;
}

interface OptimizationSettings {
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  enableCodeSplitting: boolean;
  enableServiceWorker: boolean;
  maxConcurrentRequests: number;
  debounceDelay: number;
  throttleDelay: number;
  enableVirtualization: boolean;
}

interface UsePerformanceOptimizerReturn {
  metrics: PerformanceMetrics;
  settings: OptimizationSettings;
  updateSettings: (newSettings: Partial<OptimizationSettings>) => void;
  optimizeComponent: <T extends (...args: unknown[]) => unknown>(fn: T, options?: OptimizationOptions) => T;
  debounce: <T extends (...args: unknown[]) => unknown>(fn: T, delay?: number) => T;
  throttle: <T extends (...args: unknown[]) => unknown>(fn: T, delay?: number) => T;
  measurePerformance: (name: string, fn: () => void | Promise<void>) => Promise<void>;
  getRecommendations: () => string[];
  isLowPerformanceDevice: boolean;
  enablePerformanceMode: () => void;
  disablePerformanceMode: () => void;
}

interface OptimizationOptions {
  cache?: boolean;
  memoize?: boolean;
  debounce?: number;
  throttle?: number;
}

/**
 * Hook para optimización automática de performance
 * 
 * Características:
 * - Monitoreo de métricas en tiempo real
 * - Optimizaciones automáticas basadas en dispositivo
 * - Debounce y throttle inteligentes
 * - Code splitting dinámico
 * - Recomendaciones de optimización
 * - Modo de bajo rendimiento automático
 * - Cache inteligente de funciones
 */
export function usePerformanceOptimizer(): UsePerformanceOptimizerReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    bundleSize: 0,
    networkLatency: 0,
    cpuUsage: 0
  });

  const [settings, setSettings] = useLocalStorage<OptimizationSettings>('performanceSettings', {
    enableLazyLoading: true,
    enableImageOptimization: true,
    enableCodeSplitting: true,
    enableServiceWorker: true,
    maxConcurrentRequests: 6,
    debounceDelay: 300,
    throttleDelay: 100,
    enableVirtualization: false
  });

  const [isLowPerformanceDevice, setIsLowPerformanceDevice] = useState(false);
  const performanceObserver = useRef<PerformanceObserver | null>(null);
  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const functionCache = useRef<Map<string, { result: unknown; timestamp: number }>>(new Map());

  // Detectar dispositivo de bajo rendimiento
  useEffect(() => {
    const detectLowPerformance = () => {
      const connection = navigator.connection;
      const memory = performance.memory;
      
      let score = 0;
      
      // Verificar conexión
      if (connection) {
        if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') score += 3;
        else if (connection.effectiveType === '3g') score += 2;
        else if (connection.effectiveType === '4g') score += 1;
      }
      
      // Verificar memoria
      if (memory) {
        const memoryGB = memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
        if (memoryGB < 1) score += 3;
        else if (memoryGB < 2) score += 2;
        else if (memoryGB < 4) score += 1;
      }
      
      // Verificar cores de CPU
      if (navigator.hardwareConcurrency <= 2) score += 2;
      else if (navigator.hardwareConcurrency <= 4) score += 1;
      
      // Verificar user agent para dispositivos móviles
      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        score += 1;
      }
      
      setIsLowPerformanceDevice(score >= 4);
      
      // Activar optimizaciones automáticas en dispositivos lentos
      if (score >= 4) {
        setSettings(prev => ({
          ...prev,
          enableVirtualization: true,
          maxConcurrentRequests: 3,
          debounceDelay: 500,
          throttleDelay: 200
        }));
      }
    };

    detectLowPerformance();
  }, [setSettings]);

  // Monitorear FPS
  useEffect(() => {
    const measureFPS = () => {
      const now = performance.now();
      frameCount.current++;
      
      if (now - lastFrameTime.current >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / (now - lastFrameTime.current));
        setMetrics(prev => ({ ...prev, fps }));
        
        frameCount.current = 0;
        lastFrameTime.current = now;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }, []);

  // Monitorear memoria
  useEffect(() => {
    const measureMemory = () => {
      if (performance.memory) {
        const memory = performance.memory;
        const memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    const interval = setInterval(measureMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  // Performance Observer para métricas detalladas
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            setMetrics(prev => ({ ...prev, renderTime: entry.duration }));
          } else if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            const networkLatency = navEntry.responseEnd - navEntry.requestStart;
            setMetrics(prev => ({ ...prev, networkLatency }));
          }
        });
      });

      performanceObserver.current.observe({ entryTypes: ['measure', 'navigation'] });
    }

    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect();
      }
    };
  }, []);

  // Debounce inteligente
  const debounce = useCallback(<T extends (...args: unknown[]) => unknown>(
    fn: T, 
    delay?: number
  ): T => {
    const actualDelay = delay || settings.debounceDelay;
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: unknown[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), actualDelay);
    }) as T;
  }, [settings.debounceDelay]);

  // Throttle inteligente
  const throttle = useCallback(<T extends (...args: unknown[]) => unknown>(
    fn: T, 
    delay?: number
  ): T => {
    const actualDelay = delay || settings.throttleDelay;
    let lastCall = 0;
    
    return ((...args: unknown[]) => {
      const now = Date.now();
      if (now - lastCall >= actualDelay) {
        lastCall = now;
        return fn(...args);
      }
    }) as T;
  }, [settings.throttleDelay]);

  // Optimizador de componentes
  const optimizeComponent = useCallback(<T extends (...args: unknown[]) => unknown>(
    fn: T, 
    options: OptimizationOptions = {}
  ): T => {
    let optimizedFn = fn;

    // Cache de resultados
    if (options.cache) {
      const cacheKey = fn.toString();
      optimizedFn = ((...args: unknown[]) => {
        const argsKey = JSON.stringify(args);
        const fullKey = `${cacheKey}-${argsKey}`;
        const cached = functionCache.current.get(fullKey);
        
        if (cached && Date.now() - cached.timestamp < 60000) { // Cache por 1 minuto
          return cached.result;
        }
        
        const result = fn(...args);
        functionCache.current.set(fullKey, { result, timestamp: Date.now() });
        
        // Limpiar cache viejo
        if (functionCache.current.size > 100) {
          const entries = Array.from(functionCache.current.entries());
          const oldEntries = entries.filter(([, value]) => Date.now() - value.timestamp > 60000);
          oldEntries.forEach(([key]) => functionCache.current.delete(key));
        }
        
        return result;
      }) as T;
    }

    // Debounce
    if (options.debounce) {
      optimizedFn = debounce(optimizedFn, options.debounce);
    }

    // Throttle
    if (options.throttle) {
      optimizedFn = throttle(optimizedFn, options.throttle);
    }

    return optimizedFn;
  }, [debounce, throttle]);

  // Medidor de performance
  const measurePerformance = useCallback(async (name: string, fn: () => void | Promise<void>) => {
    const startTime = performance.now();
    performance.mark(`${name}-start`);
    
    try {
      await fn();
    } finally {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`⚡ Performance: ${name} took ${duration.toFixed(2)}ms`);
    }
  }, []);

  // Generar recomendaciones
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];

    if (metrics.fps < 30) {
      recommendations.push('FPS bajo detectado. Considera reducir animaciones o activar modo de rendimiento.');
    }

    if (metrics.memoryUsage > 80) {
      recommendations.push('Alto uso de memoria. Considera limpiar cache o reducir componentes activos.');
    }

    if (metrics.renderTime > 16) {
      recommendations.push('Tiempo de render alto. Considera usar React.memo o lazy loading.');
    }

    if (metrics.networkLatency > 1000) {
      recommendations.push('Latencia de red alta. Considera activar service worker o reducir requests.');
    }

    if (!settings.enableLazyLoading) {
      recommendations.push('Lazy loading desactivado. Activarlo puede mejorar el tiempo de carga inicial.');
    }

    if (!settings.enableCodeSplitting) {
      recommendations.push('Code splitting desactivado. Activarlo puede reducir el bundle size.');
    }

    if (isLowPerformanceDevice && !settings.enableVirtualization) {
      recommendations.push('Dispositivo de bajo rendimiento detectado. Considera activar virtualización.');
    }

    return recommendations;
  }, [metrics, settings, isLowPerformanceDevice]);

  // Modo de rendimiento
  const enablePerformanceMode = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      enableLazyLoading: true,
      enableImageOptimization: true,
      enableCodeSplitting: true,
      enableVirtualization: true,
      maxConcurrentRequests: 3,
      debounceDelay: 500,
      throttleDelay: 200
    }));
  }, [setSettings]);

  const disablePerformanceMode = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      enableVirtualization: false,
      maxConcurrentRequests: 6,
      debounceDelay: 300,
      throttleDelay: 100
    }));
  }, [setSettings]);

  // Actualizar configuración
  const updateSettings = useCallback((newSettings: Partial<OptimizationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  // Limpiar cache periódicamente
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(functionCache.current.entries());
      const expiredEntries = entries.filter(([, value]) => now - value.timestamp > 300000); // 5 minutos
      
      expiredEntries.forEach(([key]) => functionCache.current.delete(key));
      
      if (expiredEntries.length > 0) {
        console.log(`🧹 Cleaned up ${expiredEntries.length} expired cache entries`);
      }
    }, 60000); // Cada minuto

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    metrics,
    settings,
    updateSettings,
    optimizeComponent,
    debounce,
    throttle,
    measurePerformance,
    getRecommendations,
    isLowPerformanceDevice,
    enablePerformanceMode,
    disablePerformanceMode
  };
}