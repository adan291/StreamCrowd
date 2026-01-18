import { useCallback, useMemo } from 'react';
import { useKiroBridge } from './useKiroBridge';

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  badges?: string[];
  isSubscriber?: boolean;
  isModerator?: boolean;
}

export interface ModerationResult {
  action: 'process_local' | 'send_to_ai' | 'block_spam' | 'block_toxic';
  command?: string;
  args?: string[];
  confidence: number;
  reason?: string;
}

interface UseLocalModeratorReturn {
  moderateMessage: (message: ChatMessage) => Promise<ModerationResult>;
  isSpam: (message: string, username: string) => boolean;
  extractCommand: (message: string) => { command: string; args: string[] } | null;
  shouldSendToAI: (message: string) => boolean;
}

/**
 * Filtro Rápido - Un pre-filtro antes de enviar nada a la IA
 * 
 * Misión: Detectar spam básico y comandos (!pium, !vote) mediante Regex
 * Acción: Si el mensaje es un comando, lo procesa localmente; 
 *         si es lenguaje natural, lo pasa a useKiroBridge
 */
export function useLocalModerator(): UseLocalModeratorReturn {
  const { sendToKiro } = useKiroBridge();

  // Patrones de comandos conocidos
  const commandPatterns = useMemo(() => [
    /^!pium\s*(@\w+)?/i,
    /^!vote\s+(\w+)/i,
    /^!bet\s+(\d+)\s*(\w+)?/i,
    /^!fish/i,
    /^!shoot/i,
    /^!fire\s+([a-j][1-9])/i,
    /^!pass\s+(@\w+)/i,
    /^!flip\s+(\d+)/i,
    /^!(piedra|papel|tijera)/i,
    /^!spin/i,
    /^!cast/i,
  ], []);

  // Patrones de spam
  const spamPatterns = useMemo(() => [
    /(.)\1{4,}/, // Caracteres repetidos (aaaaa)
    /^[A-Z\s!]{10,}$/, // Solo mayúsculas y espacios
    /(https?:\/\/[^\s]+)/i, // URLs (básico)
    /^\d+$/, // Solo números
    /^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/, // Solo símbolos
  ], []);

  // Patrones de toxicidad básica
  const toxicPatterns = useMemo(() => [
    /\b(idiota|estúpido|tonto|imbécil)\b/i,
    /\b(fuck|shit|damn)\b/i,
    /\b(kill\s+yourself|kys)\b/i,
    // Añadir más patrones según necesidad
  ], []);

  const isSpam = useCallback((message: string, _username: string): boolean => {
    // Mensajes muy cortos o muy largos
    if (message.length < 2 || message.length > 500) {
      return true;
    }

    // Verificar patrones de spam
    return spamPatterns.some(pattern => pattern.test(message));
  }, [spamPatterns]);

  const extractCommand = useCallback((message: string): { command: string; args: string[] } | null => {
    const trimmed = message.trim();
    
    for (const pattern of commandPatterns) {
      const match = pattern.exec(trimmed);
      if (match) {
        const parts = trimmed.split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        return { command, args };
      }
    }
    
    return null;
  }, [commandPatterns]);

  const shouldSendToAI = useCallback((message: string): boolean => {
    // No enviar comandos a la IA
    if (extractCommand(message)) {
      return false;
    }

    // No enviar mensajes muy cortos
    if (message.trim().length < 5) {
      return false;
    }

    // No enviar solo emotes o números
    if (/^[\d\s]+$/.test(message) || /^[\u{1F600}-\u{1F64F}\s]+$/u.test(message)) {
      return false;
    }

    return true;
  }, [extractCommand]);

  const moderateMessage = useCallback(async (message: ChatMessage): Promise<ModerationResult> => {
    const { message: text, username } = message;

    // 1. Verificar spam básico
    if (isSpam(text, username)) {
      return {
        action: 'block_spam',
        confidence: 0.9,
        reason: 'Detected spam pattern'
      };
    }

    // 2. Verificar toxicidad básica
    const isToxic = toxicPatterns.some(pattern => pattern.test(text));
    if (isToxic) {
      return {
        action: 'block_toxic',
        confidence: 0.8,
        reason: 'Detected toxic language'
      };
    }

    // 3. Extraer comando si existe
    const commandData = extractCommand(text);
    if (commandData) {
      return {
        action: 'process_local',
        command: commandData.command,
        args: commandData.args,
        confidence: 1.0,
        reason: 'Valid command detected'
      };
    }

    // 4. Determinar si enviar a IA
    if (shouldSendToAI(text)) {
      try {
        // Enviar a chat-brain para análisis avanzado
        await sendToKiro({
          hook: 'chat-brain',
          input: text,
          metadata: {
            username,
            timestamp: message.timestamp,
            badges: message.badges,
            isSubscriber: message.isSubscriber,
            isModerator: message.isModerator
          }
        });

        return {
          action: 'send_to_ai',
          confidence: 0.7,
          reason: 'Sent to AI for analysis'
        };
      } catch (error) {
        console.error('Failed to send to AI:', error);
        
        // Fallback: procesar localmente
        return {
          action: 'process_local',
          confidence: 0.5,
          reason: 'AI unavailable, processed locally'
        };
      }
    }

    // 5. Procesar localmente por defecto
    return {
      action: 'process_local',
      confidence: 0.6,
      reason: 'Standard message processing'
    };
  }, [isSpam, toxicPatterns, extractCommand, shouldSendToAI, sendToKiro]);

  return {
    moderateMessage,
    isSpam,
    extractCommand,
    shouldSendToAI
  };
}