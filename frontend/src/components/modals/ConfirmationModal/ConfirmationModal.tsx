import React, { ReactElement, ReactNode, useMemo } from 'react';
import { Container } from '../../../components/dsfr/index';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Button, { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import ButtonLink, { ButtonLinkProps } from '../../ButtonLink/ButtonLink';

interface Props {
  modalId: string;
  children: ReactNode | ReactNode[];
  title?: string | ReactElement;
  onSubmit: (param?: any) => void;
  size?: 'small' | 'medium' | 'large';
  openingButtonProps?: Omit<ButtonProps, 'onClick'>;
  openingButtonLinkProps?: Omit<ButtonLinkProps, 'onClick'>;
}

const ConfirmationModal = ({
  modalId,
  children,
  title,
  onSubmit,
  size,
  openingButtonProps,
  openingButtonLinkProps,
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
      ) : openingButtonLinkProps !== undefined ? (
        // @ts-ignore
        <ButtonLink {...openingButtonLinkProps} onClick={modal.open}>
          {openingButtonLinkProps.children}
        </ButtonLink>
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
