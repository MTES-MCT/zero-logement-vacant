import React, { useRef } from 'react';
import { Button, Container, Text } from '@dataesr/react-dsfr';
import { HousingUpdate } from '../../models/Housing';
import { HousingStatus } from '../../models/HousingState';
import { displayCount } from '../../utils/stringUtils';
import Aside from '../Aside/Aside';
import HousingEditionForm from './HousingEditionForm';

interface Props {
  housingCount: number;
  open: boolean;
  initialStatus: HousingStatus;
  fromDefaultCampaign: boolean;
  onSubmit: (housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const HousingListEditionSideMenu = ({
  housingCount,
  open,
  initialStatus,
  fromDefaultCampaign,
  onSubmit,
  onClose,
}: Props) => {
  const statusFormRef = useRef<{ submit: () => void }>();

  return (
    <Aside
      expand={open}
      onClose={onClose}
      title={`Mettre à jour ${
        housingCount === 1 ? 'le dossier' : 'les dossiers'
      }`}
      content={
        <Container as="aside">
          <Text>{displayCount(housingCount, 'logement concerné')}.</Text>
          <HousingEditionForm
            currentStatus={initialStatus}
            fromDefaultCampaign={fromDefaultCampaign}
            onSubmit={onSubmit}
            ref={statusFormRef}
          />
        </Container>
      }
      footer={
        <>
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
            onClick={() => statusFormRef.current?.submit()}
          >
            Enregistrer
          </Button>
        </>
      }
    />
  );
};

export default HousingListEditionSideMenu;
