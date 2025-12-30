import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite config for Mobile PWA build
 * @requirements Task 1.4 - Configurar Vite para build de PWA
 */

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  base: '/mobile/',
  
  build: {
    outDir: resolve(__dirname, '../dist/mobile'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
    // PWA optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, '../'),
      '@types': resolve(__dirname, '../types'),
      '@components': resolve(__dirname, '../components'),
    },
  },

  server: {
    port: 5174,
    host: true,
  },

  // PWA manifest
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.0'),
  },
});
