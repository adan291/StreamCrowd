import { useCallback, useMemo } from 'react';

// Tipos para análisis offline
export interface ChatAnalysisResult {
  action: 'alert' | 'hype' | 'moderate' | 'question';
  mood: 'hype' | 'calm' | 'toxic' | 'confused';
  response: string;
  confidence: number;
}

export interface GameNarrationResult {
  speech: string;
  tone: 'western' | 'epic' | 'funny' | 'dramatic';
  duration: number;
}

export interface ClipSuggestionResult {
  title: string;
  confidence: number;
  keywords: string[];
  moment: string;
}

export interface StreamSummaryResult {
  summary: string;
  tweet: string;
  highlights: string[];
  stats: {
    followers: number;
    engagement: number;
  };
}

/**
 * Hook para análisis de IA completamente offline y autosuficiente
 * 
 * Funciona sin APIs externas usando:
 * - Análisis de patrones de texto
 * - Diccionarios de palabras clave
 * - Algoritmos de sentimiento básicos
 * - Templates predefinidos
 */
export function useOfflineAI() {
  // Diccionarios de palabras clave
  const keywords = useMemo(() => ({
    hype: [
      'increíble', 'épico', 'genial', 'brutal', 'espectacular', 'wow', 'omg',
      'pogchamp', 'pog', 'hype', 'fire', 'fuego', 'bestial', 'crack',
      'leyenda', 'god', 'insane', 'loco', 'flipante', 'alucinante'
    ],
    toxic: [
      'idiota', 'estúpido', 'tonto', 'imbécil', 'basura', 'malo', 'horrible',
      'odio', 'hate', 'kill', 'die', 'cancer', 'trash', 'noob', 'ez'
    ],
    question: [
      '¿', '?', 'cómo', 'qué', 'cuándo', 'dónde', 'por qué', 'para qué',
      'how', 'what', 'when', 'where', 'why', 'pregunta', 'question'
    ],
    calm: [
      'tranquilo', 'relajado', 'chill', 'nice', 'bien', 'ok', 'normal',
      'suave', 'cool', 'peaceful', 'zen', 'calma', 'sereno'
    ],
    games: {
      pium: ['pium', 'duelo', 'pistola', 'disparo', 'western', 'cowboy'],
      roulette: ['ruleta', 'casino', 'apuesta', 'bet', 'rojo', 'negro'],
      fishing: ['pesca', 'fish', 'caña', 'anzuelo', 'río', 'lago'],
      duckHunt: ['pato', 'duck', 'caza', 'hunt', 'disparo', 'shoot']
    }
  }), []);

  // Templates de respuestas
  const responseTemplates = useMemo(() => ({
    hype: [
      '¡Increíble energía en el chat!',
      '¡El hype está por las nubes!',
      '¡La comunidad está que arde! 🔥',
      '¡Esto se está poniendo épico!',
      '¡El chat está completamente loco!'
    ],
    calm: [
      'El chat está muy tranquilo hoy',
      'Ambiente relajado en el stream',
      'Todo muy chill por aquí',
      'La comunidad está en modo zen',
      'Conversación muy civilizada'
    ],
    toxic: [
      'Vamos a mantener el respeto en el chat',
      'Recordemos las reglas de la comunidad',
      'Mejor cambiemos de tema',
      'Mantengamos un ambiente positivo',
      'El chat es para pasarlo bien'
    ],
    question: [
      'Veo que hay dudas en el chat',
      'Hay preguntas interesantes',
      'La comunidad quiere saber más',
      'Vamos a resolver esas dudas',
      'Buenas preguntas en el chat'
    ]
  }), []);

  // Análisis de sentimiento básico
  const analyzeSentiment = useCallback((text: string): { mood: ChatAnalysisResult['mood']; confidence: number } => {
    const lowerText = text.toLowerCase();
    
    let hypeScore = 0;
    let toxicScore = 0;
    let questionScore = 0;
    let calmScore = 0;

    // Contar palabras clave
    keywords.hype.forEach(word => {
      if (lowerText.includes(word)) hypeScore += 1;
    });
    
    keywords.toxic.forEach(word => {
      if (lowerText.includes(word)) toxicScore += 2; // Peso mayor para toxicidad
    });
    
    keywords.question.forEach(word => {
      if (lowerText.includes(word)) questionScore += 1;
    });
    
    keywords.calm.forEach(word => {
      if (lowerText.includes(word)) calmScore += 1;
    });

    // Factores adicionales
    const hasExclamation = (text.match(/!/g) || []).length;
    const hasQuestion = (text.match(/\?/g) || []).length;
    const hasAllCaps = text === text.toUpperCase() && text.length > 3;
    const hasEmotes = /[\u{1F600}-\u{1F64F}]/u.test(text);

    hypeScore += hasExclamation * 0.5 + (hasAllCaps ? 1 : 0) + (hasEmotes ? 0.5 : 0);
    questionScore += hasQuestion * 2;

    // Determinar mood dominante
    const scores = { hype: hypeScore, toxic: toxicScore, question: questionScore, calm: calmScore };
    const maxScore = Math.max(...Object.values(scores));
    
    if (maxScore === 0) {
      return { mood: 'calm', confidence: 0.3 };
    }

    const dominantMood = Object.keys(scores).find(key => scores[key as keyof typeof scores] === maxScore) as ChatAnalysisResult['mood'];
    const confidence = Math.min(maxScore / 5, 1); // Normalizar a 0-1

    // Casos especiales
    if (toxicScore > 0) {
      return { mood: 'toxic', confidence: Math.min(toxicScore / 3, 1) };
    }

    if (questionScore > hypeScore && questionScore > calmScore) {
      return { mood: 'confused', confidence }; // Preguntas = confusión
    }

    return { mood: dominantMood || 'calm', confidence };
  }, [keywords]);

  // Análisis de chat
  const analyzeChatMessages = useCallback((messages: string[]): ChatAnalysisResult => {
    if (!messages.length) {
      return {
        action: 'alert',
        mood: 'calm',
        response: 'El chat está muy silencioso',
        confidence: 0.8
      };
    }

    const combinedText = messages.join(' ');
    const { mood, confidence } = analyzeSentiment(combinedText);

    // Determinar acción basada en mood
    let action: ChatAnalysisResult['action'] = 'alert';
    if (mood === 'hype') action = 'hype';
    else if (mood === 'toxic') action = 'moderate';
    else if (mood === 'confused') action = 'question';

    // Seleccionar respuesta aleatoria
    const responses = responseTemplates[mood === 'confused' ? 'question' : mood];
    const response = responses[Math.floor(Math.random() * responses.length)];

    return {
      action,
      mood,
      response,
      confidence: Math.max(confidence, 0.6) // Mínimo de confianza
    };
  }, [analyzeSentiment, responseTemplates]);

  // Narración de juegos
  const generateGameNarration = useCallback((gameEvent: string): GameNarrationResult => {
    const lowerEvent = gameEvent.toLowerCase();
    
    // Detectar tipo de juego
    let gameType = 'generic';
    let tone: GameNarrationResult['tone'] = 'epic';
    
    if (keywords.games.pium.some(word => lowerEvent.includes(word))) {
      gameType = 'pium';
      tone = 'western';
    } else if (keywords.games.roulette.some(word => lowerEvent.includes(word))) {
      gameType = 'roulette';
      tone = 'dramatic';
    } else if (keywords.games.fishing.some(word => lowerEvent.includes(word))) {
      gameType = 'fishing';
      tone = 'funny';
    } else if (keywords.games.duckHunt.some(word => lowerEvent.includes(word))) {
      gameType = 'duckHunt';
      tone = 'epic';
    }

    // Templates de narración por juego
    const narrationTemplates = {
      pium: [
        '¡El duelo más épico del oeste está a punto de comenzar!',
        '¡Los forasteros se miran fijamente bajo el sol del mediodía!',
        '¡El viento sopla y la tensión se puede cortar con un cuchillo!',
        '¡Quien desenfunde primero será el nuevo sheriff de la ciudad!'
      ],
      roulette: [
        '¡La ruleta gira y los corazones se aceleran!',
        '¡Todo o nada en esta apuesta legendaria!',
        '¡El destino está en manos de la suerte!',
        '¡La tensión es palpable mientras la bola rueda!'
      ],
      fishing: [
        '¡Parece que tenemos un pez gordo en el anzuelo!',
        '¡La caña se dobla, algo grande viene!',
        '¡El río está generoso hoy con los pescadores!',
        '¡Cuidado que este pez tiene ganas de pelea!'
      ],
      duckHunt: [
        '¡Los patos vuelan alto pero los cazadores están listos!',
        '¡Apunten bien que solo tienen una oportunidad!',
        '¡El cielo se llena de plumas y adrenalina!',
        '¡La caza ha comenzado, que gane el mejor tirador!'
      ],
      generic: [
        '¡Se viene algo épico!',
        '¡La emoción está en el aire!',
        '¡Esto se va a poner interesante!',
        '¡Prepárense para lo que viene!'
      ]
    };

    const templates = narrationTemplates[gameType as keyof typeof narrationTemplates];
    const speech = templates[Math.floor(Math.random() * templates.length)];
    
    // Estimar duración basada en longitud del texto
    const duration = Math.max(3, Math.ceil(speech.length / 15)); // ~15 caracteres por segundo

    return { speech, tone, duration };
  }, [keywords]);

  // Sugerencias de clips
  const generateClipSuggestion = useCallback((chatLogs: string[]): ClipSuggestionResult => {
    if (!chatLogs.length) {
      return {
        title: 'Momento del Stream',
        confidence: 0.3,
        keywords: ['stream'],
        moment: 'Momento silencioso del stream'
      };
    }

    const combinedText = chatLogs.join(' ').toLowerCase();
    const { mood } = analyzeSentiment(combinedText);

    // Extraer palabras clave más frecuentes
    const words = combinedText.split(/\s+/).filter(word => word.length > 3);
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topWords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);

    // Templates de títulos por mood
    const titleTemplates = {
      hype: [
        '¡Momento ÉPICO en el stream!',
        '¡El chat se vuelve LOCO!',
        '¡HYPE máximo alcanzado!',
        '¡Momento LEGENDARIO!'
      ],
      toxic: [
        'Momento tenso en el stream',
        'El chat se calienta',
        'Discusión acalorada',
        'Momento controversial'
      ],
      confused: [
        'El chat tiene dudas',
        'Momento de confusión',
        'Preguntas sin respuesta',
        '¿Qué está pasando?'
      ],
      calm: [
        'Momento relajado del stream',
        'Chat tranquilo',
        'Conversación chill',
        'Momento zen'
      ]
    };

    const templates = titleTemplates[mood];
    const baseTitle = templates[Math.floor(Math.random() * templates.length)];
    
    // Personalizar título con palabras clave
    let title = baseTitle;
    if (topWords.length > 0 && !['el', 'la', 'de', 'en', 'y', 'a', 'que'].includes(topWords[0])) {
      title = `${baseTitle} - ${topWords[0]}`;
    }

    const confidence = Math.min(chatLogs.length / 10, 1); // Más logs = más confianza

    return {
      title,
      confidence,
      keywords: topWords,
      moment: `Momento ${mood} detectado en el chat`
    };
  }, [analyzeSentiment]);

  // Resumen de stream
  const generateStreamSummary = useCallback((streamStats: any): StreamSummaryResult => {
    const stats = {
      duration: streamStats.duration || '2h 30m',
      viewers: streamStats.viewers || { peak: 500, average: 300 },
      followers: streamStats.followers || { gained: 25 },
      messages: streamStats.messages || 1000,
      games: streamStats.games || ['Juegos varios']
    };

    // Generar resumen basado en estadísticas
    const summary = `¡Stream de ${stats.duration} completado! Alcanzamos ${stats.viewers.peak} viewers en el pico con ${stats.viewers.average} de promedio. Ganamos ${stats.followers.gained} nuevos followers y el chat estuvo súper activo con ${stats.messages} mensajes. Los juegos ${stats.games.join(', ')} fueron un éxito total. ¡Gracias por el apoyo increíble!`;

    // Generar tweet
    const tweet = `🔥 ¡Stream épico de ${stats.duration}! ${stats.viewers.peak} viewers pico, +${stats.followers.gained} followers y chat súper activo. Los juegos estuvieron 🔥🔥 ¡Gracias comunidad! #StreamCrowd #Twitch #Gaming`;

    // Generar highlights
    const highlights = [
      `Pico de ${stats.viewers.peak} viewers`,
      `+${stats.followers.gained} nuevos followers`,
      `Chat activo con ${stats.messages} mensajes`,
      `Juegos exitosos: ${stats.games.join(', ')}`,
      `Promedio de ${stats.viewers.average} viewers mantenido`
    ];

    return {
      summary,
      tweet,
      highlights,
      stats: {
        followers: stats.followers.gained,
        engagement: Math.min((stats.messages / stats.viewers.average) * 10, 100)
      }
    };
  }, []);

  return {
    analyzeChatMessages,
    generateGameNarration,
    generateClipSuggestion,
    generateStreamSummary,
    analyzeSentiment
  };
}