import React, { useCallback, useEffect, useRef } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';

/**
 * WizardStepper - Step indicator and navigation for wizard flows
 * @requirements 4.2, 4.3, 4.6, 1.1 (accessibility)
 * 
 * Displays a visual step indicator showing current, completed, and pending steps.
 * Includes Next/Back navigation buttons with keyboard navigation support.
 */

export interface WizardStep {
  /** Unique identifier for the step */
  id: string;
  /** Display title for the step */
  title: string;
  /** Optional icon for the step */
  icon?: React.ReactNode;
  /** Whether this step is complete */
  isComplete?: boolean;
  /** Whether this step is optional */
  isOptional?: boolean;
}

export interface WizardStepperProps {
  /** Array of steps in the wizard */
  steps: WizardStep[];
  /** Current step index (0-based) */
  currentStep: number;
  /** Callback when step changes */
  onStepChange: (step: number) => void;
  /** Whether to show navigation buttons */
  showNavigation?: boolean;
  /** Custom label for the Back button */
  backLabel?: string;
  /** Custom label for the Next button */
  nextLabel?: string;
  /** Custom label for the Finish button (last step) */
  finishLabel?: string;
  /** Callback when Finish is clicked */
  onFinish?: () => void;
  /** Whether the current step is valid (enables Next) */
  canProceed?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
  onStepChange,
  showNavigation = true,
  backLabel = 'Atrás',
  nextLabel = 'Siguiente',
  finishLabel = 'Finalizar',
  onFinish,
  canProceed = true,
  className = '',
}) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const stepIndicatorsRef = useRef<HTMLDivElement>(null);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  }, [currentStep, isFirstStep, onStepChange]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onFinish?.();
    } else {
      onStepChange(currentStep + 1);
    }
  }, [currentStep, isLastStep, onStepChange, onFinish]);

  // Keyboard navigation for wizard steps
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { key } = event;
    
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      event.preventDefault();
      // Navigate to next completed step or stay on current
      const nextStep = currentStep + 1;
      if (nextStep < steps.length && (steps[nextStep].isComplete || nextStep <= currentStep)) {
        onStepChange(nextStep);
      }
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      event.preventDefault();
      // Navigate to previous step (always allowed if completed)
      const prevStep = currentStep - 1;
      if (prevStep >= 0) {
        onStepChange(prevStep);
      }
    } else if (key === 'Home') {
      event.preventDefault();
      onStepChange(0);
    } else if (key === 'End') {
      event.preventDefault();
      // Go to last completed step
      let lastCompleted = 0;
      for (let i = steps.length - 1; i >= 0; i--) {
        if (steps[i].isComplete || i < currentStep) {
          lastCompleted = i;
          break;
        }
      }
      onStepChange(lastCompleted);
    }
  }, [currentStep, steps, onStepChange]);

  return (
    <div className={className}>
      {/* Step indicators with keyboard navigation */}
      <div 
        ref={stepIndicatorsRef}
        className="flex items-center justify-center mb-6"
        role="tablist"
        aria-label="Pasos del asistente"
        onKeyDown={handleKeyDown}
      >
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = step.isComplete || index < currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step circle */}
              <button
                type="button"
                role="tab"
                onClick={() => isCompleted && onStepChange(index)}
                disabled={!isCompleted && !isActive}
                tabIndex={isActive ? 0 : -1}
                className={`
                  relative flex items-center justify-center
                  w-10 h-10 rounded-full
                  font-medium text-sm
                  transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900
                  ${isActive 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' 
                    : isCompleted 
                      ? 'bg-green-500/20 text-green-400 cursor-pointer hover:bg-green-500/30' 
                      : 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  }
                `}
                aria-selected={isActive}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${step.title}${isCompleted ? ' (completado)' : isActive ? ' (actual)' : ' (pendiente)'}`}
                aria-disabled={!isCompleted && !isActive}
              >
                {isCompleted && !isActive ? (
                  <Check size={18} aria-hidden="true" />
                ) : step.icon ? (
                  <span className="w-5 h-5" aria-hidden="true">{step.icon}</span>
                ) : (
                  index + 1
                )}
              </button>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={`
                    w-12 h-0.5 mx-2
                    transition-colors duration-200
                    ${index < currentStep ? 'bg-green-500/50' : 'bg-zinc-700'}
                  `}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current step title */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-zinc-100">
          {steps[currentStep]?.title}
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          Paso {currentStep + 1} de {steps.length}
          {steps[currentStep]?.isOptional && (
            <span className="ml-2 text-zinc-400">(opcional)</span>
          )}
        </p>
      </div>

      {/* Navigation buttons */}
      {showNavigation && (
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={isFirstStep}
            leftIcon={<ChevronLeft size={16} />}
          >
            {backLabel}
          </Button>

          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed}
            rightIcon={!isLastStep ? <ChevronRight size={16} /> : undefined}
          >
            {isLastStep ? finishLabel : nextLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for managing wizard state
 */
export function useWizard(totalSteps: number) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState<Set<number>>(new Set());

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  }, [totalSteps]);

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const markComplete = useCallback((step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]));
  }, []);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  }, []);

  return {
    currentStep,
    completedSteps,
    goToStep,
    goNext,
    goBack,
    markComplete,
    reset,
    isFirstStep: currentStep === 0,
    isLastStep: currentStep === totalSteps - 1,
  };
}

export default WizardStepper;
