// Internationalization (i18n) system - Spanish and English only
export type Locale = 'es' | 'en';

export interface Translations {
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    confirm: string;
    search: string;
    settings: string;
    theme: string;
    language: string;
    exit: string;
  };
  connection: {
    title: string;
    subtitle: string;
    channelLabel: string;
    channelPlaceholder: string;
    channelTooltip: string;
    tokenLabel: string;
    tokenPlaceholder: string;
    tokenTooltip: string;
    hideToken: string;
    connect: string;
    disconnect: string;
    connecting: string;
    connected: string;
    disconnected: string;
    error: string;
    connectedSuccess: string;
    tokenHelp: string;
    instructions: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    errorAuth: string;
    errorNetwork: string;
    errorConnection: string;
    errorChannelRequired: string;
    errorChannelInvalid: string;
    errorTokenInvalid: string;
  };
  nav: {
    panel: string;
    gallery: string;
    data: string;
    history: string;
    activity: string;
    analytics: string;
    chat: string;
    stream: string;
  };
  poll: {
    title: string;
    createTitle: string;
    question: string;
    questionPlaceholder: string;
    options: string;
    optionPlaceholder: string;
    addOption: string;
    removeOption: string;
    create: string;
    stop: string;
    reset: string;
    active: string;
    ended: string;
    totalVotes: string;
    votes: string;
    winner: string;
    noVotes: string;
    waitingPoll: string;
    createPollHint: string;
    duration: string;
    maxVotes: string;
    unlimited: string;
    seconds: string;
    minutes: string;
    timeRemaining: string;
    voteWith: string;
    openOverlay: string;
    copyOverlayUrl: string;
    urlCopied: string;
  };
  moderation: {
    title: string;
    config: string;
    stats: string;
    log: string;
    accepted: string;
    rejected: string;
    voteChanged: string;
    acceptanceRate: string;
    reasons: {
      accountTooNew: string;
      cooldownActive: string;
      alreadyVoted: string;
      invalidOption: string;
      voteChangeCooldown: string;
    };
  };
  gallery: {
    title: string;
    upload: string;
    delete: string;
    noAssets: string;
    uploadHint: string;
    storageFull: string;
    dragDrop: string;
    maxSize: string;
  };
  analytics: {
    title: string;
    configureAI: string;
    aiActive: string;
    noData: string;
  };
  history: {
    title: string;
    noPastPolls: string;
    viewDetails: string;
    exportData: string;
  };
  overlay: {
    title: string;
    customize: string;
    background: string;
    textColor: string;
    borderColor: string;
    showBorders: string;
    fontSize: string;
    fontStyle: string;
    theme: string;
    light: string;
    dark: string;
    small: string;
    medium: string;
    large: string;
    normal: string;
    bold: string;
    italic: string;
    chromaKey: string;
    waitingPoll: string;
    mode: string;
    forOBS: string;
  };
  notifications: {
    pollCreated: string;
    pollEnded: string;
    pollReset: string;
    connectionError: string;
    storageFull: string;
    copied: string;
    saved: string;
    deleted: string;
    autoEnded: string;
  };
}

export const translations: Record<Locale, Translations> = {
  es: {
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      confirm: 'Confirmar',
      search: 'Buscar',
      settings: 'Configuración',
      theme: 'Tema',
      language: 'Idioma',
      exit: 'Salir',
    },
    connection: {
      title: 'Conectar a Twitch',
      subtitle: 'Ingresa el nombre del canal para comenzar',
      channelLabel: 'Canal / URL',
      channelPlaceholder: 'Ej: ibai',
      channelTooltip: 'El nombre de usuario o enlace de Twitch (ej. ibai).',
      tokenLabel: 'Access Token (Opcional)',
      tokenPlaceholder: 'Ej: uo6dgg01...',
      tokenTooltip: 'Necesario para que el bot escriba en el chat (anunciar encuestas). Sin esto, funcionará en modo solo lectura.',
      hideToken: 'Ocultar',
      connect: 'Conectar',
      disconnect: 'Desconectar',
      connecting: 'Conectando...',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      error: 'Error de conexión',
      connectedSuccess: 'Conectado al chat correctamente.',
      tokenHelp: 'El token permite enviar mensajes al chat',
      instructions: 'Instrucciones',
      step1: 'Ve a',
      step2: 'Selecciona "Bot Chat Token" o Custom.',
      step3: 'Asegura los scopes: chat:read y chat:edit.',
      step4: 'Genera y copia el ACCESS TOKEN (no el Client ID).',
      errorAuth: 'Error de Autenticación',
      errorNetwork: 'Error de Red',
      errorConnection: 'Error de Conexión',
      errorChannelRequired: 'El nombre del canal es obligatorio.',
      errorChannelInvalid: 'Nombre inválido (3-25 caracteres, letras, números y _).',
      errorTokenInvalid: 'Token inválido. Asegúrate de copiar el "ACCESS TOKEN".',
    },
    nav: {
      panel: 'Panel',
      gallery: 'Galería',
      data: 'Data',
      history: 'Historial',
      activity: 'Actividad',
      analytics: 'Analytics',
      chat: 'Chat',
      stream: 'Stream',
    },
    poll: {
      title: 'Encuesta',
      createTitle: 'Crear Encuesta',
      question: 'Pregunta',
      questionPlaceholder: '¿Cuál es tu pregunta?',
      options: 'Opciones',
      optionPlaceholder: 'Opción',
      addOption: 'Añadir opción',
      removeOption: 'Eliminar opción',
      create: 'Crear Encuesta',
      stop: 'Detener',
      reset: 'Reiniciar',
      active: 'Activa',
      ended: 'Finalizada',
      totalVotes: 'Votos totales',
      votes: 'votos',
      winner: 'Ganador',
      noVotes: 'Sin votos aún',
      waitingPoll: 'Esperando encuesta...',
      createPollHint: 'Crea una encuesta en el panel principal',
      duration: 'Duración',
      maxVotes: 'Límite de votos',
      unlimited: 'Sin límite',
      seconds: 'segundos',
      minutes: 'minutos',
      timeRemaining: 'Tiempo restante',
      voteWith: 'Vota escribiendo',
      openOverlay: 'Abrir Overlay',
      copyOverlayUrl: 'Copiar URL del Overlay',
      urlCopied: 'URL copiada al portapapeles',
    },
    moderation: {
      title: 'Moderación',
      config: 'Configuración',
      stats: 'Estadísticas',
      log: 'Registro',
      accepted: 'Aceptados',
      rejected: 'Rechazados',
      voteChanged: 'Cambios de voto',
      acceptanceRate: 'Tasa de aceptación',
      reasons: {
        accountTooNew: 'Cuenta muy nueva',
        cooldownActive: 'Cooldown activo',
        alreadyVoted: 'Ya votó',
        invalidOption: 'Opción inválida',
        voteChangeCooldown: 'Cooldown de cambio',
      },
    },
    gallery: {
      title: 'Galería de Medios',
      upload: 'Subir',
      delete: 'Eliminar',
      noAssets: 'No hay imágenes',
      uploadHint: 'Sube imágenes para usar en tus encuestas',
      storageFull: 'Espacio lleno. Elimina imágenes antiguas.',
      dragDrop: 'Arrastra y suelta aquí',
      maxSize: 'Máximo 2MB',
    },
    analytics: {
      title: 'Analytics del Stream',
      configureAI: 'Configurar IA',
      aiActive: 'Activa',
      noData: 'Sin datos disponibles',
    },
    history: {
      title: 'Historial de Encuestas',
      noPastPolls: 'No hay encuestas anteriores',
      viewDetails: 'Ver detalles',
      exportData: 'Exportar datos',
    },
    overlay: {
      title: 'Personalizar Overlay',
      customize: 'Personalizar',
      background: 'Fondo',
      textColor: 'Color de Texto',
      borderColor: 'Color de Bordes',
      showBorders: 'Mostrar Bordes',
      fontSize: 'Tamaño de Texto',
      fontStyle: 'Estilo de Texto',
      theme: 'Tema de Fondo',
      light: 'Claro',
      dark: 'Oscuro',
      small: 'S',
      medium: 'M',
      large: 'L',
      normal: 'Normal',
      bold: 'Bold',
      italic: 'Italic',
      chromaKey: 'Chroma Key',
      waitingPoll: 'Esperando encuesta...',
      mode: 'OVERLAY MODE',
      forOBS: 'Para OBS',
    },
    notifications: {
      pollCreated: 'Encuesta creada',
      pollEnded: 'Encuesta finalizada',
      pollReset: 'Encuesta reiniciada',
      connectionError: 'Error de conexión',
      storageFull: 'Espacio de almacenamiento lleno',
      copied: 'Copiado al portapapeles',
      saved: 'Guardado correctamente',
      deleted: 'Eliminado correctamente',
      autoEnded: 'Encuesta finalizada por tiempo/límite.',
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      confirm: 'Confirm',
      search: 'Search',
      settings: 'Settings',
      theme: 'Theme',
      language: 'Language',
      exit: 'Exit',
    },
    connection: {
      title: 'Connect to Twitch',
      subtitle: 'Enter the channel name to start',
      channelLabel: 'Channel / URL',
      channelPlaceholder: 'Ex: ibai',
      channelTooltip: 'The username or Twitch link (e.g. ibai).',
      tokenLabel: 'Access Token (Optional)',
      tokenPlaceholder: 'Ex: uo6dgg01...',
      tokenTooltip: 'Required for the bot to write in chat (announce polls). Without this, it will work in read-only mode.',
      hideToken: 'Hide',
      connect: 'Connect',
      disconnect: 'Disconnect',
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      error: 'Connection error',
      connectedSuccess: 'Successfully connected to chat.',
      tokenHelp: 'Token allows sending messages to chat',
      instructions: 'Instructions',
      step1: 'Go to',
      step2: 'Select "Bot Chat Token" or Custom.',
      step3: 'Ensure scopes: chat:read and chat:edit.',
      step4: 'Generate and copy the ACCESS TOKEN (not Client ID).',
      errorAuth: 'Authentication Error',
      errorNetwork: 'Network Error',
      errorConnection: 'Connection Error',
      errorChannelRequired: 'Channel name is required.',
      errorChannelInvalid: 'Invalid name (3-25 characters, letters, numbers and _).',
      errorTokenInvalid: 'Invalid token. Make sure to copy the "ACCESS TOKEN".',
    },
    nav: {
      panel: 'Panel',
      gallery: 'Gallery',
      data: 'Data',
      history: 'History',
      activity: 'Activity',
      analytics: 'Analytics',
      chat: 'Chat',
      stream: 'Stream',
    },
    poll: {
      title: 'Poll',
      createTitle: 'Create Poll',
      question: 'Question',
      questionPlaceholder: 'What is your question?',
      options: 'Options',
      optionPlaceholder: 'Option',
      addOption: 'Add option',
      removeOption: 'Remove option',
      create: 'Create Poll',
      stop: 'Stop',
      reset: 'Reset',
      active: 'Active',
      ended: 'Ended',
      totalVotes: 'Total votes',
      votes: 'votes',
      winner: 'Winner',
      noVotes: 'No votes yet',
      waitingPoll: 'Waiting for poll...',
      createPollHint: 'Create a poll in the main panel',
      duration: 'Duration',
      maxVotes: 'Vote limit',
      unlimited: 'Unlimited',
      seconds: 'seconds',
      minutes: 'minutes',
      timeRemaining: 'Time remaining',
      voteWith: 'Vote by typing',
      openOverlay: 'Open Overlay',
      copyOverlayUrl: 'Copy Overlay URL',
      urlCopied: 'URL copied to clipboard',
    },
    moderation: {
      title: 'Moderation',
      config: 'Configuration',
      stats: 'Statistics',
      log: 'Log',
      accepted: 'Accepted',
      rejected: 'Rejected',
      voteChanged: 'Vote changes',
      acceptanceRate: 'Acceptance rate',
      reasons: {
        accountTooNew: 'Account too new',
        cooldownActive: 'Cooldown active',
        alreadyVoted: 'Already voted',
        invalidOption: 'Invalid option',
        voteChangeCooldown: 'Change cooldown',
      },
    },
    gallery: {
      title: 'Media Gallery',
      upload: 'Upload',
      delete: 'Delete',
      noAssets: 'No images',
      uploadHint: 'Upload images to use in your polls',
      storageFull: 'Storage full. Delete old images.',
      dragDrop: 'Drag and drop here',
      maxSize: 'Max 2MB',
    },
    analytics: {
      title: 'Stream Analytics',
      configureAI: 'Configure AI',
      aiActive: 'Active',
      noData: 'No data available',
    },
    history: {
      title: 'Poll History',
      noPastPolls: 'No past polls',
      viewDetails: 'View details',
      exportData: 'Export data',
    },
    overlay: {
      title: 'Customize Overlay',
      customize: 'Customize',
      background: 'Background',
      textColor: 'Text Color',
      borderColor: 'Border Color',
      showBorders: 'Show Borders',
      fontSize: 'Font Size',
      fontStyle: 'Font Style',
      theme: 'Background Theme',
      light: 'Light',
      dark: 'Dark',
      small: 'S',
      medium: 'M',
      large: 'L',
      normal: 'Normal',
      bold: 'Bold',
      italic: 'Italic',
      chromaKey: 'Chroma Key',
      waitingPoll: 'Waiting for poll...',
      mode: 'OVERLAY MODE',
      forOBS: 'For OBS',
    },
    notifications: {
      pollCreated: 'Poll created',
      pollEnded: 'Poll ended',
      pollReset: 'Poll reset',
      connectionError: 'Connection error',
      storageFull: 'Storage full',
      copied: 'Copied to clipboard',
      saved: 'Saved successfully',
      deleted: 'Deleted successfully',
      autoEnded: 'Poll ended by time/limit.',
    },
  },
};
