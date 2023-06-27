import React, { useRef } from 'react';
import { Alert, Button, Container, Tabs, Title } from '@dataesr/react-dsfr';
import { HousingUpdate } from '../../models/Housing';
import { HousingStatus } from '../../models/HousingState';
import { displayCount } from '../../utils/stringUtils';
import Aside from '../Aside/Aside';
import HousingEditionForm from './HousingEditionForm';
import Tab from '../Tab/Tab';

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
            description="Mise à jour multiple"
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
        <Container as="section" spacing="p-0">
          <Tabs className="tabs-no-border first-tab-grey">
            <Tab
              label="+ Nouvelle mise à jour / note"
              className="fr-p-0 bg-975"
            >
              <HousingEditionForm
                currentStatus={initialStatus}
                fromDefaultCampaign={fromDefaultCampaign}
                onSubmit={onSubmit}
                ref={statusFormRef}
              />
            </Tab>
          </Tabs>
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
