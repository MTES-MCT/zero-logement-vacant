import type { ButtonProps } from '@codegouvfr/react-dsfr/Button';
import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Box from '@mui/material/Box';
import type { ReactElement, ReactNode } from 'react';
import { useMemo } from 'react';

import type { AppLinkAsButtonProps } from '../../_app/AppLinkAsButton/AppLinkAsButton';
import AppLinkAsButton from '../../_app/AppLinkAsButton/AppLinkAsButton';

interface Props {
  modalId: string;
  children: ReactNode | ReactNode[];
  title?: string | ReactElement;
  onOpen?(openModal: () => void): Promise<void> | void;
  onSubmit(param?: any): Promise<void> | void;
  size?: 'small' | 'medium' | 'large';
  openingButtonProps?: Exclude<ButtonProps, ButtonProps.AsAnchor>;
  openingAppLinkAsButtonProps?: Omit<AppLinkAsButtonProps, 'onClick'>;
}

function ConfirmationModal({
  modalId,
  children,
  title,
  onOpen,
  onSubmit,
  size,
  openingButtonProps,
  openingAppLinkAsButtonProps
}: Props) {
  const modal = useMemo(
    () =>
      createModal({
        id: `confirmation-modal-${modalId}`,
        isOpenedByDefault: false
      }),
    [modalId]
  );

  function open() {
    if (!onOpen) {
      return modal.open();
    }

    onOpen(modal.open);
  }

  const onClick = async () => {
    await onSubmit();
    modal.close();
  };

  return (
    <>
      {openingButtonProps !== undefined ? (
        <Button {...openingButtonProps} onClick={open} />
      ) : openingAppLinkAsButtonProps !== undefined ? (
        <AppLinkAsButton {...openingAppLinkAsButtonProps} onClick={open}>
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
            className: 'fr-mr-2w'
          },
          {
            children: 'Confirmer',
            onClick: onClick,
            doClosesModal: false
          }
        ]}
        style={{ textAlign: 'initial' }}
      >
        <Box component="section">{children}</Box>
      </modal.Component>
    </>
  );
}

export default ConfirmationModal;
