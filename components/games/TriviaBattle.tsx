import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TwitchMessage } from '../../types';
import { takeNewChatMessages, markChatMessagesRead } from '../../src/application/utils/chatCursor';
import { shuffle, sortByKeyRandomTies } from '../../src/application/utils/shuffle';
import { Play, Trophy, RotateCcw, HelpCircle, Check, Timer, Plus, Trash2, Sparkles, AlertCircle, Loader2, BookOpen, Gamepad2, Film, Music, Globe, Cpu, Dumbbell, Utensils, RefreshCw, Pause, X, Users } from 'lucide-react';
import { loadAIConfig, AIConfig, getProviderForFunction } from '../../src/application/services/AnalyticsService';
import { OBSOverlayUrl } from '../OBSOverlayUrl';
import { gameSync } from '../../src/infrastructure/sync/FirebaseSync';
import { useOBSTriggers } from '../../src/application/hooks/useOBSTriggers';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
  source?: 'local' | 'api' | 'ai' | 'manual'; // Fuente de la pregunta
}

interface PlayerScore {
  oderId: string;
  username: string;
  color: string;
  score: number;
  streak: number;
  lastAnswer: number | null;
  answeredCurrent: boolean;
}

interface TriviaCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  questions: Question[];
  apiCategoryId?: number; // ID de Open Trivia DB si aplica
}

interface TriviaBattleProps {
  chatMessages: TwitchMessage[];
  isConnected?: boolean;
}

const GAME_CHANNEL = 'trivia_battle_sync';
const STORAGE_KEY_TRIVIA = 'trivia_battle_state';
const CUSTOM_QUESTIONS_KEY = 'trivia_custom_questions';
const QUESTION_USAGE_KEY = 'trivia_question_usage'; // Contador de uso de preguntas

// Sistema de contador de uso de preguntas
interface QuestionUsage {
  [questionId: string]: number;
}

const loadQuestionUsage = (): QuestionUsage => {
  try {
    const saved = localStorage.getItem(QUESTION_USAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const saveQuestionUsage = (usage: QuestionUsage): void => {
  localStorage.setItem(QUESTION_USAGE_KEY, JSON.stringify(usage));
};

const incrementQuestionUsage = (questionIds: string[]): void => {
  const usage = loadQuestionUsage();
  questionIds.forEach(id => {
    usage[id] = (usage[id] || 0) + 1;
  });
  saveQuestionUsage(usage);
};

// Ordenar preguntas priorizando las menos usadas
const sortByUsage = (questions: Question[]): Question[] => {
  const usage = loadQuestionUsage();
  // Menos usadas primero; empates en orden aleatorio uniforme
  return sortByKeyRandomTies(questions, q => usage[q.id] || 0);
};

// Funciones para persistencia de preguntas personalizadas
interface SavedCategory {
  id: string;
  name: string;
  topic: string;
  questions: Question[];
  createdAt: number;
}

const loadCustomCategories = (): SavedCategory[] => {
  try {
    const saved = localStorage.getItem(CUSTOM_QUESTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveCustomCategory = (topic: string, questions: Question[]): SavedCategory => {
  const categories = loadCustomCategories();
  const id = `custom_${Date.now()}`;
  const newCategory: SavedCategory = {
    id,
    name: topic,
    topic,
    questions,
    createdAt: Date.now()
  };
  
  // Buscar si ya existe una categoría con el mismo tema
  const existingIndex = categories.findIndex(c => c.topic.toLowerCase() === topic.toLowerCase());
  if (existingIndex >= 0) {
    // Añadir preguntas a la categoría existente
    categories[existingIndex].questions = [
      ...categories[existingIndex].questions,
      ...questions
    ];
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(categories));
    return categories[existingIndex];
  } else {
    // Crear nueva categoría
    categories.push(newCategory);
    localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(categories));
    return newCategory;
  }
};

const deleteCustomCategory = (categoryId: string): void => {
  const categories = loadCustomCategories();
  const filtered = categories.filter(c => c.id !== categoryId);
  localStorage.setItem(CUSTOM_QUESTIONS_KEY, JSON.stringify(filtered));
};

// Función para decodificar HTML entities de la API
const decodeHTML = (html: string): string => {
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
};

// Cache de preguntas de API traducidas
const API_QUESTIONS_CACHE_KEY = 'trivia_api_questions_cache';

interface CachedQuestion extends Question {
  originalQuestion: string; // Pregunta original en inglés
  categoryId: number;
}

// Detectar si un texto está en inglés
const isEnglishText = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  // Palabras muy comunes en inglés que raramente aparecen en español
  const englishWords = [
    'which', 'what', 'who', 'where', 'when', 'how', 'the', 'is', 'are', 'was', 
    'were', 'has', 'have', 'had', 'did', 'does', 'do', 'been', 'being', 'would',
    'could', 'should', 'will', 'shall', 'may', 'might', 'must', 'can', 'this',
    'that', 'these', 'those', 'there', 'their', 'they', 'them', 'with', 'from',
    'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once', 'here',
    'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
    'same', 'than', 'too', 'very', 'just', 'also', 'now', 'called', 'known',
    'following', 'according', 'however', 'although', 'because', 'since'
  ];
  
  // Contar cuántas palabras inglesas hay
  let englishCount = 0;
  for (const word of englishWords) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) englishCount += matches.length;
  }
  
  // Si hay 2 o más palabras inglesas comunes, probablemente está en inglés
  return englishCount >= 2;
};

const loadCachedApiQuestions = (): CachedQuestion[] => {
  try {
    const saved = localStorage.getItem(API_QUESTIONS_CACHE_KEY);
    if (!saved) return [];
    const cached: CachedQuestion[] = JSON.parse(saved);
    // Filtrar preguntas que no se tradujeron correctamente (siguen en inglés)
    return cached.filter(q => {
      // Si la pregunta es igual a la original, no está traducida
      if (q.question === q.originalQuestion) return false;
      // Usar la función de detección de inglés
      if (isEnglishText(q.question)) return false;
      return true;
    });
  } catch {
    return [];
  }
};

const saveCachedApiQuestion = (question: CachedQuestion): void => {
  // Solo guardar si la pregunta está realmente traducida
  if (question.question === question.originalQuestion) return;
  if (isEnglishText(question.question)) return;
  
  const cached = loadCachedApiQuestions();
  // Evitar duplicados por pregunta original
  if (!cached.find(q => q.originalQuestion === question.originalQuestion)) {
    cached.push(question);
    localStorage.setItem(API_QUESTIONS_CACHE_KEY, JSON.stringify(cached));
  }
};

// Traducir texto simple usando la API de IA configurada
const translateSimpleText = async (text: string, apiKey: string, provider: string): Promise<string> => {
  const prompt = `Traduce este texto del inglés al español. Responde SOLO con la traducción, nada más:\n${text}`;
  
  try {
    if (provider === 'gemini') {
      const model = localStorage.getItem('gemini_working_model') || 'gemini-2.0-flash-exp';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        }
      );
      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (result && result.length > 0) return result;
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });
      const data = await response.json();
      const result = data.choices?.[0]?.message?.content?.trim();
      if (result && result.length > 0) return result;
    }
  } catch (error) {
    console.warn('Simple translation failed:', error);
  }
  return text;
};

// Traducir una pregunta completa (pregunta + opciones) con fallback robusto
const translateQuestion = async (
  questionText: string,
  options: string[],
  apiKey: string,
  provider: string
): Promise<{ question: string; options: string[] }> => {
  // Primero intentar traducción estructurada con JSON
  const prompt = `Traduce esta pregunta de trivia del inglés al español de España. 
IMPORTANTE: Responde ÚNICAMENTE con el JSON, sin explicaciones ni texto adicional.

Formato de respuesta (JSON puro):
{"question": "pregunta en español", "options": ["opción A", "opción B", "opción C", "opción D"]}

Pregunta a traducir: ${questionText}
Opciones a traducir: ${options.join(' | ')}`;

  try {
    let text = '';
    if (provider === 'gemini') {
      const model = localStorage.getItem('gemini_working_model') || 'gemini-2.0-flash-exp';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
          }),
        }
      );
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
        }),
      });
      const data = await response.json();
      text = data.choices?.[0]?.message?.content?.trim() || '';
    }

    if (text) {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.question && parsed.options && parsed.options.length === options.length) {
            // Verificar que realmente se tradujo (no es igual al original)
            if (parsed.question !== questionText) {
              return { question: parsed.question, options: parsed.options };
            }
          }
        } catch (parseError) {
          console.warn('JSON parse failed, trying fallback:', parseError);
        }
      }
    }
  } catch (error) {
    console.warn('Structured translation failed:', error);
  }

  // FALLBACK: Traducir cada elemento por separado
  console.log('Using fallback translation for:', questionText.substring(0, 50));
  try {
    const translatedQuestion = await translateSimpleText(questionText, apiKey, provider);
    const translatedOptions = await Promise.all(
      options.map(opt => translateSimpleText(opt, apiKey, provider))
    );
    
    // Verificar que al menos la pregunta se tradujo
    if (translatedQuestion !== questionText) {
      return { question: translatedQuestion, options: translatedOptions };
    }
  } catch (fallbackError) {
    console.warn('Fallback translation also failed:', fallbackError);
  }

  return { question: questionText, options };
};

// Función para cargar preguntas de Open Trivia DB con traducción
const fetchOpenTDBQuestions = async (
  categoryId: number | null,
  amount: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'any',
  timeLimit: number,
  translateToSpanish: boolean = true
): Promise<Question[]> => {
  // Primero, buscar en cache local
  const cached = loadCachedApiQuestions();
  const cachedForCategory = cached.filter(q => 
    categoryId ? q.categoryId === categoryId : true
  );
  
  // Si tenemos suficientes en cache, usar esas (priorizando menos usadas)
  if (cachedForCategory.length >= amount) {
    const usage = loadQuestionUsage();
    const sorted = sortByKeyRandomTies(cachedForCategory, q => usage[q.id] || 0);
    return sorted.slice(0, amount).map(q => ({ ...q, timeLimit }));
  }
  
  // Si no hay suficientes en cache, cargar de API
  let url = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
  if (categoryId) url += `&category=${categoryId}`;
  if (difficulty !== 'any') url += `&difficulty=${difficulty}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Error al conectar con Open Trivia DB');
  
  const data = await response.json();
  if (data.response_code !== 0) {
    if (data.response_code === 1) throw new Error('No hay suficientes preguntas para esta categoría');
    throw new Error('Error en la API de trivia');
  }
  
  // Obtener config de IA para traducción
  let aiProvider: string | null = null;
  let aiApiKey: string | null = null;
  
  if (translateToSpanish) {
    const config = loadAIConfig();
    const providerInfo = config ? getProviderForFunction(config, 'games') : null;
    if (providerInfo) {
      aiProvider = providerInfo.provider;
      aiApiKey = providerInfo.apiKey;
    }
  }
  
  const questions: Question[] = [];
  
  for (let i = 0; i < data.results.length; i++) {
    const q = data.results[i];
    let questionText = decodeHTML(q.question);
    let options = [...q.incorrect_answers, q.correct_answer].map(decodeHTML);
    const originalQuestion = decodeHTML(q.question);
    
    // Traducir si tenemos IA configurada
    if (translateToSpanish && aiProvider && aiApiKey) {
      try {
        // Usar la función de traducción estructurada
        const translated = await translateQuestion(questionText, options, aiApiKey, aiProvider);
        questionText = translated.question;
        // Mantener el orden de las opciones traducidas igual que el original
        // La última opción es la correcta (correct_answer)
        options = translated.options;
      } catch (error) {
        console.warn('Translation failed for question:', error);
        // Si falla la traducción, saltar esta pregunta
        continue;
      }
    }
    
    // VERIFICACIÓN FINAL: Si la pregunta sigue en inglés, saltarla
    if (isEnglishText(questionText)) {
      console.warn('Question still in English, skipping:', questionText.substring(0, 50));
      continue;
    }
    
    // La respuesta correcta está en la última posición del array options
    const correctAnswerTranslated = options[options.length - 1];
    
    // Mezclar opciones (Fisher-Yates: la correcta no debe quedar sesgada hacia el final).
    // Se sigue la posición de la correcta por índice, no por texto, por si hay opciones repetidas.
    const order = shuffle(options.map((_, idx) => idx));
    const shuffledOptions = order.map(idx => options[idx]);
    const correctIndex = order.indexOf(options.length - 1);
    
    const question: Question = {
      id: `opentdb_${categoryId || 'any'}_${Date.now()}_${i}`,
      question: questionText,
      options: shuffledOptions,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      timeLimit,
      source: 'api' as const
    };
    
    questions.push(question);
    
    // Guardar en cache solo si está traducida
    saveCachedApiQuestion({
      ...question,
      originalQuestion,
      categoryId: categoryId || 0
    });
  }
  
  return questions;
};

// Banco de preguntas predefinidas por categoría - Con apiCategoryId para enriquecer desde API
const QUESTION_BANK: TriviaCategory[] = [
  {
    id: 'general',
    name: 'Cultura General',
    icon: <BookOpen size={16} />,
    apiCategoryId: 9, // Open Trivia DB category
    questions: [
      { id: 'g1', question: '¿Cuál es el planeta más grande del sistema solar?', options: ['Marte', 'Júpiter', 'Saturno', 'Neptuno'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'g2', question: '¿En qué año llegó el hombre a la Luna?', options: ['1965', '1969', '1972', '1975'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'g3', question: '¿Cuál es el océano más grande?', options: ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'g4', question: '¿Cuántos huesos tiene el cuerpo humano adulto?', options: ['186', '206', '226', '256'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'g5', question: '¿Cuál es el país más grande del mundo?', options: ['China', 'Estados Unidos', 'Canadá', 'Rusia'], correctIndex: 3, timeLimit: 15, source: 'local' },
      { id: 'g6', question: '¿Cuántos colores tiene el arcoíris?', options: ['5', '6', '7', '8'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'g7', question: '¿Cuál es el animal más grande del mundo?', options: ['Elefante', 'Ballena azul', 'Jirafa', 'Tiburón ballena'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'g8', question: '¿Cuántos días tiene un año bisiesto?', options: ['364', '365', '366', '367'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'g9', question: '¿Qué gas necesitan las plantas para la fotosíntesis?', options: ['Oxígeno', 'Nitrógeno', 'Dióxido de carbono', 'Hidrógeno'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'g10', question: '¿Cuál es el metal más caro del mundo?', options: ['Oro', 'Platino', 'Rodio', 'Plata'], correctIndex: 2, timeLimit: 15, source: 'local' },
    ]
  },
  {
    id: 'gaming',
    name: 'Videojuegos',
    icon: <Gamepad2 size={16} />,
    apiCategoryId: 15,
    questions: [
      { id: 'vg1', question: '¿En qué año se lanzó el primer Super Mario Bros?', options: ['1983', '1985', '1987', '1989'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg2', question: '¿Cuál es el videojuego más vendido de la historia?', options: ['GTA V', 'Minecraft', 'Tetris', 'Wii Sports'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg3', question: '¿Qué empresa creó PlayStation?', options: ['Nintendo', 'Microsoft', 'Sony', 'Sega'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'vg4', question: '¿Cómo se llama el protagonista de The Legend of Zelda?', options: ['Zelda', 'Link', 'Ganon', 'Epona'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg5', question: '¿Qué juego popularizó el Battle Royale?', options: ['Fortnite', 'PUBG', 'Apex Legends', 'H1Z1'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg6', question: '¿En qué año salió la primera Xbox?', options: ['1999', '2001', '2003', '2005'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg7', question: '¿Qué personaje es la mascota de Sega?', options: ['Mario', 'Sonic', 'Crash', 'Spyro'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg8', question: '¿En qué juego aparece Master Chief?', options: ['Gears of War', 'Halo', 'Destiny', 'Call of Duty'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg9', question: '¿Qué juego tiene el personaje Kratos?', options: ['Devil May Cry', 'God of War', 'Darksiders', 'Bayonetta'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'vg10', question: '¿Cuál es el juego principal de Riot Games?', options: ['Dota 2', 'League of Legends', 'Smite', 'Heroes of the Storm'], correctIndex: 1, timeLimit: 15, source: 'local' },
    ]
  },
  {
    id: 'movies',
    name: 'Cine y Series',
    icon: <Film size={16} />,
    apiCategoryId: 11,
    questions: [
      { id: 'm1', question: '¿Quién dirigió Titanic?', options: ['Steven Spielberg', 'James Cameron', 'Christopher Nolan', 'Martin Scorsese'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'm2', question: '¿Cuántas películas hay de Harry Potter?', options: ['6', '7', '8', '9'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'm3', question: '¿En qué año se estrenó El Señor de los Anillos: La Comunidad del Anillo?', options: ['1999', '2001', '2003', '2005'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'm4', question: '¿Qué actor interpreta a Iron Man en el MCU?', options: ['Chris Evans', 'Chris Hemsworth', 'Robert Downey Jr.', 'Mark Ruffalo'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'm5', question: '¿Cuál fue la primera película de Pixar?', options: ['Buscando a Nemo', 'Toy Story', 'Monsters Inc.', 'Bichos'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'm6', question: '¿Quién interpreta a Jack Sparrow?', options: ['Orlando Bloom', 'Johnny Depp', 'Javier Bardem', 'Geoffrey Rush'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'm7', question: '¿En qué película aparece el personaje Neo?', options: ['Blade Runner', 'Matrix', 'Tron', 'Ready Player One'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'm8', question: '¿Cuántas películas de Star Wars hay en la saga principal?', options: ['6', '9', '11', '12'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'm9', question: '¿Qué serie tiene dragones y el Trono de Hierro?', options: ['The Witcher', 'Game of Thrones', 'Vikings', 'The Last Kingdom'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'm10', question: '¿Quién dirigió Inception?', options: ['James Cameron', 'Christopher Nolan', 'Denis Villeneuve', 'Ridley Scott'], correctIndex: 1, timeLimit: 15, source: 'local' },
    ]
  },
  {
    id: 'music',
    name: 'Música',
    icon: <Music size={16} />,
    apiCategoryId: 12,
    questions: [
      { id: 'mu1', question: '¿De qué país es originaria la banda Queen?', options: ['Estados Unidos', 'Reino Unido', 'Australia', 'Canadá'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'mu2', question: '¿Quién es conocido como el "Rey del Pop"?', options: ['Elvis Presley', 'Prince', 'Michael Jackson', 'Freddie Mercury'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'mu3', question: '¿Cuántos miembros tenía The Beatles?', options: ['3', '4', '5', '6'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'mu4', question: '¿Qué instrumento toca Slash de Guns N\' Roses?', options: ['Batería', 'Bajo', 'Guitarra', 'Teclado'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'mu5', question: '¿En qué década se popularizó el reggaetón?', options: ['1980s', '1990s', '2000s', '2010s'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'mu6', question: '¿Quién cantó "Bohemian Rhapsody"?', options: ['The Beatles', 'Queen', 'Led Zeppelin', 'Pink Floyd'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'mu7', question: '¿De qué país es Bad Bunny?', options: ['México', 'Colombia', 'Puerto Rico', 'España'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'mu8', question: '¿Qué banda cantó "Smells Like Teen Spirit"?', options: ['Pearl Jam', 'Nirvana', 'Soundgarden', 'Alice in Chains'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'mu9', question: '¿Cuál es el nombre real de Shakira?', options: ['Shakira Isabel', 'María Shakira', 'Shakira Ripoll', 'Ana Shakira'], correctIndex: 0, timeLimit: 15, source: 'local' },
      { id: 'mu10', question: '¿Qué artista tiene el álbum "Thriller"?', options: ['Prince', 'Michael Jackson', 'Whitney Houston', 'Madonna'], correctIndex: 1, timeLimit: 15, source: 'local' },
    ]
  },
  {
    id: 'geography',
    name: 'Geografía',
    icon: <Globe size={16} />,
    apiCategoryId: 22,
    questions: [
      { id: 'geo1', question: '¿Cuál es la capital de Australia?', options: ['Sídney', 'Melbourne', 'Canberra', 'Brisbane'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'geo2', question: '¿Cuál es el río más largo del mundo?', options: ['Amazonas', 'Nilo', 'Yangtsé', 'Misisipi'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'geo3', question: '¿En qué continente está Egipto?', options: ['Asia', 'Europa', 'África', 'Oceanía'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'geo4', question: '¿Cuál es el país con más habitantes?', options: ['India', 'China', 'Estados Unidos', 'Indonesia'], correctIndex: 0, timeLimit: 15, source: 'local' },
      { id: 'geo5', question: '¿Cuál es la montaña más alta del mundo?', options: ['K2', 'Everest', 'Kilimanjaro', 'Mont Blanc'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'geo6', question: '¿Cuál es la capital de Canadá?', options: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'geo7', question: '¿En qué país está Machu Picchu?', options: ['Chile', 'Bolivia', 'Perú', 'Ecuador'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'geo8', question: '¿Cuál es el desierto más grande del mundo?', options: ['Sahara', 'Gobi', 'Antártida', 'Kalahari'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'geo9', question: '¿Cuántos países hay en la Unión Europea (2024)?', options: ['25', '27', '29', '31'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'geo10', question: '¿Cuál es la capital de Brasil?', options: ['Río de Janeiro', 'São Paulo', 'Brasilia', 'Salvador'], correctIndex: 2, timeLimit: 15, source: 'local' },
    ]
  },
  {
    id: 'tech',
    name: 'Tecnología',
    icon: <Cpu size={16} />,
    apiCategoryId: 18,
    questions: [
      { id: 't1', question: '¿Quién fundó Microsoft?', options: ['Steve Jobs', 'Bill Gates', 'Mark Zuckerberg', 'Elon Musk'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 't2', question: '¿En qué año se lanzó el primer iPhone?', options: ['2005', '2007', '2009', '2011'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 't3', question: '¿Qué significa "HTML"?', options: ['HyperText Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language', 'Hyperlink Text Management Language'], correctIndex: 0, timeLimit: 20, source: 'local' },
      { id: 't4', question: '¿Cuál fue la primera red social masiva?', options: ['Facebook', 'MySpace', 'Twitter', 'LinkedIn'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 't5', question: '¿Qué empresa creó Android?', options: ['Apple', 'Microsoft', 'Google', 'Samsung'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 't6', question: '¿Qué significa "CPU"?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], correctIndex: 0, timeLimit: 15, source: 'local' },
      { id: 't7', question: '¿Quién fundó Amazon?', options: ['Elon Musk', 'Jeff Bezos', 'Mark Zuckerberg', 'Larry Page'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 't8', question: '¿Qué empresa creó ChatGPT?', options: ['Google', 'Microsoft', 'OpenAI', 'Meta'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 't9', question: '¿En qué año se fundó YouTube?', options: ['2003', '2005', '2007', '2009'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 't10', question: '¿Qué significa "WiFi"?', options: ['Wireless Fidelity', 'Wired Fiber', 'Wide Frequency', 'No significa nada específico'], correctIndex: 3, timeLimit: 15, source: 'local' },
    ]
  },
  {
    id: 'sports',
    name: 'Deportes',
    icon: <Dumbbell size={16} />,
    apiCategoryId: 21,
    questions: [
      { id: 's1', question: '¿Cuántos jugadores tiene un equipo de fútbol en el campo?', options: ['9', '10', '11', '12'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 's2', question: '¿En qué país se inventó el baloncesto?', options: ['Estados Unidos', 'Canadá', 'Reino Unido', 'España'], correctIndex: 0, timeLimit: 15, source: 'local' },
      { id: 's3', question: '¿Cuántos Grand Slams hay en tenis?', options: ['3', '4', '5', '6'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 's4', question: '¿Cada cuántos años se celebran los Juegos Olímpicos?', options: ['2', '3', '4', '5'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 's5', question: '¿Quién tiene más Balones de Oro?', options: ['Cristiano Ronaldo', 'Lionel Messi', 'Johan Cruyff', 'Michel Platini'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 's6', question: '¿Cuántos sets se necesitan para ganar un partido de tenis masculino en Grand Slam?', options: ['2', '3', '4', '5'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 's7', question: '¿En qué deporte se usa un "birdie"?', options: ['Golf', 'Bádminton', 'Tenis', 'Ambos A y B'], correctIndex: 3, timeLimit: 15, source: 'local' },
      { id: 's8', question: '¿Cuántos puntos vale un touchdown en fútbol americano?', options: ['3', '6', '7', '10'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 's9', question: '¿En qué país se originó el judo?', options: ['China', 'Corea', 'Japón', 'Tailandia'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 's10', question: '¿Cuántos jugadores hay en un equipo de baloncesto en cancha?', options: ['4', '5', '6', '7'], correctIndex: 1, timeLimit: 15, source: 'local' },
    ]
  },
  {
    id: 'food',
    name: 'Gastronomía',
    icon: <Utensils size={16} />,
    questions: [
      { id: 'f1', question: '¿De qué país es originaria la pizza?', options: ['España', 'Francia', 'Italia', 'Grecia'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'f2', question: '¿Cuál es el ingrediente principal del guacamole?', options: ['Tomate', 'Aguacate', 'Chile', 'Cebolla'], correctIndex: 1, timeLimit: 15, source: 'local' },
      { id: 'f3', question: '¿De qué país es el sushi?', options: ['China', 'Corea', 'Japón', 'Tailandia'], correctIndex: 2, timeLimit: 15, source: 'local' },
      { id: 'f4', question: '¿Qué fruta es conocida como "la reina de las frutas"?', options: ['Mango', 'Piña', 'Fresa', 'Mangostán'], correctIndex: 3, timeLimit: 15, source: 'local' },
      { id: 'f5', question: '¿Cuál es la especia más cara del mundo?', options: ['Vainilla', 'Azafrán', 'Canela', 'Cardamomo'], correctIndex: 1, timeLimit: 15, source: 'local' },
    ]
  },
];

// Modos simplificados: category (unifica local + API), ai, manual
type TriviaMode = 'category' | 'ai' | 'manual';

export const TriviaBattle: React.FC<TriviaBattleProps> = ({ chatMessages, isConnected = true }) => {
  const [gameState, setGameState] = useState<'setup' | 'question' | 'results' | 'final' | 'paused'>('setup');
  const [triviaMode, setTriviaMode] = useState<TriviaMode>('category');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pausedTimeLeft, setPausedTimeLeft] = useState(0); // Guardar tiempo al pausar
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [players, setPlayers] = useState<Map<string, PlayerScore>>(new Map<string, PlayerScore>());
  const [showCorrect, setShowCorrect] = useState(false);
  const [answerCounts, setAnswerCounts] = useState<number[]>([0, 0, 0, 0]);
  
  // Category selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['general']);
  const [questionsPerCategory, setQuestionsPerCategory] = useState(5);
  const [questionTime, setQuestionTime] = useState(35); // Tiempo por pregunta configurable
  
  // AI Mode
  const [aiTopic, setAiTopic] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);
  
  // Loading state para categorías (local + API)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Opción para enriquecer con API (activado por defecto)
  const [enrichWithApi, setEnrichWithApi] = useState(true);
  
  // Custom saved categories
  const [customCategories, setCustomCategories] = useState<SavedCategory[]>([]);
  const [selectedCustomCategories, setSelectedCustomCategories] = useState<string[]>([]);
  
  // Manual question editor
  const [editingQuestion, setEditingQuestion] = useState('');
  const [editingOptions, setEditingOptions] = useState(['', '', '', '']);
  const [editingCorrect, setEditingCorrect] = useState(0);
  const [editingTime, setEditingTime] = useState(15);
  
  const lastProcessedRef = useRef<TwitchMessage | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const playersArray = [...players.values()] as PlayerScore[];
  const sortedPlayers = playersArray.sort((a, b) => b.score - a.score);
  const totalAnswers = answerCounts.reduce((a, b) => a + b, 0);

  // Load AI config and custom categories on mount
  useEffect(() => {
    const config = loadAIConfig();
    setAiConfig(config);
    setCustomCategories(loadCustomCategories());
  }, []);

  // Setup BroadcastChannel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(GAME_CHANNEL);
    return () => channelRef.current?.close();
  }, []);

  const syncToOverlay = useCallback(() => {
    const state = {
      type: 'trivia_state',
      gameState,
      currentQuestion: currentQuestion || null,
      questionIndex: currentQuestionIndex,
      totalQuestions: questions.length,
      timeLeft,
      showCorrect,
      answerCounts,
      topPlayers: sortedPlayers.slice(0, 10)
    };
    channelRef.current?.postMessage(state);
    try {
      localStorage.setItem(STORAGE_KEY_TRIVIA, JSON.stringify(state));
    } catch { /* ignore */ }
    gameSync.update('trivia', state).catch(() => {});
  }, [gameState, currentQuestion, currentQuestionIndex, questions.length, timeLeft, showCorrect, answerCounts, sortedPlayers]);

  useEffect(() => {
    syncToOverlay();
  }, [syncToOverlay]);

  // Process chat messages for answers
  useEffect(() => {
    if (!isConnected || gameState !== 'question' || !currentQuestion) return;
    const newMessages = takeNewChatMessages(chatMessages, lastProcessedRef);

    newMessages.forEach((msg: TwitchMessage) => {
      const msgLower = msg.message.toLowerCase().trim();
      const oderId = msg.userId || msg.username;
      
      // Check if user already answered this question BEFORE processing
      const existingPlayer = players.get(oderId);
      if (existingPlayer?.answeredCurrent) return;
      
      // Only accept EXACT single character answers: a, b, c, or d (letters only)
      let answerIndex = -1;
      if (msgLower.length === 1) {
        if (msgLower === 'a') answerIndex = 0;
        else if (msgLower === 'b') answerIndex = 1;
        else if (msgLower === 'c') answerIndex = 2;
        else if (msgLower === 'd') answerIndex = 3;
      }
      
      if (answerIndex >= 0 && answerIndex < currentQuestion.options.length) {
        setPlayers((prev: Map<string, PlayerScore>) => {
          const newPlayers = new Map<string, PlayerScore>(prev);
          const existing = newPlayers.get(oderId);
          
          // Double-check in case of race condition
          if (existing?.answeredCurrent) return prev;
          
          const isCorrect = answerIndex === currentQuestion.correctIndex;
          const timeBonus = Math.floor(timeLeft / 2);
          const streakBonus = existing?.streak || 0;
          const points = isCorrect ? 10 + timeBonus + (streakBonus * 2) : 0;
          
          newPlayers.set(oderId, {
            oderId,
            username: msg.username,
            color: msg.color || '#a970ff',
            score: (existing?.score || 0) + points,
            streak: isCorrect ? (existing?.streak || 0) + 1 : 0,
            lastAnswer: answerIndex,
            answeredCurrent: true
          });
          
          return newPlayers;
        });
        
        setAnswerCounts((prev: number[]) => {
          const newCounts = [...prev];
          newCounts[answerIndex]++;
          return newCounts;
        });
      }
    });
  }, [chatMessages, isConnected, gameState, currentQuestion, timeLeft, players]);

  // Question timer
  useEffect(() => {
    if (gameState !== 'question') return;
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setShowCorrect(true);
          setTimeout(() => setGameState('results'), 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, pausedTimeLeft]);

  // Generate questions from categories (including custom) - Prioriza las menos usadas
  const generateFromCategories = async () => {
    setIsLoadingQuestions(true);
    setLoadError(null);
    
    const allQuestions: Question[] = [];
    
    // Default categories - preguntas locales en español
    selectedCategories.forEach((catId: string) => {
      const category = QUESTION_BANK.find(c => c.id === catId);
      if (category) {
        // Ordenar por uso (menos usadas primero)
        const sortedByUsage = sortByUsage(category.questions);
        const questionsWithTime = sortedByUsage.slice(0, questionsPerCategory).map(q => ({
          ...q,
          timeLimit: questionTime
        }));
        allQuestions.push(...questionsWithTime);
      }
    });
    
    // Custom categories (IA generadas)
    selectedCustomCategories.forEach((catId: string) => {
      const category = customCategories.find(c => c.id === catId);
      if (category) {
        const sortedByUsage = sortByUsage(category.questions);
        const questionsWithTime = sortedByUsage.slice(0, questionsPerCategory).map(q => ({
          ...q,
          timeLimit: questionTime,
          source: 'ai' as const
        }));
        allQuestions.push(...questionsWithTime);
      }
    });
    
    // Enriquecer con API si está activado (preguntas traducidas al español)
    if (enrichWithApi) {
      try {
        // Obtener preguntas de API para las categorías seleccionadas que tengan apiCategoryId
        const apiPromises = selectedCategories
          .map(catId => QUESTION_BANK.find(c => c.id === catId))
          .filter(cat => cat?.apiCategoryId)
          .map(cat => fetchOpenTDBQuestions(cat!.apiCategoryId!, Math.min(questionsPerCategory, 5), 'any', questionTime));
        
        if (apiPromises.length > 0) {
          const apiResults = await Promise.allSettled(apiPromises);
          apiResults.forEach(result => {
            if (result.status === 'fulfilled') {
              allQuestions.push(...result.value);
            }
          });
        }
      } catch (error) {
        console.warn('Error loading API questions, using local only:', error);
      }
    }
    
    // Mezclar todas las preguntas priorizando las menos usadas
    const finalQuestions = sortByUsage(allQuestions);
    setQuestions(finalQuestions);
    setIsLoadingQuestions(false);
  };

  // Generate questions with AI
  const generateWithAI = async () => {
    const config = loadAIConfig();
    const providerInfo = config ? getProviderForFunction(config, 'games') : null;
    
    if (!providerInfo) {
      setAiError('Configura tu API key de IA en el panel de Analytics para usar esta función.');
      return;
    }
    if (!aiTopic.trim()) {
      setAiError('Escribe un tema para generar preguntas.');
      return;
    }

    setIsGenerating(true);
    setAiError(null);

    const { provider, apiKey } = providerInfo;

    const prompt = `Genera ${aiQuestionCount} preguntas de trivia sobre "${aiTopic}" para un juego de stream.
Responde SOLO con un JSON válido con esta estructura exacta:
{
  "questions": [
    {
      "question": "¿Pregunta aquí?",
      "options": ["Opción 1", "Opción 2", "Opción 3", "Opción 4"],
      "correctIndex": 0
    }
  ]
}
IMPORTANTE: 
- Cada pregunta debe tener exactamente 4 opciones
- correctIndex es el índice (0-3) de la respuesta correcta
- Las preguntas deben ser variadas y de dificultad media
- Responde SOLO el JSON, sin texto adicional`;

    try {
      let text = '';
      
      if (provider === 'gemini') {
        const savedModel = localStorage.getItem('gemini_working_model') || 'gemini-2.0-flash-exp';
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${savedModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
            }),
          }
        );

        if (!response.ok) throw new Error('Error en la API de Gemini');

        const data = await response.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        });

        if (!response.ok) throw new Error('Error en la API de OpenAI');

        const data = await response.json();
        text = data.choices?.[0]?.message?.content || '';
      }
      
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.questions && Array.isArray(parsed.questions)) {
            const newQuestions: Question[] = parsed.questions.map((q: any, i: number) => ({
              id: `ai_${Date.now()}_${i}`,
              question: q.question,
              options: q.options.slice(0, 4),
              correctIndex: Math.min(q.correctIndex, 3),
              timeLimit: questionTime
            }));
            // AÑADIR a las existentes en lugar de reemplazar
            setQuestions(prev => [...prev, ...newQuestions]);
            
            // Guardar en localStorage para persistencia
            const savedCategory = saveCustomCategory(aiTopic, newQuestions);
            setCustomCategories(loadCustomCategories());
            setAiSuccess(`✅ ${newQuestions.length} preguntas guardadas en "${aiTopic}"`);
            setTimeout(() => setAiSuccess(null), 4000);
            
            setIsGenerating(false);
            return;
          }
        }
      }
      throw new Error('No se pudo parsear la respuesta de la IA');
    } catch (error) {
      console.error('AI generation error:', error);
      setAiError(error instanceof Error ? error.message : 'Error generando preguntas');
    }
    setIsGenerating(false);
  };

  // OBS Triggers
  const { triggerGameStart, triggerGameEnd } = useOBSTriggers();

  const startGame = () => {
    if (questions.length === 0) return;
    
    // Incrementar contador de uso de las preguntas que se van a usar
    incrementQuestionUsage(questions.map(q => q.id));
    
    setCurrentQuestionIndex(0);
    setPlayers(new Map<string, PlayerScore>()); // Clear players for new game
    setTimeLeft(questions[0].timeLimit);
    setAnswerCounts([0, 0, 0, 0]);
    setShowCorrect(false);
    markChatMessagesRead(chatMessages, lastProcessedRef); // Reset to avoid processing old messages
    setGameState('question');
    triggerGameStart();
  };

  const nextQuestion = () => {
    if (currentQuestionIndex >= questions.length - 1) {
      setGameState('final');
      triggerGameEnd();
      return;
    }
    
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setTimeLeft(questions[nextIndex].timeLimit);
    setAnswerCounts([0, 0, 0, 0]);
    setShowCorrect(false);
    
    setPlayers((prev: Map<string, PlayerScore>) => {
      const newPlayers = new Map<string, PlayerScore>(prev);
      newPlayers.forEach((player, key) => {
        newPlayers.set(key, { ...player, answeredCurrent: false, lastAnswer: null });
      });
      return newPlayers;
    });
    
    setGameState('question');
  };

  const addManualQuestion = () => {
    if (!editingQuestion.trim() || editingOptions.filter((o: string) => o.trim()).length < 2) return;
    
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: editingQuestion,
      options: editingOptions.filter((o: string) => o.trim()),
      correctIndex: editingCorrect,
      timeLimit: editingTime
    };
    
    setQuestions((prev: Question[]) => [...prev, newQuestion]);
    setEditingQuestion('');
    setEditingOptions(['', '', '', '']);
    setEditingCorrect(0);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev: Question[]) => prev.filter((q: Question) => q.id !== id));
  };

  const pauseGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPausedTimeLeft(timeLeft);
    setGameState('paused');
  };

  const resumeGame = () => {
    setTimeLeft(pausedTimeLeft);
    setGameState('question');
  };

  const resetGame = () => {
    setGameState('setup');
    setCurrentQuestionIndex(0);
    setPlayers(new Map<string, PlayerScore>());
    setTimeLeft(0);
    setPausedTimeLeft(0);
    setAnswerCounts([0, 0, 0, 0]);
    setShowCorrect(false);
    if (timerRef.current) clearInterval(timerRef.current);
    triggerGameEnd();
  };

  const clearPlayers = () => {
    setPlayers(new Map<string, PlayerScore>());
  };

  const removePlayer = (oderId: string) => {
    setPlayers(prev => {
      const newPlayers = new Map<string, PlayerScore>(prev);
      newPlayers.delete(oderId);
      return newPlayers;
    });
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev: string[]) => 
      prev.includes(catId) 
        ? prev.filter((c: string) => c !== catId)
        : [...prev, catId]
    );
  };

  const toggleCustomCategory = (catId: string) => {
    setSelectedCustomCategories((prev: string[]) => 
      prev.includes(catId) 
        ? prev.filter((c: string) => c !== catId)
        : [...prev, catId]
    );
  };

  const handleDeleteCustomCategory = (catId: string) => {
    deleteCustomCategory(catId);
    setCustomCategories(loadCustomCategories());
    setSelectedCustomCategories(prev => prev.filter(c => c !== catId));
  };

  return (
    <div className="p-4 space-y-4">
      {/* Setup Mode */}
      {gameState === 'setup' && (
        <>
          {/* Header with OBS */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-bold text-white flex items-center gap-2">
              <HelpCircle className="text-purple-400" size={20} />
              Trivia Battle
            </span>
            <OBSOverlayUrl overlayParam="overlayTrivia" title="la trivia" />
          </div>
          
          {/* Mode Selector - Simplificado */}
          <div className="flex gap-1 bg-zinc-800 rounded-xl p-1.5">
            <button
              onClick={() => setTriviaMode('category')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                triviaMode === 'category' ? 'bg-purple-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <BookOpen size={14} /> Categorías
            </button>
            <button
              onClick={() => setTriviaMode('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                triviaMode === 'ai' ? 'bg-purple-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <Sparkles size={14} /> IA
            </button>
            <button
              onClick={() => setTriviaMode('manual')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                triviaMode === 'manual' ? 'bg-purple-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <Plus size={14} /> Manual
            </button>
          </div>

          {/* Category Mode */}
          {triviaMode === 'category' && (
            <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium text-white">Selecciona categorías</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="trivia-questions-per-category" className="text-xs text-zinc-400">Preguntas:</label>
                    <input
                      id="trivia-questions-per-category"
                      name="questionsPerCategory"
                      type="number"
                      min="1"
                      max="10"
                      value={questionsPerCategory}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestionsPerCategory(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                      className="w-12 px-2 py-1 bg-zinc-700 rounded text-white text-center text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer size={14} className="text-zinc-400" />
                    <label htmlFor="trivia-question-time-category" className="sr-only">Tiempo por pregunta</label>
                    <select
                      id="trivia-question-time-category"
                      name="questionTime"
                      aria-label="Tiempo por pregunta"
                      value={questionTime}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQuestionTime(parseInt(e.target.value))}
                      className="px-2 py-1 bg-zinc-700 rounded text-white text-sm"
                    >
                      <option value={15}>15s</option>
                      <option value={20}>20s</option>
                      <option value={25}>25s</option>
                      <option value={30}>30s</option>
                      <option value={35}>35s</option>
                      <option value={45}>45s</option>
                      <option value={60}>60s</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Default Categories */}
              <div>
                <span className="text-xs text-zinc-400 mb-2 block">Categorías (preguntas en español)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {QUESTION_BANK.map((cat: TriviaCategory) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                    >
                      {cat.icon}
                      <span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Categories (AI Generated) */}
              {customCategories.length > 0 && (
                <div>
                  <span className="text-xs text-zinc-400 mb-2 block flex items-center gap-1">
                    <Sparkles size={12} className="text-purple-400" />
                    Categorías personalizadas (IA)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {customCategories.map((cat: SavedCategory) => (
                      <div key={cat.id} className="relative group">
                        <button
                          onClick={() => toggleCustomCategory(cat.id)}
                          className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                            selectedCustomCategories.includes(cat.id)
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                              : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          }`}
                        >
                          <Sparkles size={14} />
                          <span className="truncate flex-1 text-left">{cat.name}</span>
                          <span className="text-xs opacity-70">{cat.questions.length}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomCategory(cat.id);
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Eliminar categoría"
                        >
                          <Trash2 size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Opción para enriquecer con API */}
              <div className="flex items-center gap-2 p-2 bg-zinc-700/50 rounded-lg">
                <button
                  onClick={() => setEnrichWithApi(!enrichWithApi)}
                  className={`w-8 h-4 rounded-full transition-colors ${enrichWithApi ? 'bg-cyan-500' : 'bg-zinc-600'}`}
                >
                  <div className={`w-3 h-3 rounded-full bg-white transition-transform ${enrichWithApi ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-xs text-zinc-300">Añadir preguntas online</span>
                <span className="text-[10px] text-zinc-500">(se traducen automáticamente)</span>
              </div>
              
              {loadError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-400" />
                  <span className="text-red-200 text-xs">{loadError}</span>
                </div>
              )}
              
              <button
                onClick={generateFromCategories}
                disabled={(selectedCategories.length === 0 && selectedCustomCategories.length === 0) || isLoadingQuestions}
                className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
              >
                {isLoadingQuestions ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>Generar preguntas</>
                )}
              </button>
              
              <p className="text-[10px] text-zinc-500 text-center">
                💡 Las preguntas menos usadas se priorizan automáticamente
              </p>
            </div>
          )}

          {/* AI Mode */}
          {triviaMode === 'ai' && (
            <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                <span className="text-sm font-medium text-white">Trivia con IA</span>
              </div>
              
              {(() => {
                const config = loadAIConfig();
                const providerInfo = config ? getProviderForFunction(config, 'games') : null;
                return !providerInfo ? (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={18} className="text-yellow-400 mt-0.5" />
                    <div>
                      <p className="text-yellow-200 text-sm font-medium">API de IA no configurada</p>
                      <p className="text-yellow-200/70 text-xs mt-1">
                        Ve a la pestaña "Data" → "Analytics" → "Configurar IA" para añadir tu API key de Gemini, OpenAI o Claude.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="trivia-ai-topic" className="text-xs text-zinc-400 mb-1 block">Tema de la trivia</label>
                    <input
                      id="trivia-ai-topic"
                      name="aiTopic"
                      type="text"
                      value={aiTopic}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiTopic(e.target.value)}
                      placeholder="Ej: World of Warcraft, Marvel, Historia de España..."
                      className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label htmlFor="trivia-ai-question-count" className="text-xs text-zinc-400">Preguntas:</label>
                      <input
                        id="trivia-ai-question-count"
                        name="aiQuestionCount"
                        type="number"
                        min="3"
                        max="15"
                        value={aiQuestionCount}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiQuestionCount(Math.max(3, Math.min(15, parseInt(e.target.value) || 5)))}
                        className="w-14 px-2 py-1 bg-zinc-700 rounded text-white text-center text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer size={14} className="text-zinc-400" />
                      <label htmlFor="trivia-question-time-ai" className="sr-only">Tiempo por pregunta</label>
                      <select
                        id="trivia-question-time-ai"
                        name="questionTimeAi"
                        aria-label="Tiempo por pregunta"
                        value={questionTime}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setQuestionTime(parseInt(e.target.value))}
                        className="px-2 py-1 bg-zinc-700 rounded text-white text-sm"
                      >
                        <option value={15}>15s</option>
                        <option value={20}>20s</option>
                        <option value={25}>25s</option>
                        <option value={30}>30s</option>
                        <option value={35}>35s</option>
                        <option value={45}>45s</option>
                        <option value={60}>60s</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={generateWithAI}
                      disabled={isGenerating || !aiTopic.trim()}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-lg"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Generar con IA
                        </>
                      )}
                    </button>
                  </div>
                  
                  {aiError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2">
                      <p className="text-red-300 text-xs">{aiError}</p>
                    </div>
                  )}
                  
                  {aiSuccess && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-2">
                      <p className="text-green-300 text-xs">{aiSuccess}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-zinc-500">
                    <p>💡 Ejemplos de temas:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['League of Legends', 'Anime', 'Fútbol', 'Harry Potter', 'Minecraft', 'Ciencia'].map((topic: string) => (
                        <button
                          key={topic}
                          onClick={() => setAiTopic(topic)}
                          className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              );
              })()}
            </div>
          )}

          {/* Manual Mode */}
          {triviaMode === 'manual' && (
            <div className="bg-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle size={16} className="text-purple-400" />
                <span className="text-sm font-medium text-white">Añadir Pregunta Manual</span>
              </div>
              
              <label htmlFor="trivia-manual-question" className="sr-only">Pregunta</label>
              <input
                id="trivia-manual-question"
                name="editingQuestion"
                type="text"
                value={editingQuestion}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingQuestion(e.target.value)}
                placeholder="Escribe la pregunta..."
                className="w-full px-3 py-2 bg-zinc-700 rounded-lg text-white text-sm"
              />
              
              <div className="grid grid-cols-2 gap-2">
                {editingOptions.map((opt: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingCorrect(i)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        editingCorrect === i ? 'bg-green-500 text-white' : 'bg-zinc-600 text-zinc-400'
                      }`}
                      aria-label={`Marcar opción ${i + 1} como correcta`}
                    >
                      {i + 1}
                    </button>
                    <label htmlFor={`trivia-option-${i}`} className="sr-only">Opción {i + 1}</label>
                    <input
                      id={`trivia-option-${i}`}
                      name={`editingOption${i}`}
                      type="text"
                      value={opt}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newOpts = [...editingOptions];
                        newOpts[i] = e.target.value;
                        setEditingOptions(newOpts);
                      }}
                      placeholder={`Opción ${i + 1}`}
                      className="flex-1 px-2 py-1 bg-zinc-700 rounded text-white text-sm"
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer size={14} className="text-zinc-400" />
                  <label htmlFor="trivia-manual-time" className="sr-only">Tiempo en segundos</label>
                  <input
                    id="trivia-manual-time"
                    name="editingTime"
                    type="number"
                    min="5"
                    max="60"
                    value={editingTime}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTime(parseInt(e.target.value) || 15)}
                    className="w-14 px-2 py-1 bg-zinc-700 rounded text-white text-center text-sm"
                    aria-label="Tiempo en segundos"
                  />
                  <span className="text-zinc-500 text-xs">seg</span>
                </div>
                <button
                  onClick={addManualQuestion}
                  disabled={!editingQuestion.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg"
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          {questions.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-zinc-300">{questions.length} preguntas listas</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuestions([])}
                    className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={startGame}
                    className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold rounded-lg"
                  >
                    <Play size={16} /> ¡Empezar!
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {questions.map((q: Question, i: number) => (
                  <div key={q.id} className="flex items-center gap-2 bg-zinc-700/50 rounded-lg p-2">
                    <span className="text-xs text-zinc-500 w-6">{i + 1}.</span>
                    <span className="flex-1 text-sm text-zinc-300 truncate">{q.question}</span>
                    <span className="text-xs text-zinc-500">{q.timeLimit}s</span>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Player List in Setup */}
          {playersArray.length > 0 && (
            <div className="bg-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <Users size={16} className="text-purple-400" />
                  {playersArray.length} jugadores
                </span>
                <button
                  onClick={clearPlayers}
                  className="flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg"
                >
                  <Trash2 size={12} /> Limpiar todos
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {sortedPlayers.map((player: PlayerScore, i: number) => (
                  <div
                    key={player.oderId}
                    className="flex items-center gap-2 px-2 py-1 bg-zinc-700/50 rounded-lg"
                  >
                    <span className="text-xs" style={{ color: player.color }}>
                      {i === 0 && player.score > 0 ? '👑 ' : ''}{player.username}
                    </span>
                    <span className="text-xs text-purple-400">{player.score}</span>
                    <button
                      onClick={() => removePlayer(player.oderId)}
                      className="p-0.5 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded transition-colors"
                      title="Eliminar jugador"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Question Mode */}
      {(gameState === 'question' || gameState === 'results') && currentQuestion && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm">
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={pauseGame}
                className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30"
              >
                <Pause size={14} /> Pausar
              </button>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'
              }`}>
                <Timer size={16} className="text-white" />
                <span className="text-white font-bold">{timeLeft}s</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4">
            <p className="text-white text-lg font-bold text-center mb-4">
              {currentQuestion.question}
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.options.map((option: string, i: number) => {
                const isCorrect = i === currentQuestion.correctIndex;
                const percentage = totalAnswers > 0 ? Math.round((answerCounts[i] / totalAnswers) * 100) : 0;
                const optionLetter = ['A', 'B', 'C', 'D'][i];
                
                return (
                  <div
                    key={i}
                    className={`relative p-3 rounded-lg transition-all ${
                      showCorrect
                        ? isCorrect
                          ? 'bg-green-500/30 ring-2 ring-green-400'
                          : 'bg-zinc-700/50 opacity-60'
                        : 'bg-zinc-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        showCorrect && isCorrect ? 'bg-green-500' : 'bg-zinc-600'
                      } text-white`}>
                        {showCorrect && isCorrect ? <Check size={14} /> : optionLetter}
                      </span>
                      <span className="text-white text-sm flex-1">{option}</span>
                      {showCorrect && (
                        <span className="text-xs text-zinc-400">{answerCounts[i]} ({percentage}%)</span>
                      )}
                    </div>
                    {showCorrect && (
                      <div 
                        className={`absolute bottom-0 left-0 h-1 rounded-b-lg transition-all ${
                          isCorrect ? 'bg-green-500' : 'bg-zinc-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            
            <p className="text-center text-zinc-400 text-xs mt-3">
              Responde con <code className="bg-zinc-700 px-1 rounded">A</code> <code className="bg-zinc-700 px-1 rounded">B</code> <code className="bg-zinc-700 px-1 rounded">C</code> <code className="bg-zinc-700 px-1 rounded">D</code>
            </p>
          </div>

          {gameState === 'results' && (
            <div className="flex justify-center">
              <button
                onClick={nextQuestion}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white font-bold rounded-lg"
              >
                {currentQuestionIndex >= questions.length - 1 ? 'Ver Resultados' : 'Siguiente Pregunta'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Paused State */}
      {gameState === 'paused' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
          <div className="text-5xl mb-3">⏸️</div>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">Juego Pausado</h3>
          <p className="text-zinc-400 mb-4">
            Pregunta {currentQuestionIndex + 1} de {questions.length} • 
            {sortedPlayers[0]?.username ? ` ${sortedPlayers[0].username} lidera con ${sortedPlayers[0].score} pts` : ' Sin jugadores aún'}
          </p>
          <div className="flex justify-center gap-3">
            <button 
              onClick={resumeGame} 
              className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors"
            >
              <Play size={20} /> Continuar Jugando
            </button>
            <button 
              onClick={resetGame} 
              className="flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-medium rounded-xl transition-colors"
            >
              <RotateCcw size={20} /> Volver al Inicio
            </button>
          </div>
        </div>
      )}

      {/* Final Results */}
      {gameState === 'final' && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy size={24} className="text-yellow-400" />
            <span className="text-xl font-bold text-white">¡Resultados Finales!</span>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sortedPlayers.slice(0, 10).map((player: PlayerScore, i: number) => (
              <div
                key={player.oderId}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  i === 0 ? 'bg-yellow-500/30' : i === 1 ? 'bg-zinc-400/20' : i === 2 ? 'bg-orange-700/20' : 'bg-zinc-700/30'
                }`}
              >
                <span className="text-lg w-8">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span className="flex-1 font-medium" style={{ color: player.color }}>
                  {player.username}
                </span>
                <span className="text-yellow-400 font-bold">{player.score} pts</span>
              </div>
            ))}
          </div>
          
          <button
            onClick={resetGame}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg"
          >
            <RotateCcw size={16} /> Nueva Partida
          </button>
        </div>
      )}

      {/* Live Leaderboard */}
      {(gameState === 'question' || gameState === 'results' || gameState === 'paused') && sortedPlayers.length > 0 && (
        <div className="bg-zinc-800/50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-xs font-medium text-zinc-400">Top 5</span>
            </div>
            {gameState === 'paused' && (
              <button
                onClick={clearPlayers}
                className="flex items-center gap-1 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg"
              >
                <Trash2 size={10} /> Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedPlayers.slice(0, 5).map((player: PlayerScore, i: number) => (
              <div
                key={player.oderId}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                style={{ backgroundColor: player.color + '30', color: player.color }}
              >
                {i === 0 ? '👑' : ''} {player.username}: {player.score}
                {player.streak > 1 && <span className="text-yellow-400"> 🔥{player.streak}</span>}
                {gameState === 'paused' && (
                  <button
                    onClick={() => removePlayer(player.oderId)}
                    className="ml-1 p-0.5 hover:bg-red-500/30 text-zinc-400 hover:text-red-400 rounded transition-colors"
                    title="Eliminar jugador"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TriviaBattle;
