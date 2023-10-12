import '../../components/_dsfr';
import React from 'react';

declare module '../../components/_dsfr' {
  type TitleAs = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  interface StepperProps {
    className?: string;
    currentStep: number;
    currentTitle: string;
    nextStepTitle: string;
    steps: number;
    titleAs?: TitleAs;
  }

  declare const Stepper: React.FC<StepperProps>;
}
