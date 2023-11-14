import { Step, StepProps } from '../../../hooks/useGraphStepper';
import { forwardRef } from 'react';

const step: Step = {
  id: 'choose-locality',
  Component: forwardRef((props: StepProps, ref) => {
    return <p>Choix commune</p>;
  }),
};

export default step;
