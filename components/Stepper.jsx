'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export function Step({ children }) {
  return <>{children}</>;
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange,
  onFinalStepCompleted,
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Next',
  disableStepIndicators = false,
  renderStepIndicator,
}) {
  const steps = Array.isArray(children) ? children : [children];
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goTo = (step) => {
    setCurrentStep(step);
    onStepChange?.(step);
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      goTo(currentStep + 1);
    } else {
      onFinalStepCompleted?.();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) goTo(currentStep - 1);
  };

  return (
    <div className={stepContainerClassName}>
      <div className={`flex items-center gap-2 ${stepCircleContainerClassName}`}>
        {steps.map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;
          return (
            <div key={i} className="flex items-center gap-2">
              <motion.div
                animate={{
                  background: isActive
                    ? 'rgba(6,182,212,1)'
                    : isCompleted
                    ? 'rgba(6,182,212,0.5)'
                    : 'rgba(255,255,255,0.1)',
                  scale: isActive ? 1.15 : 1,
                }}
                transition={{ duration: 0.2 }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `2px solid ${isActive ? '#06b6d4' : isCompleted ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.15)'}`,
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {!disableStepIndicators && (renderStepIndicator
                  ? renderStepIndicator({ step: stepNum, isActive, isCompleted })
                  : stepNum)}
              </motion.div>
              {i < steps.length - 1 && (
                <motion.div
                  animate={{ background: isCompleted ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)' }}
                  style={{ height: 2, width: 24, borderRadius: 1 }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className={contentClassName}>
        {steps[currentStep - 1]}
      </div>

      <div className={footerClassName}>
        {currentStep > 1 && (
          <button onClick={handleBack} {...backButtonProps}>{backButtonText}</button>
        )}
        <button onClick={handleNext} {...nextButtonProps}>
          {currentStep === steps.length ? 'Finish' : nextButtonText}
        </button>
      </div>
    </div>
  );
}
