import { Col, Icon, Row, Title } from '../../components/dsfr/index';
import React, { useState } from 'react';
import styles from './housing-details-card.module.scss';
import classNames from 'classnames';
import { Housing, HousingUpdate } from '../../models/Housing';
import HousingDetailsSubCardBuilding from './HousingDetailsSubCardBuilding';
import HousingDetailsSubCardProperties from './HousingDetailsSubCardProperties';
import HousingDetailsSubCardLocation from './HousingDetailsSubCardLocation';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import { useFindNotesByHousingQuery } from '../../services/note.service';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { Note } from '../../models/Note';
import HousingDetailsCardOccupancy from './HousingDetailsSubCardOccupancy';
import HousingDetailsCardMobilisation from './HousingDetailsSubCardMobilisation';
import { Campaign } from '../../models/Campaign';
import { useUpdateHousingMutation } from '../../services/housing.service';
import Button from '@codegouvfr/react-dsfr/Button';
import Card from '@codegouvfr/react-dsfr/Card';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import AppLink from '../AppLink/AppLink';

interface Props {
  housing: Housing;
  housingEvents: Event[];
  housingNotes: Note[];
  housingCampaigns: Campaign[];
}

function HousingDetailsCard({
  housing,
  housingEvents,
  housingNotes,
  housingCampaigns,
}: Props) {
  const [updateHousing] = useUpdateHousingMutation();

  const [isHousingListEditionExpand, setIsHousingListEditionExpand] =
    useState(false);

  const { refetch: refetchHousingEvents } = useFindEventsByHousingQuery(
    housing.id
  );
  const { refetch: refetchHousingNotes } = useFindNotesByHousingQuery(
    housing.id
  );

  const submitHousingUpdate = async (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    await updateHousing({
      housing,
      housingUpdate,
    });
    await refetchHousingEvents();
    await refetchHousingNotes();

    setIsHousingListEditionExpand(false);
  };

  return (
    <Card
      border={false}
      size="small"
      title={
        <>
          <span className="card-title-icon">
            <Icon name="fr-icon-home-4-fill" iconPosition="center" size="1x" />
          </span>
          <Button
            onClick={() => setIsHousingListEditionExpand(true)}
            className="fr-ml-1w float-right"
          >
            Mettre à jour / Ajouter une note
          </Button>
          <HousingEditionSideMenu
            housing={housing}
            housingEvents={housingEvents}
            housingNotes={housingNotes}
            expand={isHousingListEditionExpand}
            onSubmit={submitHousingUpdate}
            onClose={() => setIsHousingListEditionExpand(false)}
          />
          <Title as="h1" look="h4" spacing="mb-1w">
            {housing.rawAddress.join(' - ')}
            <AppLink
              title="Voir sur la carte - nouvelle fenêtre"
              to={`https://www.google.com/maps/place/${housing.latitude},${housing.longitude}`}
              target="_blank"
              iconPosition="left"
              className={classNames(
                styles.link,
                'fr-link',
                'fr-ml-3w',
                'float-right'
              )}
            >
              Voir sur la carte
            </AppLink>
          </Title>
        </>
      }
      desc={
        <>
          <HousingDetailsCardOccupancy
            housing={housing}
            lastOccupancyEvent={housingEvents.find(
              (event) =>
                event.category === 'Followup' &&
                event.kind === 'Update' &&
                event.section === 'Situation' &&
                event.name === "Modification du statut d'occupation" &&
                event.old.occupancy !== event.new.occupancy
            )}
          />
          <HousingDetailsCardMobilisation
            housing={housing}
            campaigns={housingCampaigns}
          />
          <Tabs
            className="no-border fr-pt-3w"
            tabs={[
              {
                label: 'Caractéristiques',
                content: (
                  <div className="fr-px-0">
                    <Row gutters>
                      <Col>
                        <HousingDetailsSubCardProperties housing={housing} />
                        <HousingDetailsSubCardLocation housing={housing} />
                      </Col>
                      <Col>
                        <HousingDetailsSubCardBuilding housing={housing} />
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                label: 'Historique de suivi',
                content: (
                  <EventsHistory events={housingEvents} notes={housingNotes} />
                ),
              },
            ]}
          ></Tabs>
        </>
      }
    ></Card>
  );
}

export default HousingDetailsCard;
