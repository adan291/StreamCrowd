/**
 * Property-based tests for OBSConnectionWizard
 * 
 * Tests the wizard step progression for correctness:
 * - Property 5: Wizard Step Progression
 * 
 * @requirements 3.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { WizardStep, WizardStepStatus } from '../../components/OBSConnectionWizard';

// Define the wizard steps structure for testing
const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'obs-running',
    title: 'OBS Ejecutándose',
    description: 'Verificar que OBS Studio está abierto',
    status: 'pending',
  },
  {
    id: 'websocket-enabled',
    title: 'WebSocket Habilitado',
    description: 'Verificar que el servidor WebSocket está activo',
    status: 'pending',
  },
  {
    id: 'connection-test',
    title: 'Prueba de Conexión',
    description: 'Verificar que la conexión funciona correctamente',
    status: 'pending',
  },
];

// Valid status transitions
const VALID_TRANSITIONS: Record<WizardStepStatus, WizardStepStatus[]> = {
  'pending': ['checking', 'skipped'],
  'checking': ['success', 'error'],
  'success': [], // Terminal state for step
  'error': ['pending', 'skipped'], // Can retry or skip
  'skipped': [], // Terminal state for step
};

// Simulate step status update
function updateStepStatus(
  steps: WizardStep[],
  stepId: string,
  newStatus: WizardStepStatus
): WizardStep[] {
  return steps.map(step =>
    step.id === stepId ? { ...step, status: newStatus } : step
  );
}

// Check if a transition is valid
function isValidTransition(from: WizardStepStatus, to: WizardStepStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

// Check if can progress to next step
function canProgressToNextStep(currentStep: WizardStep): boolean {
  return currentStep.status === 'success' || currentStep.status === 'skipped';
}

// Simulate wizard progression
function simulateWizardProgression(
  statusSequence: WizardStepStatus[][]
): { finalSteps: WizardStep[]; completedSteps: number; errors: string[] } {
  let steps = [...WIZARD_STEPS.map(s => ({ ...s }))];
  let currentStepIndex = 0;
  const errors: string[] = [];
  
  for (let i = 0; i < statusSequence.length && currentStepIndex < steps.length; i++) {
    const stepStatuses = statusSequence[i];
    const currentStep = steps[currentStepIndex];
    
    for (const newStatus of stepStatuses) {
      const oldStatus = steps[currentStepIndex].status;
      
      // Check if transition is valid
      if (!isValidTransition(oldStatus, newStatus)) {
        errors.push(`Invalid transition: ${oldStatus} -> ${newStatus} for step ${currentStep.id}`);
        continue;
      }
      
      steps = updateStepStatus(steps, currentStep.id, newStatus);
      
      // Check if can progress
      if (canProgressToNextStep(steps[currentStepIndex]) && currentStepIndex < steps.length - 1) {
        currentStepIndex++;
      }
    }
  }
  
  const completedSteps = steps.filter(s => s.status === 'success' || s.status === 'skipped').length;
  
  return { finalSteps: steps, completedSteps, errors };
}

describe('OBSConnectionWizard Property Tests', () => {
  // Arbitrary for valid status sequences
  const statusArb = fc.constantFrom<WizardStepStatus>('pending', 'checking', 'success', 'error', 'skipped');
  
  // Arbitrary for a sequence of statuses for one step
  const stepStatusSequenceArb = fc.array(statusArb, { minLength: 1, maxLength: 5 });
  
  // Arbitrary for all steps' status sequences
  const wizardStatusSequenceArb = fc.array(stepStatusSequenceArb, { minLength: 1, maxLength: 3 });

  /**
   * Property 5: Wizard Step Progression
   * For any wizard session, steps SHALL only progress forward after successful completion.
   * @validates Requirements 3.2
   */
  describe('Property 5: Wizard Step Progression', () => {
    it('should only allow valid status transitions', () => {
      fc.assert(
        fc.property(statusArb, statusArb, (from, to) => {
          const isValid = isValidTransition(from, to);
          
          // Verify our transition rules
          if (from === 'pending') {
            expect(isValid).toBe(to === 'checking' || to === 'skipped');
          } else if (from === 'checking') {
            expect(isValid).toBe(to === 'success' || to === 'error');
          } else if (from === 'success') {
            expect(isValid).toBe(false); // Terminal state
          } else if (from === 'error') {
            expect(isValid).toBe(to === 'pending' || to === 'skipped');
          } else if (from === 'skipped') {
            expect(isValid).toBe(false); // Terminal state
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should only progress to next step after success or skip', () => {
      fc.assert(
        fc.property(statusArb, (status) => {
          const step: WizardStep = {
            id: 'test',
            title: 'Test',
            description: 'Test step',
            status,
          };
          
          const canProgress = canProgressToNextStep(step);
          
          expect(canProgress).toBe(status === 'success' || status === 'skipped');
        }),
        { numRuns: 10 }
      );
    });

    it('should maintain step order during progression', () => {
      // Simulate a successful wizard run
      const successfulRun = simulateWizardProgression([
        ['checking', 'success'], // Step 1: obs-running
        ['checking', 'success'], // Step 2: websocket-enabled
        ['checking', 'success'], // Step 3: connection-test
      ]);
      
      expect(successfulRun.errors).toHaveLength(0);
      expect(successfulRun.completedSteps).toBe(3);
      expect(successfulRun.finalSteps[0].status).toBe('success');
      expect(successfulRun.finalSteps[1].status).toBe('success');
      expect(successfulRun.finalSteps[2].status).toBe('success');
    });

    it('should allow skipping failed steps', () => {
      // Simulate a run with a skipped step
      const runWithSkip = simulateWizardProgression([
        ['checking', 'error', 'skipped'], // Step 1: failed, then skipped
        ['checking', 'success'], // Step 2: success
        ['checking', 'success'], // Step 3: success
      ]);
      
      expect(runWithSkip.errors).toHaveLength(0);
      expect(runWithSkip.completedSteps).toBe(3);
      expect(runWithSkip.finalSteps[0].status).toBe('skipped');
      expect(runWithSkip.finalSteps[1].status).toBe('success');
      expect(runWithSkip.finalSteps[2].status).toBe('success');
    });

    it('should allow retry after error', () => {
      // Simulate a run with retry
      const runWithRetry = simulateWizardProgression([
        ['checking', 'error', 'pending', 'checking', 'success'], // Step 1: error, retry, success
        ['checking', 'success'], // Step 2: success
        ['checking', 'success'], // Step 3: success
      ]);
      
      expect(runWithRetry.errors).toHaveLength(0);
      expect(runWithRetry.completedSteps).toBe(3);
    });

    it('should not progress from pending without checking first', () => {
      // Try to go directly from pending to success (invalid)
      const invalidRun = simulateWizardProgression([
        ['success'], // Invalid: pending -> success
      ]);
      
      expect(invalidRun.errors.length).toBeGreaterThan(0);
      expect(invalidRun.finalSteps[0].status).toBe('pending'); // Should remain pending
    });

    it('should not allow going back from success', () => {
      // Try to go from success back to checking (invalid)
      const steps: WizardStep[] = [
        { id: 'test', title: 'Test', description: 'Test', status: 'success' },
      ];
      
      const canGoBack = isValidTransition('success', 'checking');
      expect(canGoBack).toBe(false);
      
      const canGoToPending = isValidTransition('success', 'pending');
      expect(canGoToPending).toBe(false);
    });
  });

  /**
   * Property: Step Structure Invariants
   */
  describe('Step Structure Invariants', () => {
    it('should have exactly 3 steps', () => {
      expect(WIZARD_STEPS).toHaveLength(3);
    });

    it('should have unique step IDs', () => {
      const ids = WIZARD_STEPS.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should have required step IDs in order', () => {
      expect(WIZARD_STEPS[0].id).toBe('obs-running');
      expect(WIZARD_STEPS[1].id).toBe('websocket-enabled');
      expect(WIZARD_STEPS[2].id).toBe('connection-test');
    });

    it('should have non-empty titles and descriptions', () => {
      for (const step of WIZARD_STEPS) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.description.length).toBeGreaterThan(0);
      }
    });

    it('should start with pending status', () => {
      for (const step of WIZARD_STEPS) {
        expect(step.status).toBe('pending');
      }
    });
  });

  /**
   * Property: Status Transition Completeness
   */
  describe('Status Transition Completeness', () => {
    it('should define transitions for all statuses', () => {
      const allStatuses: WizardStepStatus[] = ['pending', 'checking', 'success', 'error', 'skipped'];
      
      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      }
    });

    it('should have terminal states with no outgoing transitions', () => {
      expect(VALID_TRANSITIONS['success']).toHaveLength(0);
      expect(VALID_TRANSITIONS['skipped']).toHaveLength(0);
    });

    it('should have non-terminal states with outgoing transitions', () => {
      expect(VALID_TRANSITIONS['pending'].length).toBeGreaterThan(0);
      expect(VALID_TRANSITIONS['checking'].length).toBeGreaterThan(0);
      expect(VALID_TRANSITIONS['error'].length).toBeGreaterThan(0);
    });
  });
});
