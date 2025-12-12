// Re-export from refactored mascot module
// This file maintains backward compatibility with existing imports

export {
  AIVisionMascot,
  default,
  MascotFace,
  useMascotDrag,
  useIdleTime,
  analyzeChatSentiment,
  determineEmotion,
} from './mascot';

export type {
  MascotEmotion,
  MascotState,
  UserDifficulty,
  MascotPosition,
  ChatSentiment,
  EmotionResult,
  EyeStyle,
  MascotSize,
} from './mascot';
