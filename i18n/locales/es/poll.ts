/**
 * Spanish translations for Poll/Voting feature
 * 
 * Contains all translations related to polls, voting, and survey functionality.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { PollTranslations } from '../../types';

export const poll: PollTranslations = {
  // Basic poll UI
  title: 'Encuesta',
  liveTitle: 'Encuesta en Vivo',
  createTitle: 'Crear Encuesta',
  question: 'Pregunta',
  questionPlaceholder: '¿Cuál es tu pregunta?',
  options: 'Opciones',
  optionPlaceholder: 'Opción',
  
  // Actions
  addOption: 'Añadir opción',
  removeOption: 'Eliminar opción',
  create: 'Crear Encuesta',
  stop: 'Detener',
  reset: 'Reiniciar',
  
  // Status
  active: 'Activa',
  ended: 'Finalizada',
  totalVotes: 'Votos totales',
  votes: 'votos',
  votesLabel: 'votos',
  winner: 'Ganador',
  viewDetails: 'Ver Detalles',
  ofTotal: 'del total',
  noVotes: 'Sin votos aún',
  waitingPoll: 'Esperando encuesta...',
  createPollHint: 'Crea una encuesta en el panel principal',
  
  // Configuration
  duration: 'Duración',
  maxVotes: 'Límite de votos',
  unlimited: 'Sin límite',
  seconds: 'segundos',
  minutes: 'minutos',
  timeRemaining: 'Tiempo restante',
  voteWith: 'Vota escribiendo',
  
  // Overlay settings
  openOverlay: 'Abrir Overlay',
  copyOverlayUrl: 'Copiar URL del Overlay',
  urlCopied: 'URL copiada al portapapeles',
  
  // Confirmation and preview
  confirm: 'Confirmar Encuesta',
  confirmHint: 'Revisa los detalles antes de lanzar.',
  preview: 'Vista Previa',
  save: 'Guardar',
  saveTemplate: 'Guardar como Plantilla',
  apply: 'Aplicar',
  cancel: 'Cancelar',
  
  // Goal settings
  goal: 'Meta',
  goalTooltip: 'Detiene al llegar a X votos',
  
  // Validation messages
  writeQuestion: 'Escribe una pregunta para guardar.',
  minOptions: 'La encuesta debe tener al menos 2 opciones.',
  storageFull: 'No se pudo guardar: Límite de almacenamiento excedido.',
  templateSaved: 'Plantilla guardada correctamente.',
  replaceOptions: 'Esto reemplazará las opciones actuales. ¿Deseas continuar?',
  noPollActive: 'No hay votación activa',
  createInPanel: 'Crea una encuesta en el Panel para ver la vista previa.',
  shareVotes: '{label}: {percentage}% de los votos',
  
  // OBS integration
  obsOverlay: 'Overlay para OBS',
  obsHint: 'Muestra la encuesta en tu stream con Window Capture.',
  
  // Quick poll
  quick: 'Rápido',
  yesNo: 'Sí / No',
  
  // Section and question labels
  sectionTitle: 'Título de Sección',
  sectionTitleTooltip: "Aparece sobre la pregunta (ej: 'Votando Ahora')",
  questionLabel: 'Pregunta',
  questionTooltip: 'La pregunta principal para los viewers',
  questionPlaceholderFull: '¿Qué jugamos hoy?',
  
  // Response options
  responseOptions: 'Opciones de Respuesta',
  addOptionBtn: 'Agregar Opción',
  
  // Time and colors
  timeSec: 'Tiempo (Seg)',
  barColor: 'Barra',
  limitColor: 'Límite',
  
  // Vote prefix settings
  votePrefix: 'Prefijo',
  votePrefixTooltip: 'Símbolo para votar (ej: +1, !1, #1)',
  voteKeyTooltip: 'Palabra clave para votar (ej: si, no, rojo)',
  
  // Match mode
  matchMode: 'Modo',
  matchModeTooltip: 'Exacto: debe coincidir exactamente. Parcial: puede estar dentro del mensaje.',
  matchExact: 'Exacto',
  matchPartial: 'Parcial',
  
  // Poll actions
  startPoll: 'Iniciar Votación',
  clearForm: 'Limpiar Formulario',
  
  // Templates
  templates: 'Plantillas',
  myTemplates: 'Mis Plantillas',
  favorites: 'Favoritos',
  
  // Image upload
  uploadImage: 'Subir Imagen',
  galleryBtn: 'Galería',
  
  // Feedback messages
  presetApplied: 'Preset aplicado.',
  templateLoaded: 'Plantilla cargada.',
  
  // Image validation errors
  invalidImageType: 'El archivo debe ser una imagen válida (JPG, PNG, GIF).',
  imageTooLarge: 'La imagen es demasiado grande (Máx 40MB).',
  fileReadError: 'Error al leer el archivo. Intenta de nuevo.',
  iconSavedToGallery: 'Icono procesado y guardado en Galería.',
  imageProcessError: 'Error al procesar la imagen en el navegador.',
  imageDamaged: 'El archivo de imagen parece estar dañado.',
  
  // Option validation
  needTwoOptions: 'Se necesitan al menos 2 opciones.',
  completeAllFields: 'Completa la pregunta y todas las opciones.',
  allOptionsNeedLabel: 'Todas las opciones deben tener una etiqueta.',
  option: 'Opción',
  
  // Import options
  noOptionsToImport: 'No hay opciones para importar',
  optionsImported: 'opciones importadas',
  
  // Quick poll creation
  quickPollCreated: '¡Encuesta rápida Sí/No creada!',
  
  // Spinner/raffle integration
  spinnerWheel: 'Ruleta',
  randomWinnerTooltip: 'Sortea un ganador entre los viewers',
  raffle: 'Sorteo',
};
