import type { JSX } from 'react';

import {
  createExtendedModal,
  type ExtendedModalOptions,
  type ExtendedModalProps
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
              className: 'fr-mr-2w',
              doClosesModal: false,
              priority: 'secondary',
              nativeButtonProps: {
                type: 'reset'
              },
              onClick: props.onClose
            },
            {
              children: 'Confirmer',
              doClosesModal: false,
              nativeButtonProps: {
                type: 'submit'
              },
              onClick: onSubmit
            }
          ]}
        />
      );
    }
  };
}
