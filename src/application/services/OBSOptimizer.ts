export class OBSOptimizer {
  private isInitialized = false;
  private performanceMode = false;
  private frameRateMonitor: number | null = null;

  /**
   * Detect if running in OBS Browser Source environment
   */
  isOBSEnvironment(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      window.navigator.userAgent.includes('OBS') || 
      (window as any).obsstudio !== undefined ||
      window.location.search.includes('obs=true') ||
      window.location.search.includes('overlay')
    );
  }

  /**
   * Apply OBS-specific optimizations
   */
  applyOBSOptimizations(): void {
    if (!this.isOBSEnvironment() || this.isInitialized) return;

    console.log('🎬 Applying OBS optimizations...');

    // Disable animations that can cause performance issues in OBS
    this.optimizeAnimations();
    
    // Optimize rendering performance
    this.optimizeRendering();
    
    // Preload critical overlays
    this.preloadCriticalOverlays();
    
    // Monitor performance
    this.monitorOBSPerformance();
    
    // Apply CSS optimizations
    this.applyCSSOptimizations();
    
    // Optimize memory usage
    this.optimizeMemoryUsage();

    this.isInitialized = true;
    console.log('✅ OBS optimizations applied');
  }

  /**
   * Disable or reduce animations for better OBS performance
   */
  private optimizeAnimations(): void {
    const style = document.createElement('style');
    style.id = 'obs-animation-optimizations';
    style.textContent = `
      /* Reduce animation duration for OBS */
      * {
        --animation-duration: 0.1s !important;
        --transition-duration: 0.1s !important;
      }
      
      /* Disable problematic animations */
      .animate-spin {
        animation-duration: 0.5s !important;
      }
      
      .animate-pulse {
        animation-duration: 1s !important;
      }
      
      /* Optimize fade animations */
      .animate-fade-in,
      .animate-fade-out {
        animation-duration: 0.2s !important;
      }
      
      /* Disable complex transforms that can cause issues */
      .animate-bounce {
        animation: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Optimize rendering performance for OBS
   */
  private optimizeRendering(): void {
    // Force hardware acceleration on body
    document.body.style.transform = 'translateZ(0)';
    document.body.style.backfaceVisibility = 'hidden';
    
    // Set optimal rendering hints
    document.body.style.imageRendering = 'optimizeSpeed';
    document.body.style.textRendering = 'optimizeSpeed';
    
    // Disable text selection to improve performance
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  }

  /**
   * Apply CSS optimizations specific to OBS
   */
  private applyCSSOptimizations(): void {
    const style = document.createElement('style');
    style.id = 'obs-css-optimizations';
    style.textContent = `
      /* Font rendering optimizations */
      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        font-smooth: always;
      }
      
      /* Overlay container optimizations */
      .overlay-container,
      [data-overlay="true"] {
        will-change: transform, opacity;
        backface-visibility: hidden;
        transform: translateZ(0);
        contain: layout style paint;
      }
      
      /* Optimize frequently changing elements */
      .poll-option,
      .vote-count,
      .timer-display,
      .game-score {
        will-change: transform, opacity;
        contain: layout;
      }
      
      /* Reduce repaints for text elements */
      .text-content {
        contain: style;
      }
      
      /* Optimize images */
      img {
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
      }
      
      /* Disable outline for better performance */
      * {
        outline: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Preload critical overlays for OBS
   */
  private preloadCriticalOverlays(): void {
    const criticalOverlays = [
      'poll-overlay',
      'countdown-overlay',
      'spinner-overlay',
      'judge-panel-overlay'
    ];

    criticalOverlays.forEach(async (overlay) => {
      try {
        // Dynamically import based on overlay type
        const overlayPath = this.getOverlayPath(overlay);
        if (overlayPath) {
          await import(overlayPath);
          console.log(`🚀 Preloaded ${overlay} for OBS`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${overlay}:`, error);
      }
    });
  }

  /**
   * Get the import path for an overlay
   */
  private getOverlayPath(overlayName: string): string | null {
    const overlayMap: Record<string, string> = {
      'poll-overlay': '../../../components/PollOverlay',
      'countdown-overlay': '../../../components/Countdown',
      'spinner-overlay': '../../../components/SpinnerWheel',
      'judge-panel-overlay': '../../../components/JudgePanel',
    };

    return overlayMap[overlayName] || null;
  }

  /**
   * Monitor OBS performance and adjust settings
   */
  private monitorOBSPerformance(): void {
    let frameCount = 0;
    let lastTime = performance.now();
    let lowFPSCount = 0;

    const checkPerformance = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        // Track FPS
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'obs_performance', {
            fps: fps,
            performance_mode: this.performanceMode
          });
        }
        
        // Detect low FPS and trigger performance mode
        if (fps < 30) {
          lowFPSCount++;
          console.warn(`⚠️ Low FPS detected in OBS: ${fps} (${lowFPSCount} times)`);
          
          if (lowFPSCount >= 3 && !this.performanceMode) {
            this.triggerPerformanceMode();
          }
        } else {
          lowFPSCount = 0;
          
          // Exit performance mode if FPS is good
          if (this.performanceMode && fps >= 50) {
            this.exitPerformanceMode();
          }
        }
      }
      
      this.frameRateMonitor = requestAnimationFrame(checkPerformance);
    };
    
    this.frameRateMonitor = requestAnimationFrame(checkPerformance);
  }

  /**
   * Trigger performance mode to reduce quality and improve FPS
   */
  private triggerPerformanceMode(): void {
    if (this.performanceMode) return;
    
    console.log('🔧 Triggering OBS performance mode');
    this.performanceMode = true;
    
    // Add performance mode class to document
    document.documentElement.classList.add('obs-performance-mode');
    
    // Apply additional performance optimizations
    const style = document.createElement('style');
    style.id = 'obs-performance-mode';
    style.textContent = `
      .obs-performance-mode {
        /* Disable all animations */
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
        
        /* Reduce visual effects */
        .shadow-lg, .shadow-xl {
          box-shadow: none !important;
        }
        
        .blur {
          filter: none !important;
        }
        
        /* Simplify gradients */
        .bg-gradient-to-r,
        .bg-gradient-to-l,
        .bg-gradient-to-t,
        .bg-gradient-to-b {
          background: var(--fallback-color, #6366f1) !important;
        }
        
        /* Reduce border radius for simpler rendering */
        .rounded-lg {
          border-radius: 4px !important;
        }
        
        .rounded-xl {
          border-radius: 6px !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Notify about performance mode
    this.dispatchPerformanceModeEvent(true);
  }

  /**
   * Exit performance mode when FPS improves
   */
  private exitPerformanceMode(): void {
    if (!this.performanceMode) return;
    
    console.log('✅ Exiting OBS performance mode');
    this.performanceMode = false;
    
    // Remove performance mode class
    document.documentElement.classList.remove('obs-performance-mode');
    
    // Remove performance mode styles
    const performanceStyle = document.getElementById('obs-performance-mode');
    if (performanceStyle) {
      performanceStyle.remove();
    }
    
    // Notify about performance mode exit
    this.dispatchPerformanceModeEvent(false);
  }

  /**
   * Optimize memory usage for long-running OBS sessions
   */
  private optimizeMemoryUsage(): void {
    // Clean up unused resources periodically
    setInterval(() => {
      if (this.isOBSEnvironment()) {
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
        
        // Clear any cached data that's not needed
        this.clearUnusedCaches();
      }
    }, 60000); // Every minute
  }

  /**
   * Clear unused caches to free memory
   */
  private clearUnusedCaches(): void {
    // Clear old performance entries
    if (performance.clearResourceTimings) {
      performance.clearResourceTimings();
    }
    
    // Clear old console logs in development
    if (process.env.NODE_ENV === 'development' && console.clear) {
      // Only clear if there are too many logs
      const logCount = (console as any)._logCount || 0;
      if (logCount > 1000) {
        console.clear();
        (console as any)._logCount = 0;
      }
    }
  }

  /**
   * Dispatch custom event for performance mode changes
   */
  private dispatchPerformanceModeEvent(enabled: boolean): void {
    const event = new CustomEvent('obsPerformanceModeChange', {
      detail: { enabled, timestamp: Date.now() }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get current performance status
   */
  getPerformanceStatus(): {
    isOBS: boolean;
    performanceMode: boolean;
    isInitialized: boolean;
  } {
    return {
      isOBS: this.isOBSEnvironment(),
      performanceMode: this.performanceMode,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Manually trigger performance mode (for testing)
   */
  forcePerformanceMode(enabled: boolean): void {
    if (enabled) {
      this.triggerPerformanceMode();
    } else {
      this.exitPerformanceMode();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.frameRateMonitor) {
      cancelAnimationFrame(this.frameRateMonitor);
      this.frameRateMonitor = null;
    }
    
    // Remove optimization styles
    const styles = [
      'obs-animation-optimizations',
      'obs-css-optimizations',
      'obs-performance-mode'
    ];
    
    styles.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
    
    // Remove performance mode class
    document.documentElement.classList.remove('obs-performance-mode');
    
    this.isInitialized = false;
    this.performanceMode = false;
  }
}

// Singleton instance
export const obsOptimizer = new OBSOptimizer();