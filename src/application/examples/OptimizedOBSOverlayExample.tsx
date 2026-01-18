/**
 * OptimizedOBSOverlayExample - Demonstrates OBS overlay optimization
 * Shows real-time poll/vote updates with minimal CPU usage
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useOBSOptimization } from '../hooks/useRealTimeOptimization';

interface PollOption {
  id: string;
  text: string;
  votes: number;
  color: string;
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isActive: boolean;
  endTime?: number;
}

interface OBSOverlayExampleProps {
  enableOptimization?: boolean;
  simulateVoting?: boolean;
  overlayMode?: boolean;
}

/**
 * Optimized OBS Overlay Component for polls
 */
export function OptimizedOBSOverlayExample({ 
  enableOptimization = true,
  simulateVoting = false,
  overlayMode = false
}: OBSOverlayExampleProps) {
  const optimization = useOBSOptimization();
  const { createRealTimeHandler, performanceStats } = optimization;
  
  // Sample poll data
  const [basePollData] = useState<PollData>({
    id: 'sample_poll',
    question: '¿Cuál es tu juego favorito?',
    options: [
      { id: 'option1', text: 'Minecraft', votes: 45, color: '#4CAF50' },
      { id: 'option2', text: 'Fortnite', votes: 32, color: '#2196F3' },
      { id: 'option3', text: 'Among Us', votes: 28, color: '#FF5722' },
      { id: 'option4', text: 'Valorant', votes: 19, color: '#9C27B0' }
    ],
    totalVotes: 124,
    isActive: true,
    endTime: Date.now() + 300000 // 5 minutes from now
  });

  // Use optimized real-time handler for poll data
  const optimizedPollData = createRealTimeHandler(basePollData, {
    throttleInterval: 33, // 30fps for smooth OBS rendering
    maxUpdatesPerSecond: 30,
    priorityUpdates: (prev, next) => {
      // Priority for significant vote changes (>5 votes difference)
      return Math.abs(next.totalVotes - prev.totalVotes) > 5;
    }
  });

  // Performance tracking
  const renderCount = useRef(0);
  const frameTimeRef = useRef<number[]>([]);
  const lastFrameTime = useRef(Date.now());

  // Track rendering performance
  useEffect(() => {
    renderCount.current++;
    const now = Date.now();
    const frameTime = now - lastFrameTime.current;
    lastFrameTime.current = now;
    
    frameTimeRef.current.push(frameTime);
    if (frameTimeRef.current.length > 60) { // Keep last 60 frames
      frameTimeRef.current.shift();
    }
  });

  // Calculate average FPS
  const averageFPS = frameTimeRef.current.length > 0 
    ? 1000 / (frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length)
    : 0;

  // Simulate voting activity for testing
  useEffect(() => {
    if (!simulateVoting) return;

    const interval = setInterval(() => {
      const randomOption = Math.floor(Math.random() * basePollData.options.length);
      const voteIncrement = Math.floor(Math.random() * 3) + 1; // 1-3 votes
      
      const updatedPollData: PollData = {
        ...basePollData,
        options: basePollData.options.map((option, index) => 
          index === randomOption 
            ? { ...option, votes: option.votes + voteIncrement }
            : option
        ),
        totalVotes: basePollData.totalVotes + voteIncrement
      };

      // Update base data for next iteration
      Object.assign(basePollData, updatedPollData);
      
      if (enableOptimization) {
        // The optimized handler will throttle these updates
        // In a real implementation, this would trigger the real-time handler
        console.log('Optimized vote update:', updatedPollData.totalVotes);
      } else {
        // Direct updates would cause excessive re-renders
        console.log('Unoptimized vote update:', updatedPollData.totalVotes);
      }
    }, 200); // 5 votes per second

    return () => clearInterval(interval);
  }, [simulateVoting, enableOptimization, basePollData]);

  // Calculate percentages
  const pollWithPercentages = {
    ...optimizedPollData,
    options: optimizedPollData.options.map(option => ({
      ...option,
      percentage: optimizedPollData.totalVotes > 0 
        ? (option.votes / optimizedPollData.totalVotes) * 100 
        : 0
    }))
  };

  // OBS overlay styles
  const overlayStyles = overlayMode ? {
    background: 'transparent',
    color: 'white',
    fontFamily: 'Arial, sans-serif'
  } : {};

  return (
    <div 
      className={`obs-overlay-example ${overlayMode ? 'overlay-mode' : 'preview-mode'}`}
      style={overlayStyles}
    >
      {/* Performance Monitor (hidden in overlay mode) */}
      {!overlayMode && (
        <div className="performance-monitor bg-black bg-opacity-75 text-white p-4 mb-4 rounded">
          <h3 className="font-bold mb-2">OBS Performance Monitor</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-300">CPU Reduction</div>
              <div className={`text-lg font-bold ${performanceStats.cpuUsageReduction > 40 ? 'text-green-400' : 'text-yellow-400'}`}>
                {performanceStats.cpuUsageReduction.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-300">Avg FPS</div>
              <div className={`text-lg font-bold ${averageFPS > 25 ? 'text-green-400' : 'text-red-400'}`}>
                {averageFPS.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="text-gray-300">Renders</div>
              <div className="text-lg font-bold text-blue-400">{renderCount.current}</div>
            </div>
            <div>
              <div className="text-gray-300">Total Votes</div>
              <div className="text-lg font-bold text-purple-400">{optimizedPollData.totalVotes}</div>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            Throttle: {optimization.config.throttleInterval}ms | 
            Max Updates: {optimization.config.maxUpdatesPerSecond}/sec | 
            Batch Size: {optimization.config.batchSize}
          </div>
        </div>
      )}

      {/* Poll Display */}
      <div className={`poll-display ${overlayMode ? 'overlay-poll' : 'preview-poll'}`}>
        {/* Poll Question */}
        <div className={`poll-question ${overlayMode ? 'text-2xl font-bold mb-6 text-center text-white drop-shadow-lg' : 'text-xl font-bold mb-4 text-center'}`}>
          {pollWithPercentages.question}
        </div>

        {/* Poll Options */}
        <div className="poll-options space-y-3">
          {pollWithPercentages.options.map((option, index) => (
            <div key={option.id} className="poll-option">
              {/* Option Header */}
              <div className="flex justify-between items-center mb-1">
                <span className={`font-semibold ${overlayMode ? 'text-white drop-shadow' : 'text-gray-800'}`}>
                  {option.text}
                </span>
                <span className={`text-sm ${overlayMode ? 'text-gray-200 drop-shadow' : 'text-gray-600'}`}>
                  {option.votes} votos ({option.percentage.toFixed(1)}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className={`progress-bar-container ${overlayMode ? 'bg-black bg-opacity-50' : 'bg-gray-200'} rounded-full h-6 relative overflow-hidden`}>
                <div
                  className="progress-bar h-full rounded-full transition-all duration-300 ease-out relative"
                  style={{
                    width: `${option.percentage}%`,
                    backgroundColor: option.color,
                    boxShadow: overlayMode ? '0 0 10px rgba(255,255,255,0.3)' : 'none'
                  }}
                >
                  {/* Animated shine effect for overlay mode */}
                  {overlayMode && (
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
                      style={{
                        animation: 'shine 2s infinite',
                        transform: 'skewX(-25deg)'
                      }}
                    />
                  )}
                </div>
                
                {/* Vote count overlay */}
                <div className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${
                  overlayMode ? 'text-white drop-shadow' : 'text-gray-800'
                }`}>
                  {option.votes}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Poll Footer */}
        <div className={`poll-footer mt-6 text-center ${overlayMode ? 'text-gray-200 drop-shadow' : 'text-gray-600'}`}>
          <div className="text-lg font-semibold">
            Total: {pollWithPercentages.totalVotes} votos
          </div>
          {pollWithPercentages.endTime && (
            <div className="text-sm mt-1">
              Tiempo restante: {Math.max(0, Math.ceil((pollWithPercentages.endTime - Date.now()) / 1000))}s
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-25deg); }
          100% { transform: translateX(200%) skewX(-25deg); }
        }
        
        .overlay-mode {
          background: transparent !important;
          min-height: 400px;
        }
        
        .overlay-poll {
          padding: 20px;
          max-width: 500px;
          margin: 0 auto;
        }
        
        .preview-poll {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .progress-bar {
          transition: width 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * OBS Integration Controls
 */
export function OBSIntegrationControls() {
  const [overlayMode, setOverlayMode] = useState(false);
  const [simulateVoting, setSimulateVoting] = useState(false);
  const [enableOptimization, setEnableOptimization] = useState(true);

  return (
    <div className="obs-integration-controls">
      <div className="controls-panel bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-bold mb-3">OBS Integration Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={overlayMode}
              onChange={(e) => setOverlayMode(e.target.checked)}
            />
            <span>Overlay Mode (Transparent)</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={simulateVoting}
              onChange={(e) => setSimulateVoting(e.target.checked)}
            />
            <span>Simulate Voting (5/sec)</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={enableOptimization}
              onChange={(e) => setEnableOptimization(e.target.checked)}
            />
            <span>Enable Optimization</span>
          </label>
        </div>

        {overlayMode && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="font-semibold text-sm">OBS Setup Instructions:</div>
            <ol className="text-sm mt-1 list-decimal list-inside space-y-1">
              <li>Add Browser Source in OBS</li>
              <li>Set URL to: <code className="bg-gray-200 px-1 rounded">http://localhost:5173/obs-overlay</code></li>
              <li>Set Width: 500px, Height: 400px</li>
              <li>Enable "Shutdown source when not visible"</li>
              <li>Enable "Refresh browser when scene becomes active"</li>
            </ol>
          </div>
        )}
      </div>

      <OptimizedOBSOverlayExample
        overlayMode={overlayMode}
        simulateVoting={simulateVoting}
        enableOptimization={enableOptimization}
      />
    </div>
  );
}

export default OptimizedOBSOverlayExample;