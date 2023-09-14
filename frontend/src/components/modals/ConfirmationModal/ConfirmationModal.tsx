import React, { ReactElement, ReactNode } from 'react';
import {
  Button,
  Container,
  Modal,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalTitle,
} from '@dataesr/react-dsfr';

interface Props {
  children: ReactNode | ReactNode[];
  title?: string | ReactElement;
  onSubmit: (param?: any) => void;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

const ConfirmationModal = ({
  children,
  title,
  onSubmit,
  onClose,
  size,
  icon,
}: Props) => {
  return (
    <Modal isOpen={true} hide={() => onClose()} size={size}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle icon={icon ?? 'ri-1x ri-arrow-right-line'}>
        {title ?? 'Confirmation'}
      </ModalTitle>
      <ModalContent>
        <Container as="section" fluid>
          {children}
        </Container>
      </ModalContent>
      <ModalFooter>
        <Button
          title="Annuler"
          secondary
          className="fr-mr-2w"
          onClick={() => onClose()}
        >
          Annuler
        </Button>
        <Button title="Confirmer" onClick={onSubmit}>
          Confirmer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmationModal;
