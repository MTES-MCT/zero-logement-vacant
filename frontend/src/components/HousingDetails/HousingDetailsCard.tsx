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
import { pluralize } from '../../utils/stringUtils';
import Tab from '../Tab/Tab';
import { Housing, HousingUpdate } from '../../models/Housing';
import { updateHousing } from '../../store/actions/housingAction';
import { HousingOwner } from '../../models/Owner';
import HousingDetailsSubCardOwners from './HousingDetailsSubCardOwners';
import HousingDetailsSubCardBuilding from './HousingDetailsSubCardBuilding';
import HousingDetailsSubCardProperties from './HousingDetailsSubCardProperties';
import HousingDetailsSubCardLocation from './HousingDetailsSubCardLocation';
import HousingDetailsSubCardSituation from './HousingDetailsSubCardSituation';
import HousingNoteModal from '../modals/HousingNoteModal/HousingNoteModal';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';
import { useAppDispatch } from '../../hooks/useStore';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import HousingSubStatusBadge from '../HousingStatusBadge/HousingSubStatusBadge';
import HousingPrecisionsBadges from '../HousingStatusBadge/HousingPrecisionsBadges';
import {
  useCreateNoteMutation,
  useFindNotesByHousingQuery,
} from '../../services/note.service';
import { useFindEventsByHousingQuery } from '../../services/event.service';
import { HousingNoteCreation, Note } from '../../models/Note';

interface Props {
  housing: Housing;
  housingOwners: HousingOwner[];
  housingEvents: Event[];
  housingNotes: Note[];
}

function HousingDetailsCard({
  housing,
  housingOwners,
  housingEvents,
  housingNotes,
}: Props) {
  const dispatch = useAppDispatch();

  const [isHousingListEditionExpand, setIsHousingListEditionExpand] =
    useState(false);
  const [isModalNoteOpen, setIsModalNoteOpen] = useState(false);

  const [createNote] = useCreateNoteMutation();
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
    dispatch(updateHousing(housing, housingUpdate, refetchHousingEvents));
    setIsHousingListEditionExpand(false);
  };

  const submitHousingNoteAboutHousing = async (
    note: HousingNoteCreation
  ): Promise<void> => {
    await createNote(note).finally(() => {
      refetchHousingNotes();
      setIsModalNoteOpen(false);
    });
  };

  return (
    <Card hasArrow={false} hasBorder={false} size="sm">
      <CardTitle>
        <span className="card-title-icon">
          <Icon name="ri-home-fill" iconPosition="center" size="1x" />
        </span>
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
        <div className="bg-975 fr-p-2w">
          <div className={styles.reference}>
            <span>Invariant fiscal : {housing.invariant}</span>
            <span>Référence cadastrale : {housing.cadastralReference}</span>
            <span>
              {pluralize(housing.dataYears.length)('Millésime')} :{' '}
              {housing.dataYears.join(' - ')}
            </span>
          </div>
          <HousingStatusBadge status={housing.status} />
          <HousingSubStatusBadge
            status={housing.status}
            subStatus={housing.subStatus}
          />
          <HousingPrecisionsBadges
            status={housing.status}
            subStatus={housing.subStatus}
            precisions={housing.precisions}
          />
        </div>
        <Row spacing="pt-2w float" justifyContent="right">
          <Button
            secondary
            icon="ri-sticky-note-fill"
            onClick={() => setIsModalNoteOpen(true)}
          >
            Ajouter une note
          </Button>
          <Button
            icon="ri-edit-2-fill"
            onClick={() => setIsHousingListEditionExpand(true)}
            className="fr-ml-1w"
          >
            Mettre à jour le dossier
          </Button>
          {isModalNoteOpen && (
            <HousingNoteModal
              housingList={[housing]}
              onClose={() => setIsModalNoteOpen(false)}
              onSubmitAboutHousing={submitHousingNoteAboutHousing}
            />
          )}
          <HousingEditionSideMenu
            housing={housing}
            expand={isHousingListEditionExpand}
            onSubmit={submitHousingUpdate}
            onClose={() => setIsHousingListEditionExpand(false)}
          />
        </Row>
        <Tabs className="fr-pt-3w">
          <Tab label="Caractéristiques" className="fr-px-0">
            <Row>
              <Col spacing="mx-1w">
                <HousingDetailsSubCardLocation housing={housing} />
                <HousingDetailsSubCardProperties housing={housing} />
                <HousingDetailsSubCardBuilding housing={housing} />
              </Col>
              <Col spacing="mx-1w">
                <HousingDetailsSubCardSituation housing={housing} />
                <HousingDetailsSubCardOwners
                  housingId={housing.id}
                  housingOwners={housingOwners}
                />
              </Col>
            </Row>
          </Tab>
          <Tab label="Suivi du logement">
            <EventsHistory events={housingEvents} notes={housingNotes} />
          </Tab>
        </Tabs>
      </CardDescription>
    </Card>
  );
}

export default HousingDetailsCard;
