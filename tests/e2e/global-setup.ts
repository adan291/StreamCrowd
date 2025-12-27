/**
 * Global Setup for E2E Tests
 * 
 * Starts the Mock OBS WebSocket Server before all tests
 */

import { FullConfig } from '@playwright/test';

// Note: The mock server is started per-test in obs-integration.spec.ts
// This file is kept for potential future global setup needs

async function globalSetup(config: FullConfig) {
  console.log('E2E Global Setup: Preparing test environment...');
  
  // Set environment variables for tests
  process.env.E2E_TEST = 'true';
  
  console.log('E2E Global Setup: Complete');
}

export default globalSetup;
