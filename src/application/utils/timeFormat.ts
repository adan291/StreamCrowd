/**
 * Time Format - Utilidades para formateo de tiempo
 * 
 * Proporciona funciones para mostrar timestamps en formato relativo
 * amigable para el usuario ("hace 2m", "hace 1h", etc.)
 * 
 * @requirements 3.3 - Formato de tiempo relativo
 */

/**
 * Formatea un timestamp a tiempo relativo en español
 * 
 * @param timestamp - Unix timestamp en milisegundos
 * @param now - Timestamp actual (opcional, para testing)
 * @returns String como "ahora", "hace 2m", "hace 1h", etc.
 * 
 * @example
 * formatRelativeTime(Date.now() - 120000) // "hace 2m"
 * formatRelativeTime(Date.now() - 3600000) // "hace 1h"
 */
export const formatRelativeTime = (
  timestamp: number,
  now: number = Date.now()
): string => {
  // Validar timestamp
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 'ahora';
  }

  const diff = now - timestamp;

  // Si es futuro o muy reciente (< 60s), mostrar "ahora"
  if (diff < 60000) {
    return 'ahora';
  }

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `hace ${days}d`;
  }
  if (hours > 0) {
    return `hace ${hours}h`;
  }
  if (minutes > 0) {
    return `hace ${minutes}m`;
  }

  return 'ahora';
};

/**
 * Formatea un timestamp a hora absoluta corta
 * 
 * @param timestamp - Unix timestamp en milisegundos
 * @returns String como "14:30", "09:15"
 */
export const formatShortTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '--:--';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formatea un timestamp a hora con segundos
 * 
 * @param timestamp - Unix timestamp en milisegundos
 * @returns String como "14:30:45"
 */
export const formatFullTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '--:--:--';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/**
 * Formatea una duración en segundos a formato legible
 * 
 * @param seconds - Duración en segundos
 * @returns String como "30s", "5m", "2h", "1d"
 */
export const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0s';
  }

  if (seconds < 60) {
    return `${Math.floor(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  }
  return `${Math.floor(seconds / 86400)}d`;
};

/**
 * Verifica si un timestamp es válido
 */
export const isValidTimestamp = (timestamp: number): boolean => {
  return Number.isFinite(timestamp) && timestamp > 0;
};
