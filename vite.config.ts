import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { viteSecurityHeadersPlugin } from './src/infrastructure/security/viteSecurityHeadersPlugin';

// Plugin para inyectar versión de build en index.html
function buildVersionPlugin(): Plugin {
  return {
    name: 'build-version',
    transformIndexHtml(html) {
      const buildTime = Date.now().toString();
      return html.replace(/__BUILD_TIME__/g, buildTime);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      tailwindcss(),
      buildVersionPlugin(),
      viteSecurityHeadersPlugin(),
      visualizer({
        filename: 'dist/bundle-report.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      VitePWA({
        registerType: 'prompt', // Cambiado a prompt para control manual
        includeAssets: ['ai-vision-icon.svg', 'ai-vision-icon.png', 'ai-vision-icon.ico', 'favicon.ico'],
        devOptions: {
          enabled: false
        },
        workbox: {
          // Limpiar caches viejos automáticamente
          cleanupOutdatedCaches: true,
          // NO pre-cachear JS - evita problemas de versiones
          globPatterns: ['**/*.{ico,png,svg,woff2}'], // Quitamos CSS y HTML del precache
          // Saltar waiting y activar inmediatamente
          skipWaiting: true,
          clientsClaim: true,
          // Navegación siempre va a la red
          navigateFallback: null,
          // Forzar que index.html siempre venga de la red
          navigateFallbackDenylist: [/.*/],
          runtimeCaching: [
            {
              // JS files - SIEMPRE red primero, cache solo como fallback
              urlPattern: /\.js$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'js-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 // 1 día máximo
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // CSS - Network first también
              urlPattern: /\.css$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'css-cache',
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 7
                }
              }
            },
            {
              // Imágenes de Twitch - Cache first (estas no cambian)
              urlPattern: /^https:\/\/static-cdn\.jtvnw\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'twitch-images',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7
                }
              }
            }
          ]
        },
        manifest: {
          name: 'StreamCrowd',
          short_name: 'StreamCrowd',
          description: 'Suite de herramientas interactivas para streamers: encuestas, sorteos, juegos, panel de jueces y más',
          theme_color: '#9146FF',
          background_color: '#0e0e10',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'ai-vision-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'ai-vision-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          categories: ['entertainment', 'utilities', 'social'],
          screenshots: [],
          shortcuts: [
            {
              name: 'Nueva Encuesta',
              short_name: 'Encuesta',
              description: 'Crear una nueva encuesta',
              url: '/',
              icons: [{ src: 'ai-vision-icon.png', sizes: '192x192' }]
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@reduxjs/toolkit',
        'socket.io-client',
        'web-vitals'
      ],
      exclude: [
        '@mediapipe/tasks-vision', // Load on demand - very heavy AI/ML library
        '@mediapipe/camera_utils',
        '@mediapipe/control_utils',
        '@mediapipe/drawing_utils'
      ]
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 500, // Alertar si chunks > 500KB
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug']
        },
        mangle: {
          safari10: true
        }
      },
      sourcemap: 'hidden', // Source maps for production debugging
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            // Vendor libraries - separate by usage patterns and size
            if (id.includes('node_modules')) {
              // Core React ecosystem - most critical
              if (id.includes('react-dom')) {
                return 'react-dom';
              }
              if (id.includes('react') && !id.includes('recharts') && !id.includes('react-dom')) {
                return 'react-core';
              }
              
              // State management - frequently used
              if (id.includes('@reduxjs/toolkit') || id.includes('redux')) {
                return 'state-management';
              }
              
              // Firebase - heavy but essential for sync
              if (id.includes('firebase')) {
                return 'firebase';
              }
              
              // MediaPipe - very heavy, optional AI features
              if (id.includes('@mediapipe')) {
                return 'mediapipe';
              }
              
              // Charts and visualization - heavy, used in analytics
              if (id.includes('recharts') || id.includes('d3')) {
                return 'charts';
              }
              
              // Socket.io and real-time - essential for streaming
              if (id.includes('socket.io') || id.includes('tmi.js')) {
                return 'realtime';
              }
              
              // OBS integration - specific to streaming
              if (id.includes('obs-websocket')) {
                return 'obs-integration';
              }
              
              // UI libraries - frequently used
              if (id.includes('lucide-react')) {
                return 'ui-icons';
              }
              if (id.includes('framer-motion')) {
                return 'animations';
              }
              
              // Validation and utilities
              if (id.includes('zod')) {
                return 'validation';
              }
              
              // Web Vitals for performance monitoring
              if (id.includes('web-vitals')) {
                return 'performance';
              }
              
              // Other smaller vendors
              return 'vendor';
            }
            
            // Game components - separate chunk per game for lazy loading
            if (id.includes('/games/')) {
              const gameMatch = id.match(/\/games\/([^\/]+)/);
              if (gameMatch) {
                const gameName = gameMatch[1].replace('.tsx', '').toLowerCase();
                return `game-${gameName}`;
              }
            }
            
            // Overlay components - separate chunks for OBS performance
            if (id.includes('Overlay.tsx') || id.includes('/overlays/')) {
              const overlayMatch = id.match(/\/([^\/]+)Overlay/) || id.match(/\/overlays\/([^\/]+)/);
              if (overlayMatch) {
                return `overlay-${overlayMatch[1].toLowerCase()}`;
              }
              return 'overlays';
            }
            
            // Feature-based chunking for large components
            if (id.includes('/components/giveaway/')) {
              return 'feature-giveaway';
            }
            if (id.includes('/components/activity/')) {
              return 'feature-activity';
            }
            if (id.includes('/components/commands/')) {
              return 'feature-commands';
            }
            if (id.includes('/components/collaboration/')) {
              return 'feature-collaboration';
            }
            if (id.includes('/components/metrics/')) {
              return 'feature-metrics';
            }
            if (id.includes('/components/macros/')) {
              return 'feature-macros';
            }
            if (id.includes('/components/plugins/')) {
              return 'feature-plugins';
            }
            if (id.includes('/components/timers/')) {
              return 'feature-timers';
            }
            if (id.includes('/components/obs-export/')) {
              return 'feature-obs-export';
            }
            if (id.includes('/components/integrations/')) {
              return 'feature-integrations';
            }
            if (id.includes('/components/webhooks/')) {
              return 'feature-webhooks';
            }
            if (id.includes('/components/mascot/')) {
              return 'feature-mascot';
            }
            
            // Shared utilities and hooks
            if (id.includes('/hooks/') || id.includes('/utils/')) {
              return 'shared-utils';
            }
            
            // i18n system
            if (id.includes('/i18n/')) {
              return 'i18n';
            }
            
            return undefined;
          },
          
          // Optimize chunk and asset file names
          chunkFileNames: (chunkInfo) => {
            return `assets/js/[name]-[hash].js`;
          },
          
          // Asset optimization with organized structure
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') ?? [];
            const ext = info[info.length - 1];
            
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext ?? '')) {
              return `assets/images/[name]-[hash][extname]`;
            }
            
            if (/woff2?|eot|ttf|otf/i.test(ext ?? '')) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            
            if (/mp3|wav|ogg/i.test(ext ?? '')) {
              return `assets/audio/[name]-[hash][extname]`;
            }
            
            return `assets/[name]-[hash][extname]`;
          }
        }
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      exclude: ['**/node_modules/**', '**/e2e/**'],
      setupFiles: ['./tests/setup.ts'],
    }
  };
});
