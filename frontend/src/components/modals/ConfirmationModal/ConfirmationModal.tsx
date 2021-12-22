import React from 'react';
import {
    Button,
    Container,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Text,
} from '@dataesr/react-dsfr';

const ConfirmationModal = (
    {
        content,
        onSubmit,
        onClose
    }: {
        content: string,
        onSubmit: () => void,
        onClose: () => void
    }) => {

    return (
        <Modal isOpen={true}
               hide={() => onClose()}>
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Confirmation
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    <Text size="md" className="fr-mb-0">
                        {content}
                    </Text>
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="Annuler"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="Confirmer"
                        onClick={onSubmit}>
                    Confirmer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default ConfirmationModal;

