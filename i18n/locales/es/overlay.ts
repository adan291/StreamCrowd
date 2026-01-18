/**
 * Spanish translations for OBS Overlay functionality
 * 
 * Contains all translations related to OBS overlays, overlay customization,
 * overlay settings, URL generation, and overlay display modes.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { OverlayTranslations } from '../../types';

export const overlay: OverlayTranslations = {
  // Main overlay UI
  title: 'Personalizar Overlay',
  customize: 'Personalizar',
  
  // Visual customization
  background: 'Fondo',
  textColor: 'Color de Texto',
  borderColor: 'Color de Bordes',
  showBorders: 'Mostrar Bordes',
  
  // Typography settings
  fontSize: 'Tamaño de Texto',
  fontStyle: 'Estilo de Texto',
  normal: 'Normal',
  bold: 'Bold',
  italic: 'Italic',
  
  // Theme settings
  theme: 'Tema de Fondo',
  light: 'Claro',
  dark: 'Oscuro',
  
  // Size options
  size: 'Tamaño',
  small: 'S',
  medium: 'M',
  large: 'L',
  normalSize: 'Normal',
  largeSize: 'Grande',
  
  // OBS integration
  chromaKey: 'Chroma Key',
  forOBS: 'Para OBS',
  mode: 'OVERLAY MODE',
  
  // Status messages
  waitingPoll: 'Esperando encuesta...',
};

export default overlay;