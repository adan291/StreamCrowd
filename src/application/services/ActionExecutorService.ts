/**
 * ActionExecutorService - Service for executing macro actions
 * 
 * This service handles the execution of individual macro actions, including:
 * - send_chat_message: Send a message to chat
 * - change_scene: Change OBS scene
 * - toggle_source: Show/hide OBS source
 * - play_sound: Play a sound from the soundboard
 * - start_poll: Start a poll
 * - start_prediction: Start a Twitch prediction
 * - send_notification: Send notifications via push/discord/telegram
 * - set_variable: Set a user variable
 * - delay: Wait for a specified time
 * 
 * @requirements 3.1 - THE Macro_Service SHALL support action "send_chat_message"
 * @requirements 3.2 - THE Macro_Service SHALL support action "change_scene"
 * @requirements 3.3 - THE Macro_Service SHALL support action "toggle_source"
 * @requirements 3.4 - THE Macro_Service SHALL support action "play_sound"
 * @requirements 3.5 - THE Macro_Service SHALL support action "start_poll"
 * @requirements 3.6 - THE Macro_Service SHALL support action "start_prediction"
 * @requirements 3.7 - THE Macro_Service SHALL support action "send_notification"
 * @requirements 3.8 - THE Macro_Service SHALL support action "set_variable"
 * @requirements 3.9 - THE Macro_Service SHALL support action "delay"
 * @requirements 3.10 - WHEN an action fails, THE Macro_Service SHALL continue with the next action
 */

import type {
  MacroAction,
  ActionType,
  ActionResult,
  ExecutionContext,
  SendChatMessageConfig,
  ChangeSceneConfig,
  ToggleSourceConfig,
  PlaySoundConfig,
  StartPollConfig,
  StartPredictionConfig,
  SendNotificationConfig,
  SetVariableConfig,
  DelayConfig,
} from '../../../types/macros';
import type { IVariableResolver } from './VariableResolverService';
import { VariableResolverService } from './VariableResolverService';
import type { IConditionEvaluator } from './ConditionEvaluatorService';
import { ConditionEvaluatorService } from './ConditionEvaluatorService';

/**
 * Interface for external service dependencies
 * These are injected to allow for testing and loose coupling
 */
export interface ActionExecutorDependencies {
  chatService?: IChatServiceAdapter;
  obsService?: IOBSServiceAdapter;
  soundService?: ISoundServiceAdapter;
  pollService?: IPollServiceAdapter;
  predictionService?: IPredictionServiceAdapter;
  notificationService?: INotificationServiceAdapter;
  variableResolver?: IVariableResolver;
  conditionEvaluator?: IConditionEvaluator;
}

/**
 * Adapter interface for ChatService
 */
export interface IChatServiceAdapter {
  sendMessage(message: string, platform?: string): Promise<boolean>;
}

/**
 * Adapter interface for OBSService
 */
export interface IOBSServiceAdapter {
  isConnected(): boolean;
  switchScene(sceneName: string): Promise<void>;
  setSourceVisible(sceneName: string, sourceName: string, visible: boolean): Promise<void>;
  getCurrentScene(): Promise<string | null>;
  getSceneSources(sceneName: string): Promise<Array<{ name: string; visible: boolean }>>;
}

/**
 * Adapter interface for SoundService
 */
export interface ISoundServiceAdapter {
  playSound(soundId: string, volume?: number): Promise<void>;
}

/**
 * Adapter interface for PollService
 */
export interface IPollServiceAdapter {
  createPoll(params: {
    title: string;
    question: string;
    options: Array<{ label: string; color: string }>;
    duration?: number;
  }): Promise<unknown>;
}

/**
 * Adapter interface for PredictionService
 */
export interface IPredictionServiceAdapter {
  createPrediction(data: {
    broadcaster_id: string;
    title: string;
    outcomes: Array<{ title: string }>;
    prediction_window: number;
  }): Promise<unknown>;
  getBroadcasterId(): string | null;
}

/**
 * Adapter interface for NotificationService
 */
export interface INotificationServiceAdapter {
  notify(event: {
    type: string;
    title: string;
    message: string;
    timestamp: number;
    data?: Record<string, unknown>;
  }): Promise<unknown>;
}

/**
 * Interface for the ActionExecutor service
 */
export interface IActionExecutor {
  execute(action: MacroAction, context: ExecutionContext): Promise<ActionResult>;
  executeAll(actions: MacroAction[], context: ExecutionContext): Promise<ActionResult[]>;
}

/**
 * Default colors for poll options
 */
const DEFAULT_POLL_COLORS = [
  '#9146FF', // Twitch purple
  '#00FF7F', // Spring green
  '#FF6B6B', // Coral red
  '#4ECDC4', // Teal
  '#FFE66D', // Yellow
  '#95E1D3', // Mint
  '#F38181', // Salmon
  '#AA96DA', // Lavender
];


/**
 * ActionExecutorService class
 * 
 * Executes macro actions with proper error handling and condition evaluation.
 * Each action type has a dedicated executor method.
 */
export class ActionExecutorService implements IActionExecutor {
  private chatService?: IChatServiceAdapter;
  private obsService?: IOBSServiceAdapter;
  private soundService?: ISoundServiceAdapter;
  private pollService?: IPollServiceAdapter;
  private predictionService?: IPredictionServiceAdapter;
  private notificationService?: INotificationServiceAdapter;
  private variableResolver: IVariableResolver;
  private conditionEvaluator: IConditionEvaluator;

  constructor(dependencies: ActionExecutorDependencies = {}) {
    this.chatService = dependencies.chatService;
    this.obsService = dependencies.obsService;
    this.soundService = dependencies.soundService;
    this.pollService = dependencies.pollService;
    this.predictionService = dependencies.predictionService;
    this.notificationService = dependencies.notificationService;
    this.variableResolver = dependencies.variableResolver || new VariableResolverService();
    this.conditionEvaluator = dependencies.conditionEvaluator || new ConditionEvaluatorService(this.variableResolver);
  }

  /**
   * Executes a single action
   * @param action - The action to execute
   * @param context - Execution context with variables
   * @returns ActionResult with success/failure status
   */
  async execute(action: MacroAction, context: ExecutionContext): Promise<ActionResult> {
    const startTime = Date.now();

    // Check condition if present
    if (action.condition) {
      const conditionMet = this.conditionEvaluator.evaluate(action.condition, context);
      if (!conditionMet) {
        return {
          actionId: action.id,
          actionType: action.type,
          success: true,
          skipped: true,
          duration: Date.now() - startTime,
        };
      }
    }

    // Apply pre-action delay if specified
    if (action.delay > 0) {
      await this.executeDelay({ seconds: action.delay });
    }

    try {
      await this.executeAction(action, context);
      
      return {
        actionId: action.id,
        actionType: action.type,
        success: true,
        skipped: false,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        actionId: action.id,
        actionType: action.type,
        success: false,
        skipped: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Executes all actions in sequence
   * Continues execution even if an action fails (Requirement 3.10)
   * @param actions - Array of actions to execute
   * @param context - Execution context with variables
   * @returns Array of ActionResults
   */
  async executeAll(actions: MacroAction[], context: ExecutionContext): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const action of actions) {
      const result = await this.execute(action, context);
      results.push(result);
      // Continue with next action even if this one failed (Requirement 3.10)
    }

    return results;
  }

  /**
   * Routes action execution to the appropriate handler
   */
  private async executeAction(action: MacroAction, context: ExecutionContext): Promise<void> {
    switch (action.type) {
      case 'send_chat_message':
        await this.executeSendChatMessage(action.config as SendChatMessageConfig, context);
        break;
      case 'change_scene':
        await this.executeChangeScene(action.config as ChangeSceneConfig, context);
        break;
      case 'toggle_source':
        await this.executeToggleSource(action.config as ToggleSourceConfig, context);
        break;
      case 'play_sound':
        await this.executePlaySound(action.config as PlaySoundConfig);
        break;
      case 'start_poll':
        await this.executeStartPoll(action.config as StartPollConfig, context);
        break;
      case 'start_prediction':
        await this.executeStartPrediction(action.config as StartPredictionConfig, context);
        break;
      case 'send_notification':
        await this.executeSendNotification(action.config as SendNotificationConfig, context);
        break;
      case 'set_variable':
        await this.executeSetVariable(action.config as SetVariableConfig, context);
        break;
      case 'delay':
        await this.executeDelay(action.config as DelayConfig);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Sends a chat message
   * @requirements 3.1
   */
  private async executeSendChatMessage(
    config: SendChatMessageConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.chatService) {
      throw new Error('Chat service not available');
    }

    // Resolve variables in the message
    const resolvedMessage = this.variableResolver.resolve(config.message, context);
    
    const success = await this.chatService.sendMessage(resolvedMessage, config.platform);
    
    if (!success) {
      throw new Error('Failed to send chat message');
    }
  }

  /**
   * Changes the OBS scene
   * @requirements 3.2
   */
  private async executeChangeScene(
    config: ChangeSceneConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.obsService) {
      throw new Error('OBS service not available');
    }

    if (!this.obsService.isConnected()) {
      throw new Error('OBS is not connected');
    }

    // Resolve variables in scene name
    const resolvedSceneName = this.variableResolver.resolve(config.sceneName, context);
    
    await this.obsService.switchScene(resolvedSceneName);
  }

  /**
   * Toggles OBS source visibility
   * @requirements 3.3
   */
  private async executeToggleSource(
    config: ToggleSourceConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.obsService) {
      throw new Error('OBS service not available');
    }

    if (!this.obsService.isConnected()) {
      throw new Error('OBS is not connected');
    }

    // Resolve variables in source name
    const resolvedSourceName = this.variableResolver.resolve(config.sourceName, context);
    
    // Get current scene
    const currentScene = await this.obsService.getCurrentScene();
    if (!currentScene) {
      throw new Error('Could not determine current OBS scene');
    }

    let visible: boolean;
    
    if (config.action === 'toggle') {
      // Get current visibility and toggle it
      const sources = await this.obsService.getSceneSources(currentScene);
      const source = sources.find(s => s.name === resolvedSourceName);
      visible = source ? !source.visible : true;
    } else {
      visible = config.action === 'show';
    }

    await this.obsService.setSourceVisible(currentScene, resolvedSourceName, visible);
  }

  /**
   * Plays a sound from the soundboard
   * @requirements 3.4
   */
  private async executePlaySound(config: PlaySoundConfig): Promise<void> {
    if (!this.soundService) {
      throw new Error('Sound service not available');
    }

    await this.soundService.playSound(config.soundId, config.volume);
  }

  /**
   * Starts a poll
   * @requirements 3.5
   */
  private async executeStartPoll(
    config: StartPollConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.pollService) {
      throw new Error('Poll service not available');
    }

    // Resolve variables in title and options
    const resolvedTitle = this.variableResolver.resolve(config.title, context);
    const resolvedOptions = config.options.map((option, index) => ({
      label: this.variableResolver.resolve(option, context),
      color: DEFAULT_POLL_COLORS[index % DEFAULT_POLL_COLORS.length],
    }));

    await this.pollService.createPoll({
      title: resolvedTitle,
      question: resolvedTitle,
      options: resolvedOptions,
      duration: config.duration,
    });
  }

  /**
   * Starts a Twitch prediction
   * @requirements 3.6
   */
  private async executeStartPrediction(
    config: StartPredictionConfig,
    context: ExecutionContext
  ): Promise<void> {
    console.log('[Macro] executeStartPrediction called', { 
      config, 
      hasPredictionService: !!this.predictionService 
    });
    
    if (!this.predictionService) {
      throw new Error('Servicio de predicciones no disponible');
    }

    const broadcasterId = this.predictionService.getBroadcasterId();
    console.log('[Macro] Broadcaster ID:', broadcasterId);
    
    if (!broadcasterId) {
      throw new Error('ID de canal no disponible');
    }

    // Resolve variables in title and outcomes
    const resolvedTitle = this.variableResolver.resolve(config.title, context);
    const resolvedOutcomes = config.outcomes.map(outcome => ({
      title: this.variableResolver.resolve(outcome, context),
    }));

    console.log('[Macro] Creating prediction with:', {
      broadcaster_id: broadcasterId,
      title: resolvedTitle,
      outcomes: resolvedOutcomes,
      prediction_window: config.duration,
    });

    const result = await this.predictionService.createPrediction({
      broadcaster_id: broadcasterId,
      title: resolvedTitle,
      outcomes: resolvedOutcomes,
      prediction_window: config.duration,
    });
    
    console.log('[Macro] Prediction result:', result);
    
    // Check if result is an error
    if (result && typeof result === 'object' && 'code' in result && 'message' in result) {
      const error = result as { code: string; message: string; solution?: string };
      console.log('[Macro] Prediction error:', error);
      throw new Error(error.message + (error.solution ? ` - ${error.solution}` : ''));
    }
    
    console.log('[Macro] Prediction created successfully');
  }

  /**
   * Sends a notification via configured channels
   * @requirements 3.7
   */
  private async executeSendNotification(
    config: SendNotificationConfig,
    context: ExecutionContext
  ): Promise<void> {
    if (!this.notificationService) {
      throw new Error('Notification service not available');
    }

    // Resolve variables in title and message
    const resolvedTitle = this.variableResolver.resolve(config.title, context);
    const resolvedMessage = this.variableResolver.resolve(config.message, context);

    await this.notificationService.notify({
      type: 'macro_notification',
      title: resolvedTitle,
      message: resolvedMessage,
      timestamp: Date.now(),
      data: {
        channels: config.channels,
        triggeredBy: context.triggeredBy,
        user: context.user?.username,
      },
    });
  }

  /**
   * Sets a user variable
   * @requirements 3.8
   */
  private async executeSetVariable(
    config: SetVariableConfig,
    context: ExecutionContext
  ): Promise<void> {
    const variableResolver = this.variableResolver as VariableResolverService;
    
    if (!variableResolver.setUserVariable) {
      throw new Error('Variable resolver does not support setting variables');
    }

    let finalValue: string | number = config.value;

    // Handle operations for numeric values
    if (config.operation && config.operation !== 'set') {
      const currentVar = variableResolver.getVariable(config.variableName, context);
      const currentValue = currentVar ? Number(currentVar.value) : 0;
      const operandValue = typeof config.value === 'number' ? config.value : parseFloat(String(config.value)) || 0;

      if (config.operation === 'increment') {
        finalValue = currentValue + operandValue;
      } else if (config.operation === 'decrement') {
        finalValue = currentValue - operandValue;
      }
    }

    variableResolver.setUserVariable(
      config.variableName,
      finalValue,
      typeof finalValue === 'number' ? 'number' : 'string'
    );
  }

  /**
   * Delays execution for a specified time
   * @requirements 3.9
   */
  private async executeDelay(config: DelayConfig): Promise<void> {
    const delayMs = Math.min(Math.max(config.seconds, 0), 60) * 1000;
    
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // ==================== Service Setters ====================

  /**
   * Sets the chat service adapter
   */
  setChatService(service: IChatServiceAdapter): void {
    this.chatService = service;
  }

  /**
   * Sets the OBS service adapter
   */
  setOBSService(service: IOBSServiceAdapter): void {
    this.obsService = service;
  }

  /**
   * Sets the sound service adapter
   */
  setSoundService(service: ISoundServiceAdapter): void {
    this.soundService = service;
  }

  /**
   * Sets the poll service adapter
   */
  setPollService(service: IPollServiceAdapter): void {
    this.pollService = service;
  }

  /**
   * Sets the prediction service adapter
   */
  setPredictionService(service: IPredictionServiceAdapter): void {
    this.predictionService = service;
  }

  /**
   * Sets the notification service adapter
   */
  setNotificationService(service: INotificationServiceAdapter): void {
    this.notificationService = service;
  }
}

// ============ SINGLETON INSTANCE ============

let actionExecutorInstance: ActionExecutorService | null = null;

/**
 * Get the singleton instance of ActionExecutorService
 */
export function getActionExecutorService(dependencies?: ActionExecutorDependencies): ActionExecutorService {
  if (!actionExecutorInstance) {
    actionExecutorInstance = new ActionExecutorService(dependencies);
  }
  return actionExecutorInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetActionExecutorService(): void {
  actionExecutorInstance = null;
}

export default ActionExecutorService;
