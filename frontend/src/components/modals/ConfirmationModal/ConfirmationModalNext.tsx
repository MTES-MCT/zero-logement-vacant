import type { JSX } from 'react';

import {
  createExtendedModal,
  type ExtendedModalOptions,
  type ExtendedModalProps
} from './ExtendedModal';

export type ConfirmationModalOptions = ExtendedModalOptions;

export interface ConfirmationModalProps
  extends Omit<ExtendedModalProps, 'buttons'> {
  onClose?(): void;
  onSubmit?(): void;
}

export function createConfirmationModal(options: ConfirmationModalOptions) {
  const modal = createExtendedModal(options);

  return {
    ...modal,
    Component(props: ConfirmationModalProps): JSX.Element {
      const { onClose, onSubmit, ...rest } = props;

      return (
        <modal.Component
          {...rest}
          buttons={[
            {
              children: 'Annuler',
              priority: 'secondary',
              onClick: onClose,
              className: 'fr-mr-2w'
            },
            {
              children: 'Confirmer',
              onClick: onSubmit,
              doClosesModal: false
            }
          ]}
        />
      );
    }
  };
}
