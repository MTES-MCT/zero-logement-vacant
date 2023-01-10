import {
  Button,
  Card,
  CardDescription,
  CardTitle,
  Col,
  Icon,
  Link as DSFRLink,
  Row,
  Tabs,
  Title,
} from '@dataesr/react-dsfr';
import React, { useState } from 'react';
import styles from './housing-details-card.module.scss';
import classNames from 'classnames';
import { pluralize } from '../../utils/stringUtils';
import {
  getHousingState,
  getHousingSubStatus,
  getPrecision,
} from '../../models/HousingState';
import Tab from '../Tab/Tab';
import { Housing, HousingUpdate } from '../../models/Housing';
import HousingStatusModal from '../modals/HousingStatusModal/HousingStatusModal';
import {
  createHousingNote,
  updateHousing,
} from '../../store/actions/housingAction';
import { useDispatch } from 'react-redux';
import { HousingOwner } from '../../models/Owner';
import HousingDetailsSubCardOwners from './HousingDetailsSubCardOwners';
import HousingDetailsSubCardBuilding from './HousingDetailsSubCardBuilding';
import HousingDetailsSubCardProperties from './HousingDetailsSubCardProperties';
import HousingDetailsSubCardLocation from './HousingDetailsSubCardLocation';
import HousingDetailsSubCardSituation from './HousingDetailsSubCardSituation';
import HousingNoteModal from '../modals/HousingNoteModal/HousingNoteModal';
import { HousingNote } from '../../models/Note';
import EventsHistory from '../EventsHistory/EventsHistory';
import { Event } from '../../models/Event';

interface Props {
  housing: Housing;
  housingOwners: HousingOwner[];
  housingEvents: Event[];
}

function HousingDetailsCard({ housing, housingOwners, housingEvents }: Props) {
  const dispatch = useDispatch();

  const [isModalStatusOpen, setIsModalStatusOpen] = useState(false);
  const [isModalNoteOpen, setIsModalNoteOpen] = useState(false);

  const submitHousingUpdate = (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    dispatch(updateHousing(housing, housingUpdate));
    setIsModalStatusOpen(false);
  };

  const submitHousingNoteAboutHousing = (note: HousingNote): void => {
    dispatch(createHousingNote(note));
    setIsModalNoteOpen(false);
  };

  return (
    <Card hasArrow={false} hasBorder={false} size="sm">
      <CardTitle>
        <span className="card-title-icon">
          <Icon name="ri-home-fill" iconPosition="center" size="1x" />
        </span>
        <Title as="h1" look="h4" spacing="mb-1w">
          {housing.rawAddress.join(' - ')}
          <DSFRLink
            title="Voir sur la carte - nouvelle fenêtre"
            href={`https://www.google.com/maps/place/${housing.latitude},${housing.longitude}`}
            target="_blank"
            icon="ri-map-pin-2-fill"
            iconPosition="left"
            className={classNames(styles.link, 'fr-link', 'fr-ml-3w')}
          >
            Voir sur la carte
          </DSFRLink>
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
          {housing.status != null && (
            <span
              style={{
                backgroundColor: `var(${
                  getHousingState(housing.status).bgcolor
                })`,
                color: `var(${getHousingState(housing.status).color})`,
              }}
              className="status-label"
            >
              {getHousingState(housing.status).title}
            </span>
          )}
          {housing.subStatus && (
            <span
              style={{
                backgroundColor: `var(${
                  getHousingSubStatus(housing)?.bgcolor
                })`,
                color: `var(${getHousingSubStatus(housing)?.color})`,
              }}
              className="status-label"
            >
              {housing.subStatus}
            </span>
          )}
          {housing.precisions &&
            housing.precisions.map((precision, index) => (
              <b key={'precision_' + index} className="status-label">
                {housing.status && housing.subStatus && (
                  <span
                    style={{
                      backgroundColor: `var(${
                        getPrecision(
                          housing.status,
                          housing.subStatus,
                          precision
                        )?.bgcolor
                      })`,
                      color: `var(${
                        getPrecision(
                          housing.status,
                          housing.subStatus,
                          precision
                        )?.color
                      })`,
                    }}
                    className="status-label"
                  >
                    {precision}
                  </span>
                )}
              </b>
            ))}
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
            onClick={() => setIsModalStatusOpen(true)}
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
          {isModalStatusOpen && (
            <HousingStatusModal
              housingList={[housing]}
              onSubmit={submitHousingUpdate}
              onClose={() => setIsModalStatusOpen(false)}
            />
          )}
        </Row>
        <Tabs className="fr-pt-3w">
          <Tab label="Caractéristiques" className="fr-px-0">
            <Row>
              <Col spacing="mx-1w">
                <HousingDetailsSubCardLocation housing={housing} />
                <HousingDetailsSubCardProperties housing={housing} />
                {housing.buildingHousingCount &&
                  housing.buildingHousingCount > 1 && (
                    <HousingDetailsSubCardBuilding housing={housing} />
                  )}
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
            <EventsHistory events={housingEvents} />
          </Tab>
        </Tabs>
      </CardDescription>
    </Card>
  );
}

export default HousingDetailsCard;
