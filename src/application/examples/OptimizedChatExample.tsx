/**
 * OptimizedChatExample - Demonstrates real-time optimization in chat components
 * Shows before/after performance improvements with comprehensive monitoring
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useChatOptimization, useStreamingOptimization } from '../hooks/useRealTimeOptimization';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  badges?: string[];
  color?: string;
}

interface ChatExampleProps {
  webSocketUrl?: string;
  enableOptimization?: boolean;
  simulateHighActivity?: boolean;
}

/**
 * Optimized Chat Component using real-time optimization hooks
 */
export function OptimizedChatExample({ 
  webSocketUrl, 
  enableOptimization = true,
  simulateHighActivity = false 
}: ChatExampleProps) {
  // Use optimization hooks
  const chatOptimization = useChatOptimization();
  const streamOptimization = useStreamingOptimization(webSocketUrl);
  
  // Choose optimization based on prop
  const optimization = webSocketUrl ? streamOptimization : chatOptimization;
  
  // Create optimized chat handler
  const { messages, addMessage, clearMessages } = optimization.createChatHandler();
  
  // Performance monitoring
  const { performanceStats } = optimization;
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  
  // Track renders for performance comparison
  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    lastRenderTime.current = now;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Chat render #${renderCount.current}, time since last: ${timeSinceLastRender}ms`);
    }
  });

  // Simulate high-activity chat for testing
  useEffect(() => {
    if (!simulateHighActivity) return;

    const interval = setInterval(() => {
      const simulatedMessage: ChatMessage = {
        id: `sim_${Date.now()}_${Math.random()}`,
        username: `User${Math.floor(Math.random() * 1000)}`,
        message: `Simulated message ${Date.now()}`,
        timestamp: Date.now(),
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      };

      if (enableOptimization) {
        // Use optimized handler (debounced/batched)
        addMessage(simulatedMessage);
      } else {
        // Direct state update (unoptimized)
        // This would cause excessive re-renders in real implementation
        console.log('Unoptimized message:', simulatedMessage);
      }
    }, 100); // 10 messages per second

    return () => clearInterval(interval);
  }, [simulateHighActivity, enableOptimization, addMessage]);

  // Handle new message input
  const handleNewMessage = useCallback((messageText: string) => {
    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      username: 'StreamCrowdUser',
      message: messageText,
      timestamp: Date.now(),
      badges: ['broadcaster'],
      color: '#ff6b6b'
    };

    addMessage(newMessage);
  }, [addMessage]);

  // WebSocket message handler
  useEffect(() => {
    if (!optimization.webSocketManager) return;

    const handleWebSocketMessage = (wsMessage: any) => {
      if (wsMessage.type === 'chat_message') {
        const chatMessage: ChatMessage = {
          id: wsMessage.data.id || `ws_${Date.now()}`,
          username: wsMessage.data.username,
          message: wsMessage.data.message,
          timestamp: wsMessage.data.timestamp || Date.now(),
          badges: wsMessage.data.badges,
          color: wsMessage.data.color
        };

        addMessage(chatMessage);
      }
    };

    optimization.webSocketManager.on('message', handleWebSocketMessage);

    return () => {
      optimization.webSocketManager?.off('message', handleWebSocketMessage);
    };
  }, [optimization.webSocketManager, addMessage]);

  return (
    <div className="optimized-chat-example">
      {/* Performance Stats Panel */}
      <div className="performance-panel bg-gray-100 p-4 mb-4 rounded">
        <h3 className="font-bold mb-2">Performance Monitoring</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-semibold">CPU Reduction</div>
            <div className={`text-lg ${performanceStats.cpuUsageReduction > 50 ? 'text-green-600' : 'text-yellow-600'}`}>
              {performanceStats.cpuUsageReduction.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="font-semibold">Messages/sec</div>
            <div className="text-lg">{performanceStats.messagesPerSecond.toFixed(1)}</div>
          </div>
          <div>
            <div className="font-semibold">Renders</div>
            <div className="text-lg">{renderCount.current}</div>
          </div>
          <div>
            <div className="font-semibold">Avg Latency</div>
            <div className="text-lg">{performanceStats.averageLatency}ms</div>
          </div>
        </div>
        
        {/* Detailed optimization stats */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-semibold">Debounce Efficiency</div>
            <div>
              Calls: {performanceStats.debounceStats.calls}, 
              Executions: {performanceStats.debounceStats.executions}
              {performanceStats.debounceStats.calls > 0 && (
                <span className="text-green-600 ml-1">
                  ({((1 - performanceStats.debounceStats.executions / performanceStats.debounceStats.calls) * 100).toFixed(1)}% saved)
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="font-semibold">Batch Efficiency</div>
            <div>
              Total: {performanceStats.batchStats.totalUpdates}, 
              Batched: {performanceStats.batchStats.batchedUpdates}
              {performanceStats.batchStats.totalUpdates > 0 && (
                <span className="text-green-600 ml-1">
                  ({((1 - performanceStats.batchStats.batchedUpdates / performanceStats.batchStats.totalUpdates) * 100).toFixed(1)}% reduction)
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="font-semibold">Deduplication</div>
            <div>
              Requests: {performanceStats.deduplicationStats.totalRequests}, 
              Filtered: {performanceStats.deduplicationStats.duplicatesFiltered}
            </div>
          </div>
        </div>

        {/* WebSocket stats if available */}
        {performanceStats.webSocketStats && (
          <div className="mt-4 p-2 bg-blue-50 rounded">
            <div className="font-semibold text-sm">WebSocket Status</div>
            <div className="text-xs">
              Connected: {performanceStats.webSocketStats.isConnected ? '✅' : '❌'} | 
              Received: {performanceStats.webSocketStats.messagesReceived} | 
              Sent: {performanceStats.webSocketStats.messagesSent} | 
              Reconnects: {performanceStats.webSocketStats.reconnectAttempts}
            </div>
          </div>
        )}
      </div>

      {/* Chat Controls */}
      <div className="chat-controls mb-4 flex gap-2">
        <button
          onClick={() => handleNewMessage(`Test message ${Date.now()}`)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Send Test Message
        </button>
        <button
          onClick={clearMessages}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear Messages
        </button>
        {optimization.webSocketManager && (
          <button
            onClick={() => optimization.sendWebSocketMessage({
              type: 'test_message',
              message: `WebSocket test ${Date.now()}`
            })}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Send WebSocket Message
          </button>
        )}
      </div>

      {/* Chat Messages Display */}
      <div className="chat-messages bg-gray-900 text-white p-4 rounded h-96 overflow-y-auto">
        <div className="text-sm text-gray-400 mb-2">
          {messages.length} messages | Optimization: {enableOptimization ? 'ON' : 'OFF'}
        </div>
        
        {messages.length === 0 ? (
          <div className="text-gray-500 italic">No messages yet...</div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <div key={message.id} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 min-w-[60px]">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
                <span 
                  className="font-semibold min-w-[100px]"
                  style={{ color: message.color || '#ffffff' }}
                >
                  {message.username}:
                </span>
                <span className="flex-1">{message.message}</span>
                {message.badges && (
                  <div className="flex gap-1">
                    {message.badges.map((badge, index) => (
                      <span key={index} className="text-xs bg-purple-600 px-1 rounded">
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration Display */}
      <div className="mt-4 text-xs text-gray-600">
        <div className="font-semibold">Current Configuration:</div>
        <div>Debounce: {optimization.config.debounceDelay}ms</div>
        <div>Throttle: {optimization.config.throttleInterval}ms</div>
        <div>Batch Size: {optimization.config.batchSize}</div>
        <div>Batch Delay: {optimization.config.batchDelay}ms</div>
        <div>WebSocket: {optimization.config.enableWebSocket ? 'Enabled' : 'Disabled'}</div>
      </div>
    </div>
  );
}

/**
 * Comparison component showing optimized vs unoptimized performance
 */
export function ChatPerformanceComparison() {
  const [showOptimized, setShowOptimized] = useState(true);
  const [simulateActivity, setSimulateActivity] = useState(false);

  return (
    <div className="chat-performance-comparison">
      <div className="controls mb-4 flex gap-4 items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showOptimized}
            onChange={(e) => setShowOptimized(e.target.checked)}
          />
          Enable Optimization
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={simulateActivity}
            onChange={(e) => setSimulateActivity(e.target.checked)}
          />
          Simulate High Activity (10 msg/sec)
        </label>
      </div>

      <div className="comparison-note mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <div className="font-semibold">Performance Comparison</div>
        <div className="text-sm mt-1">
          Toggle optimization on/off and enable high activity simulation to see the performance difference.
          With optimization enabled, you should see:
          <ul className="list-disc list-inside mt-2">
            <li>Fewer React re-renders (check render count)</li>
            <li>Higher CPU reduction percentage</li>
            <li>Smoother UI during high message frequency</li>
            <li>Better debounce and batch efficiency</li>
          </ul>
        </div>
      </div>

      <OptimizedChatExample
        enableOptimization={showOptimized}
        simulateHighActivity={simulateActivity}
      />
    </div>
  );
}

export default OptimizedChatExample;