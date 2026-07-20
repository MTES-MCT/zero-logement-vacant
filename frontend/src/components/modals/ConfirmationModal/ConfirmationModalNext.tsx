import type { JSX } from 'react';

import {
  createExtendedModal,
  type ExtendedModalOptions,
  type ExtendedModalProps
} from './ExtendedModal';

export type ConfirmationModalOptions = ExtendedModalOptions;

export interface ConfirmationModalProps extends Omit<
  ExtendedModalProps,
  'buttons'
> {
  onSubmit?(): void;
  /**
   * Disables the "Confirmer" button, e.g. while an async submission is in
   * flight, to prevent a double-submit. The button stays enabled by default.
   */
  submitting?: boolean;
}

export function createConfirmationModal(options: ConfirmationModalOptions) {
  const modal = createExtendedModal(options);

  return {
    ...modal,
    Component(props: ConfirmationModalProps): JSX.Element {
      const { onSubmit, submitting, ...rest } = props;

      return (
        <modal.Component
          {...rest}
          buttons={[
            {
              children: 'Annuler',
              className: 'fr-mr-2w',
              doClosesModal: true,
              priority: 'secondary',
              nativeButtonProps: {
                type: 'reset'
              }
            },
            {
              children: 'Confirmer',
              doClosesModal: false,
              disabled: submitting,
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
