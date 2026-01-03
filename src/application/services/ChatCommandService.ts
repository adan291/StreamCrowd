/**
 * ChatCommandService
 * 
 * Handles slash commands typed in the Stream Crowd chat input.
 * When a user types /command, this service parses and executes the appropriate action.
 * 
 * Supported commands:
 * - /announce <message> - Send an announcement (colored message)
 * - /announceblue <message> - Blue announcement
 * - /announcegreen <message> - Green announcement
 * - /announceorange <message> - Orange announcement
 * - /announcepurple <message> - Purple announcement
 * - /slow [seconds] - Enable slow mode (default 30s)
 * - /slowoff - Disable slow mode
 * - /emoteonly - Enable emote-only mode
 * - /emoteonlyoff - Disable emote-only mode
 * - /subscribers - Enable subscriber-only mode
 * - /subscribersoff - Disable subscriber-only mode
 * - /followers [minutes] - Enable follower-only mode
 * - /followersoff - Disable follower-only mode
 * - /shoutout <username> - Send a shoutout
 * - /raid <username> - Start a raid (broadcaster only)
 * - /clip - Create a clip
 * - /poll <title> | <option1> | <option2> ... - Create a poll
 * - /prediction <title> | <outcome1> | <outcome2> - Create a prediction
 * - /clear - Clear chat (not available via API, sends message)
 * - /timeout <username> [seconds] - Timeout a user
 * - /ban <username> - Ban a user
 * - /unban <username> - Unban a user
 * - /vip <username> - Add VIP
 * - /unvip <username> - Remove VIP
 * - /mod <username> - Add moderator
 * - /unmod <username> - Remove moderator
 */

import type { ITwitchApiServiceAdapter } from './ActionExecutorService';

export interface CommandResult {
  success: boolean;
  message: string;
  isCommand: boolean; // true if input was a command, false if regular message
  /** For announce commands, contains the announcement data to display locally */
  announcementData?: {
    text: string;
    color: 'blue' | 'green' | 'orange' | 'purple' | 'primary';
  };
  /** For other commands, contains system notification to display in chat */
  systemNotification?: {
    type: 'shoutout' | 'raid' | 'clip' | 'poll' | 'prediction' | 'moderation';
    icon: string;
    text: string;
    link?: string;
  };
}

export interface ChatCommandDependencies {
  twitchApiService: ITwitchApiServiceAdapter;
  sendChatMessage: (message: string) => Promise<boolean>;
  timeoutUser: (username: string, duration: number) => Promise<boolean>;
  banUser: (username: string) => Promise<boolean>;
  unbanUser: (username: string) => Promise<boolean>;
  addVIP: (username: string) => Promise<boolean>;
  removeVIP: (username: string) => Promise<boolean>;
  addModerator: (username: string) => Promise<boolean>;
  removeModerator: (username: string) => Promise<boolean>;
  createPrediction?: (title: string, outcomes: string[], duration: number) => Promise<boolean>;
}

export class ChatCommandService {
  private deps: ChatCommandDependencies;

  constructor(deps: ChatCommandDependencies) {
    this.deps = deps;
  }

  /**
   * Check if input is a command (starts with /)
   */
  isCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  /**
   * Parse and execute a command
   */
  async execute(input: string): Promise<CommandResult> {
    const trimmed = input.trim();
    
    if (!this.isCommand(trimmed)) {
      return { success: true, message: '', isCommand: false };
    }

    // Parse command and arguments
    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    try {
      switch (command) {
        // Announcements
        case 'announce':
          return await this.handleAnnounce(args, 'primary');
        case 'announceblue':
          return await this.handleAnnounce(args, 'blue');
        case 'announcegreen':
          return await this.handleAnnounce(args, 'green');
        case 'announceorange':
          return await this.handleAnnounce(args, 'orange');
        case 'announcepurple':
          return await this.handleAnnounce(args, 'purple');

        // Chat modes
        case 'slow':
          return await this.handleSlowMode(args);
        case 'slowoff':
          return await this.handleSlowModeOff();
        case 'emoteonly':
          return await this.handleEmoteOnly(true);
        case 'emoteonlyoff':
          return await this.handleEmoteOnly(false);
        case 'subscribers':
          return await this.handleSubscribersOnly(true);
        case 'subscribersoff':
          return await this.handleSubscribersOnly(false);
        case 'followers':
          return await this.handleFollowersOnly(args);
        case 'followersoff':
          return await this.handleFollowersOnlyOff();

        // Shoutout & Raid
        case 'shoutout':
        case 'so':
          return await this.handleShoutout(args);
        case 'raid':
          return await this.handleRaid(args);

        // Clip
        case 'clip':
          return await this.handleClip();

        // Poll & Prediction
        case 'poll':
          return await this.handlePoll(args);
        case 'prediction':
          return await this.handlePrediction(args);

        // Moderation
        case 'timeout':
        case 'to':
          return await this.handleTimeout(args);
        case 'ban':
          return await this.handleBan(args);
        case 'unban':
          return await this.handleUnban(args);
        case 'vip':
          return await this.handleVIP(args, true);
        case 'unvip':
          return await this.handleVIP(args, false);
        case 'mod':
          return await this.handleMod(args, true);
        case 'unmod':
          return await this.handleMod(args, false);

        // Clear (not available via API)
        case 'clear':
          return { 
            success: false, 
            message: '⚠️ /clear no está disponible via API. Usa el panel de moderación de Twitch.', 
            isCommand: true 
          };

        // Pin (not available via API)
        case 'pin':
          return { 
            success: false, 
            message: '⚠️ /pin no está disponible via API de Twitch. Puedes usar /announce para destacar un mensaje.', 
            isCommand: true 
          };

        // Unknown command
        default:
          return { 
            success: false, 
            message: `❌ Comando desconocido: /${command}. Escribe /help para ver comandos disponibles.`, 
            isCommand: true 
          };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`, 
        isCommand: true 
      };
    }
  }

  // ==================== Command Handlers ====================

  private async handleAnnounce(
    message: string, 
    color: 'blue' | 'green' | 'orange' | 'purple' | 'primary'
  ): Promise<CommandResult> {
    if (!message.trim()) {
      return { success: false, message: '❌ Uso: /announce <mensaje>', isCommand: true };
    }

    const result = await this.deps.twitchApiService.sendAnnouncement(message, color);
    
    return {
      success: result.success,
      message: result.success 
        ? `✅ Anuncio enviado` 
        : `❌ ${result.error || 'Error al enviar anuncio'}`,
      isCommand: true,
      // Include announcement data for local display when successful
      announcementData: result.success ? { text: message, color } : undefined,
    };
  }

  private async handleSlowMode(args: string): Promise<CommandResult> {
    const seconds = args ? parseInt(args) : 30;
    
    if (isNaN(seconds) || seconds < 3 || seconds > 120) {
      return { success: false, message: '❌ Uso: /slow [3-120 segundos]', isCommand: true };
    }

    const result = await this.deps.twitchApiService.updateChatSettings({
      slowMode: true,
      slowModeWaitTime: seconds
    });

    return {
      success: result.success,
      message: result.success 
        ? `✅ Modo lento activado (${seconds}s)` 
        : `❌ ${result.error || 'Error'}`,
      isCommand: true
    };
  }

  private async handleSlowModeOff(): Promise<CommandResult> {
    const result = await this.deps.twitchApiService.updateChatSettings({
      slowMode: false
    });

    return {
      success: result.success,
      message: result.success 
        ? `✅ Modo lento desactivado` 
        : `❌ ${result.error || 'Error'}`,
      isCommand: true
    };
  }

  private async handleEmoteOnly(enabled: boolean): Promise<CommandResult> {
    const result = await this.deps.twitchApiService.updateChatSettings({
      emoteMode: enabled
    });

    return {
      success: result.success,
      message: result.success 
        ? `✅ Modo solo emotes ${enabled ? 'activado' : 'desactivado'}` 
        : `❌ ${result.error || 'Error'}`,
      isCommand: true
    };
  }

  private async handleSubscribersOnly(enabled: boolean): Promise<CommandResult> {
    const result = await this.deps.twitchApiService.updateChatSettings({
      subscriberMode: enabled
    });

    return {
      success: result.success,
      message: result.success 
        ? `✅ Modo solo subs ${enabled ? 'activado' : 'desactivado'}` 
        : `❌ ${result.error || 'Error'}`,
      isCommand: true
    };
  }

  private async handleFollowersOnly(args: string): Promise<CommandResult> {
    const minutes = args ? parseInt(args) : 10;
    
    if (isNaN(minutes) || minutes < 0 || minutes > 129600) {
      return { success: false, message: '❌ Uso: /followers [0-129600 minutos]', isCommand: true };
    }

    const result = await this.deps.twitchApiService.updateChatSettings({
      followerMode: true,
      followerModeDuration: minutes
    });

    return {
      success: result.success,
      message: result.success 
        ? `✅ Modo solo seguidores activado (${minutes} min)` 
        : `❌ ${result.error || 'Error'}`,
      isCommand: true
    };
  }

  private async handleFollowersOnlyOff(): Promise<CommandResult> {
    const result = await this.deps.twitchApiService.updateChatSettings({
      followerMode: false
    });

    return {
      success: result.success,
      message: result.success 
        ? `✅ Modo solo seguidores desactivado` 
        : `❌ ${result.error || 'Error'}`,
      isCommand: true
    };
  }

  private async handleShoutout(username: string): Promise<CommandResult> {
    if (!username.trim()) {
      return { success: false, message: '❌ Uso: /shoutout <usuario>', isCommand: true };
    }

    const cleanUsername = username.replace('@', '').trim();
    const result = await this.deps.twitchApiService.sendShoutout(cleanUsername);

    return {
      success: result.success,
      message: result.success 
        ? `✅ Shoutout enviado a ${cleanUsername}` 
        : `❌ ${result.error || 'Error al enviar shoutout'}`,
      isCommand: true,
      systemNotification: result.success ? {
        type: 'shoutout',
        icon: '📢',
        text: `Shoutout enviado a @${cleanUsername}`,
      } : undefined,
    };
  }

  private async handleRaid(username: string): Promise<CommandResult> {
    if (!username.trim()) {
      return { success: false, message: '❌ Uso: /raid <usuario>', isCommand: true };
    }

    const cleanUsername = username.replace('@', '').trim();
    const result = await this.deps.twitchApiService.startRaid(cleanUsername);

    return {
      success: result.success,
      message: result.success 
        ? `✅ Raid iniciado hacia ${cleanUsername}` 
        : `❌ ${result.error || 'Error al iniciar raid'}`,
      isCommand: true,
      systemNotification: result.success ? {
        type: 'raid',
        icon: '🚀',
        text: `Raid iniciado hacia @${cleanUsername}`,
      } : undefined,
    };
  }

  private async handleClip(): Promise<CommandResult> {
    const result = await this.deps.twitchApiService.createClip();

    return {
      success: result.success,
      message: result.success 
        ? `✅ Clip creado${result.editUrl ? `: ${result.editUrl}` : ''}` 
        : `❌ ${result.error || 'Error al crear clip'}`,
      isCommand: true,
      systemNotification: result.success ? {
        type: 'clip',
        icon: '🎬',
        text: 'Clip creado',
        link: result.editUrl,
      } : undefined,
    };
  }

  private async handlePoll(args: string): Promise<CommandResult> {
    // Format: /poll Título | Opción 1 | Opción 2 | ...
    const parts = args.split('|').map(p => p.trim()).filter(p => p);
    
    if (parts.length < 3) {
      return { 
        success: false, 
        message: '❌ Uso: /poll Título | Opción 1 | Opción 2 [| Opción 3 ...]', 
        isCommand: true 
      };
    }

    const title = parts[0];
    const choices = parts.slice(1);

    if (choices.length < 2 || choices.length > 5) {
      return { 
        success: false, 
        message: '❌ Las encuestas necesitan entre 2 y 5 opciones', 
        isCommand: true 
      };
    }

    const result = await this.deps.twitchApiService.createPoll({
      title,
      choices,
      duration: 60 // Default 60 seconds
    });

    return {
      success: result.success,
      message: result.success 
        ? `✅ Encuesta creada: "${title}"` 
        : `❌ ${result.error || 'Error al crear encuesta'}`,
      isCommand: true,
      systemNotification: result.success ? {
        type: 'poll',
        icon: '📊',
        text: `Encuesta creada: "${title}"`,
      } : undefined,
    };
  }

  private async handlePrediction(args: string): Promise<CommandResult> {
    // Format: /prediction Título | Resultado 1 | Resultado 2
    const parts = args.split('|').map(p => p.trim()).filter(p => p);
    
    if (parts.length < 3) {
      return { 
        success: false, 
        message: '❌ Uso: /prediction Título | Resultado 1 | Resultado 2 [| ...]', 
        isCommand: true 
      };
    }

    const title = parts[0];
    const outcomes = parts.slice(1);

    if (outcomes.length < 2 || outcomes.length > 10) {
      return { 
        success: false, 
        message: '❌ Las predicciones necesitan entre 2 y 10 resultados', 
        isCommand: true 
      };
    }

    if (this.deps.createPrediction) {
      const success = await this.deps.createPrediction(title, outcomes, 120);
      return {
        success,
        message: success 
          ? `✅ Predicción creada: "${title}"` 
          : `❌ Error al crear predicción`,
        isCommand: true,
        systemNotification: success ? {
          type: 'prediction',
          icon: '🎯',
          text: `Predicción creada: "${title}"`,
        } : undefined,
      };
    }

    return { 
      success: false, 
      message: '❌ Servicio de predicciones no disponible', 
      isCommand: true 
    };
  }

  private async handleTimeout(args: string): Promise<CommandResult> {
    const parts = args.split(/\s+/);
    const username = parts[0]?.replace('@', '');
    const duration = parts[1] ? parseInt(parts[1]) : 600; // Default 10 minutes

    if (!username) {
      return { success: false, message: '❌ Uso: /timeout <usuario> [segundos]', isCommand: true };
    }

    if (isNaN(duration) || duration < 1 || duration > 1209600) {
      return { success: false, message: '❌ Duración debe ser entre 1 y 1209600 segundos', isCommand: true };
    }

    const success = await this.deps.timeoutUser(username, duration);

    return {
      success,
      message: success 
        ? `✅ ${username} silenciado por ${duration}s` 
        : `❌ Error al silenciar a ${username}`,
      isCommand: true
    };
  }

  private async handleBan(username: string): Promise<CommandResult> {
    const cleanUsername = username.replace('@', '').trim();
    
    if (!cleanUsername) {
      return { success: false, message: '❌ Uso: /ban <usuario>', isCommand: true };
    }

    const success = await this.deps.banUser(cleanUsername);

    return {
      success,
      message: success 
        ? `✅ ${cleanUsername} baneado` 
        : `❌ Error al banear a ${cleanUsername}`,
      isCommand: true
    };
  }

  private async handleUnban(username: string): Promise<CommandResult> {
    const cleanUsername = username.replace('@', '').trim();
    
    if (!cleanUsername) {
      return { success: false, message: '❌ Uso: /unban <usuario>', isCommand: true };
    }

    const success = await this.deps.unbanUser(cleanUsername);

    return {
      success,
      message: success 
        ? `✅ ${cleanUsername} desbaneado` 
        : `❌ Error al desbanear a ${cleanUsername}`,
      isCommand: true
    };
  }

  private async handleVIP(username: string, add: boolean): Promise<CommandResult> {
    const cleanUsername = username.replace('@', '').trim();
    
    if (!cleanUsername) {
      return { success: false, message: `❌ Uso: /${add ? 'vip' : 'unvip'} <usuario>`, isCommand: true };
    }

    const success = add 
      ? await this.deps.addVIP(cleanUsername)
      : await this.deps.removeVIP(cleanUsername);

    return {
      success,
      message: success 
        ? `✅ ${cleanUsername} ${add ? 'ahora es VIP' : 'ya no es VIP'}` 
        : `❌ Error al ${add ? 'dar' : 'quitar'} VIP a ${cleanUsername}`,
      isCommand: true
    };
  }

  private async handleMod(username: string, add: boolean): Promise<CommandResult> {
    const cleanUsername = username.replace('@', '').trim();
    
    if (!cleanUsername) {
      return { success: false, message: `❌ Uso: /${add ? 'mod' : 'unmod'} <usuario>`, isCommand: true };
    }

    const success = add 
      ? await this.deps.addModerator(cleanUsername)
      : await this.deps.removeModerator(cleanUsername);

    return {
      success,
      message: success 
        ? `✅ ${cleanUsername} ${add ? 'ahora es moderador' : 'ya no es moderador'}` 
        : `❌ Error al ${add ? 'dar' : 'quitar'} mod a ${cleanUsername}`,
      isCommand: true
    };
  }

  /**
   * Get list of available commands
   */
  static getAvailableCommands(): string[] {
    return [
      '/announce <mensaje> - Enviar anuncio',
      '/announceblue <mensaje> - Anuncio azul',
      '/announcegreen <mensaje> - Anuncio verde',
      '/announceorange <mensaje> - Anuncio naranja',
      '/announcepurple <mensaje> - Anuncio morado',
      '/slow [segundos] - Modo lento (default 30s)',
      '/slowoff - Desactivar modo lento',
      '/emoteonly - Solo emotes',
      '/emoteonlyoff - Desactivar solo emotes',
      '/subscribers - Solo suscriptores',
      '/subscribersoff - Desactivar solo subs',
      '/followers [minutos] - Solo seguidores',
      '/followersoff - Desactivar solo seguidores',
      '/shoutout <usuario> - Shoutout',
      '/raid <usuario> - Iniciar raid',
      '/clip - Crear clip',
      '/poll Título | Op1 | Op2 - Crear encuesta',
      '/prediction Título | R1 | R2 - Crear predicción',
      '/timeout <usuario> [segundos] - Silenciar',
      '/ban <usuario> - Banear',
      '/unban <usuario> - Desbanear',
      '/vip <usuario> - Dar VIP',
      '/unvip <usuario> - Quitar VIP',
      '/mod <usuario> - Dar mod',
      '/unmod <usuario> - Quitar mod',
    ];
  }
}

export default ChatCommandService;
