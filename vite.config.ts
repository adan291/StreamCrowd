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
          // No pre-cachear archivos JS para evitar problemas de versiones
          globPatterns: ['**/*.{css,html,ico,png,svg,woff2}'],
          // Saltar waiting y activar inmediatamente
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              // JS files - Network first para siempre tener la última versión
              urlPattern: /\.js$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'js-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 // 1 día
                }
              }
            },
            {
              urlPattern: /^https:\/\/static-cdn\.jtvnw\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'twitch-images',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                }
              }
            }
          ]
        },
        manifest: {
          name: 'TwitchVote Live',
          short_name: 'TwitchVote',
          description: 'Encuestas interactivas en vivo para Twitch con análisis de chat y herramientas para streamers',
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
      chunkSizeWarningLimit: 500,
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
            // Vendor chunks - split by library for better caching
            if (id.includes('node_modules')) {
              // React ecosystem - keep together to avoid initialization issues
              if (id.includes('react-dom') || id.includes('react/') || id.includes('/react/') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              // Framer Motion - heavy animation library (depends on React)
              if (id.includes('framer-motion') || id.includes('motion')) {
                return 'vendor-motion';
              }
              // UI icons - lucide-react depends on React, keep separate
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              // Charts library - heavy
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }
              // OBS WebSocket
              if (id.includes('obs-websocket-js')) {
                return 'vendor-obs';
              }
              // Firebase - heavy
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              // Twitch chat
              if (id.includes('tmi.js')) {
                return 'vendor-twitch';
              }
              // Excel export - very heavy
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              // Socket.io for real-time
              if (id.includes('socket.io')) {
                return 'vendor-socket';
              }
              // Don't chunk other small modules - let Vite handle them
              // This prevents initialization order issues
              return undefined;
            }
            // Game components - each game gets its own chunk via lazy loading
            if (id.includes('/components/games/')) {
              const match = id.match(/\/games\/([^/]+)\.(tsx|ts)$/);
              if (match) {
                return `game-${match[1].toLowerCase()}`;
              }
            }
            // Application services - separate chunk
            if (id.includes('/src/application/services/')) {
              return 'app-services';
            }
            // Infrastructure adapters - separate chunk
            if (id.includes('/src/infrastructure/')) {
              return 'app-infrastructure';
            }
            // Analytics components
            if (id.includes('Analytics') || id.includes('analytics')) {
              return 'feature-analytics';
            }
            // OBS related
            if (id.includes('OBS') || id.includes('obs')) {
              return 'feature-obs';
            }
            // Alert system
            if (id.includes('Alert')) {
              return 'feature-alerts';
            }
            // Command system
            if (id.includes('Command')) {
              return 'feature-commands';
            }
            // Giveaway and Judge panels - heavy components
            if (id.includes('Giveaway') || id.includes('Judge')) {
              return 'feature-giveaway';
            }
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
