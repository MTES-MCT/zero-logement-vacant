import { JSX } from 'react';

import {
  createExtendedModal,
  ExtendedModalOptions,
  ExtendedModalProps
} from './ExtendedModal';

export type ConfirmationModalOptions = ExtendedModalOptions;

export interface ConfirmationModalProps
  extends Omit<ExtendedModalProps, 'buttons'> {
  onSubmit?(): void;
}

export function createConfirmationModal(options: ConfirmationModalOptions) {
  const modal = createExtendedModal(options);

  return {
    ...modal,
    Component(props: ConfirmationModalProps): JSX.Element {
      const { onSubmit, ...rest } = props;

      return (
        <modal.Component
          {...rest}
          buttons={[
            {
              children: 'Annuler',
              priority: 'secondary',
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
