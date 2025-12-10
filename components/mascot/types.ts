// AI Vision Mascot Types

export type MascotEmotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'sad'
  | 'confused'
  | 'helpful'
  | 'celebrating'
  | 'concerned'
  | 'thinking'
  | 'sleepy'
  | 'surprised'
  | 'love'
  | 'angry';

export interface MascotState {
  emotion: MascotEmotion;
  message: string;
  isVisible: boolean;
  helpTip?: string;
}

export interface UserDifficulty {
  type: 'connection_failed' | 'poll_empty' | 'no_votes' | 'repeated_action' | 'idle';
  timestamp: number;
  context?: string;
}

export interface MascotPosition {
  x: number;
  y: number;
}

export interface ChatSentiment {
  sentiment: 'positive' | 'neutral' | 'negative';
  intensity: number;
}

export interface EmotionResult {
  emotion: MascotEmotion;
  message: string;
  helpTip?: string;
}

export interface EyeStyle {
  scaleX: number;
  scaleY: number;
  translateY?: number;
}
