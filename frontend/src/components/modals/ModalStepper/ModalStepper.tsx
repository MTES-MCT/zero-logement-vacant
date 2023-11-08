import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import { createModal, ModalProps } from '@codegouvfr/react-dsfr/Modal';
import fp from 'lodash/fp';
import { ReactElement } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { findChildren } from '../../../utils/elementUtils';
import ModalStep from './ModalStep';
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
  children?: ReactElement | ReactElement[];
  openingButtonProps?: ButtonProps;
}

const modal = createModal({
  id: uuidv4(),
  isOpenedByDefault: false,
});

function ModalStepper(props: Props) {
  const steps = findChildren(props.children, ModalStep);
  const stepper = useStepper(fp.range(0, steps?.length ?? 0));
  const step = steps?.[stepper.step];

  const open = modal.open;

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
        await step?.props?.onConfirm?.();
        stepper.next();
      },
    },
  ];

  return (
    <>
      {/* @ts-ignore */}
      <Button {...props.openingButtonProps} onClick={open} />
      <modal.Component {...props} buttons={buttons} title={step?.props?.title}>
        {step}
      </modal.Component>
    </>
  );
}

export default ModalStepper;
