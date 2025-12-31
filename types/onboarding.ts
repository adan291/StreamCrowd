/**
 * Onboarding Types
 * 
 * Types and interfaces for the interactive onboarding system.
 * Supports step-by-step tutorials with validation and progress tracking.
 */

/**
 * Action types that can be performed during an onboarding step
 */
export type OnboardingActionType = 'click' | 'input' | 'navigate' | 'observe';

/**
 * Navigation action for changing app state during tutorial
 */
export interface OnboardingNavigationAction {
  type: 'navigate';
  leftTab?: 'dynamics' | 'games' | 'platforms' | 'obs' | 'gallery' | 'data';
  dynamicsView?: 'selector' | 'poll' | 'judge' | 'giveaway';
  dataSubTab?: 'activity' | 'analytics';
  rightTab?: 'chat' | 'stream';
  showModeration?: boolean;
  createDemoPoll?: boolean;
  showSoundBoard?: boolean;
  showSpinner?: boolean;
}

/**
 * Represents a single step in the onboarding tutorial
 */
export interface OnboardingStep {
  /** Unique identifier for the step */
  id: string;
  /** CSS selector for the target element to highlight */
  target: string;
  /** Title displayed in the tooltip */
  title: string;
  /** Detailed message/instructions for the step */
  message: string;
  /** Position of the tooltip relative to the target */
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Mascot emotion to display */
  mascotEmotion: 'happy' | 'excited' | 'thinking' | 'waving';
  /** Type of action required to complete this step */
  action?: OnboardingNavigationAction;
  /** Whether this step requires user interaction to complete */
  requiresInteraction?: boolean;
  /** Validation function to check if step is completed */
  validationKey?: string;
}

/**
 * Tracks the user's progress through the onboarding tutorial
 */
export interface OnboardingProgress {
  /** Index of the current step (0-based) */
  currentStep: number;
  /** Array of completed step IDs */
  completedSteps: string[];
  /** Timestamp when the tutorial was started */
  startedAt: number;
  /** Timestamp of last activity in the tutorial */
  lastActiveAt: number;
  /** Whether the entire tutorial has been completed */
  isCompleted: boolean;
  /** Whether the tutorial was skipped */
  wasSkipped: boolean;
}

/**
 * Storage schema for persisting onboarding state
 */
export interface OnboardingStorage {
  /** Schema version for migrations */
  version: 1;
  /** Whether the user has seen the welcome screen */
  hasSeenWelcome: boolean;
  /** Current progress through the tutorial */
  progress: OnboardingProgress;
  /** IDs of contextual tips that have been dismissed */
  dismissedTips: string[];
  /** User preferences for onboarding behavior */
  preferences: {
    /** Whether to show contextual tips */
    showContextualTips: boolean;
  };
}

/**
 * Contextual tip shown based on user actions
 */
export interface ContextualTip {
  /** Unique identifier for the tip */
  id: string;
  /** Context/trigger for showing this tip */
  context: string;
  /** Title of the tip */
  title: string;
  /** Message content */
  message: string;
  /** CSS selector for positioning (optional) */
  target?: string;
  /** Position relative to target */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Whether this tip can be permanently dismissed */
  dismissable: boolean;
}

/**
 * Return type for the useOnboarding hook
 */
export interface UseOnboardingReturn {
  /** Whether this is the user's first visit */
  isFirstVisit: boolean;
  /** Whether the tutorial is currently active */
  isActive: boolean;
  /** Current step data */
  currentStep: OnboardingStep | null;
  /** Current step index */
  currentStepIndex: number;
  /** Total number of steps */
  totalSteps: number;
  /** Current progress object */
  progress: OnboardingProgress;
  /** Start the tutorial */
  startTutorial: () => void;
  /** Complete the current step and advance */
  completeStep: (stepId: string) => void;
  /** Skip the tutorial entirely */
  skipTutorial: () => void;
  /** Reset the tutorial to start over */
  resetTutorial: () => void;
  /** Resume from last active step */
  resumeTutorial: () => void;
  /** Show a contextual tip */
  showContextualTip: (context: string) => ContextualTip | null;
  /** Dismiss a contextual tip permanently */
  dismissTip: (tipId: string) => void;
  /** Check if a tip has been dismissed */
  isTipDismissed: (tipId: string) => boolean;
  /** Toggle contextual tips preference */
  setShowContextualTips: (show: boolean) => void;
}

/**
 * Default onboarding progress state
 */
export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  currentStep: 0,
  completedSteps: [],
  startedAt: 0,
  lastActiveAt: 0,
  isCompleted: false,
  wasSkipped: false,
};

/**
 * Default onboarding storage state
 */
export const DEFAULT_ONBOARDING_STORAGE: OnboardingStorage = {
  version: 1,
  hasSeenWelcome: false,
  progress: DEFAULT_ONBOARDING_PROGRESS,
  dismissedTips: [],
  preferences: {
    showContextualTips: true,
  },
};

/**
 * Storage key for onboarding data
 */
export const ONBOARDING_STORAGE_KEY = 'twitchvote_onboarding';
