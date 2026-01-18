import React, { useState, useCallback } from 'react';
import {
  useOfflineAI,
  useSmartModerator,
  useAdvancedOverlaySync,
  useIntelligentVoice,
  usePerformanceOptimizer,
  type ChatMessage
} from '@/hooks';

/**
 * Demostración completa de los hooks self-sustained
 * 
 * Este componente muestra cómo todos los hooks funcionan juntos
 * sin dependencias externas de IA, completamente offline.
 */
export function SelfSustainedAIDemo() {
  const [chatInput, setChatInput] = useState('');
  const [gameEvent, setGameEvent] = useState('');
  const [simulatedMessages, setSimulatedMessages] = useState<ChatMessage[]>([]);
  
  // Hooks self-sustained
  const {
    analyzeChatMessages,
    generateGameNarration,
    generateClipSuggestion,
    generateStreamSummary
  } = useOfflineAI();

  const {
    moderateMessage,
    analyzeChatTrends,
    getProblematicUsers,
    moderationStats
    // userBehaviors - unused for now
  } = useSmartModerator();

  const {
    state: overlayState,
    updateState: updateOverlay,
    // isConnected, - unused for now
    isOffline,
    addNotification
    // syncStats - unused for now
  } = useAdvancedOverlaySync('demo-channel');

  const {
    speak,
    speakImmediate,
    isSpeaking,
    queue,
    currentPersonality,
    setPersonality,
    stats: voiceStats
  } = useIntelligentVoice();

  const {
    metrics,
    // settings, - unused for now
    getRecommendations,
    isLowPerformanceDevice,
    optimizeComponent,
    debounce,
    measurePerformance
  } = usePerformanceOptimizer();

  // Función optimizada para procesar chat
  const processOptimizedChat = useCallback(
    optimizeComponent(
      async (message: ChatMessage) => {
        await measurePerformance('chat-processing', async () => {
          // 1. Moderación inteligente
          const modResult = await moderateMessage(message);
          
          if (modResult.action === 'allow') {
            // 2. Análisis de IA offline
            const analysis = analyzeChatMessages([message.message]);
            
            // 3. Actualizar overlay con mood
            await updateOverlay({
              mood: analysis.mood,
              lastUpdate: Date.now()
            });
            
            // 4. Narración inteligente si es necesario
            if (analysis.action === 'hype') {
              await speak({
                text: analysis.response,
                mood: analysis.mood,
                priority: 'high'
              });
            }
            
            // 5. Notificación en overlay
            addNotification({
              type: analysis.action === 'hype' ? 'success' : 'info',
              message: `Chat ${analysis.mood}: ${analysis.response}`,
              duration: 5000
            });
          } else {
            // Mensaje moderado
            addNotification({
              type: 'warning',
              message: `Mensaje moderado: ${modResult.reason}`,
              duration: 3000
            });
            
            if (modResult.suggestedResponse) {
              await speakImmediate(modResult.suggestedResponse, {
                tone: 'dramatic',
                priority: 'urgent'
              });
            }
          }
        });
      },
      { cache: true, debounce: 300 }
    ),
    [moderateMessage, analyzeChatMessages, updateOverlay, speak, addNotification, speakImmediate, measurePerformance, optimizeComponent]
  );

  // Simular mensaje de chat
  const simulateChatMessage = useCallback(
    debounce(async () => {
      if (!chatInput.trim()) return;

      const message: ChatMessage = {
        id: Date.now().toString(),
        username: `User${Math.floor(Math.random() * 1000)}`,
        message: chatInput,
        timestamp: Date.now(),
        isSubscriber: Math.random() > 0.7,
        isModerator: Math.random() > 0.9
      };

      setSimulatedMessages(prev => [...prev.slice(-9), message]);
      await processOptimizedChat(message);
      setChatInput('');
    }, 500),
    [chatInput, processOptimizedChat, debounce]
  );

  // Simular evento de juego
  const simulateGameEvent = useCallback(async () => {
    if (!gameEvent.trim()) return;

    const narration = generateGameNarration(gameEvent);
    
    await speak({
      text: narration.speech,
      tone: narration.tone,
      priority: 'high'
    });

    await updateOverlay({
      currentGame: {
        event: gameEvent,
        narration: narration.speech,
        tone: narration.tone
      },
      mood: 'hype'
    });

    addNotification({
      type: 'success',
      message: `🎮 ${narration.speech}`,
      duration: narration.duration * 1000
    });

    setGameEvent('');
  }, [gameEvent, generateGameNarration, speak, updateOverlay, addNotification]);

  // Generar clip automático
  const generateAutoClip = useCallback(async () => {
    const recentMessages = simulatedMessages.slice(-5).map(m => m.message);
    const clipSuggestion = generateClipSuggestion(recentMessages);
    
    addNotification({
      type: 'info',
      message: `📹 Clip sugerido: "${clipSuggestion.title}"`,
      duration: 8000
    });

    await speak({
      text: `Clip generado: ${clipSuggestion.title}`,
      priority: 'normal'
    });
  }, [simulatedMessages, generateClipSuggestion, addNotification, speak]);

  // Generar resumen de stream
  const generateStreamSummaryDemo = useCallback(async () => {
    const mockStats = {
      duration: '2h 30m',
      viewers: { peak: 1247, average: 892 },
      followers: { gained: 78 },
      messages: simulatedMessages.length,
      games: ['Pium Game', 'Casino Roulette']
    };

    const summary = generateStreamSummary(mockStats);
    
    await updateOverlay({
      streamSummary: summary
    });

    await speak({
      text: summary.summary,
      priority: 'high',
      personality: 'narrator'
    });

    addNotification({
      type: 'success',
      message: '📊 Resumen del stream generado',
      duration: 5000
    });
  }, [simulatedMessages.length, generateStreamSummary, updateOverlay, speak, addNotification]);

  // Análisis de tendencias del chat
  const chatTrends = analyzeChatTrends();
  const problematicUsers = getProblematicUsers();
  const recommendations = getRecommendations();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">🤖 Self-Sustained AI Demo</h1>
        <p className="text-gray-600">
          Demostración completa de IA offline sin dependencias externas
        </p>
      </div>

      {/* Estado del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">🔗 Conexión</h3>
          <div className={`text-center py-2 rounded ${isOffline ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {isOffline ? '🔴 Offline' : '🟢 Online'}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">🎤 Voz</h3>
          <div className={`text-center py-2 rounded ${isSpeaking ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}>
            {isSpeaking ? 'Hablando...' : 'Listo'}
          </div>
          <div className="text-xs text-center mt-1">
            Cola: {queue.length} | {currentPersonality.name}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">⚡ Performance</h3>
          <div className="text-center">
            <div className="text-lg font-bold">{metrics.fps} FPS</div>
            <div className="text-xs text-gray-500">
              {isLowPerformanceDevice ? '🐌 Dispositivo lento' : '🚀 Dispositivo rápido'}
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">🛡️ Moderación</h3>
          <div className="text-center">
            <div className="text-lg font-bold">{moderationStats.messagesProcessed}</div>
            <div className="text-xs text-gray-500">Mensajes procesados</div>
          </div>
        </div>
      </div>

      {/* Controles principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chat Simulator */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">💬 Simulador de Chat</h2>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe un mensaje de chat..."
                className="w-full border rounded px-3 py-2"
                onKeyPress={(e) => e.key === 'Enter' && simulateChatMessage()}
              />
              <button
                onClick={simulateChatMessage}
                disabled={!chatInput.trim()}
                className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Enviar Mensaje
              </button>
            </div>

            {/* Mensajes recientes */}
            <div className="bg-gray-50 rounded p-3 max-h-40 overflow-y-auto">
              <h4 className="font-medium mb-2">Mensajes Recientes:</h4>
              {simulatedMessages.map(msg => (
                <div key={msg.id} className="text-sm mb-1">
                  <span className="font-medium text-blue-600">{msg.username}:</span>
                  <span className="ml-2">{msg.message}</span>
                  {msg.isSubscriber && <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-1 rounded">SUB</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🎮 Eventos de Juego</h2>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={gameEvent}
                onChange={(e) => setGameEvent(e.target.value)}
                placeholder="Describe un evento de juego..."
                className="w-full border rounded px-3 py-2"
                onKeyPress={(e) => e.key === 'Enter' && simulateGameEvent()}
              />
              <button
                onClick={simulateGameEvent}
                disabled={!gameEvent.trim()}
                className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Narrar Evento
              </button>
            </div>

            {/* Eventos predefinidos */}
            <div className="grid grid-cols-2 gap-2">
              {[
                'Duelo Pium épico entre @user1 y @user2',
                'Ganador de la ruleta: @winner con apuesta de 1000',
                'Pesca exitosa: @fisher capturó un pez legendario',
                'Duck Hunt: @hunter disparó 5 patos seguidos'
              ].map((event, index) => (
                <button
                  key={index}
                  onClick={() => setGameEvent(event)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 p-2 rounded"
                >
                  {event.substring(0, 30)}...
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Análisis y estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tendencias del Chat */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">📈 Tendencias del Chat</h3>
          {chatTrends ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Mood:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  chatTrends.mood === 'hype' ? 'bg-orange-100 text-orange-800' :
                  chatTrends.mood === 'toxic' ? 'bg-red-100 text-red-800' :
                  chatTrends.mood === 'confused' ? 'bg-purple-100 text-purple-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {chatTrends.mood}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mensajes:</span>
                <span>{chatTrends.messageCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Usuarios únicos:</span>
                <span>{chatTrends.uniqueUsers}</span>
              </div>
              <div className="flex justify-between">
                <span>Confianza:</span>
                <span>{(chatTrends.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No hay datos suficientes</p>
          )}
        </div>

        {/* Estadísticas de Moderación */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🛡️ Moderación</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Spam bloqueado:</span>
              <span className="text-red-600">{moderationStats.spamBlocked}</span>
            </div>
            <div className="flex justify-between">
              <span>Toxicidad bloqueada:</span>
              <span className="text-red-600">{moderationStats.toxicityBlocked}</span>
            </div>
            <div className="flex justify-between">
              <span>Advertencias:</span>
              <span className="text-yellow-600">{moderationStats.warningsIssued}</span>
            </div>
            <div className="flex justify-between">
              <span>Usuarios problemáticos:</span>
              <span className="text-orange-600">{problematicUsers.length}</span>
            </div>
          </div>
        </div>

        {/* Estadísticas de Voz */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">🎤 Estadísticas de Voz</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total hablado:</span>
              <span>{voiceStats.totalSpoken}</span>
            </div>
            <div className="flex justify-between">
              <span>Duración promedio:</span>
              <span>{voiceStats.averageDuration.toFixed(1)}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Cola procesada:</span>
              <span>{voiceStats.queueProcessed}</span>
            </div>
            <div className="flex justify-between">
              <span>Interrupciones:</span>
              <span>{voiceStats.interruptionsHandled}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">⚡ Acciones Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={generateAutoClip}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            📹 Generar Clip
          </button>
          
          <button
            onClick={generateStreamSummaryDemo}
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
          >
            📊 Resumen Stream
          </button>
          
          <button
            onClick={() => setPersonality(currentPersonality.id === 'narrator' ? 'commentator' : 'narrator')}
            className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded"
          >
            🎭 Cambiar Voz
          </button>
          
          <button
            onClick={() => addNotification({
              type: 'success',
              message: '🎉 ¡Notificación de prueba!',
              duration: 3000
            })}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            🔔 Test Notificación
          </button>
        </div>
      </div>

      {/* Recomendaciones de Performance */}
      {recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-800">💡 Recomendaciones</h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-yellow-700">
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estado del overlay */}
      {overlayState.notifications && overlayState.notifications.length > 0 && (
        <div className="fixed top-4 right-4 space-y-2 z-50">
          {overlayState.notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg shadow-lg max-w-sm ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              {notification.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}