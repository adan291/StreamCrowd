// Centralized Chat Analysis Service
// Used by both StreamAnalytics and AIVisionMascot

import { TwitchMessage } from '../types';

// ============ TYPES ============

export interface ChatMetrics {
  // Basic counts
  totalMessages: number;
  uniqueUsers: number;
  messagesPerMinute: number;
  avgWordsPerMessage: number;
  
  // Sentiment
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  sentimentIntensity: number; // 0 to 100
  
  // Engagement
  engagementScore: number; // 0 to 100
  activityLevel: 'dead' | 'low' | 'moderate' | 'high' | 'explosive';
  
  // Top data
  topUsers: { username: string; count: number }[];
  topWords: { word: string; count: number }[];
  topEmotes: { emote: string; count: number }[];
  
  // Trends
  isGrowing: boolean;
  peakActivity: number;
  growthRate: number; // % change in activity
  
  // Special detections
  specialMood: 'love' | 'hype' | 'angry' | 'sad' | 'surprised' | null;
  
  // Advanced metrics
  chatVelocity: number; // msgs per second in last minute
  userRetention: number; // % of users who sent 2+ messages
  responseRate: number; // estimated conversation rate
  peakHour: string | null; // hour with most activity
  dominantLanguage: 'es' | 'en' | 'mixed';
  spamScore: number; // 0-100, higher = more spam-like
  diversityIndex: number; // 0-1, vocabulary diversity
}

export interface TimeSlotData {
  timestamp: number;
  time: string;
  messages: number;
  sentiment: number;
  users: number;
}

// ============ PATTERNS ============

// Expanded sentiment patterns (Spanish + English + Emotes)
const POSITIVE_PATTERNS = [
  // English
  /\b(pog|poggers|pogchamp|hype|gg|nice|amazing|love|great|awesome|lol|lmao|goat|based|w\b|dub|lets\s*go|fire|sick|insane|clutch|clean|ez|ggwp|godlike|legendary)\b/gi,
  // Spanish
  /\b(genial|increíble|vamos|bien|bueno|excelente|crack|goat|jaja|xd|ole|bravo|grande|máquina|bestia|capo|ídolo|fenómeno|brutal|épico)\b/gi,
  // Emotes & Emojis
  /(❤️|💜|💕|🎉|👏|🔥|💪|🙌|😍|🥳|✨|⭐|💯|👍|😂|🤣|😊|😄|💖|🫶)+/g,
  // Twitch emotes
  /\b(Kappa|PogChamp|LUL|KEKW|OMEGALUL|4Head|EZ|Kreygasm|HeyGuys|VoHiYo|POGGERS|widepeepoHappy|peepoHappy|Clap|catJAM|pepeD|HYPERS)\b/gi,
];

const NEGATIVE_PATTERNS = [
  // English
  /\b(bad|terrible|hate|worst|boring|sad|rip|fail|trash|cringe|L\b|ratio|dead|mid|cope|mald|malding|pepega|braindead|throw|choke)\b/gi,
  // Spanish
  /\b(basura|aburrido|malo|horrible|fatal|asco|mierda|pésimo|nefasto|desastre|vergüenza|patético)\b/gi,
  // Emotes & Emojis
  /(😢|😭|💔|👎|😡|🤬|😤|😠|💀|☠️|🗑️|😴|😒|🙄)+/g,
  // Twitch emotes
  /\b(BibleThump|PepeHands|Sadge|peepoSad|FeelsBadMan|NotLikeThis|ResidentSleeper|DansGame|WutFace|cmonBruh|haHAA|WeirdChamp|COPIUM)\b/gi,
];

const EXCITEMENT_PATTERNS = [
  /[A-Z]{4,}/g, // CAPS
  /!{2,}/g, // Multiple exclamations
  /\?{2,}/g, // Multiple questions
  /(.)\1{3,}/g, // Repeated characters (aaaa, oooo)
  /\b(omg|wtf|wow|insane|crazy|loco|dios|madre|hostia)\b/gi,
];

const SPECIAL_MOOD_PATTERNS = {
  love: /❤️|💜|💕|💖|love|te\s*amo|<3|amor|te\s*quiero|🫶|😍|💗/gi,
  hype: /🔥|HYPE|LET'S\s*GO|VAMOS|POG|INSANE|CRAZY|OMG|WOW|😱|🤯|🚀/gi,
  angry: /😡|🤬|angry|mad|furioso|enojado|hate|odio|rage|mald/gi,
  sad: /😢|😭|💔|sad|triste|rip|F\b|press\s*f|sadge|peeposad/gi,
  surprised: /😱|🤯|wtf|omg|no\s*way|que|increíble|what|wow|holy/gi,
};

// Common stop words to filter from word cloud
const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'en', 'que', 'es', 'y', 'a', 'por', 'con', 'para', 'no', 'se', 'si', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'ha', 'me', 'del', 'son', 'muy', 'sin', 'sobre', 'ser', 'tiene', 'también', 'fue', 'hay', 'está', 'cuando', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar', 'estas', 'algunas', 'algo', 'nosotros',
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also'
]);

// ============ ANALYSIS FUNCTIONS ============

/**
 * Main analysis function - analyzes chat messages and returns comprehensive metrics
 */
export function analyzeChat(
  messages: TwitchMessage[] | { username: string; message: string; timestamp?: number }[],
  sessionStartTime?: number
): ChatMetrics {
  if (messages.length === 0) {
    return getEmptyMetrics();
  }

  const now = Date.now();
  const startTime = sessionStartTime || (messages[0] as any).timestamp || now - 300000;
  const durationMinutes = Math.max(1, (now - startTime) / 60000);

  // Basic counts
  const userCounts = new Map<string, number>();
  const wordCounts = new Map<string, number>();
  const emoteCounts = new Map<string, number>();
  
  let positiveScore = 0;
  let negativeScore = 0;
  let excitementScore = 0;
  let totalWords = 0;

  // Process each message
  messages.forEach(msg => {
    const text = msg.message;
    const username = msg.username.toLowerCase();
    
    // User counts
    userCounts.set(username, (userCounts.get(username) || 0) + 1);
    
    // Word analysis
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    totalWords += words.length;
    
    words.forEach(word => {
      // Skip URLs, mentions, commands
      if (word.startsWith('http') || word.startsWith('@') || word.startsWith('!') || word.startsWith('+')) return;
      if (STOP_WORDS.has(word)) return;
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    // Emote detection (Twitch emotes pattern)
    const emotePattern = /\b([A-Z][a-z]+[A-Z][a-zA-Z]*|[A-Z]{2,}[a-z]+|pepe\w+|Pog\w*|KEKW|LUL|OMEGALUL)\b/g;
    const emotes = text.match(emotePattern);
    if (emotes) {
      emotes.forEach(emote => {
        emoteCounts.set(emote, (emoteCounts.get(emote) || 0) + 1);
      });
    }
    
    // Sentiment scoring
    POSITIVE_PATTERNS.forEach(p => {
      const matches = text.match(p);
      if (matches) positiveScore += matches.length;
    });
    
    NEGATIVE_PATTERNS.forEach(p => {
      const matches = text.match(p);
      if (matches) negativeScore += matches.length;
    });
    
    EXCITEMENT_PATTERNS.forEach(p => {
      const matches = text.match(p);
      if (matches) excitementScore += matches.length;
    });
  });

  // Calculate metrics
  const totalMessages = messages.length;
  const uniqueUsers = userCounts.size;
  const messagesPerMinute = totalMessages / durationMinutes;
  const avgWordsPerMessage = totalWords / Math.max(1, totalMessages);

  // Sentiment calculation
  const sentimentRaw = positiveScore - negativeScore;
  const sentimentDivisor = Math.max(1, positiveScore + negativeScore);
  const sentimentScore = Math.max(-1, Math.min(1, sentimentRaw / sentimentDivisor));
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (sentimentScore > 0.2) sentiment = 'positive';
  else if (sentimentScore < -0.2) sentiment = 'negative';

  // Intensity (0-100) based on emotional content and activity
  const emotionalDensity = (positiveScore + negativeScore + excitementScore) / Math.max(1, totalMessages);
  const activityFactor = Math.min(1, messagesPerMinute / 10); // Normalize to 10 msgs/min = 100%
  const sentimentIntensity = Math.min(100, Math.round((emotionalDensity * 50) + (activityFactor * 50)));

  // Engagement score
  const avgMsgsPerUser = totalMessages / Math.max(1, uniqueUsers);
  const engagementScore = Math.min(100, Math.round(
    (avgMsgsPerUser * 15) + // Participation depth
    (uniqueUsers * 2) + // User diversity
    (excitementScore * 3) + // Excitement
    (activityFactor * 20) // Activity level
  ));

  // Activity level
  let activityLevel: ChatMetrics['activityLevel'] = 'dead';
  if (messagesPerMinute > 20) activityLevel = 'explosive';
  else if (messagesPerMinute > 10) activityLevel = 'high';
  else if (messagesPerMinute > 3) activityLevel = 'moderate';
  else if (messagesPerMinute > 0.5) activityLevel = 'low';

  // Top users
  const topUsers = Array.from(userCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, count]) => ({ username, count }));

  // Top words
  const topWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  // Top emotes
  const topEmotes = Array.from(emoteCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([emote, count]) => ({ emote, count }));

  // Special mood detection
  const specialMood = detectSpecialMood(messages.slice(-30));

  // Trend detection (compare first half vs second half)
  const midpoint = Math.floor(messages.length / 2);
  const firstHalf = messages.slice(0, midpoint);
  const secondHalf = messages.slice(midpoint);
  const isGrowing = secondHalf.length > firstHalf.length * 1.2;
  const growthRate = firstHalf.length > 0 
    ? Math.round(((secondHalf.length - firstHalf.length) / firstHalf.length) * 100)
    : 0;

  // Advanced metrics
  
  // Chat velocity (messages in last 60 seconds)
  const recentMessages = messages.filter(m => {
    const ts = (m as any).timestamp;
    return ts && (now - ts) < 60000;
  });
  const chatVelocity = Math.round((recentMessages.length / 60) * 100) / 100;

  // User retention (users with 2+ messages)
  const retainedUsers = Array.from(userCounts.values()).filter(c => c >= 2).length;
  const userRetention = uniqueUsers > 0 ? Math.round((retainedUsers / uniqueUsers) * 100) : 0;

  // Response rate (estimate based on message timing patterns)
  const responseRate = Math.min(100, Math.round(avgMsgsPerUser * 20));

  // Peak hour detection
  const hourCounts = new Map<number, number>();
  messages.forEach(m => {
    const ts = (m as any).timestamp;
    if (ts) {
      const hour = new Date(ts).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
  });
  const peakHourEntry = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakHourEntry ? `${peakHourEntry[0]}:00` : null;

  // Language detection
  const spanishWords = ['que', 'de', 'el', 'la', 'en', 'es', 'no', 'si', 'por', 'con', 'jaja', 'vamos'];
  const englishWords = ['the', 'is', 'are', 'you', 'lol', 'nice', 'good', 'yes', 'no', 'what'];
  let spanishCount = 0, englishCount = 0;
  messages.forEach(m => {
    const words = m.message.toLowerCase().split(/\s+/);
    words.forEach(w => {
      if (spanishWords.includes(w)) spanishCount++;
      if (englishWords.includes(w)) englishCount++;
    });
  });
  const dominantLanguage: 'es' | 'en' | 'mixed' = 
    spanishCount > englishCount * 1.5 ? 'es' :
    englishCount > spanishCount * 1.5 ? 'en' : 'mixed';

  // Spam score (repetitive messages, short messages, same user flooding)
  const messageCounts = new Map<string, number>();
  let shortMessages = 0;
  messages.forEach(m => {
    const normalized = m.message.toLowerCase().trim();
    messageCounts.set(normalized, (messageCounts.get(normalized) || 0) + 1);
    if (m.message.length < 5) shortMessages++;
  });
  const duplicateRatio = Array.from(messageCounts.values()).filter(c => c > 2).length / Math.max(1, messageCounts.size);
  const shortRatio = shortMessages / Math.max(1, totalMessages);
  const topUserRatio = topUsers[0] ? topUsers[0].count / totalMessages : 0;
  const spamScore = Math.min(100, Math.round((duplicateRatio * 40) + (shortRatio * 30) + (topUserRatio * 30)));

  // Vocabulary diversity (unique words / total words)
  const diversityIndex = totalWords > 0 ? Math.round((wordCounts.size / totalWords) * 100) / 100 : 0;

  return {
    totalMessages,
    uniqueUsers,
    messagesPerMinute: Math.round(messagesPerMinute * 10) / 10,
    avgWordsPerMessage: Math.round(avgWordsPerMessage * 10) / 10,
    sentiment,
    sentimentScore: Math.round(sentimentScore * 100) / 100,
    sentimentIntensity,
    engagementScore,
    activityLevel,
    topUsers,
    topWords,
    topEmotes,
    isGrowing,
    peakActivity: messagesPerMinute,
    growthRate,
    specialMood,
    chatVelocity,
    userRetention,
    responseRate,
    peakHour,
    dominantLanguage,
    spamScore,
    diversityIndex,
  };
}

/**
 * Detect special mood from recent messages
 */
function detectSpecialMood(messages: { message: string }[]): ChatMetrics['specialMood'] {
  if (messages.length < 5) return null;
  
  const allText = messages.map(m => m.message).join(' ');
  
  const moodScores: Record<string, number> = {
    love: 0,
    hype: 0,
    angry: 0,
    sad: 0,
    surprised: 0,
  };
  
  Object.entries(SPECIAL_MOOD_PATTERNS).forEach(([mood, pattern]) => {
    const matches = allText.match(pattern);
    if (matches) moodScores[mood] = matches.length;
  });
  
  // Find dominant mood (needs at least 3 matches)
  const maxMood = Object.entries(moodScores).reduce((a, b) => a[1] > b[1] ? a : b);
  if (maxMood[1] >= 3) {
    return maxMood[0] as ChatMetrics['specialMood'];
  }
  
  return null;
}

/**
 * Generate time series data for charts
 */
export function generateTimeSeries(
  messages: { message: string; timestamp: number; username: string }[],
  slotDurationMs: number = 60000
): TimeSlotData[] {
  if (messages.length === 0) return [];

  const slots = new Map<number, { messages: number; sentiment: number; users: Set<string> }>();

  messages.forEach(msg => {
    const slot = Math.floor(msg.timestamp / slotDurationMs) * slotDurationMs;
    const existing = slots.get(slot) || { messages: 0, sentiment: 0, users: new Set<string>() };
    
    existing.messages++;
    existing.users.add(msg.username);
    
    // Quick sentiment check
    let msgSentiment = 0;
    POSITIVE_PATTERNS.forEach(p => { if (msg.message.match(p)) msgSentiment += 1; });
    NEGATIVE_PATTERNS.forEach(p => { if (msg.message.match(p)) msgSentiment -= 1; });
    existing.sentiment += msgSentiment;
    
    slots.set(slot, existing);
  });

  return Array.from(slots.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-60) // Last 60 slots
    .map(([timestamp, data]) => ({
      timestamp,
      time: new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      messages: data.messages,
      sentiment: Math.max(-1, Math.min(1, data.sentiment / Math.max(1, data.messages))),
      users: data.users.size,
    }));
}

/**
 * Get empty metrics object
 */
function getEmptyMetrics(): ChatMetrics {
  return {
    totalMessages: 0,
    uniqueUsers: 0,
    messagesPerMinute: 0,
    avgWordsPerMessage: 0,
    sentiment: 'neutral',
    sentimentScore: 0,
    sentimentIntensity: 0,
    engagementScore: 0,
    activityLevel: 'dead',
    topUsers: [],
    topWords: [],
    topEmotes: [],
    isGrowing: false,
    peakActivity: 0,
    growthRate: 0,
    specialMood: null,
    chatVelocity: 0,
    userRetention: 0,
    responseRate: 0,
    peakHour: null,
    dominantLanguage: 'mixed',
    spamScore: 0,
    diversityIndex: 0,
  };
}

/**
 * Get activity level label in Spanish
 */
export function getActivityLabel(level: ChatMetrics['activityLevel']): string {
  const labels = {
    dead: '💤 Sin actividad',
    low: '🐢 Baja',
    moderate: '👍 Moderada',
    high: '🔥 Alta',
    explosive: '🚀 Explosiva',
  };
  return labels[level];
}

/**
 * Get sentiment emoji
 */
export function getSentimentEmoji(sentiment: ChatMetrics['sentiment']): string {
  const emojis = {
    positive: '😊',
    neutral: '😐',
    negative: '😔',
  };
  return emojis[sentiment];
}


/**
 * Generate executive summary for a session
 */
export function generateSummary(metrics: ChatMetrics): string {
  const lines: string[] = [];
  
  // Activity summary
  if (metrics.activityLevel === 'explosive') {
    lines.push('🚀 Sesión EXPLOSIVA con altísima actividad');
  } else if (metrics.activityLevel === 'high') {
    lines.push('🔥 Sesión muy activa con gran participación');
  } else if (metrics.activityLevel === 'moderate') {
    lines.push('👍 Sesión con actividad moderada');
  } else if (metrics.activityLevel === 'low') {
    lines.push('🐢 Sesión tranquila con poca actividad');
  } else {
    lines.push('💤 Sesión con muy poca actividad');
  }
  
  // Engagement
  if (metrics.engagementScore > 70) {
    lines.push(`💜 Engagement excepcional (${metrics.engagementScore}%)`);
  } else if (metrics.engagementScore > 40) {
    lines.push(`👏 Buen nivel de engagement (${metrics.engagementScore}%)`);
  }
  
  // Sentiment
  if (metrics.sentiment === 'positive') {
    lines.push(`😊 Ambiente positivo (score: ${metrics.sentimentScore.toFixed(2)})`);
  } else if (metrics.sentiment === 'negative') {
    lines.push(`😔 Ambiente tenso (score: ${metrics.sentimentScore.toFixed(2)})`);
  }
  
  // Growth
  if (metrics.growthRate > 20) {
    lines.push(`📈 Crecimiento notable (+${metrics.growthRate}%)`);
  } else if (metrics.growthRate < -20) {
    lines.push(`📉 Descenso de actividad (${metrics.growthRate}%)`);
  }
  
  // Retention
  if (metrics.userRetention > 50) {
    lines.push(`🎯 Alta retención de usuarios (${metrics.userRetention}%)`);
  }
  
  // Spam warning
  if (metrics.spamScore > 50) {
    lines.push(`⚠️ Alto nivel de spam detectado (${metrics.spamScore})`);
  }
  
  return lines.join('\n');
}

/**
 * Calculate health score for the chat (0-100)
 */
export function calculateHealthScore(metrics: ChatMetrics): number {
  let score = 50; // Base score
  
  // Activity contribution (0-20)
  const activityScores = { dead: 0, low: 5, moderate: 10, high: 15, explosive: 20 };
  score += activityScores[metrics.activityLevel];
  
  // Engagement contribution (0-20)
  score += Math.min(20, metrics.engagementScore / 5);
  
  // Sentiment contribution (-10 to +10)
  score += metrics.sentimentScore * 10;
  
  // Diversity bonus (0-10)
  score += metrics.diversityIndex * 10;
  
  // Spam penalty (0 to -20)
  score -= metrics.spamScore / 5;
  
  // Retention bonus (0-10)
  score += metrics.userRetention / 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get insights and recommendations
 */
export function getInsights(metrics: ChatMetrics): { type: 'success' | 'warning' | 'info'; message: string }[] {
  const insights: { type: 'success' | 'warning' | 'info'; message: string }[] = [];
  
  // Positive insights
  if (metrics.engagementScore > 70) {
    insights.push({ type: 'success', message: '¡Excelente engagement! La audiencia está muy participativa.' });
  }
  if (metrics.userRetention > 60) {
    insights.push({ type: 'success', message: 'Alta retención: los usuarios vuelven a participar.' });
  }
  if (metrics.diversityIndex > 0.3) {
    insights.push({ type: 'success', message: 'Conversaciones variadas y ricas en vocabulario.' });
  }
  if (metrics.growthRate > 30) {
    insights.push({ type: 'success', message: '¡El chat está creciendo rápidamente!' });
  }
  
  // Warnings
  if (metrics.spamScore > 40) {
    insights.push({ type: 'warning', message: 'Detectado contenido repetitivo. Considera moderar.' });
  }
  if (metrics.sentiment === 'negative' && metrics.sentimentIntensity > 50) {
    insights.push({ type: 'warning', message: 'Ambiente negativo detectado. Atención a la moderación.' });
  }
  if (metrics.userRetention < 20 && metrics.uniqueUsers > 10) {
    insights.push({ type: 'warning', message: 'Baja retención: usuarios no vuelven a participar.' });
  }
  
  // Info/Tips
  if (metrics.activityLevel === 'low' || metrics.activityLevel === 'dead') {
    insights.push({ type: 'info', message: 'Tip: Haz preguntas al chat para aumentar participación.' });
  }
  if (metrics.avgWordsPerMessage < 3) {
    insights.push({ type: 'info', message: 'Mensajes muy cortos. Fomenta conversaciones más largas.' });
  }
  
  return insights.slice(0, 4); // Max 4 insights
}

/**
 * Compare two sessions
 */
export function compareSessions(current: ChatMetrics, previous: ChatMetrics): {
  metric: string;
  current: number;
  previous: number;
  change: number;
  improved: boolean;
}[] {
  return [
    {
      metric: 'Mensajes/min',
      current: current.messagesPerMinute,
      previous: previous.messagesPerMinute,
      change: previous.messagesPerMinute > 0 
        ? Math.round(((current.messagesPerMinute - previous.messagesPerMinute) / previous.messagesPerMinute) * 100)
        : 0,
      improved: current.messagesPerMinute > previous.messagesPerMinute,
    },
    {
      metric: 'Engagement',
      current: current.engagementScore,
      previous: previous.engagementScore,
      change: previous.engagementScore > 0
        ? Math.round(((current.engagementScore - previous.engagementScore) / previous.engagementScore) * 100)
        : 0,
      improved: current.engagementScore > previous.engagementScore,
    },
    {
      metric: 'Usuarios',
      current: current.uniqueUsers,
      previous: previous.uniqueUsers,
      change: previous.uniqueUsers > 0
        ? Math.round(((current.uniqueUsers - previous.uniqueUsers) / previous.uniqueUsers) * 100)
        : 0,
      improved: current.uniqueUsers > previous.uniqueUsers,
    },
    {
      metric: 'Sentimiento',
      current: Math.round(current.sentimentScore * 100),
      previous: Math.round(previous.sentimentScore * 100),
      change: Math.round((current.sentimentScore - previous.sentimentScore) * 100),
      improved: current.sentimentScore > previous.sentimentScore,
    },
  ];
}
