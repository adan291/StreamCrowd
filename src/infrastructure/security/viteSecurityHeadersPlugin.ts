/**
 * Vite Security Headers Plugin
 * 
 * Adds security headers to responses during development
 * This ensures security headers are tested locally before deployment
 * 
 * @requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { Plugin } from 'vite';
import { getSecurityHeadersForRoute } from './SecurityHeaders';

/**
 * Vite plugin to add security headers during development
 */
export function viteSecurityHeadersPlugin(): Plugin {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Get the request path
        const path = req.url || '/';
        
        // Get security headers for this route
        const headers = getSecurityHeadersForRoute(path);
        
        // Apply headers to response
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        next();
      });
    },
  };
}
