import {
  ForwardRefExoticComponent,
  RefAttributes,
  useRef,
  useState,
} from 'react';

export interface Step {
  id: string;
  Component: ForwardRefExoticComponent<RefAttributes<StepProps>>;
}

export interface StepProps {
  onNext?: () => Promise<string | null>;
}

export function useGraphStepper(steps: Step[]) {
  const [previousStep, setPreviousStep] = useState<string>();
  const [step, setStep] = useState(steps[0].id);
  const currentStep = get(step);
  // Store a ref for the current step component
  const ref = useRef<StepProps>(null);

  function get(id: string): Step {
    const step = steps.find((step) => step.id === id);
    if (!step) {
      throw new Error(`Step ${id} not found`);
    }
    return step;
  }

  function previous(): void {
    if (previousStep) {
      setPreviousStep(step);
      setStep(previousStep);
    }
  }

  function next(ns: string): void {
    const nextStep = get(ns);
    if (nextStep) {
      setPreviousStep(step);
      setStep(nextStep.id);
    }
  }

  function isFirstStep(): boolean {
    return step === steps[0].id;
  }

  function isOver(next: string): boolean {
    return next === '';
  }

  function reset(): void {
    setPreviousStep(undefined);
    setStep(steps[0].id);
  }

  return {
    currentStep,
    isFirstStep,
    isOver,
    next,
    previous,
    ref,
    reset,
    steps,
  };
}
