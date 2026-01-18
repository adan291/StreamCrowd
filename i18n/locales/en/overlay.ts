/**
 * English (EN) Overlay Translations
 * 
 * OBS overlay translations for stream integration.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { OverlayTranslations } from '../../types';

/**
 * Overlay English translations
 * OBS overlay customization and display options
 */
export const overlay: OverlayTranslations = {
  title: 'Overlay',
  customize: 'Customize',
  background: 'Background',
  textColor: 'Text color',
  borderColor: 'Border color',
  showBorders: 'Show borders',
  fontSize: 'Font size',
  fontStyle: 'Font style',
  theme: 'Theme',
  light: 'Light',
  dark: 'Dark',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  normal: 'Normal',
  bold: 'Bold',
  italic: 'Italic',
  chromaKey: 'Chroma key',
  waitingPoll: 'Waiting for poll...',
  mode: 'Mode',
  forOBS: 'For OBS',
  size: 'Size',
  normalSize: 'Normal size',
  largeSize: 'Large size',
};

export default overlay;