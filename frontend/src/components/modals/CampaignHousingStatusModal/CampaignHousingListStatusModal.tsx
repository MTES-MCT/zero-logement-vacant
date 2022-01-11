import React, { useRef } from 'react';
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
import { CampaignHousingUpdate } from '../../../models/Housing';
import { CampaignHousingStatus } from '../../../models/CampaignHousingState';
import { displayCount } from '../../../utils/stringUtils';
import CampaignHousingStatusForm from './CampaignHousingStatusForm';

const CampaignHousingListStatusModal = (
    {
        housingCount,
        initialStatus,
        onSubmit,
        onClose
    }: {
        housingCount: number,
        initialStatus: CampaignHousingStatus,
        onSubmit: (campaignHousingUpdate: CampaignHousingUpdate) => void,
        onClose: () => void
    }) => {

    const statusFormRef = useRef<{validate: () => void}>();

    return (
        <Modal isOpen={true}
               hide={() => onClose()}
               data-testid="campaign-creation-modal"
               size="lg">
            <ModalClose hide={() => onClose()} title="Fermer la fenêtre">Fermer</ModalClose>
            <ModalTitle>
                <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
                Mettre à jour {housingCount === 1 ? 'le dossier' : 'les dossiers'}
            </ModalTitle>
            <ModalContent>
                <Container fluid>
                    <Text>
                        {displayCount(housingCount, 'logement concerné')}.
                    </Text>
                    <CampaignHousingStatusForm previousStatus={initialStatus}
                                               onValidate={onSubmit}
                                               ref={statusFormRef}/>
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
                        onClick={() => statusFormRef.current?.validate()}>
                    Enregistrer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default CampaignHousingListStatusModal;

