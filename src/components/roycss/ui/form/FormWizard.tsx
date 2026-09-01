/**
 * ROYCSS Form Wizard Component
 * @module roycss/ui/form/FormWizard
 * @description Multi-step form wizard with validation and progress tracking
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn, generateId } from '@/components/roycss/shared/utils';
import type { StepperStep } from '@/lib/roycss/types';

// ============================================================================
// Types
// ============================================================================

export interface FormWizardProps {
  /** Wizard steps */
  steps: StepperStep[];
  /** Current step index (controlled) */
  currentStep?: number;
  /** Initial step index */
  defaultStep?: number;
  /** Callback when step changes */
  onStepChange?: (step: number) => void;
  /** Callback when wizard completes */
  onComplete?: (data: Record<string, unknown>) => void;
  /** Callback when wizard is cancelled */
  onCancel?: () => void;
  /** Show step numbers */
  showStepNumbers?: boolean;
  /** Show step descriptions */
  showDescriptions?: boolean;
  /** Orientation of stepper */
  orientation?: 'horizontal' | 'vertical';
  /** Variant of stepper */
  variant?: 'default' | 'simple' | 'progress';
  /** Size of stepper */
  size?: 'sm' | 'md' | 'lg';
  /** Custom submit button text */
  submitText?: string;
  /** Custom cancel button text */
  cancelText?: string;
  /** Disable navigation to completed steps */
  disableCompletedNavigation?: boolean;
  /** Validate before proceeding */
  validateStep?: (step: number, data: Record<string, unknown>) => Promise<boolean> | boolean;
  /** Class names */
  className?: string;
  /** Children - render function with step content */
  children: (
    step: number,
    data: Record<string, unknown>,
    updateData: (field: string, value: unknown) => void
  ) => React.ReactNode;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StepIndicatorProps {
  steps: StepperStep[];
  currentStep: number;
  orientation: 'horizontal' | 'vertical';
  variant: 'default' | 'simple' | 'progress';
  size: 'sm' | 'md' | 'lg';
  showStepNumbers: boolean;
  showDescriptions: boolean;
  onStepClick?: (index: number) => void;
  canNavigateToStep?: (index: number) => boolean;
}

function StepIndicator({
  steps,
  currentStep,
  orientation,
  variant,
  size,
  showStepNumbers,
  showDescriptions,
  onStepClick,
  canNavigateToStep,
}: StepIndicatorProps) {
  const sizeClasses = {
    sm: { circle: 'w-6 h-6 text-xs', gap: 'gap-1.5', font: 'text-xs' },
    md: { circle: 'w-8 h-8 text-sm', gap: 'gap-2', font: 'text-sm' },
    lg: { circle: 'w-10 h-10 text-base', gap: 'gap-3', font: 'text-base' },
  };

  const classes = sizeClasses[size];

  if (variant === 'simple') {
    return (
      <div className={cn('flex items-center', orientation === 'vertical' ? 'flex-col' : '', classes.gap)}>
        <span className={cn('font-medium text-muted-foreground', classes.font)}>
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>
    );
  }

  if (variant === 'progress') {
    const progress = ((currentStep + 1) / steps.length) * 100;
    return (
      <div className="w-full">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={cn(
        'flex items-center',
        orientation === 'vertical' ? 'flex-col gap-4' : 'justify-between',
        orientation === 'horizontal' && 'w-full'
      )}
      role="tablist"
      aria-label="Wizard steps"
    >
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = step.completed || index < currentStep;
        const isDisabled = step.disabled || (!canNavigateToStep?.(index) && !isActive && !isCompleted);
        const canNavigate = onStepClick && !isDisabled;

        return (
          <React.Fragment key={step.id}>
            {/* Step Item */}
            <div
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onClick={() => canNavigate && onStepClick!(index)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && canNavigate) {
                  e.preventDefault();
                  onStepClick!(index);
                }
              }}
              className={cn(
                'flex items-center',
                orientation === 'vertical' ? 'w-full' : '',
                canNavigate && 'cursor-pointer'
              )}
            >
              {/* Circle */}
              <div
                className={cn(
                  'rounded-full flex items-center justify-center flex-shrink-0 transition-colors border-2',
                  classes.circle,
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'border-success bg-success text-white'
                      : isDisabled
                        ? 'border-muted-foreground/30 text-muted-foreground/30'
                        : 'border-muted-foreground/50 text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : showStepNumbers ? (
                  index + 1
                ) : (
                  step.icon
                )}
              </div>

              {/* Label */}
              {(showDescriptions || step.description) && (
                <div className={cn(orientation === 'vertical' ? 'ml-3 mt-1' : 'ml-3')}>
                  <p
                    className={cn(
                      'font-medium',
                      classes.font,
                      isActive
                        ? 'text-foreground'
                        : isDisabled
                          ? 'text-muted-foreground/30'
                          : 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                  {showDescriptions && step.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Connector Line */}
            {orientation === 'horizontal' && index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2',
                  index < currentStep ? 'bg-success' : 'bg-muted-foreground/20'
                )}
              />
            )}

            {orientation === 'vertical' && index < steps.length - 1 && (
              <div
                className={cn(
                  'w-0.5 ml-4',
                  index < currentStep ? 'bg-success' : 'bg-muted-foreground/20',
                  size === 'sm' ? 'h-6' : size === 'md' ? 'h-8' : 'h-10'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FormWizard({
  steps,
  currentStep: propCurrentStep,
  defaultStep = 0,
  onStepChange,
  onComplete,
  onCancel,
  showStepNumbers = true,
  showDescriptions = true,
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  submitText = 'Complete',
  cancelText = 'Cancel',
  disableCompletedNavigation = false,
  validateStep,
  className,
  children,
}: FormWizardProps) {
  const [internalStep, setInternalStep] = useState(defaultStep);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [isValidating, setIsValidating] = useState(false);

  const currentStep = propCurrentStep ?? internalStep;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Update field in form data
  const updateData = useCallback((field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Navigate to specific step
  const goToStep = useCallback(
    async (targetStep: number) => {
      if (targetStep < 0 || targetStep >= steps.length) return;
      
      // Check if we're moving forward and need to validate
      if (targetStep > currentStep && validateStep) {
        setIsValidating(true);
        const isValid = await validateStep(currentStep, formData);
        setIsValidating(false);
        
        if (!isValid) return;
      }

      setInternalStep(targetStep);
      onStepChange?.(targetStep);
    },
    [currentStep, steps.length, validateStep, formData, onStepChange]
  );

  // Go to next step
  const nextStep = useCallback(async () => {
    if (validateStep) {
      setIsValidating(true);
      const isValid = await validateStep(currentStep, formData);
      setIsValidating(false);
      
      if (!isValid) return;
    }
    
    goToStep(currentStep + 1);
  }, [currentStep, goToStep, validateStep, formData]);

  // Go to previous step
  const prevStep = useCallback(() => {
    goToStep(currentStep - 1);
  }, [currentStep, goToStep]);

  // Handle completion
  const handleComplete = useCallback(async () => {
    if (validateStep) {
      setIsValidating(true);
      const isValid = await validateStep(currentStep, formData);
      setIsValidating(false);
      
      if (!isValid) return;
    }
    
    onComplete?.(formData);
  }, [currentStep, formData, validateStep, onComplete]);

  // Check if can navigate to a step
  const canNavigateToStep = useCallback(
    (index: number) => {
      if (disableCompletedNavigation) {
        return index <= currentStep;
      }
      return true;
    },
    [disableCompletedNavigation, currentStep]
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Step Indicator */}
      <div className="mb-8">
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          orientation={orientation}
          variant={variant}
          size={size}
          showStepNumbers={showStepNumbers}
          showDescriptions={showDescriptions}
          onStepClick={goToStep}
          canNavigateToStep={canNavigateToStep}
        />
      </div>

      {/* Content */}
      <div className="min-h-[200px]" role="tabpanel" aria-label={`Step ${currentStep + 1}: ${steps[currentStep]?.title}`}>
        {children(currentStep, formData, updateData)}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t">
        <div>
          {!isFirstStep && (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-accent transition-colors"
            >
              {cancelText}
            </button>
          )}

          {isLastStep ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={isValidating}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : submitText}
            </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              disabled={isValidating}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isValidating ? 'Validating...' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default FormWizard;
