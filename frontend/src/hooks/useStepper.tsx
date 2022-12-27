import { useMemo, useState } from 'react';

export type Step = number;

export interface StepperOptions {
  step?: number;
}

export function useStepper(steps: Step[], options?: StepperOptions) {
  const [index, setIndex] = useState(options?.step ?? 0);

  const step: Step = useMemo(() => steps[index], [steps, index]);

  function isCompleted(i: number): boolean {
    return i < index;
  }

  function isInBounds(index: number): boolean {
    return Number.isInteger(index) && 0 <= index && index <= steps.length - 1;
  }

  function forceStep(index: number): void {
    if (isInBounds(index)) {
      setIndex(index);
    }
  }

  function next(): void {
    if (isInBounds(index + 1)) {
      setIndex(index + 1);
    }
  }

  return {
    forceStep,
    index,
    isCompleted,
    next,
    step,
  };
}
