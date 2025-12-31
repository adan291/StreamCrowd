/**
 * Global Setup for E2E Tests
 * Runs once before all tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');
  
  // Verify dev server is running
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    const baseURL = config.projects[0].use?.baseURL || 'http://localhost:5173';
    await page.goto(baseURL, { timeout: 30000 });
    console.log('✅ Dev server is running');
  } catch (error) {
    console.error('❌ Dev server not available. Make sure to run: npm run dev');
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E test setup complete');
}

export default globalSetup;
