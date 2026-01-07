import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

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
      visualizer({
        filename: 'dist/bundle-report.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['ai-vision-icon.svg', 'ai-vision-icon.png', 'ai-vision-icon.ico'],
        devOptions: {
          enabled: false
        },
        workbox: {
          // Limpiar caches viejos automáticamente
          cleanupOutdatedCaches: true,
          // NO pre-cachear JS - evita problemas de versiones
          globPatterns: ['**/*.{css,html,ico,png,svg,woff2}'],
          // Saltar waiting y activar inmediatamente
          skipWaiting: true,
          clientsClaim: true,
          // Navegación siempre va a la red
          navigateFallback: null,
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
    build: {
      chunkSizeWarningLimit: 2000, // Silenciar warning - app compleja con muchas features
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Firebase - muy pesado
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              // Recharts y D3 - gráficos pesados
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }
              // OBS WebSocket
              if (id.includes('obs-websocket')) {
                return 'vendor-obs';
              }
              // Socket.io
              if (id.includes('socket.io')) {
                return 'vendor-socket';
              }
              // Lucide icons - muchos iconos
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // TMI.js - Twitch chat
              if (id.includes('tmi.js')) {
                return 'vendor-tmi';
              }
            }
            return undefined;
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
