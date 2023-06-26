import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  Col,
  Icon,
  Link,
  Row,
  Tabs,
  Title,
} from '@dataesr/react-dsfr';
import React, { useState } from 'react';
import styles from './housing-details-card.module.scss';
import classNames from 'classnames';
import Tab from '../Tab/Tab';
import { Housing, HousingUpdate } from '../../models/Housing';
import { updateHousing } from '../../store/actions/housingAction';
import HousingDetailsSubCardBuilding from './HousingDetailsSubCardBuilding';
import HousingDetailsSubCardProperties from './HousingDetailsSubCardProperties';
import HousingDetailsSubCardLocation from './HousingDetailsSubCardLocation';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';
import { useAppDispatch } from '../../hooks/useStore';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import { useFindNotesByHousingQuery } from '../../services/note.service';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { Note } from '../../models/Note';
import HousingDetailsCardOccupancy from './HousingDetailsSubCardOccupancy';
import HousingDetailsCardMobilisation from './HousingDetailsSubCardMobilisation';
import { Campaign } from '../../models/Campaign';

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
  const dispatch = useAppDispatch();

  const [isHousingListEditionExpand, setIsHousingListEditionExpand] =
    useState(false);

  const { refetch: refetchHousingEvents } = useFindEventsByHousingQuery(
    housing.id
  );
  const { refetch: refetchHousingNotes } = useFindNotesByHousingQuery(
    housing.id
  );

  const submitHousingUpdate = (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    dispatch(
      updateHousing(housing, housingUpdate, () => {
        refetchHousingEvents();
        refetchHousingNotes();
      })
    );
    setIsHousingListEditionExpand(false);
  };

  return (
    <Card hasArrow={false} hasBorder={false} size="sm">
      <CardTitle>
        <span className="card-title-icon">
          <Icon name="ri-home-fill" iconPosition="center" size="1x" />
        </span>
        <Button
          onClick={() => setIsHousingListEditionExpand(true)}
          className="fr-ml-1w float-right"
        >
          Mettre à jour / Ajouter une note
        </Button>
        <HousingEditionSideMenu
          housing={housing}
          expand={isHousingListEditionExpand}
          onSubmit={submitHousingUpdate}
          onClose={() => setIsHousingListEditionExpand(false)}
        />
        <Title as="h1" look="h4" spacing="mb-1w">
          {housing.rawAddress.join(' - ')}
          <Link
            title="Voir sur la carte - nouvelle fenêtre"
            href={`https://www.google.com/maps/place/${housing.latitude},${housing.longitude}`}
            target="_blank"
            icon="ri-map-pin-2-fill"
            iconPosition="left"
            className={classNames(styles.link, 'fr-link', 'fr-ml-3w')}
          >
            Voir sur la carte
          </Link>
        </Title>
      </CardTitle>
      <CardDescription>
        <HousingDetailsCardOccupancy housing={housing} />
        <HousingDetailsCardMobilisation
          housing={housing}
          campaigns={housingCampaigns}
        />
        <Tabs className={classNames(styles.tabs, 'fr-pt-3w')}>
          <Tab label="Caractéristiques" className="fr-px-0">
            <Row gutters>
              <Col>
                <HousingDetailsSubCardProperties housing={housing} />
                <HousingDetailsSubCardLocation housing={housing} />
              </Col>
              <Col>
                <HousingDetailsSubCardBuilding housing={housing} />
              </Col>
            </Row>
          </Tab>
          <Tab label="Historique de suivi">
            <EventsHistory events={housingEvents} notes={housingNotes} />
          </Tab>
        </Tabs>
      </CardDescription>
    </Card>
  );
}

export default HousingDetailsCard;
