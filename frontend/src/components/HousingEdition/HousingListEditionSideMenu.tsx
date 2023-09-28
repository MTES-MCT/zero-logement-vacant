import React, { useRef } from 'react';
import { Alert, Button, Container, Title } from '@dataesr/react-dsfr';
import { HousingUpdate } from '../../models/Housing';
import { displayCount } from '../../utils/stringUtils';
import Aside from '../Aside/Aside';
import HousingEditionForm from './HousingEditionForm';

interface Props {
  housingCount: number;
  open: boolean;
  fromDefaultCampaign?: boolean;
  onSubmit: (housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const HousingListEditionSideMenu = ({
  housingCount,
  open,
  fromDefaultCampaign,
  onSubmit,
  onClose,
}: Props) => {
  const statusFormRef = useRef<{
    submit: () => void;
  }>();

  return (
    <Aside
      expand={open}
      onClose={onClose}
      title={
        <>
          <Button
            title="Fermer"
            className="fr-p-0"
            icon="fr-icon-arrow-right-s-line-double"
            tertiary
            hasBorder={false}
            onClick={onClose}
          />
          <Alert
            description="Mise à jour groupée"
            small
            type="warning"
            className="float-right"
          ></Alert>
          <Title as="h6" className="fr-mb-0">
            {displayCount(housingCount, 'logement sélectionné')}
          </Title>
        </>
      }
      content={
        <Container as="section">
          {open && (
            <HousingEditionForm
              fromDefaultCampaign={fromDefaultCampaign}
              housingCount={housingCount}
              onSubmit={onSubmit}
              ref={statusFormRef}
            />
          )}
        </Container>
      }
      className="fr-p-0"
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
