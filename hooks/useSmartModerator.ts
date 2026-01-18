import { useCallback, useMemo, useState, useRef } from 'react';
import { useOfflineAI } from './useOfflineAI';
import type { ChatMessage } from './useLocalModerator';

interface ModerationRule {
  id: string;
  name: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high';
  action: 'warn' | 'timeout' | 'ban' | 'delete';
  pattern?: RegExp;
  keywords?: string[];
  cooldown?: number;
}

interface ModerationResult {
  action: 'allow' | 'warn' | 'timeout' | 'ban' | 'delete';
  reason: string;
  confidence: number;
  triggeredRules: string[];
  suggestedResponse?: string;
}

interface UserBehavior {
  messageCount: number;
  spamScore: number;
  toxicityScore: number;
  lastMessageTime: number;
  warnings: number;
  timeouts: number;
}

/**
 * Hook de moderación inteligente y autosuficiente
 * 
 * Características:
 * - Análisis de comportamiento de usuarios
 * - Detección avanzada de spam y toxicidad
 * - Sistema de reglas personalizable
 * - Aprendizaje de patrones
 * - Funciona completamente offline
 */
export function useSmartModerator() {
  const { analyzeChatMessages, analyzeSentiment } = useOfflineAI();
  const [userBehaviors, setUserBehaviors] = useState<Map<string, UserBehavior>>(new Map());
  const messageHistory = useRef<ChatMessage[]>([]);
  const [moderationStats, setModerationStats] = useState({
    messagesProcessed: 0,
    spamBlocked: 0,
    toxicityBlocked: 0,
    warningsIssued: 0
  });

  // Reglas de moderación predefinidas
  const defaultRules = useMemo((): ModerationRule[] => [
    {
      id: 'spam-repetition',
      name: 'Spam por repetición',
      enabled: true,
      severity: 'medium',
      action: 'timeout',
      pattern: /(.)\1{5,}/,
      cooldown: 300 // 5 minutos
    },
    {
      id: 'spam-caps',
      name: 'Spam en mayúsculas',
      enabled: true,
      severity: 'low',
      action: 'warn',
      pattern: /^[A-Z\s!]{10,}$/
    },
    {
      id: 'toxicity-insults',
      name: 'Insultos y toxicidad',
      enabled: true,
      severity: 'high',
      action: 'timeout',
      keywords: [
        'idiota', 'estúpido', 'tonto', 'imbécil', 'basura', 'cancer',
        'kill yourself', 'kys', 'die', 'hate', 'trash', 'noob'
      ],
      cooldown: 600 // 10 minutos
    },
    {
      id: 'spam-links',
      name: 'Spam de enlaces',
      enabled: true,
      severity: 'high',
      action: 'ban',
      pattern: /(https?:\/\/[^\s]+)/gi
    },
    {
      id: 'excessive-emotes',
      name: 'Exceso de emotes',
      enabled: true,
      severity: 'low',
      action: 'delete',
      pattern: /([\u{1F600}-\u{1F64F}]){8,}/u
    },
    {
      id: 'rapid-fire',
      name: 'Mensajes muy rápidos',
      enabled: true,
      severity: 'medium',
      action: 'timeout',
      cooldown: 180 // 3 minutos
    }
  ], []);

  const [rules, setRules] = useState<ModerationRule[]>(defaultRules);

  // Actualizar comportamiento del usuario
  const updateUserBehavior = useCallback((username: string, message: ChatMessage) => {
    setUserBehaviors(prev => {
      const newBehaviors = new Map(prev);
      const current = newBehaviors.get(username) || {
        messageCount: 0,
        spamScore: 0,
        toxicityScore: 0,
        lastMessageTime: 0,
        warnings: 0,
        timeouts: 0
      };

      const now = Date.now();
      const timeDiff = now - current.lastMessageTime;

      // Actualizar estadísticas
      current.messageCount++;
      current.lastMessageTime = now;

      // Calcular spam score basado en frecuencia
      if (timeDiff < 2000) { // Menos de 2 segundos
        current.spamScore += 2;
      } else if (timeDiff < 5000) { // Menos de 5 segundos
        current.spamScore += 1;
      } else {
        current.spamScore = Math.max(0, current.spamScore - 0.5);
      }

      // Analizar toxicidad del mensaje
      const sentiment = analyzeSentiment(message.message);
      if (sentiment.mood === 'toxic') {
        current.toxicityScore += sentiment.confidence * 2;
      } else {
        current.toxicityScore = Math.max(0, current.toxicityScore - 0.1);
      }

      newBehaviors.set(username, current);
      return newBehaviors;
    });
  }, [analyzeSentiment]);

  // Verificar reglas de moderación
  const checkModerationRules = useCallback((message: ChatMessage): ModerationResult => {
    const triggeredRules: string[] = [];
    let highestSeverity: ModerationRule['severity'] = 'low';
    let recommendedAction: ModerationResult['action'] = 'allow';
    let confidence = 0;

    const userBehavior = userBehaviors.get(message.username);
    const messageText = message.message.toLowerCase();

    // Verificar cada regla
    for (const rule of rules) {
      if (!rule.enabled) continue;

      let ruleTriggered = false;

      // Verificar patrón regex
      if (rule.pattern && rule.pattern.test(message.message)) {
        ruleTriggered = true;
      }

      // Verificar palabras clave
      if (rule.keywords && rule.keywords.some(keyword => messageText.includes(keyword.toLowerCase()))) {
        ruleTriggered = true;
      }

      // Verificar reglas especiales
      if (rule.id === 'rapid-fire' && userBehavior) {
        const timeDiff = Date.now() - userBehavior.lastMessageTime;
        if (timeDiff < 1000 && userBehavior.spamScore > 5) {
          ruleTriggered = true;
        }
      }

      if (ruleTriggered) {
        triggeredRules.push(rule.name);
        
        // Actualizar severidad y acción recomendada
        if (rule.severity === 'high' || (rule.severity === 'medium' && highestSeverity === 'low')) {
          highestSeverity = rule.severity;
          recommendedAction = rule.action;
        }

        // Aumentar confianza
        confidence += rule.severity === 'high' ? 0.4 : rule.severity === 'medium' ? 0.3 : 0.2;
      }
    }

    // Ajustar confianza basada en comportamiento del usuario
    if (userBehavior) {
      if (userBehavior.spamScore > 10) confidence += 0.2;
      if (userBehavior.toxicityScore > 5) confidence += 0.3;
      if (userBehavior.warnings > 2) confidence += 0.1;
    }

    confidence = Math.min(confidence, 1);

    // Generar razón
    let reason = 'Mensaje permitido';
    if (triggeredRules.length > 0) {
      reason = `Reglas activadas: ${triggeredRules.join(', ')}`;
    }

    // Generar respuesta sugerida
    let suggestedResponse: string | undefined;
    if (recommendedAction !== 'allow') {
      const responses = {
        warn: `@${message.username} por favor mantén el respeto en el chat`,
        timeout: `@${message.username} ha sido silenciado temporalmente por ${triggeredRules.join(', ').toLowerCase()}`,
        ban: `@${message.username} ha sido baneado por violación grave de las reglas`,
        delete: `Mensaje de @${message.username} eliminado por ${triggeredRules.join(', ').toLowerCase()}`
      };
      suggestedResponse = responses[recommendedAction];
    }

    return {
      action: recommendedAction,
      reason,
      confidence,
      triggeredRules,
      suggestedResponse
    };
  }, [rules, userBehaviors]);

  // Procesar mensaje completo
  const moderateMessage = useCallback(async (message: ChatMessage): Promise<ModerationResult> => {
    // Actualizar historial
    messageHistory.current.push(message);
    if (messageHistory.current.length > 100) {
      messageHistory.current = messageHistory.current.slice(-100);
    }

    // Actualizar comportamiento del usuario
    updateUserBehavior(message.username, message);

    // Verificar reglas
    const result = checkModerationRules(message);

    // Actualizar estadísticas
    setModerationStats(prev => ({
      messagesProcessed: prev.messagesProcessed + 1,
      spamBlocked: prev.spamBlocked + (result.action === 'timeout' && result.triggeredRules.some(r => r.includes('spam')) ? 1 : 0),
      toxicityBlocked: prev.toxicityBlocked + (result.action !== 'allow' && result.triggeredRules.some(r => r.includes('toxicidad')) ? 1 : 0),
      warningsIssued: prev.warningsIssued + (result.action === 'warn' ? 1 : 0)
    }));

    // Actualizar comportamiento del usuario basado en la acción
    if (result.action === 'warn') {
      setUserBehaviors(prev => {
        const newBehaviors = new Map(prev);
        const userBehavior = newBehaviors.get(message.username);
        if (userBehavior) {
          userBehavior.warnings++;
          newBehaviors.set(message.username, userBehavior);
        }
        return newBehaviors;
      });
    } else if (result.action === 'timeout') {
      setUserBehaviors(prev => {
        const newBehaviors = new Map(prev);
        const userBehavior = newBehaviors.get(message.username);
        if (userBehavior) {
          userBehavior.timeouts++;
          newBehaviors.set(message.username, userBehavior);
        }
        return newBehaviors;
      });
    }

    return result;
  }, [updateUserBehavior, checkModerationRules]);

  // Análisis de tendencias del chat
  const analyzeChatTrends = useCallback(() => {
    const recentMessages = messageHistory.current.slice(-20);
    if (recentMessages.length === 0) return null;

    const messages = recentMessages.map(m => m.message);
    const analysis = analyzeChatMessages(messages);

    return {
      ...analysis,
      messageCount: recentMessages.length,
      uniqueUsers: new Set(recentMessages.map(m => m.username)).size,
      averageMessageLength: messages.reduce((acc, msg) => acc + msg.length, 0) / messages.length
    };
  }, [analyzeChatMessages]);

  // Obtener usuarios problemáticos
  const getProblematicUsers = useCallback(() => {
    const problematicUsers: Array<{
      username: string;
      behavior: UserBehavior;
      riskScore: number;
    }> = [];

    userBehaviors.forEach((behavior, username) => {
      const riskScore = behavior.spamScore * 0.3 + 
                      behavior.toxicityScore * 0.5 + 
                      behavior.warnings * 0.1 + 
                      behavior.timeouts * 0.1;

      if (riskScore > 2) {
        problematicUsers.push({ username, behavior, riskScore });
      }
    });

    return problematicUsers.sort((a, b) => b.riskScore - a.riskScore);
  }, [userBehaviors]);

  // Configurar reglas
  const updateRule = useCallback((ruleId: string, updates: Partial<ModerationRule>) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  }, []);

  const addCustomRule = useCallback((rule: Omit<ModerationRule, 'id'>) => {
    const newRule: ModerationRule = {
      ...rule,
      id: `custom-${Date.now()}`
    };
    setRules(prev => [...prev, newRule]);
  }, []);

  // Limpiar datos antiguos
  const cleanupOldData = useCallback(() => {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hora

    setUserBehaviors(prev => {
      const newBehaviors = new Map();
      prev.forEach((behavior, username) => {
        if (behavior.lastMessageTime > oneHourAgo) {
          newBehaviors.set(username, behavior);
        }
      });
      return newBehaviors;
    });

    messageHistory.current = messageHistory.current.filter(
      msg => msg.timestamp > oneHourAgo
    );
  }, []);

  return {
    moderateMessage,
    analyzeChatTrends,
    getProblematicUsers,
    updateRule,
    addCustomRule,
    cleanupOldData,
    rules,
    moderationStats,
    userBehaviors: Array.from(userBehaviors.entries()).map(([username, behavior]) => ({
      username,
      ...behavior
    }))
  };
}