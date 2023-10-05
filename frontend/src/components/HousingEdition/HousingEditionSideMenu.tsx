import React, { useRef } from 'react';
import { Container, Text, Title } from '../_dsfr/index';
import { Housing, HousingUpdate } from '../../models/Housing';
import { useCampaignList } from '../../hooks/useCampaignList';
import Aside from '../Aside/Aside';
import { Campaign } from '../../models/Campaign';
import HousingEditionForm from './HousingEditionForm';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';
import { Note } from '../../models/Note';
import styles from './housing-edition.module.scss';
import Button from '@codegouvfr/react-dsfr/Button';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import AppLink from '../_app/AppLink/AppLink';

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
              iconId="fr-icon-arrow-right-s-line-double"
              priority="tertiary no outline"
              onClick={onClose}
            />
            <AppLink
              to={'/logements/' + housing.id}
              isSimple
              target="_blank"
              className="float-right"
            >
              Voir la fiche logement
            </AppLink>
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
            <Tabs
              className="no-border first-tab-grey"
              tabs={[
                {
                  label: '+ Nouvelle mise à jour / note',
                  content: (
                    <HousingEditionForm
                      housing={housing}
                      fromDefaultCampaign={hasOnlyDefaultCampaign}
                      onSubmit={submit}
                      ref={statusFormRef}
                    />
                  ),
                },
                {
                  label: 'Historique de suivi',
                  content: (
                    <EventsHistory
                      events={housingEvents ?? []}
                      notes={housingNotes ?? []}
                    />
                  ),
                },
              ]}
            ></Tabs>
          </Container>
        }
        footer={
          <>
            <Button
              priority="secondary"
              className="fr-mr-2w"
              onClick={() => onClose()}
            >
              Annuler
            </Button>
            {
              <Button onClick={() => statusFormRef.current?.submit()}>
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
