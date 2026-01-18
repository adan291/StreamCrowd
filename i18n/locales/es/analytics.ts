/**
 * Spanish translations for Analytics and Metrics feature
 * 
 * Contains all translations related to stream analytics, metrics dashboard,
 * AI-powered insights, session history, and data export functionality.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 */

import type { AnalyticsTranslations } from '../../types';

export const analytics: AnalyticsTranslations = {
  // Main analytics dashboard
  title: 'Analytics del Stream',
  configureAI: 'Configurar IA',
  aiActive: 'Activa',
  noData: 'Sin datos disponibles',
  
  // View modes
  live: 'En vivo',
  history: 'Historial',
  
  // Session information
  activeSession: 'Sesión activa',
  noActiveStream: 'No hay stream activo',
  connectToSee: 'Conecta a un canal para ver analytics en vivo',
  
  // Viewer metrics
  uniqueViewers: 'Viewers únicos',
  messages: 'Mensajes',
  
  // Sentiment analysis
  positive: 'Positivo',
  neutral: 'Neutral',
  negative: 'Negativo',
  
  // Engagement metrics
  engagement: 'Engagement',
  mainTopics: 'Temas principales',
  frequentWords: 'Palabras frecuentes',
  mostUsedEmotes: 'Emotes más usados',
  mostActiveViewers: 'Viewers más activos',
  
  // Message statistics
  msgs: 'msgs',
  sessionsThisDay: 'sesión(es) este día',
  totalMessages: 'Total mensajes',
  noSessionsDate: 'No hay sesiones para esta fecha',
  
  // Data export
  exportData: 'Exportar datos',
  
  // Loading states
  loading: 'Cargando...',
};
