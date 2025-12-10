// Emotion analysis utilities for AI Vision Mascot
import { TwitchMessage } from '../../types';
import { MascotEmotion, ChatSentiment, EmotionResult } from './types';

// Patterns for sentiment analysis
const POSITIVE_PATTERNS = [
  /\b(pog|poggers|pogchamp|hype|gg|nice|amazing|love|great|awesome|lol|lmao|jaja|xd|goat|crack|genial|increíble|vamos)\b/gi,
  /(❤️|💜|🎉|👏|🔥)+/g,
];

const NEGATIVE_PATTERNS = [
  /\b(bad|terrible|hate|boring|sad|rip|fail|trash|basura|aburrido|malo)\b/gi,
  /(😢|😭|💔|👎)+/g,
];

const EXCITEMENT_PATTERNS = [
  /[A-Z]{3,}/g,
  /!{2,}/g,
  /\b(omg|wtf|wow|insane|crazy|loco)\b/gi,
];

/**
 * Analyzes chat messages to determine overall sentiment
 */
export const analyzeChatSentiment = (messages: TwitchMessage[]): ChatSentiment => {
  if (messages.length === 0) return { sentiment: 'neutral', intensity: 0 };

  const recentMessages = messages.slice(-30);
  let positiveScore = 0;
  let negativeScore = 0;
  let excitementScore = 0;

  recentMessages.forEach((msg) => {
    const text = msg.message;
    
    POSITIVE_PATTERNS.forEach((p) => {
      const matches = text.match(p);
      if (matches) positiveScore += matches.length;
    });
    
    NEGATIVE_PATTERNS.forEach((p) => {
      const matches = text.match(p);
      if (matches) negativeScore += matches.length;
    });
    
    EXCITEMENT_PATTERNS.forEach((p) => {
      const matches = text.match(p);
      if (matches) excitementScore += matches.length;
    });
  });

  const intensity = Math.min(100, (positiveScore + negativeScore + excitementScore) * 3);

  if (positiveScore > negativeScore * 1.5) return { sentiment: 'positive', intensity };
  if (negativeScore > positiveScore * 1.5) return { sentiment: 'negative', intensity };
  return { sentiment: 'neutral', intensity };
};

/**
 * Detects special emotion patterns in chat messages
 */
export const detectSpecialEmotions = (messages: TwitchMessage[]): MascotEmotion | null => {
  if (messages.length === 0) return null;
  
  const recentMessages = messages.slice(-20);
  const allText = recentMessages.map((m) => m.message.toLowerCase()).join(' ');

  // Love detection
  const loveMatches = allText.match(/❤️|💜|💕|love|te amo|<3|amor/gi);
  if (loveMatches && loveMatches.length >= 3) return 'love';

  // Surprise detection
  const surpriseMatches = allText.match(/omg|wtf|wow|no way|que|increíble|😱|🤯/gi);
  if (surpriseMatches && surpriseMatches.length >= 3) return 'surprised';

  // Angry detection
  const angryMatches = allText.match(/😡|🤬|angry|mad|furioso|enojado|hate/gi);
  if (angryMatches && angryMatches.length >= 3) return 'angry';

  return null;
};

interface DetermineEmotionParams {
  chatSentiment: ChatSentiment;
  t: any;
  difficulty?: { type: string; context?: string };
  isConnected: boolean;
  hasPoll: boolean;
  pollVotes: number;
  messages: TwitchMessage[];
  idleTime: number;
}

/**
 * Determines the mascot's emotion based on various factors
 */
export const determineEmotion = ({
  chatSentiment,
  t,
  difficulty,
  isConnected,
  hasPoll,
  pollVotes,
  messages,
  idleTime,
}: DetermineEmotionParams): EmotionResult => {
  // Priority 0: Special emotions from chat
  if (messages.length > 0) {
    const specialEmotion = detectSpecialEmotions(messages);
    if (specialEmotion === 'love') {
      return { emotion: 'love', message: t.mascot.msgLove };
    }
    if (specialEmotion === 'surprised') {
      return { emotion: 'surprised', message: t.mascot.msgSurprised };
    }
    if (specialEmotion === 'angry') {
      return { emotion: 'concerned', message: t.mascot.msgAngry };
    }
  }

  // Priority 1: User difficulties
  if (difficulty) {
    switch (difficulty.type) {
      case 'connection_failed':
        return { emotion: 'helpful', message: t.mascot.msgConnectionFailed, helpTip: t.mascot.helpConnectionFailed };
      case 'poll_empty':
        return { emotion: 'confused', message: t.mascot.msgPollEmpty, helpTip: t.mascot.helpPollEmpty };
      case 'no_votes':
        return { emotion: 'concerned', message: t.mascot.msgNoVotes, helpTip: t.mascot.helpNoVotes };
      case 'repeated_action':
        return { emotion: 'helpful', message: t.mascot.msgRepeatedAction, helpTip: difficulty.context || t.mascot.helpRepeatedAction };
      case 'idle':
        return { emotion: 'sleepy', message: t.mascot.msgSleepy };
    }
  }

  // Priority 2: Chat sentiment
  if (chatSentiment.intensity > 30) {
    if (chatSentiment.sentiment === 'positive') {
      if (chatSentiment.intensity > 90) {
        return { emotion: 'celebrating', message: t.mascot.msgChatExcited };
      }
      if (chatSentiment.intensity > 70) {
        return { emotion: 'excited', message: t.mascot.msgChatPositive };
      }
      return { emotion: 'happy', message: t.mascot.msgHappy };
    }
    if (chatSentiment.sentiment === 'negative') {
      if (chatSentiment.intensity > 70) {
        return { emotion: 'sad', message: t.mascot.msgSad };
      }
      return { emotion: 'concerned', message: t.mascot.msgChatNegative, helpTip: t.mascot.helpNoVotes };
    }
  }

  // Priority 3: Connection state
  if (!isConnected) {
    return { emotion: 'neutral', message: t.mascot.msgNotConnected };
  }

  // Priority 4: Poll states
  if (hasPoll) {
    if (pollVotes > 50) {
      return { emotion: 'celebrating', message: `${t.mascot.msgPollGoing.replace('{votes}', String(pollVotes))} 🎉` };
    }
    if (pollVotes > 10) {
      return { emotion: 'happy', message: t.mascot.msgPollGoing.replace('{votes}', String(pollVotes)) };
    }
    if (pollVotes === 0) {
      return { emotion: 'thinking', message: t.mascot.msgWaitingVotes };
    }
    return { emotion: 'excited', message: `¡${pollVotes} votos! Sigue así 💪` };
  }

  // Priority 5: Idle state
  if (idleTime > 60000) {
    return { emotion: 'sleepy', message: t.mascot.msgSleepy };
  }

  return { emotion: 'neutral', message: t.mascot.msgWatching };
};
