/**
 * UI Colors - Paleta de colores unificada para la sección de Actividad
 * 
 * Centraliza todos los colores usados en la UI para garantizar consistencia
 * y facilitar el mantenimiento.
 * 
 * @requirements 6.1 - Paleta consistente
 * @requirements 6.2 - Mismo color para mismo tipo de evento
 * @requirements 6.4 - WCAG AA contrast compliance (4.5:1 minimum)
 */

/**
 * Tipos de eventos soportados
 */
export type EventColorType = 
  | 'follow' 
  | 'sub' 
  | 'resub' 
  | 'gift' 
  | 'raid' 
  | 'bits' 
  | 'vote' 
  | 'ban' 
  | 'timeout';

/**
 * Paleta de colores principal para tipos de evento
 * Estos colores son inmutables y se usan en toda la aplicación
 * 
 * WCAG AA Compliant: All colors have been selected to provide
 * at least 4.5:1 contrast ratio on dark theme backgrounds (#18181b, #27272a).
 * For light theme backgrounds, use getContrastingTextColor() or darker variants.
 */
export const EVENT_COLORS: Record<EventColorType, string> = {
  follow: '#4ade80',    // Green-400 - bright green for dark backgrounds
  sub: '#c084fc',       // Purple-400 - bright purple for dark backgrounds
  resub: '#a78bfa',     // Violet-400 - bright violet for dark backgrounds
  gift: '#f472b6',      // Pink-400 - bright pink for dark backgrounds
  raid: '#60a5fa',      // Blue-400 - bright blue for dark backgrounds
  bits: '#fbbf24',      // Amber-400 - bright amber for dark backgrounds
  vote: '#22d3ee',      // Cyan-400 - bright cyan for dark backgrounds
  ban: '#f87171',       // Red-400 - bright red for dark backgrounds
  timeout: '#fb923c',   // Orange-400 - bright orange for dark backgrounds
} as const;

/**
 * Color por defecto para tipos no reconocidos
 */
const DEFAULT_COLOR = '#71717a'; // Zinc-500

/**
 * Obtiene el color para un tipo de evento
 * Siempre retorna el mismo color para el mismo tipo (consistencia)
 * 
 * @param type - Tipo de evento
 * @returns Color hexadecimal
 */
export const getEventColor = (type: string): string => {
  if (type in EVENT_COLORS) {
    return EVENT_COLORS[type as EventColorType];
  }
  return DEFAULT_COLOR;
};

/**
 * Convierte un color hex a RGB
 */
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Obtiene un tint (color con opacidad) para un tipo de evento
 * Útil para fondos sutiles
 * 
 * @param type - Tipo de evento
 * @param opacity - Opacidad (0-1), default 0.1
 * @returns Color en formato rgba
 */
export const getEventTint = (type: string, opacity: number = 0.1): string => {
  const color = getEventColor(type);
  const rgb = hexToRgb(color);
  
  if (!rgb) {
    return `rgba(113, 113, 122, ${opacity})`; // Zinc-500 fallback
  }
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

/**
 * Colores para estados de UI
 */
export const UI_STATE_COLORS = {
  hover: 'rgba(255, 255, 255, 0.05)',
  active: 'rgba(255, 255, 255, 0.1)',
  disabled: 'rgba(255, 255, 255, 0.02)',
  focus: 'rgba(59, 130, 246, 0.5)', // Blue-500 con opacidad
} as const;

/**
 * Colores para tiers de suscripción
 * WCAG AA Compliant: All colors provide at least 4.5:1 contrast ratio on dark backgrounds
 */
export const TIER_COLORS = {
  '1000': '#c084fc', // Tier 1 - Purple-400 (bright for dark backgrounds)
  '2000': '#22d3ee', // Tier 2 - Cyan-400 (bright for dark backgrounds)
  '3000': '#fbbf24', // Tier 3 - Amber-400 (bright gold for dark backgrounds)
} as const;

/**
 * Obtiene el color para un tier de suscripción
 */
export const getTierColor = (tier: string): string => {
  return TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS['1000'];
};

/**
 * Calcula la luminancia relativa de un color (para contraste WCAG)
 * @param hex - Color en formato hexadecimal
 * @returns Luminancia relativa (0-1)
 */
export const getRelativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * Calcula el ratio de contraste entre dos colores (WCAG)
 * @param color1 - Primer color hex
 * @param color2 - Segundo color hex
 * @returns Ratio de contraste (1-21)
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Verifica si dos colores cumplen WCAG AA (ratio >= 4.5)
 */
export const meetsWCAGAA = (textColor: string, bgColor: string): boolean => {
  return getContrastRatio(textColor, bgColor) >= 4.5;
};

/**
 * Obtiene un color de texto que contraste bien con el fondo
 * @param bgColor - Color de fondo hex
 * @returns '#ffffff' o '#000000' según el contraste
 */
export const getContrastingTextColor = (bgColor: string): string => {
  const luminance = getRelativeLuminance(bgColor);
  return luminance > 0.179 ? '#000000' : '#ffffff';
};
