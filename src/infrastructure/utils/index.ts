/**
 * Infrastructure utilities
 * 
 * Provides utility classes and functions for infrastructure layer components
 * including resource management, cleanup utilities, and memory leak prevention.
 */

export {
  ResourceManager,
  TimerResource,
  IntervalResource,
  SubscriptionResource,
  EventListenerResource,
  CallbackResource,
  createResourceManager,
  getGlobalResourceManager,
  resetGlobalResourceManager,
  type Disposable,
  type ResourceBreakdown,
  type ResourceManagerConfig,
  type LeakDetectionResult,
} from './ResourceManager';