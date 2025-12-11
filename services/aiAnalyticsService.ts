// AI Analytics Service - Analyzes chat and generates stream insights

export interface AIConfig {
  provider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  enabled: boolean;
}

export interface ChatAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  engagement: number; // 0-100
  peakMoments: PeakMoment[];
  wordCloud: WordFrequency[];
  emoteUsage: EmoteStats[];
  viewerInteraction: ViewerInteractionStats;
}

export interface PeakMoment {
  timestamp: number;
  messageCount: number;
  topMessage: string;
  sentiment: string;
}

export interface WordFrequency {
  word: string;
  count: number;
}

export interface EmoteStats {
  emote: string;
  count: number;
  percentage: number;
}

export interface ViewerInteractionStats {
  uniqueViewers: number;
  totalMessages: number;
  avgMessagesPerViewer: number;
  mostActiveViewers: { username: string; messageCount: number }[];
  newViewers: number;
  returningViewers: number;
}

export interface StreamSession {
  id: string;
  channelName: string;
  startTime: number;
  endTime?: number;
  messages: StoredMessage[];
  analysis?: ChatAnalysis;
  pollResults?: PollSummary[];
}

export interface StoredMessage {
  username: string;
  message: string;
  timestamp: number;
  userId?: string;
}

export interface PollSummary {
  question: string;
  winner: string;
  totalVotes: number;
  options: { label: string; votes: number; percentage: number }[];
}

export interface DailyInsight {
  date: string;
  sessions: StreamSession[];
  aggregatedAnalysis?: ChatAnalysis;
}

const STORAGE_KEY = 'twitch_ai_config';
const SESSIONS_KEY = 'twitch_stream_sessions';

// Get API key from environment variable (more secure) or localStorage
const getEnvApiKey = (): string | null => {
  // Vite exposes env variables with VITE_ prefix
  return import.meta.env.VITE_GEMINI_API_KEY || null;
};

// Save/Load AI Config
export const saveAIConfig = (config: AIConfig): void => {
  // Don't save API key to localStorage if it's from env
  const envKey = getEnvApiKey();
  const configToSave = envKey && config.apiKey === envKey 
    ? { ...config, apiKey: '' } // Don't duplicate env key in storage
    : config;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
};

export const loadAIConfig = (): AIConfig | null => {
  const envKey = getEnvApiKey();
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    try {
      const config = JSON.parse(stored);
      // Prefer env key over stored key
      if (envKey) {
        config.apiKey = envKey;
      }
      return config;
    } catch {
      return envKey ? { provider: 'gemini', apiKey: envKey, enabled: true } : null;
    }
  }
  
  // If no stored config but env key exists, create default config
  if (envKey) {
    return { provider: 'gemini', apiKey: envKey, enabled: true };
  }
  
  return null;
};

export const clearAIConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// Check if using env-based API key
export const isUsingEnvKey = (): boolean => {
  return !!getEnvApiKey();
};

// Session Management
export const createSession = (channelName: string): StreamSession => {
  return {
    id: `session_${Date.now()}`,
    channelName,
    startTime: Date.now(),
    messages: [],
    pollResults: [],
  };
};

export const saveSession = (session: StreamSession): void => {
  const sessions = loadAllSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }
  // Keep only last 30 sessions
  const trimmed = sessions.slice(-30);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(trimmed));
};

export const loadAllSessions = (): StreamSession[] => {
  const stored = localStorage.getItem(SESSIONS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const getSessionsByDate = (date: string): StreamSession[] => {
  const sessions = loadAllSessions();
  return sessions.filter(s => {
    const sessionDate = new Date(s.startTime).toISOString().split('T')[0];
    return sessionDate === date;
  });
};

// Local Analysis (without AI)
export const analyzeLocally = (messages: StoredMessage[]): ChatAnalysis => {
  const wordCounts = new Map<string, number>();
  const emoteCounts = new Map<string, number>();
  const userMessageCounts = new Map<string, number>();
  const uniqueUsers = new Set<string>();
  
  // Common Twitch emotes pattern
  const emotePattern = /\b(Kappa|PogChamp|LUL|KEKW|Pepega|monkaS|OMEGALUL|PepeHands|FeelsBadMan|FeelsGoodMan|4Head|EZ|Jebaited|NotLikeThis|ResidentSleeper|BibleThump|Kreygasm|HeyGuys|VoHiYo|CoolStoryBob|DansGame|WutFace|cmonBruh|TriHard|haHAA|Clap|POGGERS|widepeepoHappy|peepoSad|Sadge|copium|COPIUM)\b/gi;
  
  // Positive/negative word lists (Spanish + English)
  const positiveWords = ['genial', 'increíble', 'wow', 'amazing', 'love', 'great', 'awesome', 'nice', 'good', 'best', 'gg', 'pog', 'hype', 'lets go', 'vamos', 'bien', 'bueno', 'excelente', 'crack', 'goat'];
  const negativeWords = ['bad', 'terrible', 'hate', 'worst', 'boring', 'aburrido', 'malo', 'fail', 'rip', 'f', 'sad', 'trash', 'basura'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Time-based analysis for peak moments
  const timeSlots = new Map<number, { count: number; messages: string[] }>();
  const slotDuration = 60000; // 1 minute slots
  
  messages.forEach(msg => {
    uniqueUsers.add(msg.username);
    userMessageCounts.set(msg.username, (userMessageCounts.get(msg.username) || 0) + 1);
    
    // Word frequency
    const words = msg.message.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 2 && !word.startsWith('+')) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    });
    
    // Emote detection
    const emotes = msg.message.match(emotePattern);
    if (emotes) {
      emotes.forEach(emote => {
        emoteCounts.set(emote, (emoteCounts.get(emote) || 0) + 1);
      });
    }
    
    // Sentiment
    const lowerMsg = msg.message.toLowerCase();
    if (positiveWords.some(w => lowerMsg.includes(w))) positiveCount++;
    if (negativeWords.some(w => lowerMsg.includes(w))) negativeCount++;
    
    // Time slots
    const slot = Math.floor(msg.timestamp / slotDuration) * slotDuration;
    const slotData = timeSlots.get(slot) || { count: 0, messages: [] };
    slotData.count++;
    slotData.messages.push(msg.message);
    timeSlots.set(slot, slotData);
  });
  
  // Calculate sentiment
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  if (positiveCount > negativeCount * 1.5) sentiment = 'positive';
  else if (negativeCount > positiveCount * 1.5) sentiment = 'negative';
  
  // Top words
  const wordCloud: WordFrequency[] = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
  
  // Emote stats
  const totalEmotes = Array.from(emoteCounts.values()).reduce((a, b) => a + b, 0);
  const emoteUsage: EmoteStats[] = Array.from(emoteCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([emote, count]) => ({
      emote,
      count,
      percentage: totalEmotes > 0 ? (count / totalEmotes) * 100 : 0,
    }));
  
  // Peak moments
  const peakMoments: PeakMoment[] = Array.from(timeSlots.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([timestamp, data]) => ({
      timestamp,
      messageCount: data.count,
      topMessage: data.messages[0] || '',
      sentiment: 'neutral',
    }));
  
  // Most active viewers
  const mostActiveViewers = Array.from(userMessageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([username, messageCount]) => ({ username, messageCount }));
  
  // Engagement score (0-100)
  const avgMsgsPerUser = messages.length / Math.max(uniqueUsers.size, 1);
  const engagement = Math.min(100, Math.round(avgMsgsPerUser * 10 + uniqueUsers.size * 0.5));
  
  return {
    sentiment,
    topics: wordCloud.slice(0, 5).map(w => w.word),
    engagement,
    peakMoments,
    wordCloud,
    emoteUsage,
    viewerInteraction: {
      uniqueViewers: uniqueUsers.size,
      totalMessages: messages.length,
      avgMessagesPerViewer: Math.round(avgMsgsPerUser * 10) / 10,
      mostActiveViewers,
      newViewers: uniqueUsers.size, // Would need historical data to calculate properly
      returningViewers: 0,
    },
  };
};


// AI-powered analysis using Gemini API
export const analyzeWithAI = async (
  messages: StoredMessage[],
  config: AIConfig
): Promise<ChatAnalysis | null> => {
  if (!config.enabled || !config.apiKey) {
    return analyzeLocally(messages);
  }

  // Prepare chat summary for AI
  const chatSummary = messages
    .slice(-500) // Last 500 messages
    .map(m => `${m.username}: ${m.message}`)
    .join('\n');

  const prompt = `Analiza este chat de Twitch y proporciona insights en formato JSON:

Chat:
${chatSummary}

Responde SOLO con un JSON válido con esta estructura:
{
  "sentiment": "positive" | "neutral" | "negative",
  "topics": ["tema1", "tema2", "tema3"],
  "engagement": número del 0 al 100,
  "highlights": ["momento destacado 1", "momento destacado 2"],
  "recommendations": ["sugerencia para mejorar engagement"]
}`;

  try {
    if (config.provider === 'gemini') {
      // Models available in free tier
      const models = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-1.0-pro'];
      let response: Response | null = null;
      
      for (const model of models) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
              },
            }),
          }
        );
        
        if (response.ok) {
          console.log(`Using Gemini model: ${model}`);
          break;
        }
        // Skip rate-limited models
        if (response.status === 429) continue;
      }

      if (!response || !response.ok) {
        console.error('Gemini API error: No working model found');
        return analyzeLocally(messages);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiInsights = JSON.parse(jsonMatch[0]);
          const localAnalysis = analyzeLocally(messages);
          
          // Merge AI insights with local analysis
          return {
            ...localAnalysis,
            sentiment: aiInsights.sentiment || localAnalysis.sentiment,
            topics: aiInsights.topics || localAnalysis.topics,
            engagement: aiInsights.engagement || localAnalysis.engagement,
          };
        }
      }
    }
    // Add support for other providers here (OpenAI, Anthropic)
    
    return analyzeLocally(messages);
  } catch (error) {
    console.error('AI analysis error:', error);
    return analyzeLocally(messages);
  }
};

// Generate daily report
export const generateDailyReport = async (
  date: string,
  config: AIConfig | null
): Promise<DailyInsight> => {
  const sessions = getSessionsByDate(date);
  
  // Aggregate all messages from the day
  const allMessages = sessions.flatMap(s => s.messages);
  
  let aggregatedAnalysis: ChatAnalysis | undefined;
  if (allMessages.length > 0) {
    if (config?.enabled && config.apiKey) {
      aggregatedAnalysis = await analyzeWithAI(allMessages, config) || undefined;
    } else {
      aggregatedAnalysis = analyzeLocally(allMessages);
    }
  }
  
  return {
    date,
    sessions,
    aggregatedAnalysis,
  };
};

// Export session data as JSON
export const exportSessionData = (session: StreamSession): string => {
  return JSON.stringify(session, null, 2);
};

// Clear old sessions (keep last N days)
export const clearOldSessions = (keepDays: number = 7): void => {
  const sessions = loadAllSessions();
  const cutoff = Date.now() - (keepDays * 24 * 60 * 60 * 1000);
  const filtered = sessions.filter(s => s.startTime > cutoff);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
};
