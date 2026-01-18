/**
 * Network Condition Detector - Service for monitoring network performance
 * 
 * This service continuously monitors network conditions and provides
 * real-time assessments for the network prioritization system.
 * 
 * Features:
 * - Real-time latency monitoring
 * - Connection stability tracking
 * - Bandwidth estimation
 * - Adaptive assessment intervals
 * 
 * Requirements: 7.5 - Network condition detection for critical update prioritization
 */

import {
  NetworkCondition,
  NetworkMetrics,
  NetworkConditionAssessment,
  NetworkRecommendation,
  assessNetworkCondition,
  DEFAULT_NETWORK_PRIORITIZATION_CONFIG,
} from '@/src/domain/entities/NetworkPriority';

/**
 * Configuration for network condition detection
 */
export interface NetworkDetectorConfig {
  /** Enable network monitoring */
  enabled: boolean;
  
  /** Base assessment interval in milliseconds */
  baseInterval: number;
  
  /** Minimum assessment interval in milliseconds */
  minInterval: number;
  
  /** Maximum assessment interval in milliseconds */
  maxInterval: number;
  
  /** Number of samples to keep for rolling averages */
  sampleSize: number;
  
  /** Timeout for network tests in milliseconds */
  testTimeout: number;
  
  /** URLs to test connectivity against */
  testUrls: string[];
  
  /** Enable adaptive interval adjustment */
  adaptiveInterval: boolean;
}

/**
 * Default configuration for network detection
 */
const DEFAULT_CONFIG: NetworkDetectorConfig = {
  enabled: true,
  baseInterval: 5000,    // 5 seconds
  minInterval: 1000,     // 1 second
  maxInterval: 30000,    // 30 seconds
  sampleSize: 10,
  testTimeout: 5000,     // 5 seconds
  testUrls: [
    'https://www.google.com/favicon.ico',
    'https://www.cloudflare.com/favicon.ico',
    'https://httpbin.org/delay/0',
  ],
  adaptiveInterval: true,
};

/**
 * Network test result
 */
interface NetworkTestResult {
  /** Test latency in milliseconds */
  latency: number;
  
  /** Whether the test succeeded */
  success: boolean;
  
  /** Timestamp of the test */
  timestamp: number;
  
  /** Error message if test failed */
  error?: string;
}

/**
 * Network condition detector service
 */
export class NetworkConditionDetector {
  private config: NetworkDetectorConfig;
  private isRunning = false;
  private currentInterval?: NodeJS.Timeout;
  private testResults: NetworkTestResult[] = [];
  private currentAssessment?: NetworkConditionAssessment;
  private listeners: Array<(assessment: NetworkConditionAssessment) => void> = [];
  private lastAssessmentTime = 0;
  private consecutiveFailures = 0;
  private adaptiveIntervalMultiplier = 1;

  constructor(config: Partial<NetworkDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start network condition monitoring
   */
  start(): void {
    if (this.isRunning || !this.config.enabled) {
      return;
    }

    this.isRunning = true;
    this.scheduleNextAssessment();
    console.log('[NetworkConditionDetector] Started monitoring network conditions');
  }

  /**
   * Stop network condition monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.currentInterval) {
      clearTimeout(this.currentInterval);
      this.currentInterval = undefined;
    }

    console.log('[NetworkConditionDetector] Stopped monitoring network conditions');
  }

  /**
   * Get the current network condition assessment
   */
  getCurrentAssessment(): NetworkConditionAssessment | undefined {
    return this.currentAssessment;
  }

  /**
   * Get the current network condition
   */
  getCurrentCondition(): NetworkCondition {
    return this.currentAssessment?.condition || 'good';
  }

  /**
   * Get current network metrics
   */
  getCurrentMetrics(): NetworkMetrics | undefined {
    return this.currentAssessment?.metrics;
  }

  /**
   * Subscribe to network condition changes
   */
  subscribe(callback: (assessment: NetworkConditionAssessment) => void): () => void {
    this.listeners.push(callback);
    
    // Send current assessment if available
    if (this.currentAssessment) {
      callback(this.currentAssessment);
    }
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Manually trigger a network assessment
   */
  async assessNow(): Promise<NetworkConditionAssessment> {
    const assessment = await this.performAssessment();
    this.updateCurrentAssessment(assessment);
    return assessment;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NetworkDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart if running to apply new config
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get detector statistics
   */
  getStats(): {
    isRunning: boolean;
    testCount: number;
    successRate: number;
    averageLatency: number;
    lastAssessment?: NetworkConditionAssessment;
    nextAssessmentIn?: number;
  } {
    const successfulTests = this.testResults.filter(r => r.success);
    const successRate = this.testResults.length > 0 
      ? (successfulTests.length / this.testResults.length) * 100 
      : 0;
    
    const averageLatency = successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.latency, 0) / successfulTests.length
      : 0;

    const nextAssessmentIn = this.currentInterval 
      ? this.getNextAssessmentInterval() 
      : undefined;

    return {
      isRunning: this.isRunning,
      testCount: this.testResults.length,
      successRate,
      averageLatency,
      lastAssessment: this.currentAssessment,
      nextAssessmentIn,
    };
  }

  /**
   * Clear test history and reset state
   */
  reset(): void {
    this.testResults = [];
    this.currentAssessment = undefined;
    this.lastAssessmentTime = 0;
    this.consecutiveFailures = 0;
    this.adaptiveIntervalMultiplier = 1;
  }

  /**
   * Dispose of the detector and clean up resources
   */
  dispose(): void {
    this.stop();
    this.listeners = [];
    this.testResults = [];
    this.currentAssessment = undefined;
  }

  // Private methods

  /**
   * Schedule the next network assessment
   */
  private scheduleNextAssessment(): void {
    if (!this.isRunning) {
      return;
    }

    const interval = this.getNextAssessmentInterval();
    
    this.currentInterval = setTimeout(async () => {
      if (!this.isRunning) {
        return;
      }

      try {
        const assessment = await this.performAssessment();
        this.updateCurrentAssessment(assessment);
        this.consecutiveFailures = 0;
        
        // Adjust adaptive interval on success
        if (this.config.adaptiveInterval && this.adaptiveIntervalMultiplier > 1) {
          this.adaptiveIntervalMultiplier = Math.max(1, this.adaptiveIntervalMultiplier * 0.9);
        }
      } catch (error) {
        console.warn('[NetworkConditionDetector] Assessment failed:', error);
        this.consecutiveFailures++;
        
        // Adjust adaptive interval on failure
        if (this.config.adaptiveInterval) {
          this.adaptiveIntervalMultiplier = Math.min(3, this.adaptiveIntervalMultiplier * 1.2);
        }
      }

      this.scheduleNextAssessment();
    }, interval);
  }

  /**
   * Calculate the next assessment interval
   */
  private getNextAssessmentInterval(): number {
    let interval = this.config.baseInterval;
    
    if (this.config.adaptiveInterval) {
      // Adjust based on network condition
      if (this.currentAssessment) {
        switch (this.currentAssessment.condition) {
          case 'excellent':
            interval *= 2; // Less frequent monitoring for excellent conditions
            break;
          case 'good':
            interval *= 1.5;
            break;
          case 'fair':
            interval *= 1;
            break;
          case 'poor':
            interval *= 0.7; // More frequent monitoring for poor conditions
            break;
          case 'critical':
            interval *= 0.5;
            break;
        }
      }
      
      // Apply adaptive multiplier based on consecutive failures
      interval *= this.adaptiveIntervalMultiplier;
    }
    
    // Clamp to configured bounds
    return Math.max(
      this.config.minInterval,
      Math.min(this.config.maxInterval, interval)
    );
  }

  /**
   * Perform a comprehensive network assessment
   */
  private async performAssessment(): Promise<NetworkConditionAssessment> {
    const startTime = Date.now();
    
    // Run network tests
    const testPromises = this.config.testUrls.map(url => this.performNetworkTest(url));
    const testResults = await Promise.allSettled(testPromises);
    
    // Process test results
    const successfulTests: NetworkTestResult[] = [];
    const failedTests: NetworkTestResult[] = [];
    
    testResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successfulTests.push(result.value);
        } else {
          failedTests.push(result.value);
        }
      } else {
        failedTests.push({
          latency: this.config.testTimeout,
          success: false,
          timestamp: Date.now(),
          error: result.reason?.message || 'Test failed',
        });
      }
    });

    // Add results to history
    [...successfulTests, ...failedTests].forEach(result => {
      this.testResults.push(result);
    });

    // Keep only recent results
    if (this.testResults.length > this.config.sampleSize) {
      this.testResults = this.testResults.slice(-this.config.sampleSize);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics();
    
    // Assess network condition
    const condition = assessNetworkCondition(metrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(condition, metrics);
    
    // Calculate confidence based on sample size and consistency
    const confidence = this.calculateConfidence(metrics);

    return {
      condition,
      metrics,
      confidence,
      recommendations,
      assessedAt: Date.now(),
    };
  }

  /**
   * Perform a single network test
   */
  private async performNetworkTest(url: string): Promise<NetworkTestResult> {
    const startTime = Date.now();
    
    try {
      // Use fetch with timeout for network test
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.testTimeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal,
        cache: 'no-cache',
      });
      
      clearTimeout(timeoutId);
      
      const latency = Date.now() - startTime;
      
      return {
        latency,
        success: true,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return {
        latency,
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate network metrics from test results
   */
  private calculateMetrics(): NetworkMetrics {
    const recentResults = this.testResults.slice(-this.config.sampleSize);
    const successfulResults = recentResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        latency: this.config.testTimeout,
        packetLoss: 100,
        stability: 0,
        bandwidth: 0,
        timestamp: Date.now(),
        sampleCount: recentResults.length,
      };
    }

    // Calculate average latency
    const latency = successfulResults.reduce((sum, r) => sum + r.latency, 0) / successfulResults.length;
    
    // Calculate packet loss percentage
    const packetLoss = ((recentResults.length - successfulResults.length) / recentResults.length) * 100;
    
    // Calculate stability (consistency of latency)
    const latencies = successfulResults.map(r => r.latency);
    const avgLatency = latency;
    const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) / latencies.length;
    const standardDeviation = Math.sqrt(variance);
    const stability = Math.max(0, 100 - (standardDeviation / avgLatency) * 100);
    
    // Estimate bandwidth (simplified calculation based on latency)
    const bandwidth = Math.max(100, 10000 / Math.max(1, latency / 10));

    return {
      latency,
      packetLoss,
      stability,
      bandwidth,
      timestamp: Date.now(),
      sampleCount: recentResults.length,
    };
  }

  /**
   * Generate recommendations based on network condition
   */
  private generateRecommendations(
    condition: NetworkCondition,
    metrics: NetworkMetrics
  ): NetworkRecommendation[] {
    const recommendations: NetworkRecommendation[] = [];

    switch (condition) {
      case 'critical':
        recommendations.push({
          type: 'fallback_mode',
          description: 'Enable fallback mode due to critical network conditions',
          severity: 'critical',
          impact: 'Reduces functionality but maintains basic operation',
        });
        recommendations.push({
          type: 'prioritize_critical',
          description: 'Only sync critical updates to preserve bandwidth',
          severity: 'critical',
          impact: 'Non-essential updates will be delayed',
        });
        break;

      case 'poor':
        recommendations.push({
          type: 'prioritize_critical',
          description: 'Prioritize critical updates over normal ones',
          severity: 'warning',
          impact: 'Some updates may be delayed',
        });
        recommendations.push({
          type: 'reduce_frequency',
          description: 'Reduce sync frequency to improve stability',
          severity: 'warning',
          impact: 'Updates may take longer to propagate',
        });
        break;

      case 'fair':
        if (metrics.latency > 200) {
          recommendations.push({
            type: 'reduce_frequency',
            description: 'Consider reducing sync frequency due to high latency',
            severity: 'info',
            impact: 'May improve overall performance',
          });
        }
        break;

      case 'good':
      case 'excellent':
        // No specific recommendations for good conditions
        break;
    }

    return recommendations;
  }

  /**
   * Calculate confidence level in the assessment
   */
  private calculateConfidence(metrics: NetworkMetrics): number {
    let confidence = 50; // Base confidence
    
    // Increase confidence with more samples
    const sampleBonus = Math.min(40, (metrics.sampleCount / this.config.sampleSize) * 40);
    confidence += sampleBonus;
    
    // Decrease confidence with high variance (low stability)
    const stabilityPenalty = (100 - metrics.stability) * 0.1;
    confidence -= stabilityPenalty;
    
    // Decrease confidence with high packet loss
    const packetLossPenalty = metrics.packetLoss * 2;
    confidence -= packetLossPenalty;
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Update current assessment and notify listeners
   */
  private updateCurrentAssessment(assessment: NetworkConditionAssessment): void {
    const previousCondition = this.currentAssessment?.condition;
    this.currentAssessment = assessment;
    this.lastAssessmentTime = Date.now();

    // Log condition changes
    if (previousCondition && previousCondition !== assessment.condition) {
      console.log(
        `[NetworkConditionDetector] Network condition changed: ${previousCondition} → ${assessment.condition}`,
        { metrics: assessment.metrics, confidence: assessment.confidence }
      );
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(assessment);
      } catch (error) {
        console.warn('[NetworkConditionDetector] Listener error:', error);
      }
    });
  }
}