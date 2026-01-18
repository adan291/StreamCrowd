import React, { useEffect, useState } from 'react';
import { 
  useKiroBridge, 
  useVoiceSynthesis, 
  useLocalModerator, 
  useThemeOrchestrator,
  useOverlaySync 
} from '@/hooks';
import type { ChatMessage } from '@/hooks';

/**
 * Ejemplo de integración completa de los hooks de IA
 * 
 * Este componente demuestra cómo usar todos los hooks de IA juntos
 * para crear una experiencia interactiva completa.
 */
export function AIIntegrationExample() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [gameEvent, setGameEvent] = useState<string>('');
  
  // Hooks de IA
  const { sendToKiro, isLoading: kiroLoading } = useKiroBridge();
  const { speak, isSpeaking, voices } = useVoiceSynthesis();
  const { moderateMessage } = useLocalModerator();
  const { currentMood, setMood, currentTheme } = useThemeOrchestrator();
  const { state: overlayState, updateState } = useOverlaySync();

  // Simular mensaje de chat
  const simulateChatMessage = async () => {
    const mockMessage: ChatMessage = {
      id: Date.now().toString(),
      username: 'TestUser',
      message: '¡Este juego está increíble! 🔥',
      timestamp: Date.now(),
      isSubscriber: true
    };

    setChatMessages(prev => [...prev, mockMessage]);

    // Moderar mensaje
    const modResult = await moderateMessage(mockMessage);
    console.log('Moderation result:', modResult);

    // Si pasa la moderación, enviar a chat-brain
    if (modResult.action === 'send_to_ai') {
      try {
        const response = await sendToKiro({
          hook: 'chat-brain',
          input: mockMessage.message,
          metadata: { username: mockMessage.username }
        });

        if (response.success && response.data) {
          // Aplicar mood detectado
          if (response.data.mood) {
            setMood(response.data.mood, 10000); // 10 segundos
          }

          // Hablar respuesta si existe
          if (response.data.response) {
            await speak(response.data.response);
          }
        }
      } catch (error) {
        console.error('Error processing chat:', error);
      }
    }
  };

  // Simular evento de juego
  const simulateGameEvent = async () => {
    const event = 'Duelo Pium: @TestUser vs @Challenger';
    setGameEvent(event);

    try {
      const response = await sendToKiro({
        hook: 'game-narrator',
        input: event,
        metadata: { gameType: 'pium' }
      });

      if (response.success && response.data?.speech) {
        // Narrar el evento
        await speak(response.data.speech, {
          rate: 1.2,
          pitch: 1.1
        });

        // Cambiar mood a hype
        setMood('hype', 8000);
      }
    } catch (error) {
      console.error('Error narrating game:', error);
    }
  };

  // Generar título de clip
  const generateClipTitle = async () => {
    const recentMessages = chatMessages.slice(-10).map(m => m.message).join(' | ');
    
    try {
      const response = await sendToKiro({
        hook: 'highlight-editor',
        input: recentMessages,
        metadata: { duration: 120 }
      });

      if (response.success && response.data?.title) {
        alert(`Título sugerido: "${response.data.title}"`);
      }
    } catch (error) {
      console.error('Error generating clip title:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">AI Integration Demo</h2>
      
      {/* Estado actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Current Mood</h3>
          <div 
            className="w-full h-8 rounded flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: currentTheme.colors.primary }}
          >
            {currentMood.toUpperCase()}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Voice Status</h3>
          <div className={`text-center py-2 rounded ${isSpeaking ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            {isSpeaking ? 'Speaking...' : 'Ready'}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Kiro Status</h3>
          <div className={`text-center py-2 rounded ${kiroLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
            {kiroLoading ? 'Processing...' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={simulateChatMessage}
          disabled={kiroLoading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Simulate Chat Message
        </button>
        
        <button
          onClick={simulateGameEvent}
          disabled={kiroLoading || isSpeaking}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Simulate Game Event
        </button>
        
        <button
          onClick={generateClipTitle}
          disabled={kiroLoading || chatMessages.length === 0}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Generate Clip Title
        </button>
      </div>

      {/* Chat Messages */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Chat Messages</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {chatMessages.map(msg => (
            <div key={msg.id} className="flex items-center space-x-2 text-sm">
              <span className="font-medium text-blue-600">{msg.username}:</span>
              <span>{msg.message}</span>
              {msg.isSubscriber && <span className="text-xs bg-purple-100 text-purple-800 px-1 rounded">SUB</span>}
            </div>
          ))}
          {chatMessages.length === 0 && (
            <p className="text-gray-500 text-sm">No messages yet. Click "Simulate Chat Message" to start.</p>
          )}
        </div>
      </div>

      {/* Game Events */}
      {gameEvent && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-orange-800 mb-2">Latest Game Event</h3>
          <p className="text-orange-700">{gameEvent}</p>
        </div>
      )}

      {/* Voice Configuration */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Voice Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Available Voices</label>
            <select className="w-full border rounded px-3 py-2">
              {voices.map((voice, index) => (
                <option key={index} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Test Speech</label>
            <button
              onClick={() => speak('¡Hola streamers! Este es un test de voz.')}
              disabled={isSpeaking}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Test Voice
            </button>
          </div>
        </div>
      </div>

      {/* Mood Controls */}
      <div className="bg-white rounded-lg shadow p-4 mt-6">
        <h3 className="font-semibold mb-3">Manual Mood Control</h3>
        <div className="flex flex-wrap gap-2">
          {(['hype', 'calm', 'toxic', 'confused', 'neutral'] as const).map(mood => (
            <button
              key={mood}
              onClick={() => setMood(mood, 5000)}
              className={`px-3 py-1 rounded text-sm ${
                currentMood === mood 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {mood.charAt(0).toUpperCase() + mood.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}