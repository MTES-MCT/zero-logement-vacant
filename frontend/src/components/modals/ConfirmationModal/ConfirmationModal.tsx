import React, { ReactElement, ReactNode, useMemo } from 'react';
import { Container } from '../../_dsfr';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import AppLinkAsButton, {
  AppLinkAsButtonProps,
} from '../../_app/AppLinkAsButton/AppLinkAsButton';

interface Props {
  modalId: string;
  children: ReactNode | ReactNode[];
  title?: string | ReactElement;
  onSubmit: (param?: any) => void;
  size?: 'small' | 'medium' | 'large';
  openingButtonProps?: Omit<ButtonProps, 'onClick'>;
  openingAppLinkAsButtonProps?: Omit<AppLinkAsButtonProps, 'onClick'>;
}

const ConfirmationModal = ({
  modalId,
  children,
  title,
  onSubmit,
  size,
  openingButtonProps,
  openingAppLinkAsButtonProps,
}: Props) => {
  const modal = useMemo(
    () =>
      createModal({
        id: `confirmation-modal-${modalId}`,
        isOpenedByDefault: false,
      }),
    [modalId]
  );

  return (
    <>
      {openingButtonProps !== undefined ? (
        // @ts-ignore
        <Button {...openingButtonProps} onClick={modal.open}>
          {openingButtonProps.children}
        </Button>
      ) : openingAppLinkAsButtonProps !== undefined ? (
        // @ts-ignore
        <AppLinkAsButton {...openingAppLinkAsButtonProps} onClick={modal.open}>
          {openingAppLinkAsButtonProps.children}
        </AppLinkAsButton>
      ) : (
        <></>
      )}
      <modal.Component
        size={size}
        title={title ?? 'Confirmation'}
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            className: 'fr-mr-2w',
          },
          {
            children: 'Confirmer',
            onClick: onSubmit,
            doClosesModal: false,
          },
        ]}
        style={{ textAlign: 'initial' }}
      >
        <Container as="section" fluid>
          {children}
        </Container>
      </modal.Component>
    </>
  );
};

export default ConfirmationModal;
