import React from 'react';
import { Button, Modal, ModalClose, ModalContent, ModalFooter, ModalTitle } from '@dataesr/react-dsfr';


const EventCreationModal = ({onSubmit, onClose}: {onSubmit: (name: string) => void, onClose: () => void}) => {

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-creation-modal">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>Ajouter un événement</ModalTitle>
            <ModalContent>

                TODO

            </ModalContent>
            <ModalFooter>
                <Button title="title"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="title"
                        onClick={() => onSubmit}
                        disabled
                        data-testid="create-button">
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default EventCreationModal;

