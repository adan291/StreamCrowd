/**
 * Tests for useDemoTour hook
 * Tests tour navigation, step management, and callbacks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDemoTour } from '../../hooks/useDemoTour';

describe('useDemoTour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start inactive', () => {
      const { result } = renderHook(() => useDemoTour());
      
      expect(result.current.isActive).toBe(false);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.currentStepData).toBeNull();
    });

    it('should have correct total steps for Spanish locale', () => {
      const { result } = renderHook(() => useDemoTour({ locale: 'es' }));
      expect(result.current.totalSteps).toBe(11);
    });

    it('should have correct total steps for English locale', () => {
      const { result } = renderHook(() => useDemoTour({ locale: 'en' }));
      expect(result.current.totalSteps).toBe(11);
    });
  });

  describe('startTour', () => {
    it('should activate tour and set step to 0', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      expect(result.current.isActive).toBe(true);
      expect(result.current.currentStep).toBe(0);
    });

    it('should call onStart callback', () => {
      const onStart = vi.fn();
      const { result } = renderHook(() => useDemoTour({ onStart }));
      
      act(() => {
        result.current.startTour();
      });
      
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it('should provide current step data when active', () => {
      const { result } = renderHook(() => useDemoTour({ locale: 'es' }));
      
      act(() => {
        result.current.startTour();
      });
      
      expect(result.current.currentStepData).not.toBeNull();
      expect(result.current.currentStepData?.id).toBe('welcome');
      expect(result.current.currentStepData?.title).toContain('Bienvenido');
    });
  });

  describe('endTour', () => {
    it('should deactivate tour and reset step', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      act(() => {
        result.current.nextStep();
      });
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(result.current.currentStep).toBe(2);
      
      act(() => {
        result.current.endTour();
      });
      
      expect(result.current.isActive).toBe(false);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.currentStepData).toBeNull();
    });

    it('should call onEnd callback', () => {
      const onEnd = vi.fn();
      const { result } = renderHook(() => useDemoTour({ onEnd }));
      
      act(() => {
        result.current.startTour();
        result.current.endTour();
      });
      
      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });

  describe('nextStep', () => {
    it('should advance to next step', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      expect(result.current.currentStep).toBe(0);
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(result.current.currentStep).toBe(1);
    });

    it('should call onStepChange with new step data', () => {
      const onStepChange = vi.fn();
      const { result } = renderHook(() => useDemoTour({ onStepChange }));
      
      act(() => {
        result.current.startTour();
      });
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(onStepChange).toHaveBeenCalled();
      const lastCall = onStepChange.mock.calls[onStepChange.mock.calls.length - 1][0];
      expect(lastCall.id).toBe('poll-creator');
    });

    it('should end tour when reaching last step', () => {
      const onEnd = vi.fn();
      const { result } = renderHook(() => useDemoTour({ onEnd }));
      
      act(() => {
        result.current.startTour();
      });
      
      // Go to last step
      for (let i = 0; i < result.current.totalSteps; i++) {
        act(() => {
          result.current.nextStep();
        });
      }
      
      expect(result.current.isActive).toBe(false);
      expect(onEnd).toHaveBeenCalled();
    });
  });

  describe('prevStep', () => {
    it('should go back to previous step', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      act(() => {
        result.current.nextStep();
      });
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(result.current.currentStep).toBe(2);
      
      act(() => {
        result.current.prevStep();
      });
      
      expect(result.current.currentStep).toBe(1);
    });

    it('should not go below step 0', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      expect(result.current.currentStep).toBe(0);
      
      act(() => {
        result.current.prevStep();
      });
      
      expect(result.current.currentStep).toBe(0);
    });

    it('should call onStepChange when going back', () => {
      const onStepChange = vi.fn();
      const { result } = renderHook(() => useDemoTour({ onStepChange }));
      
      act(() => {
        result.current.startTour();
      });
      
      act(() => {
        result.current.nextStep();
      });
      
      act(() => {
        result.current.nextStep();
      });
      
      onStepChange.mockClear();
      
      act(() => {
        result.current.prevStep();
      });
      
      expect(onStepChange).toHaveBeenCalled();
    });
  });

  describe('goToStep', () => {
    it('should jump to specific step', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      act(() => {
        result.current.goToStep(5);
      });
      
      expect(result.current.currentStep).toBe(5);
    });

    it('should not go to invalid step (negative)', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
        result.current.nextStep();
      });
      
      act(() => {
        result.current.goToStep(-1);
      });
      
      expect(result.current.currentStep).toBe(1);
    });

    it('should not go to invalid step (beyond total)', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      act(() => {
        result.current.goToStep(100);
      });
      
      expect(result.current.currentStep).toBe(0);
    });

    it('should call onStepChange when jumping', () => {
      const onStepChange = vi.fn();
      const { result } = renderHook(() => useDemoTour({ onStepChange }));
      
      act(() => {
        result.current.startTour();
      });
      
      onStepChange.mockClear();
      
      act(() => {
        result.current.goToStep(3);
      });
      
      expect(onStepChange).toHaveBeenCalled();
    });
  });

  describe('step data structure', () => {
    it('should have required fields in step data', () => {
      const { result } = renderHook(() => useDemoTour({ locale: 'es' }));
      
      act(() => {
        result.current.startTour();
      });
      
      const step = result.current.currentStepData;
      expect(step).toHaveProperty('id');
      expect(step).toHaveProperty('target');
      expect(step).toHaveProperty('title');
      expect(step).toHaveProperty('message');
      expect(step).toHaveProperty('position');
      expect(step).toHaveProperty('mascotEmotion');
    });

    it('should have valid position values', () => {
      const { result } = renderHook(() => useDemoTour());
      const validPositions = ['top', 'bottom', 'left', 'right', 'center'];
      
      act(() => {
        result.current.startTour();
      });
      
      // Check all steps
      for (let i = 0; i < result.current.totalSteps; i++) {
        act(() => {
          result.current.goToStep(i);
        });
        expect(validPositions).toContain(result.current.currentStepData?.position);
      }
    });

    it('should have valid mascot emotions', () => {
      const { result } = renderHook(() => useDemoTour());
      const validEmotions = ['happy', 'excited', 'thinking', 'waving'];
      
      act(() => {
        result.current.startTour();
      });
      
      for (let i = 0; i < result.current.totalSteps; i++) {
        act(() => {
          result.current.goToStep(i);
        });
        expect(validEmotions).toContain(result.current.currentStepData?.mascotEmotion);
      }
    });
  });

  describe('locale switching', () => {
    it('should use Spanish content by default', () => {
      const { result } = renderHook(() => useDemoTour());
      
      act(() => {
        result.current.startTour();
      });
      
      expect(result.current.currentStepData?.title).toContain('Bienvenido');
    });

    it('should use English content when specified', () => {
      const { result } = renderHook(() => useDemoTour({ locale: 'en' }));
      
      act(() => {
        result.current.startTour();
      });
      
      expect(result.current.currentStepData?.title).toContain('Welcome');
    });
  });
});
