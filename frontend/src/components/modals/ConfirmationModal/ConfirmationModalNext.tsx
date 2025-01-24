import { createModal, ModalProps } from '@codegouvfr/react-dsfr/Modal';
import { JSX, useEffect } from 'react';

export type ConfirmationModalOptions = {
  id: string;
  /**
   * @default false
   */
  isOpenedByDefault?: boolean;
};

export interface ConfirmationModalProps extends Omit<ModalProps, 'size'> {
  size?: ModalProps['size'] | 'extra-large';
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
      const { size, onSubmit, ...rest } = props;

      useEffect(() => {
        if (size === 'extra-large') {
          const container = document
            .getElementById(options.id)
            ?.querySelector('.fr-col-12');
          container?.classList?.remove('fr-col-md-10', 'fr-col-lg-8');
        }
      }, [size]);

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
              onClick: onSubmit,
              doClosesModal: true
            }
          ]}
          size={size === 'extra-large' ? 'large' : size}
          {...rest}
        />
      );
    }
  };
}
