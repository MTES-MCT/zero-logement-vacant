import React, { useRef } from 'react';
import { Button, Container, Tabs, Text, Title } from '@dataesr/react-dsfr';
import { Housing, HousingUpdate } from '../../models/Housing';
import { useCampaignList } from '../../hooks/useCampaignList';
import Aside from '../Aside/Aside';
import { Campaign } from '../../models/Campaign';
import HousingEditionForm from './HousingEditionForm';
import Tab from '../Tab/Tab';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';
import { Note } from '../../models/Note';
import styles from './housing-edition.module.scss';

interface Props {
  housing?: Housing;
  housingEvents?: Event[];
  housingNotes?: Note[];
  expand: boolean;
  onSubmit: (housing: Housing, housingUpdate: HousingUpdate) => void;
  onClose: () => void;
}

const HousingEditionSideMenu = ({
  housing,
  housingEvents,
  housingNotes,
  expand,
  onSubmit,
  onClose,
}: Props) => {
  const campaignList = useCampaignList();
  const statusFormRef = useRef<{ submit: () => void }>();

  if (!housing) {
    return <></>;
  }
  const submit = (housingUpdate: HousingUpdate) => {
    onSubmit(housing, housingUpdate);
  };

  const hasOnlyDefaultCampaign =
    housing.campaignIds.length === 1 &&
    campaignList?.find((_: Campaign) => _.id === housing.campaignIds[0])
      ?.campaignNumber === 0;

  return (
    <div className={styles.sideMenu}>
      <Aside
        expand={expand}
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
            <Title as="h6" className="fr-mb-0">
              {housing.rawAddress.join(' - ')}
            </Title>
            <Text size="sm">
              <span className="zlv-label">Invariant fiscal : </span>
              {housing.invariant}
            </Text>
          </>
        }
        className="fr-p-0"
        content={
          <Container as="section" spacing="p-0">
            <Tabs className="tabs-no-border first-tab-grey">
              <Tab
                label="+ Nouvelle mise à jour / note"
                className="fr-p-0 bg-975"
              >
                <HousingEditionForm
                  currentStatus={housing.status}
                  currentSubStatus={housing.subStatus}
                  currentPrecisions={housing.precisions}
                  currentVacancyReasons={housing.vacancyReasons}
                  fromDefaultCampaign={hasOnlyDefaultCampaign}
                  onSubmit={submit}
                  ref={statusFormRef}
                />
              </Tab>
              <Tab label="Historique de suivi">
                <EventsHistory
                  events={housingEvents ?? []}
                  notes={housingNotes ?? []}
                />
              </Tab>
            </Tabs>
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
            {
              <Button
                title="Enregistrer"
                onClick={() => statusFormRef.current?.submit()}
              >
                Enregistrer
              </Button>
            }
          </>
        }
      />
    </div>
  );
};

export default HousingEditionSideMenu;
