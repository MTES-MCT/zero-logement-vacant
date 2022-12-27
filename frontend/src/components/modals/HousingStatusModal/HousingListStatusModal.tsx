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
import { HousingUpdate } from '../../../models/Housing';
import { HousingStatus } from '../../../models/HousingState';
import { displayCount } from '../../../utils/stringUtils';
import HousingStatusForm from './HousingStatusForm';

const HousingListStatusModal = ({
  housingCount,
  initialStatus,
  fromDefaultCampaign,
  onSubmit,
  onClose,
}: {
  housingCount: number;
  initialStatus: HousingStatus;
  fromDefaultCampaign: boolean;
  onSubmit: (housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}) => {
  const statusFormRef = useRef<{ validate: () => void }>();

  return (
    <Modal isOpen={true} hide={() => onClose()} size="lg">
      <ModalClose hide={() => onClose()} title="Fermer la fenêtre">
        Fermer
      </ModalClose>
      <ModalTitle>
        <span className="ri-1x icon-left ri-arrow-right-line ds-fr--v-middle" />
        Mettre à jour {housingCount === 1 ? 'le dossier' : 'les dossiers'}
      </ModalTitle>
      <ModalContent>
        <Container fluid>
          <Text>{displayCount(housingCount, 'logement concerné')}.</Text>
          <HousingStatusForm
            currentStatus={initialStatus}
            fromDefaultCampaign={fromDefaultCampaign}
            onValidate={onSubmit}
            ref={statusFormRef}
          />
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
        <Button
          title="Enregistrer"
          onClick={() => statusFormRef.current?.validate()}
        >
          Enregistrer
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default HousingListStatusModal;
