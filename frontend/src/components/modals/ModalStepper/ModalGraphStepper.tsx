import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { createModal, ModalProps } from '@codegouvfr/react-dsfr/Modal';
import { v4 as uuidv4 } from 'uuid';

import { Step, useGraphStepper } from '../../../hooks/useGraphStepper';
import { useState } from 'react';

interface Props extends Omit<ModalProps, 'children'> {
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
          const next = (await stepper.ref.current?.onNext?.()) ?? null;
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
        <stepper.currentStep.Component ref={stepper.ref} />
      </modal.Component>
    </>
  );
}

export default ModalGraphStepper;
