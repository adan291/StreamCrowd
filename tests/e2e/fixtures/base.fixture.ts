/**
 * Base Playwright fixture for StreamCrowd.
 *
 * The dashboard (App.tsx) and the OBS overlays are lazy chunks loaded by
 * index.tsx, so the browser "load" event (what page.goto waits for) fires
 * before the UI is rendered. This fixture makes goto/reload also wait until
 * the loading placeholder is gone and #root has content.
 */
import { test as base, expect, type Page } from '@playwright/test';

export async function waitForAppReady(page: Page, timeout = 15000): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const root = document.getElementById('root');
        return !!root && root.childElementCount > 0 && !document.querySelector('[data-app-loading]');
      },
      undefined,
      { timeout }
    )
    .catch(() => {
      // Some tests navigate to pages that never render the app (e.g. OAuth
      // popups or external URLs); let the test's own assertions decide.
    });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    const originalGoto = page.goto.bind(page);
    const originalReload = page.reload.bind(page);

    page.goto = (async (...args: Parameters<Page['goto']>) => {
      const response = await originalGoto(...args);
      await waitForAppReady(page);
      return response;
    }) as Page['goto'];

    page.reload = (async (...args: Parameters<Page['reload']>) => {
      const response = await originalReload(...args);
      await waitForAppReady(page);
      return response;
    }) as Page['reload'];

    await use(page);
  },
});

export { expect };
