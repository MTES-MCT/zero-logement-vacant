import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { createModal, ModalProps } from '@codegouvfr/react-dsfr/Modal';
import {
  ForwardRefExoticComponent,
  RefAttributes,
  useRef,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useGraphStepper } from '../../../hooks/useGraphStepper';
import { Identifiable } from '../../../models/Identifiable';

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
  openingButtonProps?: Omit<ButtonProps, 'onClick'>;
  onFinish?: () => void;
}

const modal = createModal({
  id: uuidv4(),
  isOpenedByDefault: false,
});

function ModalGraphStepper(props: Props) {
  const stepper = useGraphStepper(props.steps);
  // Store a ref for the current step component
  const ref = useRef<StepProps>(null);
  const [isLoading, setIsLoading] = useState(false);

  const buttons: ModalProps['buttons'] = [
    {
      children: stepper.isFirstStep() ? 'Annuler' : 'Retour',
      priority: 'secondary',
      className: 'fr-mr-2w',
      doClosesModal: false,
      onClick: () => {
        if (!stepper.isFirstStep()) {
          stepper.previous();
          return;
        }
        stepper.reset();
        modal.close();
      },
    },
    {
      children: 'Confirmer',
      doClosesModal: false,
      disabled: isLoading,
      onClick: async () => {
        try {
          setIsLoading(true);
          const next = (await ref.current?.onNext?.()) ?? null;
          if (next !== null) {
            if (stepper.isOver(next)) {
              modal.close();
              props.onFinish?.();
              return;
            }
            stepper.next(next);
          }
        } finally {
          setIsLoading(false);
        }
      },
    },
  ];

  function open() {
    stepper.reset();
    modal.open();
  }

  return (
    <>
      {/* @ts-ignore */}
      <Button {...props.openingButtonProps} onClick={open} />
      <modal.Component {...props} buttons={buttons} title={props.title}>
        <stepper.currentStep.Component ref={ref} />
      </modal.Component>
    </>
  );
}

export interface Step extends Identifiable {
  Component: ForwardRefExoticComponent<RefAttributes<StepProps>>;
}

export interface StepProps {
  /**
   * Return the next step id.
   * Return null if not valid to stay on the current step.
   * Return an empty string to end the stepper.
   */
  onNext?: () => Promise<string | null>;
}

export default ModalGraphStepper;
