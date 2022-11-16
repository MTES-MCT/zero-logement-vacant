import React, { ChangeEvent, useState } from 'react';
import {
    Button,
    Col,
    Container,
    Modal,
    ModalClose,
    ModalContent,
    ModalFooter,
    ModalTitle,
    Row,
    Text,
    TextInput,
} from '@dataesr/react-dsfr';
import { CampaignBundle, campaignPartialName } from '../../../models/Campaign';

const CampaignBundleTitleModal = (
    {
        campaignBundle,
        onSubmit,
        onClose
    }: {
        campaignBundle: CampaignBundle,
        onSubmit: (title: string) => void,
        onClose: () => void
    }) => {

    const [campaignTitle, setCampaignTitle] = useState(campaignBundle.title ?? '');

    const submitTitle = () => onSubmit(campaignTitle);

    return (
        <Modal isOpen={true}
               hide={() => onClose()}>
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Titre de la campagne
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    <Text size="lg"><b>{campaignPartialName(campaignBundle.campaignNumber)}</b></Text>
                    <Row gutters>
                        <Col n="10">
                            <TextInput
                                value={campaignTitle}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setCampaignTitle(e.target.value)}
                                label="Titre complémentaire (optionnel)"
                                placeholder="Titre complémentaire"
                            />
                        </Col>
                    </Row>
                </Container>
            </ModalContent>
            <ModalFooter>
                <Button title="Annuler"
                        secondary
                        className="fr-mr-2w"
                        onClick={() => onClose()}>
                    Annuler
                </Button>
                <Button title="Enregistrer"
                        onClick={() => submitTitle()}>
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CampaignBundleTitleModal;

