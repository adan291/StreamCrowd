// AI Analytics Service - Analyzes chat and generates stream insights

export type AIProvider = 'gemini' | 'openai' | 'anthropic';

export interface AIProviderConfig {
  apiKey: string;
  enabled: boolean;
}

export interface AIConfig {
  providers: {
    gemini: AIProviderConfig;
    openai: AIProviderConfig;
    anthropic: AIProviderConfig;
  };
  // Qué proveedor usar para cada función
  analyticsProvider: AIProvider;
  gamesProvider: AIProvider;
}

// Config legacy para compatibilidad
export interface LegacyAIConfig {
  provider: AIProvider;
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

const STORAGE_KEY = 'twitch_ai_config_v2';
const LEGACY_STORAGE_KEY = 'twitch_ai_config';
const SESSIONS_KEY = 'twitch_stream_sessions';
const ENCRYPTION_KEY = 'TwitchVoteLive2024'; // Simple obfuscation key

// Simple encryption/decryption for API keys (not military-grade, but better than plaintext)
const encryptKey = (text: string): string => {
  if (!text) return '';
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 encode
};

const decryptKey = (encoded: string): string => {
  if (!encoded) return '';
  try {
    const text = atob(encoded); // Base64 decode
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return encoded; // Return as-is if decryption fails (legacy plaintext)
  }
};

// Get API key from environment variable (more secure) or localStorage
const getEnvApiKey = (provider: AIProvider): string | null => {
  switch (provider) {
    case 'gemini': return import.meta.env.VITE_GEMINI_API_KEY || null;
    case 'openai': return import.meta.env.VITE_OPENAI_API_KEY || null;
    case 'anthropic': return import.meta.env.VITE_ANTHROPIC_API_KEY || null;
    default: return null;
  }
};

// Default empty config
const getDefaultConfig = (): AIConfig => ({
  providers: {
    gemini: { apiKey: '', enabled: false },
    openai: { apiKey: '', enabled: false },
    anthropic: { apiKey: '', enabled: false },
  },
  analyticsProvider: 'gemini',
  gamesProvider: 'gemini',
});

// Save/Load AI Config
export const saveAIConfig = (config: AIConfig): void => {
  const configToSave = {
    ...config,
    providers: {
      gemini: { 
        apiKey: config.providers.gemini.apiKey ? encryptKey(config.providers.gemini.apiKey) : '',
        enabled: config.providers.gemini.enabled 
      },
      openai: { 
        apiKey: config.providers.openai.apiKey ? encryptKey(config.providers.openai.apiKey) : '',
        enabled: config.providers.openai.enabled 
      },
      anthropic: { 
        apiKey: config.providers.anthropic.apiKey ? encryptKey(config.providers.anthropic.apiKey) : '',
        enabled: config.providers.anthropic.enabled 
      },
    }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
};

export const loadAIConfig = (): AIConfig => {
  // Try new format first
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (stored) {
    try {
      const config = JSON.parse(stored) as AIConfig;
      // Decrypt keys and apply env overrides
      (['gemini', 'openai', 'anthropic'] as AIProvider[]).forEach(provider => {
        const envKey = getEnvApiKey(provider);
        if (envKey) {
          config.providers[provider].apiKey = envKey;
          config.providers[provider].enabled = true;
        } else if (config.providers[provider].apiKey) {
          config.providers[provider].apiKey = decryptKey(config.providers[provider].apiKey);
        }
      });
      return config;
    } catch {
      // Fall through to legacy
    }
  }
  
  // Try legacy format and migrate
  const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyStored) {
    try {
      const legacy = JSON.parse(legacyStored) as LegacyAIConfig;
      const config = getDefaultConfig();
      const provider = legacy.provider || 'gemini';
      config.providers[provider] = {
        apiKey: legacy.apiKey ? decryptKey(legacy.apiKey) : '',
        enabled: legacy.enabled
      };
      config.analyticsProvider = provider;
      config.gamesProvider = provider;
      // Save in new format
      saveAIConfig(config);
      return config;
    } catch {
      // Fall through to default
    }
  }
  
  // Check env keys
  const config = getDefaultConfig();
  (['gemini', 'openai', 'anthropic'] as AIProvider[]).forEach(provider => {
    const envKey = getEnvApiKey(provider);
    if (envKey) {
      config.providers[provider].apiKey = envKey;
      config.providers[provider].enabled = true;
    }
  });
  
  return config;
};

// Helper para obtener la config de un proveedor específico para una función
export const getProviderForFunction = (config: AIConfig, fn: 'analytics' | 'games'): { provider: AIProvider; apiKey: string } | null => {
  const provider = fn === 'analytics' ? config.analyticsProvider : config.gamesProvider;
  const providerConfig = config.providers[provider];
  
  if (providerConfig.apiKey) {
    return { provider, apiKey: providerConfig.apiKey };
  }
  
  // Fallback: buscar cualquier proveedor con key
  for (const p of ['gemini', 'openai', 'anthropic'] as AIProvider[]) {
    if (config.providers[p].apiKey) {
      return { provider: p, apiKey: config.providers[p].apiKey };
    }
  }
  
  return null;
};

export const clearAIConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
};

// Check if using env-based API key
export const isUsingEnvKey = (provider?: AIProvider): boolean => {
  if (provider) {
    return !!getEnvApiKey(provider);
  }
  return !!getEnvApiKey('gemini') || !!getEnvApiKey('openai') || !!getEnvApiKey('anthropic');
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
  const providerInfo = getProviderForFunction(config, 'analytics');
  if (!providerInfo) {
    return analyzeLocally(messages);
  }

  const { provider, apiKey } = providerInfo;

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
    if (provider === 'gemini') {
      const savedModel = localStorage.getItem('gemini_working_model');
      const modelToUse = savedModel || 'gemini-2.0-flash-exp';
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
          }),
        }
      );

      if (!response.ok) return analyzeLocally(messages);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiInsights = JSON.parse(jsonMatch[0]);
          const localAnalysis = analyzeLocally(messages);
          return {
            ...localAnalysis,
            sentiment: aiInsights.sentiment || localAnalysis.sentiment,
            topics: aiInsights.topics || localAnalysis.topics,
            engagement: aiInsights.engagement || localAnalysis.engagement,
          };
        }
      }
    } else if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!response.ok) return analyzeLocally(messages);

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      
      if (text) {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiInsights = JSON.parse(jsonMatch[0]);
          const localAnalysis = analyzeLocally(messages);
          return {
            ...localAnalysis,
            sentiment: aiInsights.sentiment || localAnalysis.sentiment,
            topics: aiInsights.topics || localAnalysis.topics,
            engagement: aiInsights.engagement || localAnalysis.engagement,
          };
        }
      }
    }
    
    return analyzeLocally(messages);
  } catch (error) {
    console.error('AI analysis error:', error);
    return analyzeLocally(messages);
  }
};

// Generate daily report
export const generateDailyReport = async (
  date: string,
  config: AIConfig
): Promise<DailyInsight> => {
  const sessions = getSessionsByDate(date);
  
  // Aggregate all messages from the day
  const allMessages = sessions.flatMap(s => s.messages);
  
  let aggregatedAnalysis: ChatAnalysis | undefined;
  if (allMessages.length > 0) {
    const providerInfo = getProviderForFunction(config, 'analytics');
    if (providerInfo) {
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
