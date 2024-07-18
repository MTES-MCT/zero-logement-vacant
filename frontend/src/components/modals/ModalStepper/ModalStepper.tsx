import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { createModal, ModalProps } from '@codegouvfr/react-dsfr/Modal';
import fp from 'lodash/fp';
import { ForwardRefExoticComponent, RefAttributes, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useStepper } from '../../../hooks/useStepper';

interface Props
  extends Pick<
    ModalProps,
    | 'className'
    | 'concealingBackdrop'
    | 'iconId'
    | 'size'
    | 'style'
    | 'topAnchor'
  > {
  title: string;
  steps: Step[];
  openingButtonProps?: ButtonProps;
  onFinish?: () => void;
}

const modal = createModal({
  id: uuidv4(),
  isOpenedByDefault: false,
});

/**
 * A modal stepper with linear steps i.e. the user can only go forward or
 * backward.
 * @param props
 * @example
 * <ModalStepper openingButtonProps={openingButtonProps} steps={steps} />
 * @constructor
 */
function ModalStepper(props: Props) {
  const steps = props.steps;
  const stepper = useStepper(fp.range(0, steps.length));
  const currentStep = steps?.[stepper.step];
  // Store a ref for the current step component
  const ref = useRef<StepProps>(null);

  function open(): void {
    stepper.forceStep(0);
    modal.open();
  }

  const buttons: ModalProps['buttons'] = [
    {
      children: stepper.isCompleted(0) ? 'Retour' : 'Annuler',
      priority: 'secondary',
      className: 'fr-mr-2w',
      doClosesModal: false,
      onClick: () => {
        if (stepper.isCompleted(0)) {
          stepper.previous();
          return;
        }
        stepper.forceStep(0);
        modal.close();
      },
    },
    {
      children: 'Confirmer',
      doClosesModal: false,
      onClick: async () => {
        const next = (await ref.current?.onNext?.()) ?? true;
        if (next) {
          stepper.isOver() ? modal.close() : stepper.next();
        }
      },
    }
  ];

  return (
    <>
      <Button {...props.openingButtonProps} onClick={open} />
      <modal.Component {...props} buttons={buttons} title={currentStep?.title}>
        <currentStep.Component ref={ref} />
      </modal.Component>
    </>
  );
}

export interface Step {
  title?: string;
  Component: ForwardRefExoticComponent<RefAttributes<StepProps>>;
}

export interface StepProps {
  /**
   * Return true to go to the next step, false otherwise.
   */
  onNext?: () => Promise<boolean>;
}

export default ModalStepper;
