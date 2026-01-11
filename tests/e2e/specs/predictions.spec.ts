/**
 * Predictions E2E Tests
 * Tests for prediction creation, betting, and resolution
 */

import { test, expect } from '../fixtures/auth.fixture';
import { PredictionPage } from '../pages/PredictionPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DataFactory } from '../fixtures/data-factory';

test.describe('Predictions', () => {
  // Note: authenticatedPage fixture already sets up Twitch mocks and connects

  test('should navigate to predictions section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.goToPredictions();
    
    // The app is a SPA and doesn't change URL for sections
    // Verify that the platforms panel is visible
    const platformsPanel = authenticatedPage.locator('[data-tour="platforms-panel"]').first();
    await expect(platformsPanel).toBeVisible({ timeout: 10000 });
  });

  test('should create a prediction with two outcomes', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction({
      title: '¿Ganaremos esta partida?',
      outcomes: ['Victoria', 'Derrota'],
      duration: 120,
    });

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);

    await predictionPage.verifyPredictionCreated(predictionData.title);
  });

  test('should create prediction with multiple outcomes', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction({
      title: '¿Cuántas kills conseguiré?',
      outcomes: ['0-5', '6-10', '11-15', '16+'],
    });

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);

    await predictionPage.verifyPredictionCreated(predictionData.title);
  });

  test('should lock prediction', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction();

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);
    await predictionPage.verifyPredictionCreated(predictionData.title);
    await predictionPage.lockPrediction();

    await predictionPage.verifyPredictionLocked();
  });

  test('should resolve prediction with winning outcome', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction({
      outcomes: ['Opción A', 'Opción B'],
    });

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);
    await predictionPage.verifyPredictionCreated(predictionData.title);
    await predictionPage.lockPrediction();
    await predictionPage.verifyPredictionLocked();
    await predictionPage.resolvePrediction(0); // First outcome wins

    await predictionPage.verifyPredictionResolved();
  });

  test('should cancel prediction and refund bets', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction();

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);
    await predictionPage.verifyPredictionCreated(predictionData.title);
    await predictionPage.cancelPrediction();

    await predictionPage.verifyPredictionCancelled();
  });

  test('should show prediction status changes', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction();

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);
    await predictionPage.verifyPredictionCreated(predictionData.title);

    // Check active status
    let status = await predictionPage.getStatus();
    expect(status).toMatch(/activa/i);

    // Lock and check
    await predictionPage.lockPrediction();
    status = await predictionPage.getStatus();
    expect(status).toMatch(/bloqueada/i);
  });
});

test.describe('Predictions - Validation', () => {
  test('should require prediction title', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    await predictionPage.goto();

    // Try to create without title - fill outcomes only
    const outcomeInputs = await predictionPage.outcomeInputs.all();
    if (outcomeInputs.length >= 2) {
      await outcomeInputs[0].fill('Outcome 1');
      await outcomeInputs[1].fill('Outcome 2');
    }
    await predictionPage.createButton.click();

    // Should show validation error
    const errorMessage = authenticatedPage.locator('.text-red-500, .text-red-400, [class*="error"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should require at least two outcomes', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    await predictionPage.goto();

    // Fill title but only one outcome
    await predictionPage.titleInput.fill('Test Prediction');
    const outcomeInputs = await predictionPage.outcomeInputs.all();
    if (outcomeInputs.length >= 1) {
      await outcomeInputs[0].fill('Only One');
      // Leave second outcome empty
    }
    await predictionPage.createButton.click();

    // Should show validation error about minimum outcomes
    const errorMessage = authenticatedPage.locator('.text-red-500, .text-red-400, [class*="error"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Predictions - Workflow', () => {
  test('should follow complete prediction workflow', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction({
      title: 'Complete Workflow Test',
      outcomes: ['Win', 'Lose'],
    });

    await predictionPage.goto();

    // 1. Create
    await predictionPage.createPrediction(predictionData);
    await predictionPage.verifyPredictionCreated(predictionData.title);

    // 2. Verify active
    expect(await predictionPage.isPredictionActive()).toBe(true);

    // 3. Lock
    await predictionPage.lockPrediction();
    await predictionPage.verifyPredictionLocked();

    // 4. Resolve
    await predictionPage.resolvePrediction(0);
    await predictionPage.verifyPredictionResolved();
  });
});
