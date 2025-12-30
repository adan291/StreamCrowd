/**
 * Predictions E2E Tests
 * Tests for prediction creation, betting, and resolution
 */

import { test, expect } from '../fixtures/auth.fixture';
import { PredictionPage } from '../pages/PredictionPage';
import { DashboardPage } from '../pages/DashboardPage';
import { DataFactory } from '../fixtures/data-factory';
import { setupTwitchMock } from '../mocks/twitch-api.mock';

test.describe('Predictions', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await setupTwitchMock(authenticatedPage);
  });

  test('should navigate to predictions section', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.goToPredictions();
    
    await expect(authenticatedPage).toHaveURL(/predictions|predicciones/i);
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
    await predictionPage.expectToast(/creada|created/i);
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
    
    const outcomes = await predictionPage.getOutcomes();
    expect(outcomes.length).toBe(4);
  });

  test('should lock prediction', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction();

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);
    await predictionPage.lockPrediction();

    await predictionPage.verifyPredictionLocked();
    await predictionPage.expectToast(/bloqueada|locked/i);
  });

  test('should resolve prediction with winning outcome', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction({
      outcomes: ['Opción A', 'Opción B'],
    });

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);
    await predictionPage.lockPrediction();
    await predictionPage.resolvePrediction(0); // First outcome wins

    await predictionPage.verifyPredictionResolved();
    await predictionPage.expectToast(/resuelta|resolved/i);
  });

  test('should cancel prediction and refund bets', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction();

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);
    await predictionPage.cancelPrediction();

    await predictionPage.verifyPredictionCancelled();
    await predictionPage.expectToast(/cancelada|cancelled|reembolso|refund/i);
  });

  test('should show prediction status changes', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    const predictionData = DataFactory.prediction();

    await predictionPage.goto();
    await predictionPage.createPrediction(predictionData);

    // Check active status
    let status = await predictionPage.getStatus();
    expect(status).toMatch(/activa|active/i);

    // Lock and check
    await predictionPage.lockPrediction();
    status = await predictionPage.getStatus();
    expect(status).toMatch(/bloqueada|locked/i);
  });
});

test.describe('Predictions - Validation', () => {
  test('should require prediction title', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await predictionPage.goto();

    // Try to create without title
    await predictionPage.outcomeInputs.first().fill('Outcome 1');
    await predictionPage.outcomeInputs.nth(1).fill('Outcome 2');
    await predictionPage.createButton.click();

    await expect(authenticatedPage.locator('[data-testid="error"], .text-red-500')).toBeVisible();
  });

  test('should require at least two outcomes', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    await predictionPage.goto();

    await predictionPage.titleInput.fill('Test Prediction');
    await predictionPage.outcomeInputs.first().fill('Only One');
    await predictionPage.createButton.click();

    await expect(authenticatedPage.locator('text=/mínimo|minimum|al menos|at least/i')).toBeVisible();
  });
});

test.describe('Predictions - Workflow', () => {
  test('should follow complete prediction workflow', async ({ authenticatedPage }) => {
    const predictionPage = new PredictionPage(authenticatedPage);
    await setupTwitchMock(authenticatedPage);
    
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

    // 5. Verify no longer active
    expect(await predictionPage.isPredictionActive()).toBe(false);
  });
});
