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
            // Solo separar librerías pesadas que NO dependen de React
            // Esto evita problemas de orden de inicialización
            if (id.includes('node_modules')) {
              // Firebase - muy pesado, no depende de React
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              // Excel export - muy pesado, no depende de React
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              // D3 (sin recharts) - pesado, no depende de React
              if (id.includes('d3-') && !id.includes('recharts')) {
                return 'vendor-d3';
              }
              // Dejar que Vite maneje todo lo demás automáticamente
              // Esto incluye React, recharts, lucide, framer-motion, etc.
              // Vite resolverá el orden correcto de dependencias
              return undefined;
            }
            // No separar código de la app - dejar que Vite optimice
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
