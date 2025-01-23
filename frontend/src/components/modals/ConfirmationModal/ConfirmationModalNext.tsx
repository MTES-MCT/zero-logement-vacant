import { createModal, ModalProps } from '@codegouvfr/react-dsfr/Modal';
import { JSX } from 'react';

export type ConfirmationModalOptions = {
  id: string;
  /**
   * @default false
   */
  isOpenedByDefault?: boolean;
};

export interface ConfirmationModalProps extends ModalProps {
  onSubmit?(): void;
}

export function createConfirmationModal(options: ConfirmationModalOptions) {
  const modal = createModal({
    id: options.id,
    isOpenedByDefault: options.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props: ConfirmationModalProps): JSX.Element {
      return (
        <modal.Component
          buttons={[
            {
              children: 'Annuler',
              priority: 'secondary',
              className: 'fr-mr-2w'
            },
            {
              children: 'Confirmer',
              onClick: props.onSubmit,
              doClosesModal: true
            }
          ]}
          {...props}
        />
      );
    }
  };
}
