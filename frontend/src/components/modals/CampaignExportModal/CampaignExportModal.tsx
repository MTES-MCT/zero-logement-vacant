import React from 'react';
import {
    Button,
    Container,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Radio,
    RadioGroup,
    Text,
} from '@dataesr/react-dsfr';

const CampaignExportModal = (
    {
        housingCount,
        ownerCount,
        exportURL,
        onSubmit,
        onClose
    }: {
        housingCount: number,
        ownerCount: number,
        exportURL: string,
        onSubmit: () => void,
        onClose: () => void
    }) => {

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-export-modal">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Exporter
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    <Text size="md" className="fr-mb-0">
                        <b>{housingCount}</b> logements
                    </Text>
                    <Text size="md">
                        <b>{ownerCount}</b> propriétaires
                    </Text>
                    <RadioGroup legend="">
                        <Radio
                            label="Pour publipostage (.csv avec coordonnées postales)"
                            value="0"
                            defaultChecked
                        />
                        <Radio
                            label="Pour analyse (.csv avec toutes les données)"
                            value="1"
                            disabled
                        />
                    </RadioGroup>
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="title"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <a href={exportURL}
                   onClick={() => onSubmit()}
                   className="fr-btn--md fr-btn"
                   download>
                    Exporter
                </a>
            </ModalFooter>
        </Modal>
    );
};

export default CampaignExportModal;

