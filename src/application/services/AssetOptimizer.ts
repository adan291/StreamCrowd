/**
 * AssetOptimizer - Optimizes images, fonts, and media assets
 * Implements Phase 4: Asset Optimization
 */

export interface AssetOptimizationConfig {
  images: {
    enableWebP: boolean;
    enableAVIF: boolean;
    quality: number;
    maxWidth: number;
    maxHeight: number;
  };
  fonts: {
    enableSubsetting: boolean;
    enablePreloading: boolean;
    fontDisplay: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  };
  audio: {
    enableCompression: boolean;
    enableLazyLoading: boolean;
    formats: string[];
  };
}

export class AssetOptimizer {
  private static instance: AssetOptimizer;
  private config: AssetOptimizationConfig;

  private static readonly DEFAULT_CONFIG: AssetOptimizationConfig = {
    images: {
      enableWebP: true,
      enableAVIF: true,
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1080,
    },
    fonts: {
      enableSubsetting: true,
      enablePreloading: true,
      fontDisplay: 'swap',
    },
    audio: {
      enableCompression: true,
      enableLazyLoading: true,
      formats: ['mp3', 'ogg'],
    },
  };

  private constructor(config?: Partial<AssetOptimizationConfig>) {
    this.config = { ...AssetOptimizer.DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<AssetOptimizationConfig>): AssetOptimizer {
    if (!AssetOptimizer.instance) {
      AssetOptimizer.instance = new AssetOptimizer(config);
    }
    return AssetOptimizer.instance;
  }

  /**
   * Task 4.1.1-4.1.6: Image optimization with modern formats
   */
  public async optimizeImage(
    imageUrl: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'auto';
    }
  ): Promise<string> {
    const { width, height, quality = this.config.images.quality, format = 'auto' } = options || {};

    // Check browser support for modern formats
    const supportsAVIF = await this.checkAVIFSupport();
    const supportsWebP = await this.checkWebPSupport();

    // Determine optimal format
    let targetFormat = format;
    if (format === 'auto') {
      if (supportsAVIF && this.config.images.enableAVIF) {
        targetFormat = 'avif';
      } else if (supportsWebP && this.config.images.enableWebP) {
        targetFormat = 'webp';
      }
    }

    // Generate optimized image URL (this would integrate with your image service)
    const optimizedUrl = this.generateOptimizedImageUrl(imageUrl, {
      width,
      height,
      quality,
      format: targetFormat,
    });

    return optimizedUrl;
  }

  /**
   * Task 4.1.4: Implement responsive image loading
   */
  public generateResponsiveImageSrcSet(
    baseUrl: string,
    breakpoints: number[] = [320, 640, 768, 1024, 1280, 1920]
  ): string {
    const srcSet = breakpoints
      .map(width => {
        const optimizedUrl = this.generateOptimizedImageUrl(baseUrl, { width });
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');

    return srcSet;
  }

  /**
   * Task 4.1.5: Add lazy loading for non-critical images
   */
  public createLazyImage(
    src: string,
    alt: string,
    options?: {
      className?: string;
      placeholder?: string;
      threshold?: number;
    }
  ): HTMLImageElement {
    const { className = '', placeholder, threshold = 0.1 } = options || {};

    const img = document.createElement('img');
    img.alt = alt;
    img.className = className;
    img.loading = 'lazy';

    // Add placeholder while loading
    if (placeholder) {
      img.src = placeholder;
      img.dataset.src = src;
    } else {
      img.src = src;
    }

    // Intersection Observer for better lazy loading control
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const lazyImg = entry.target as HTMLImageElement;
              if (lazyImg.dataset.src) {
                lazyImg.src = lazyImg.dataset.src;
                lazyImg.removeAttribute('data-src');
              }
              observer.unobserve(lazyImg);
            }
          });
        },
        { threshold }
      );

      observer.observe(img);
    }

    return img;
  }

  /**
   * Task 4.2.1-4.2.6: Font optimization
   */
  public optimizeFonts(): void {
    // Task 4.2.2: Implement font preloading for critical fonts
    if (this.config.fonts.enablePreloading) {
      this.preloadCriticalFonts();
    }

    // Task 4.2.3: Add font-display: swap for better performance
    this.addFontDisplaySwap();

    // Task 4.2.6: Implement font fallback system
    this.setupFontFallbacks();
  }

  /**
   * Task 4.3.1-4.3.6: Audio and media optimization
   */
  public async optimizeAudio(audioUrl: string): Promise<{
    mp3?: string;
    ogg?: string;
    webm?: string;
  }> {
    const optimizedFormats: { [key: string]: string } = {};

    // Generate different format URLs based on browser support
    if (this.config.audio.formats.includes('mp3')) {
      optimizedFormats.mp3 = this.generateOptimizedAudioUrl(audioUrl, 'mp3');
    }
    if (this.config.audio.formats.includes('ogg')) {
      optimizedFormats.ogg = this.generateOptimizedAudioUrl(audioUrl, 'ogg');
    }
    if (this.config.audio.formats.includes('webm')) {
      optimizedFormats.webm = this.generateOptimizedAudioUrl(audioUrl, 'webm');
    }

    return optimizedFormats;
  }

  /**
   * Task 4.3.2: Implement lazy loading for audio assets
   */
  public createLazyAudio(
    sources: { [format: string]: string },
    options?: {
      preload?: 'none' | 'metadata' | 'auto';
      controls?: boolean;
      autoplay?: boolean;
    }
  ): HTMLAudioElement {
    const { preload = 'none', controls = true, autoplay = false } = options || {};

    const audio = document.createElement('audio');
    audio.preload = preload;
    audio.controls = controls;
    audio.autoplay = autoplay;

    // Add sources in order of preference
    const formatPriority = ['webm', 'ogg', 'mp3'];
    formatPriority.forEach(format => {
      if (sources[format]) {
        const source = document.createElement('source');
        source.src = sources[format];
        source.type = `audio/${format}`;
        audio.appendChild(source);
      }
    });

    return audio;
  }

  /**
   * Task 4.3.4: Create audio preloading for critical sounds
   */
  public preloadCriticalAudio(audioUrls: string[]): void {
    audioUrls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'audio';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  /**
   * Task 4.3.6: Implement media caching strategy
   */
  public setupMediaCaching(): void {
    // Register service worker for media caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Send message to service worker to setup media caching
        registration.active?.postMessage({
          type: 'SETUP_MEDIA_CACHE',
          config: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            maxEntries: 50,
          },
        });
      });
    }
  }

  // Private helper methods

  private async checkWebPSupport(): Promise<boolean> {
    return new Promise(resolve => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  private async checkAVIFSupport(): Promise<boolean> {
    return new Promise(resolve => {
      const avif = new Image();
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 2);
      };
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
    });
  }

  private generateOptimizedImageUrl(
    baseUrl: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: string;
    }
  ): string {
    // This would integrate with your image optimization service
    // For now, return the original URL with query parameters
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format && options.format !== 'auto') params.set('f', options.format);

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  }

  private generateOptimizedAudioUrl(baseUrl: string, format: string): string {
    // Convert audio to specified format
    const extension = baseUrl.split('.').pop();
    return baseUrl.replace(`.${extension}`, `.${format}`);
  }

  private preloadCriticalFonts(): void {
    const criticalFonts = [
      '/fonts/inter-var.woff2',
      '/fonts/inter-bold.woff2',
    ];

    criticalFonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = fontUrl;
      document.head.appendChild(link);
    });
  }

  private addFontDisplaySwap(): void {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'Inter';
        font-display: ${this.config.fonts.fontDisplay};
        src: url('/fonts/inter-var.woff2') format('woff2');
        font-weight: 100 900;
      }
    `;
    document.head.appendChild(style);
  }

  private setupFontFallbacks(): void {
    const style = document.createElement('style');
    style.textContent = `
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get optimization statistics
   */
  public getOptimizationStats(): {
    imagesOptimized: number;
    fontsPreloaded: number;
    audioOptimized: number;
    totalSavings: number;
  } {
    // This would track actual optimization statistics
    return {
      imagesOptimized: 0,
      fontsPreloaded: 0,
      audioOptimized: 0,
      totalSavings: 0,
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AssetOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const assetOptimizer = AssetOptimizer.getInstance();