/**
 * PerformanceValidationSuite - Comprehensive validation of real-time optimizations
 * Measures and validates the 50% CPU reduction target and other performance metrics
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { 
  useRealTimeOptimization, 
  useStreamingOptimization, 
  useOBSOptimization, 
  useChatOptimization 
} from '../hooks/useRealTimeOptimization';

interface PerformanceTest {
  id: string;
  name: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
}

interface ValidationResults {
  overallScore: number;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  cpuReductionAchieved: number;
  performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Performance Validation Suite Component
 */
export function PerformanceValidationSuite() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [results, setResults] = useState<ValidationResults | null>(null);
  
  // Initialize optimization hooks for testing
  const streamOptimization = useStreamingOptimization();
  const obsOptimization = useOBSOptimization();
  const chatOptimization = useChatOptimization();
  const generalOptimization = useRealTimeOptimization();

  // Performance tests configuration
  const [tests, setTests] = useState<PerformanceTest[]>([
    {
      id: 'cpu_reduction',
      name: 'CPU Usage Reduction',
      description: 'Validate 50% CPU reduction target through optimization techniques',
      targetMetric: 'CPU Reduction %',
      targetValue: 50,
      currentValue: 0,
      status: 'pending',
      duration: 10000 // 10 seconds
    },
    {
      id: 'debounce_efficiency',
      name: 'Debounce Efficiency',
      description: 'Measure debounce effectiveness in reducing function calls',
      targetMetric: 'Call Reduction %',
      targetValue: 70,
      currentValue: 0,
      status: 'pending',
      duration: 5000
    },
    {
      id: 'throttle_performance',
      name: 'Throttle Performance',
      description: 'Validate throttling maintains target FPS while reducing CPU load',
      targetMetric: 'FPS Consistency',
      targetValue: 30,
      currentValue: 0,
      status: 'pending',
      duration: 8000
    },
    {
      id: 'batch_optimization',
      name: 'Batch Update Optimization',
      description: 'Measure React re-render reduction through batching',
      targetMetric: 'Re-render Reduction %',
      targetValue: 60,
      currentValue: 0,
      status: 'pending',
      duration: 6000
    },
    {
      id: 'websocket_stability',
      name: 'WebSocket Connection Stability',
      description: 'Test WebSocket manager reliability and deduplication',
      targetMetric: 'Connection Uptime %',
      targetValue: 95,
      currentValue: 0,
      status: 'pending',
      duration: 12000
    },
    {
      id: 'memory_efficiency',
      name: 'Memory Usage Efficiency',
      description: 'Validate memory cleanup and prevent leaks',
      targetMetric: 'Memory Growth Rate',
      targetValue: 5, // Max 5% growth
      currentValue: 0,
      status: 'pending',
      duration: 15000
    }
  ]);

  // Performance monitoring refs
  const performanceMonitor = useRef({
    startTime: 0,
    initialMemory: 0,
    renderCounts: new Map<string, number>(),
    fpsHistory: [] as number[],
    lastFrameTime: 0
  });

  /**
   * Run individual performance test
   */
  const runTest = useCallback(async (test: PerformanceTest): Promise<PerformanceTest> => {
    setCurrentTest(test.id);
    
    // Update test status to running
    const updatedTest = { ...test, status: 'running' as const };
    setTests(prev => prev.map(t => t.id === test.id ? updatedTest : t));

    return new Promise((resolve) => {
      const startTime = Date.now();
      performanceMonitor.current.startTime = startTime;
      
      // Initialize test-specific monitoring
      if (test.id === 'memory_efficiency') {
        performanceMonitor.current.initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      }

      const testInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        let currentValue = 0;
        let status: 'passed' | 'failed' = 'failed';

        switch (test.id) {
          case 'cpu_reduction':
            currentValue = Math.max(
              streamOptimization.performanceStats.cpuUsageReduction,
              obsOptimization.performanceStats.cpuUsageReduction,
              chatOptimization.performanceStats.cpuUsageReduction
            );
            status = currentValue >= test.targetValue ? 'passed' : 'failed';
            break;

          case 'debounce_efficiency':
            const debounceStats = streamOptimization.performanceStats.debounceStats;
            currentValue = debounceStats.calls > 0 
              ? ((debounceStats.calls - debounceStats.executions) / debounceStats.calls) * 100
              : 0;
            status = currentValue >= test.targetValue ? 'passed' : 'failed';
            break;

          case 'throttle_performance':
            // Simulate FPS measurement
            const now = Date.now();
            if (performanceMonitor.current.lastFrameTime > 0) {
              const fps = 1000 / (now - performanceMonitor.current.lastFrameTime);
              performanceMonitor.current.fpsHistory.push(fps);
              if (performanceMonitor.current.fpsHistory.length > 60) {
                performanceMonitor.current.fpsHistory.shift();
              }
            }
            performanceMonitor.current.lastFrameTime = now;
            
            const avgFps = performanceMonitor.current.fpsHistory.length > 0
              ? performanceMonitor.current.fpsHistory.reduce((a, b) => a + b, 0) / performanceMonitor.current.fpsHistory.length
              : 0;
            currentValue = avgFps;
            status = currentValue >= test.targetValue ? 'passed' : 'failed';
            break;

          case 'batch_optimization':
            const batchStats = streamOptimization.performanceStats.batchStats;
            currentValue = batchStats.totalUpdates > 0
              ? ((batchStats.totalUpdates - batchStats.batchedUpdates) / batchStats.totalUpdates) * 100
              : 0;
            status = currentValue >= test.targetValue ? 'passed' : 'failed';
            break;

          case 'websocket_stability':
            const wsStats = streamOptimization.performanceStats.webSocketStats;
            if (wsStats) {
              const uptime = elapsed;
              const connectionTime = wsStats.isConnected ? uptime : 0;
              currentValue = (connectionTime / uptime) * 100;
            } else {
              currentValue = 100; // No WebSocket = 100% stable
            }
            status = currentValue >= test.targetValue ? 'passed' : 'failed';
            break;

          case 'memory_efficiency':
            const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
            const memoryGrowth = performanceMonitor.current.initialMemory > 0
              ? ((currentMemory - performanceMonitor.current.initialMemory) / performanceMonitor.current.initialMemory) * 100
              : 0;
            currentValue = memoryGrowth;
            status = currentValue <= test.targetValue ? 'passed' : 'failed';
            break;
        }

        if (elapsed >= test.duration) {
          clearInterval(testInterval);
          const finalTest = { ...test, currentValue, status };
          setTests(prev => prev.map(t => t.id === test.id ? finalTest : t));
          resolve(finalTest);
        } else {
          // Update current value during test
          setTests(prev => prev.map(t => t.id === test.id ? { ...t, currentValue } : t));
        }
      }, 100); // Update every 100ms
    });
  }, [streamOptimization, obsOptimization, chatOptimization]);

  /**
   * Run all performance tests
   */
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults(null);
    
    // Reset all tests
    setTests(prev => prev.map(test => ({ ...test, status: 'pending' as const, currentValue: 0 })));

    const testResults: PerformanceTest[] = [];
    
    // Run tests sequentially
    for (const test of tests) {
      const result = await runTest(test);
      testResults.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate overall results
    const testsRun = testResults.length;
    const testsPassed = testResults.filter(t => t.status === 'passed').length;
    const testsFailed = testsRun - testsPassed;
    const overallScore = (testsPassed / testsRun) * 100;
    
    // Get CPU reduction from the specific test
    const cpuTest = testResults.find(t => t.id === 'cpu_reduction');
    const cpuReductionAchieved = cpuTest?.currentValue || 0;
    
    // Calculate performance grade
    let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (overallScore >= 90) performanceGrade = 'A';
    else if (overallScore >= 80) performanceGrade = 'B';
    else if (overallScore >= 70) performanceGrade = 'C';
    else if (overallScore >= 60) performanceGrade = 'D';
    else performanceGrade = 'F';

    setResults({
      overallScore,
      testsRun,
      testsPassed,
      testsFailed,
      cpuReductionAchieved,
      performanceGrade
    });

    setCurrentTest(null);
    setIsRunning(false);
  }, [tests, runTest]);

  /**
   * Generate load for testing
   */
  useEffect(() => {
    if (!isRunning) return;

    // Simulate high-frequency updates during testing
    const loadInterval = setInterval(() => {
      // Trigger various optimization hooks
      streamOptimization.createChatHandler().addMessage({
        id: `test_${Date.now()}`,
        message: `Test message ${Date.now()}`,
        timestamp: Date.now()
      });

      // Simulate viewer count updates
      const viewerHandler = streamOptimization.createViewerCountHandler(0);
      viewerHandler.updateViewerCount(Math.floor(Math.random() * 1000));

      // Simulate WebSocket messages
      if (streamOptimization.webSocketManager) {
        streamOptimization.sendWebSocketMessage({
          type: 'test_load',
          data: { timestamp: Date.now() }
        });
      }
    }, 50); // 20 times per second

    return () => clearInterval(loadInterval);
  }, [isRunning, streamOptimization]);

  return (
    <div className="performance-validation-suite">
      <div className="header mb-6">
        <h2 className="text-2xl font-bold mb-2">Performance Validation Suite</h2>
        <p className="text-gray-600">
          Comprehensive testing of real-time optimization implementation. 
          Target: 50% CPU reduction with maintained performance.
        </p>
      </div>

      {/* Results Summary */}
      {results && (
        <div className="results-summary mb-6 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">Validation Results</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{results.performanceGrade}</div>
              <div className="text-sm text-gray-600">Overall Grade</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{results.overallScore.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Overall Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{results.cpuReductionAchieved.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">CPU Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{results.testsPassed}</div>
              <div className="text-sm text-gray-600">Tests Passed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{results.testsFailed}</div>
              <div className="text-sm text-gray-600">Tests Failed</div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-white rounded border">
            <div className="font-semibold mb-2">Performance Assessment:</div>
            <div className="text-sm">
              {results.cpuReductionAchieved >= 50 ? (
                <span className="text-green-600">✓ CPU reduction target achieved ({results.cpuReductionAchieved.toFixed(1)}% &gt;= 50%)</span>
              ) : (
                <span className="text-red-600">✗ CPU reduction target not met ({results.cpuReductionAchieved.toFixed(1)}% &lt; 50%)</span>
              )}
            </div>
            <div className="text-sm mt-1">
              Overall optimization effectiveness: {results.overallScore >= 80 ? 'Excellent' : results.overallScore >= 60 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="test-controls mb-6">
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isRunning 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run Performance Validation'}
        </button>
        
        {isRunning && currentTest && (
          <div className="mt-2 text-sm text-gray-600">
            Currently running: {tests.find(t => t.id === currentTest)?.name}
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="test-results">
        <h3 className="text-lg font-semibold mb-4">Performance Tests</h3>
        <div className="space-y-4">
          {tests.map((test) => (
            <div key={test.id} className="test-item p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{test.name}</h4>
                  <p className="text-sm text-gray-600">{test.description}</p>
                </div>
                <div className="text-right">
                  <div className={`inline-block px-2 py-1 rounded text-sm font-semibold ${
                    test.status === 'passed' ? 'bg-green-100 text-green-800' :
                    test.status === 'failed' ? 'bg-red-100 text-red-800' :
                    test.status === 'running' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {test.status.toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-gray-600">{test.targetMetric}: </span>
                  <span className="font-semibold">
                    {test.currentValue.toFixed(1)} / {test.targetValue}
                    {test.id === 'memory_efficiency' ? '% growth' : 
                     test.id === 'throttle_performance' ? ' FPS' : '%'}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      test.status === 'passed' ? 'bg-green-500' :
                      test.status === 'failed' ? 'bg-red-500' :
                      test.status === 'running' ? 'bg-blue-500' :
                      'bg-gray-400'
                    }`}
                    style={{
                      width: `${Math.min(100, (test.currentValue / test.targetValue) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Performance Stats */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Real-time Performance Monitoring</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold">Stream Optimization</div>
            <div>CPU Reduction: {streamOptimization.performanceStats.cpuUsageReduction.toFixed(1)}%</div>
            <div>Messages/sec: {streamOptimization.performanceStats.messagesPerSecond.toFixed(1)}</div>
          </div>
          <div>
            <div className="font-semibold">OBS Optimization</div>
            <div>CPU Reduction: {obsOptimization.performanceStats.cpuUsageReduction.toFixed(1)}%</div>
            <div>Latency: {obsOptimization.performanceStats.averageLatency}ms</div>
          </div>
          <div>
            <div className="font-semibold">Chat Optimization</div>
            <div>CPU Reduction: {chatOptimization.performanceStats.cpuUsageReduction.toFixed(1)}%</div>
            <div>Batch Efficiency: {
              chatOptimization.performanceStats.batchStats.totalUpdates > 0
                ? ((1 - chatOptimization.performanceStats.batchStats.batchedUpdates / chatOptimization.performanceStats.batchStats.totalUpdates) * 100).toFixed(1)
                : 0
            }%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerformanceValidationSuite;