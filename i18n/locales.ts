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
    urlDetected: string;
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
    notConnected: string;
    connectToChannel: string;
    invalidChannel: string;
    invalidChannelName: string;
    twitchStream: string;
    loadStream: string;
    openInTwitch: string;
    copyLink: string;
    closeStream: string;
  };
  poll: {
    title: string;
    liveTitle: string;
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
    confirm: string;
    confirmHint: string;
    preview: string;
    save: string;
    saveTemplate: string;
    apply: string;
    cancel: string;
    goal: string;
    goalTooltip: string;
    writeQuestion: string;
    minOptions: string;
    storageFull: string;
    templateSaved: string;
    replaceOptions: string;
    noPollActive: string;
    createInPanel: string;
    shareVotes: string;
    obsOverlay: string;
    obsHint: string;
    quick: string;
    yesNo: string;
    sectionTitle: string;
    sectionTitleTooltip: string;
    questionLabel: string;
    questionTooltip: string;
    questionPlaceholderFull: string;
    responseOptions: string;
    addOptionBtn: string;
    timeSec: string;
    barColor: string;
    limitColor: string;
    votePrefix: string;
    votePrefixTooltip: string;
    voteKeyTooltip: string;
    startPoll: string;
    clearForm: string;
    templates: string;
    myTemplates: string;
    favorites: string;
    uploadImage: string;
    galleryBtn: string;
    presetApplied: string;
    templateLoaded: string;
    invalidImageType: string;
    imageTooLarge: string;
    fileReadError: string;
    iconSavedToGallery: string;
    imageProcessError: string;
    imageDamaged: string;
    needTwoOptions: string;
    completeAllFields: string;
    allOptionsNeedLabel: string;
    option: string;
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
    reset: string;
    minAccountAge: string;
    minAccountAgeTooltip: string;
    allowVoteChanges: string;
    allowVoteChangesTooltip: string;
    enabled: string;
    disabled: string;
    cooldown: string;
    cooldownTooltip: string;
    voteWeights: string;
    voteWeightsTooltip: string;
    subscriber: string;
    follower: string;
    regularUsers: string;
    presets: string;
    presetName: string;
    loadPreset: string;
    noPresets: string;
    presetSaved: string;
    presetLoaded: string;
    presetDeleted: string;
    enterPresetName: string;
    resetDefaults: string;
    whitelist: string;
    whitelistTooltip: string;
    whitelistEnabled: string;
    whitelistPlaceholder: string;
    whitelistCount: string;
    blacklist: string;
    blacklistTooltip: string;
    blacklistEnabled: string;
    blacklistPlaceholder: string;
    blacklistCount: string;
    reasons: {
      accountTooNew: string;
      cooldownActive: string;
      alreadyVoted: string;
      invalidOption: string;
      voteChangeCooldown: string;
      notWhitelisted: string;
      blacklisted: string;
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
    live: string;
    history: string;
    activeSession: string;
    noActiveStream: string;
    connectToSee: string;
    uniqueViewers: string;
    messages: string;
    positive: string;
    neutral: string;
    negative: string;
    engagement: string;
    mainTopics: string;
    frequentWords: string;
    mostUsedEmotes: string;
    mostActiveViewers: string;
    msgs: string;
    sessionsThisDay: string;
    totalMessages: string;
    noSessionsDate: string;
    exportData: string;
    loading: string;
  };
  aiConfig: {
    title: string;
    optional: string;
    description: string;
    provider: string;
    apiKey: string;
    apiKeyPlaceholder: string;
    saved: string;
    save: string;
    test: string;
    connectionSuccess: string;
    connectionError: string;
    aiAnalysis: string;
    activateInsights: string;
    noApiKeyHint: string;
    getApiKey: string;
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
  chat: {
    newPoll: string;
    options: string;
    voteHint: string;
    pollEnded: string;
    winner: string;
    withVotes: string;
    liveChat: string;
    waitingMessages: string;
    newMessages: string;
    alreadyRegistered: string;
    votedFor: string;
  };
  mascot: {
    title: string;
    chatSentiment: string;
    positive: string;
    neutral: string;
    negative: string;
    messages: string;
    votes: string;
    viewers: string;
    intensity: string;
    helpConnectionFailed: string;
    helpPollEmpty: string;
    helpNoVotes: string;
    helpRepeatedAction: string;
    helpIdle: string;
    msgConnectionFailed: string;
    msgPollEmpty: string;
    msgNoVotes: string;
    msgRepeatedAction: string;
    msgIdle: string;
    msgChatPositive: string;
    msgChatNegative: string;
    msgChatExcited: string;
    msgNotConnected: string;
    msgPollGoing: string;
    msgWaitingVotes: string;
    msgWatching: string;
    dragToMove: string;
    msgLove: string;
    msgSurprised: string;
    msgAngry: string;
    msgSleepy: string;
    msgHappy: string;
    msgSad: string;
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
      urlDetected: 'URL detectada',
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
      notConnected: 'No conectado',
      connectToChannel: 'Conéctate a un canal de Twitch para ver el stream.',
      invalidChannel: 'Canal inválido',
      invalidChannelName: 'El nombre del canal no es válido.',
      twitchStream: 'Stream de Twitch',
      loadStream: 'Cargar Stream',
      openInTwitch: 'Abrir en Twitch',
      copyLink: 'Copiar enlace',
      closeStream: 'Cerrar stream',
    },
    poll: {
      title: 'Encuesta',
      liveTitle: 'Encuesta en Vivo',
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
      confirm: 'Confirmar Encuesta',
      confirmHint: 'Revisa los detalles antes de lanzar.',
      preview: 'Vista Previa',
      save: 'Guardar',
      saveTemplate: 'Guardar como Plantilla',
      apply: 'Aplicar',
      cancel: 'Cancelar',
      goal: 'Meta',
      goalTooltip: 'Detiene al llegar a X votos',
      writeQuestion: 'Escribe una pregunta para guardar.',
      minOptions: 'La encuesta debe tener al menos 2 opciones.',
      storageFull: 'No se pudo guardar: Límite de almacenamiento excedido.',
      templateSaved: 'Plantilla guardada correctamente.',
      replaceOptions: 'Esto reemplazará las opciones actuales. ¿Deseas continuar?',
      noPollActive: 'No hay votación activa',
      createInPanel: 'Crea una encuesta en el Panel para ver la vista previa.',
      shareVotes: '{label}: {percentage}% de los votos',
      obsOverlay: 'Overlay para OBS',
      obsHint: 'Muestra la encuesta en tu stream con Window Capture.',
      quick: 'Rápido',
      yesNo: 'Sí / No',
      sectionTitle: 'Título de Sección',
      sectionTitleTooltip: "Aparece sobre la pregunta (ej: 'Votando Ahora')",
      questionLabel: 'Pregunta',
      questionTooltip: 'La pregunta principal para los viewers',
      questionPlaceholderFull: '¿Qué jugamos hoy?',
      responseOptions: 'Opciones de Respuesta',
      addOptionBtn: 'Agregar Opción',
      timeSec: 'Tiempo (Seg)',
      barColor: 'Barra',
      limitColor: 'Límite',
      votePrefix: 'Prefijo',
      votePrefixTooltip: 'Símbolo para votar (ej: +1, !1, #1)',
      voteKeyTooltip: 'Palabra clave para votar (ej: si, no, rojo)',
      startPoll: 'Iniciar Votación',
      clearForm: 'Limpiar Formulario',
      templates: 'Plantillas',
      myTemplates: 'Mis Plantillas',
      favorites: 'Favoritos',
      uploadImage: 'Subir Imagen',
      galleryBtn: 'Galería',
      presetApplied: 'Preset aplicado.',
      templateLoaded: 'Plantilla cargada.',
      invalidImageType: 'El archivo debe ser una imagen válida (JPG, PNG, GIF).',
      imageTooLarge: 'La imagen es demasiado grande (Máx 40MB).',
      fileReadError: 'Error al leer el archivo. Intenta de nuevo.',
      iconSavedToGallery: 'Icono procesado y guardado en Galería.',
      imageProcessError: 'Error al procesar la imagen en el navegador.',
      imageDamaged: 'El archivo de imagen parece estar dañado.',
      needTwoOptions: 'Se necesitan al menos 2 opciones.',
      completeAllFields: 'Completa la pregunta y todas las opciones.',
      allOptionsNeedLabel: 'Todas las opciones deben tener una etiqueta.',
      option: 'Opción',
    },
    moderation: {
      title: 'Moderación de Votos',
      config: 'Configuración',
      stats: 'Estadísticas',
      log: 'Registro',
      accepted: 'Aceptados',
      rejected: 'Rechazados',
      voteChanged: 'Cambios de voto',
      acceptanceRate: 'Tasa de aceptación',
      reset: 'Restablecer',
      minAccountAge: 'Edad Mín. Cuenta (días)',
      minAccountAgeTooltip: 'Cuentas más nuevas serán rechazadas. Pon 0 para permitir todas.',
      allowVoteChanges: 'Permitir Cambio de Voto',
      allowVoteChangesTooltip: 'Si está desactivado, los usuarios no pueden cambiar su voto.',
      enabled: 'Activado',
      disabled: 'Desactivado',
      cooldown: 'Cooldown (segundos)',
      cooldownTooltip: 'Tiempo que deben esperar para cambiar su voto.',
      voteWeights: 'Pesos de Voto (1-5)',
      voteWeightsTooltip: 'Mayor peso da más poder de voto a suscriptores/seguidores.',
      subscriber: 'Suscriptor',
      follower: 'Seguidor',
      regularUsers: 'Usuarios regulares siempre tienen peso 1x',
      presets: 'Presets',
      presetName: 'Nombre del preset...',
      loadPreset: 'Cargar Preset',
      noPresets: 'No hay presets guardados',
      presetSaved: 'Preset "{name}" guardado',
      presetLoaded: 'Preset "{name}" cargado',
      presetDeleted: 'Preset "{name}" eliminado',
      enterPresetName: 'Ingresa un nombre para el preset',
      resetDefaults: 'Configuración restablecida',
      whitelist: 'Lista de Votantes Permitidos',
      whitelistTooltip: 'Solo estos usuarios podrán votar. Un nombre por línea.',
      whitelistEnabled: 'Activar lista permitidos',
      whitelistPlaceholder: 'usuario1\nusuario2\nusuario3',
      whitelistCount: '{count} usuarios',
      blacklist: 'Lista de Votantes Exclusiones',
      blacklistTooltip: 'Estos usuarios NO podrán votar. Un nombre por línea.',
      blacklistEnabled: 'Activar lista exclusiones',
      blacklistPlaceholder: 'troll1\nspammer2\nbot3',
      blacklistCount: '{count} bloqueados',
      reasons: {
        accountTooNew: 'Cuenta muy nueva',
        cooldownActive: 'Cooldown activo',
        alreadyVoted: 'Ya votó',
        invalidOption: 'Opción inválida',
        voteChangeCooldown: 'Cooldown de cambio',
        notWhitelisted: 'No en lista blanca',
        blacklisted: 'Usuario bloqueado',
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
      live: 'En vivo',
      history: 'Historial',
      activeSession: 'Sesión activa',
      noActiveStream: 'No hay stream activo',
      connectToSee: 'Conecta a un canal para ver analytics en vivo',
      uniqueViewers: 'Viewers únicos',
      messages: 'Mensajes',
      positive: 'Positivo',
      neutral: 'Neutral',
      negative: 'Negativo',
      engagement: 'Engagement',
      mainTopics: 'Temas principales',
      frequentWords: 'Palabras frecuentes',
      mostUsedEmotes: 'Emotes más usados',
      mostActiveViewers: 'Viewers más activos',
      msgs: 'msgs',
      sessionsThisDay: 'sesión(es) este día',
      totalMessages: 'Total mensajes',
      noSessionsDate: 'No hay sesiones para esta fecha',
      exportData: 'Exportar datos',
      loading: 'Cargando...',
    },
    aiConfig: {
      title: 'Configuración IA',
      optional: 'Opcional',
      description: 'Conecta una IA para analizar tu chat y obtener insights avanzados al final de cada stream.',
      provider: 'Proveedor',
      apiKey: 'API Key',
      apiKeyPlaceholder: 'Tu {provider} API key...',
      saved: '¡Guardado!',
      save: 'Guardar',
      test: 'Test',
      connectionSuccess: '✓ Conexión exitosa!',
      connectionError: '✗ Error de conexión',
      aiAnalysis: 'Análisis con IA',
      activateInsights: 'Activa para obtener insights avanzados',
      noApiKeyHint: '💡 Sin API key, se usará análisis local básico.',
      getApiKey: 'Obtener API key de {provider} →',
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
    chat: {
      newPoll: '📊 Nueva Encuesta',
      options: 'Opciones',
      voteHint: 'Vota escribiendo +1, +2, etc.',
      pollEnded: '🏁 Encuesta Finalizada',
      winner: '🏆 Ganador',
      withVotes: 'con {votes} votos',
      liveChat: 'Chat en Vivo',
      waitingMessages: 'Esperando mensajes...',
      newMessages: 'Nuevos mensajes',
      alreadyRegistered: 'Ya registrado',
      votedFor: 'Votó por',
    },
    mascot: {
      title: 'AI Vision',
      chatSentiment: 'Sentimiento del chat',
      positive: 'Positivo',
      neutral: 'Neutral',
      negative: 'Negativo',
      messages: 'Mensajes',
      votes: 'Votos',
      viewers: 'Viewers',
      intensity: 'Intensidad',
      helpConnectionFailed: 'Verifica que el nombre del canal sea correcto y que tengas conexión a internet',
      helpPollEmpty: 'Añade al menos 2 opciones para crear una encuesta',
      helpNoVotes: 'Intenta anunciar la encuesta en el chat o hacer la pregunta más llamativa',
      helpRepeatedAction: 'Parece que algo no está funcionando como esperabas',
      helpIdle: 'Puedo ayudarte a crear encuestas, analizar el chat y más',
      msgConnectionFailed: '¡No te preocupes! Vamos a intentarlo de nuevo',
      msgPollEmpty: 'Hmm... parece que la encuesta necesita opciones',
      msgNoVotes: 'El chat está muy tranquilo...',
      msgRepeatedAction: '¿Necesitas ayuda con algo?',
      msgIdle: '¡Aquí estoy si me necesitas!',
      msgChatPositive: '¡Qué buen ambiente! 💜',
      msgChatNegative: 'El chat parece un poco tenso...',
      msgChatExcited: '¡El chat está ON FIRE! 🔥',
      msgNotConnected: '¡Hola! Conecta un canal para empezar',
      msgPollGoing: '¡{votes} votos! La encuesta va genial',
      msgWaitingVotes: 'Esperando los primeros votos...',
      msgWatching: 'Observando el chat... 👀',
      dragToMove: 'Arrastra para mover',
      msgLove: '¡Mucho amor en el chat! 💜',
      msgSurprised: '¡Wow! ¿Qué pasó? 😱',
      msgAngry: 'El chat está intenso... 😅',
      msgSleepy: '💤 Esperando actividad...',
      msgHappy: '¡Buen ambiente! 😊',
      msgSad: 'El chat está triste... 😢',
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
      urlDetected: 'URL detected',
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
      notConnected: 'Not connected',
      connectToChannel: 'Connect to a Twitch channel to watch the stream.',
      invalidChannel: 'Invalid channel',
      invalidChannelName: 'Channel name is not valid.',
      twitchStream: 'Twitch Stream',
      loadStream: 'Load Stream',
      openInTwitch: 'Open in Twitch',
      copyLink: 'Copy link',
      closeStream: 'Close stream',
    },
    poll: {
      title: 'Poll',
      liveTitle: 'Live Poll',
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
      confirm: 'Confirm Poll',
      confirmHint: 'Review details before launching.',
      preview: 'Preview',
      save: 'Save',
      saveTemplate: 'Save as Template',
      apply: 'Apply',
      cancel: 'Cancel',
      goal: 'Goal',
      goalTooltip: 'Stops when reaching X votes',
      writeQuestion: 'Write a question to save.',
      minOptions: 'Poll must have at least 2 options.',
      storageFull: 'Could not save: Storage limit exceeded.',
      templateSaved: 'Template saved successfully.',
      replaceOptions: 'This will replace current options. Continue?',
      noPollActive: 'No active poll',
      createInPanel: 'Create a poll in the Panel to see the preview.',
      shareVotes: '{label}: {percentage}% of votes',
      obsOverlay: 'OBS Overlay',
      obsHint: 'Show the poll in your stream with Window Capture.',
      quick: 'Quick',
      yesNo: 'Yes / No',
      sectionTitle: 'Section Title',
      sectionTitleTooltip: "Appears above the question (e.g. 'Voting Now')",
      questionLabel: 'Question',
      questionTooltip: 'The main question for viewers',
      questionPlaceholderFull: 'What are we playing today?',
      responseOptions: 'Response Options',
      addOptionBtn: 'Add Option',
      timeSec: 'Time (Sec)',
      barColor: 'Bar',
      limitColor: 'Limit',
      votePrefix: 'Prefix',
      votePrefixTooltip: 'Symbol to vote (e.g: +1, !1, #1)',
      voteKeyTooltip: 'Keyword to vote (e.g: yes, no, red)',
      startPoll: 'Start Poll',
      clearForm: 'Clear Form',
      templates: 'Templates',
      myTemplates: 'My Templates',
      favorites: 'Favorites',
      uploadImage: 'Upload Image',
      galleryBtn: 'Gallery',
      presetApplied: 'Preset applied.',
      templateLoaded: 'Template loaded.',
      invalidImageType: 'File must be a valid image (JPG, PNG, GIF).',
      imageTooLarge: 'Image is too large (Max 40MB).',
      fileReadError: 'Error reading file. Try again.',
      iconSavedToGallery: 'Icon processed and saved to Gallery.',
      imageProcessError: 'Error processing image in browser.',
      imageDamaged: 'Image file appears to be damaged.',
      needTwoOptions: 'At least 2 options are required.',
      completeAllFields: 'Complete the question and all options.',
      allOptionsNeedLabel: 'All options must have a label.',
      option: 'Option',
    },
    moderation: {
      title: 'Vote Moderation',
      config: 'Configuration',
      stats: 'Statistics',
      log: 'Log',
      accepted: 'Accepted',
      rejected: 'Rejected',
      voteChanged: 'Vote changes',
      acceptanceRate: 'Acceptance rate',
      reset: 'Reset',
      minAccountAge: 'Min Account Age (days)',
      minAccountAgeTooltip: 'Accounts younger than this will be rejected. Set to 0 to allow all.',
      allowVoteChanges: 'Allow Vote Changes',
      allowVoteChangesTooltip: 'When disabled, users cannot change their vote after voting.',
      enabled: 'Enabled',
      disabled: 'Disabled',
      cooldown: 'Cooldown (seconds)',
      cooldownTooltip: 'Time users must wait before changing their vote.',
      voteWeights: 'Vote Weights (1-5)',
      voteWeightsTooltip: 'Higher weights give more voting power to subscribers/followers.',
      subscriber: 'Subscriber',
      follower: 'Follower',
      regularUsers: 'Regular users always have weight 1x',
      presets: 'Presets',
      presetName: 'Preset name...',
      loadPreset: 'Load Preset',
      noPresets: 'No presets saved yet',
      presetSaved: 'Preset "{name}" saved',
      presetLoaded: 'Preset "{name}" loaded',
      presetDeleted: 'Preset "{name}" deleted',
      enterPresetName: 'Enter a preset name',
      resetDefaults: 'Settings reset to defaults',
      whitelist: 'Permitted list',
      whitelistTooltip: 'Only these users will be able to vote. One name per line.',
      whitelistEnabled: 'Enable permitted',
      whitelistPlaceholder: 'user1\nuser2\nuser3',
      whitelistCount: '{count} users',
      blacklist: 'List Excluded',
      blacklistTooltip: 'These users will NOT be able to vote. One name per line.',
      blacklistEnabled: 'Enable list Excluded',
      blacklistPlaceholder: 'troll1\nspammer2\nbot3',
      blacklistCount: '{count} blocked',
      reasons: {
        accountTooNew: 'Account too new',
        cooldownActive: 'Cooldown active',
        alreadyVoted: 'Already voted',
        invalidOption: 'Invalid option',
        voteChangeCooldown: 'Change cooldown',
        notWhitelisted: 'Not whitelisted',
        blacklisted: 'User blocked',
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
      live: 'Live',
      history: 'History',
      activeSession: 'Active session',
      noActiveStream: 'No active stream',
      connectToSee: 'Connect to a channel to see live analytics',
      uniqueViewers: 'Unique viewers',
      messages: 'Messages',
      positive: 'Positive',
      neutral: 'Neutral',
      negative: 'Negative',
      engagement: 'Engagement',
      mainTopics: 'Main topics',
      frequentWords: 'Frequent words',
      mostUsedEmotes: 'Most used emotes',
      mostActiveViewers: 'Most active viewers',
      msgs: 'msgs',
      sessionsThisDay: 'session(s) this day',
      totalMessages: 'Total messages',
      noSessionsDate: 'No sessions for this date',
      exportData: 'Export data',
      loading: 'Loading...',
    },
    aiConfig: {
      title: 'AI Configuration',
      optional: 'Optional',
      description: 'Connect an AI to analyze your chat and get advanced insights at the end of each stream.',
      provider: 'Provider',
      apiKey: 'API Key',
      apiKeyPlaceholder: 'Your {provider} API key...',
      saved: 'Saved!',
      save: 'Save',
      test: 'Test',
      connectionSuccess: '✓ Connection successful!',
      connectionError: '✗ Connection error',
      aiAnalysis: 'AI Analysis',
      activateInsights: 'Enable for advanced insights',
      noApiKeyHint: '💡 Without API key, basic local analysis will be used.',
      getApiKey: 'Get {provider} API key →',
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
    chat: {
      newPoll: '📊 New Poll',
      options: 'Options',
      voteHint: 'Vote by typing +1, +2, etc.',
      pollEnded: '🏁 Poll Ended',
      winner: '🏆 Winner',
      withVotes: 'with {votes} votes',
      liveChat: 'Live Chat',
      waitingMessages: 'Waiting for messages...',
      newMessages: 'New messages',
      alreadyRegistered: 'Already registered',
      votedFor: 'Voted for',
    },
    mascot: {
      title: 'AI Vision',
      chatSentiment: 'Chat sentiment',
      positive: 'Positive',
      neutral: 'Neutral',
      negative: 'Negative',
      messages: 'Messages',
      votes: 'Votes',
      viewers: 'Viewers',
      intensity: 'Intensity',
      helpConnectionFailed: 'Check that the channel name is correct and you have internet connection',
      helpPollEmpty: 'Add at least 2 options to create a poll',
      helpNoVotes: 'Try announcing the poll in chat or make the question more engaging',
      helpRepeatedAction: 'Something seems to not be working as expected',
      helpIdle: 'I can help you create polls, analyze chat and more',
      msgConnectionFailed: "Don't worry! Let's try again",
      msgPollEmpty: 'Hmm... looks like the poll needs options',
      msgNoVotes: 'Chat is very quiet...',
      msgRepeatedAction: 'Need help with something?',
      msgIdle: "I'm here if you need me!",
      msgChatPositive: 'Great vibes! 💜',
      msgChatNegative: 'Chat seems a bit tense...',
      msgChatExcited: 'Chat is ON FIRE! 🔥',
      msgNotConnected: 'Hello! Connect a channel to start',
      msgPollGoing: '{votes} votes! Poll is going great',
      msgWaitingVotes: 'Waiting for the first votes...',
      msgWatching: 'Watching the chat... 👀',
      dragToMove: 'Drag to move',
      msgLove: 'So much love in chat! 💜',
      msgSurprised: 'Wow! What happened? 😱',
      msgAngry: 'Chat is intense... 😅',
      msgSleepy: '💤 Waiting for activity...',
      msgHappy: 'Good vibes! 😊',
      msgSad: 'Chat is sad... 😢',
    },
  },
};
