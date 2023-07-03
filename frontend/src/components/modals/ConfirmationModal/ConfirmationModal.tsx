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
}

const ConfirmationModal = ({ children, title, onSubmit, onClose }: Props) => {
  return (
    <Modal isOpen={true} hide={() => onClose()}>
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
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
