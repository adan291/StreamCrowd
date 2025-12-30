/**
 * Test Helpers for E2E Tests
 * Common utilities and assertions
 */

import { Page, expect, Locator } from '@playwright/test';

/**
 * Wait for toast notification and verify message
 */
export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
  const toast = page.locator('[role="alert"], [data-testid="toast"]').first();
  await expect(toast).toBeVisible({ timeout: 5000 });
  await expect(toast).toContainText(message);
}

/**
 * Wait for loading to complete
 */
export async function waitForLoading(page: Page): Promise<void> {
  // Wait for any loading spinners to disappear
  const spinner = page.locator('[data-testid="loading"], .animate-spin, [role="progressbar"]');
  await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
    // Ignore if no spinner found
  });
  
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Continue even if network isn't fully idle
  });
}

/**
 * Fill form field by label
 */
export async function fillField(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByLabel(label);
  await field.clear();
  await field.fill(value);
}

/**
 * Select option from dropdown
 */
export async function selectOption(page: Page, label: string, value: string): Promise<void> {
  const select = page.getByLabel(label);
  await select.selectOption(value);
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, text: string | RegExp): Promise<void> {
  await page.getByRole('button', { name: text }).click();
}

/**
 * Navigate to a specific tool/section
 */
export async function navigateTo(page: Page, section: string): Promise<void> {
  // Click on navigation item
  const navItem = page.getByRole('link', { name: new RegExp(section, 'i') })
    .or(page.getByRole('button', { name: new RegExp(section, 'i') }));
  
  await navItem.click();
  await waitForLoading(page);
}

/**
 * Mock WebSocket connection
 */
export async function mockWebSocket(page: Page, url: string, handlers: {
  onMessage?: (data: unknown) => unknown;
  onConnect?: () => void;
}): Promise<void> {
  await page.addInitScript(({ url, handlers }) => {
    const originalWebSocket = window.WebSocket;
    
    // @ts-ignore
    window.WebSocket = class MockWebSocket {
      url: string;
      readyState = 1; // OPEN
      onopen: (() => void) | null = null;
      onclose: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: ((error: Error) => void) | null = null;

      constructor(wsUrl: string) {
        this.url = wsUrl;
        
        if (!wsUrl.includes(url)) {
          // Use real WebSocket for other URLs
          return new originalWebSocket(wsUrl) as any;
        }
        
        setTimeout(() => {
          this.onopen?.();
        }, 10);
      }

      send(data: string) {
        // Echo back or transform
        setTimeout(() => {
          this.onmessage?.({ data });
        }, 10);
      }

      close() {
        this.readyState = 3;
        this.onclose?.();
      }
    };
  }, { url, handlers: {} });
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Wait for element to be stable (no animations)
 */
export async function waitForStable(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible' });
  
  // Wait for any CSS transitions to complete
  await locator.evaluate((el) => {
    return new Promise<void>((resolve) => {
      const checkStable = () => {
        const style = getComputedStyle(el);
        if (style.transition === 'none' || style.transition === 'all 0s ease 0s') {
          resolve();
        } else {
          requestAnimationFrame(checkStable);
        }
      };
      checkStable();
    });
  });
}

/**
 * Verify accessibility of element
 */
export async function checkAccessibility(locator: Locator): Promise<void> {
  // Check for accessible name
  const accessibleName = await locator.getAttribute('aria-label')
    || await locator.getAttribute('aria-labelledby')
    || await locator.textContent();
  
  expect(accessibleName).toBeTruthy();
}

/**
 * Simulate slow network
 */
export async function simulateSlowNetwork(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 500 * 1024 / 8, // 500 kbps
    uploadThroughput: 500 * 1024 / 8,
    latency: 400,
  });
}

/**
 * Simulate offline mode
 */
export async function goOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
}

/**
 * Restore online mode
 */
export async function goOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
}

/**
 * Get localStorage value
 */
export async function getLocalStorage(page: Page, key: string): Promise<unknown> {
  return page.evaluate((k) => {
    const value = localStorage.getItem(k);
    return value ? JSON.parse(value) : null;
  }, key);
}

/**
 * Set localStorage value
 */
export async function setLocalStorage(page: Page, key: string, value: unknown): Promise<void> {
  await page.evaluate(({ k, v }) => {
    localStorage.setItem(k, JSON.stringify(v));
  }, { k: key, v: value });
}

export default {
  expectToast,
  waitForLoading,
  fillField,
  selectOption,
  clickButton,
  navigateTo,
  mockWebSocket,
  takeScreenshot,
  waitForStable,
  checkAccessibility,
  simulateSlowNetwork,
  goOffline,
  goOnline,
  getLocalStorage,
  setLocalStorage,
};
