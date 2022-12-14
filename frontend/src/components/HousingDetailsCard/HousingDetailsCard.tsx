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
  Text,
  Title,
} from '@dataesr/react-dsfr';
import React, { ReactElement, useState } from 'react';
import styles from './housing-details-card.module.scss';
import classNames from 'classnames';
import { pluralize } from '../../utils/stringUtils';
import {
  getHousingState,
  getHousingSubStatus,
  getPrecision,
} from '../../models/HousingState';
import Tab from '../Tab/Tab';
import {
  getBuildingLocation,
  hasGeoPerimeters,
  Housing,
  HousingUpdate,
  OwnershipKindLabels,
} from '../../models/Housing';
import { LocalityKindLabels } from '../../models/Establishment';
import { cadastralClassificationOptions } from '../../models/HousingFilters';
import config from '../../utils/config';
import HousingStatusModal from '../modals/HousingStatusModal/HousingStatusModal';
import {
  updateHousing,
  updateHousingOwners,
} from '../../store/actions/housingAction';
import { useDispatch } from 'react-redux';
import { HousingOwner } from '../../models/Owner';
import ButtonLink from '../ButtonLink/ButtonLink';
import HousingOwnersModal from '../modals/HousingOwnersModal/HousingOwnersModal';

interface DetailsCardProps {
  title: string;
  onModify?: () => any;
  children?: ReactElement | ReactElement[];
}

function DetailsCard({ title, onModify, children }: DetailsCardProps) {
  return (
    <Card
      hasArrow={false}
      hasBorder={false}
      size="sm"
      className={classNames(styles.detailsCard, 'app-card-xs')}
    >
      <CardTitle>
        <Title
          as="h2"
          look="h6"
          spacing="mb-1w"
          className={classNames(styles.title, styles.titleInline)}
        >
          {title}
          {onModify && (
            <ButtonLink
              className={styles.link}
              display="flex"
              icon="ri-edit-2-fill"
              iconPosition="left"
              iconSize="1x"
              isSimple
              title="Modifier"
              onClick={() => onModify()}
            >
              Modifier
            </ButtonLink>
          )}
        </Title>
        <hr />
      </CardTitle>
      <CardDescription className={styles.content}>{children}</CardDescription>
    </Card>
  );
}

interface HousingDetailsCardProps {
  housing: Housing;
  housingOwners: HousingOwner[];
}

function HousingDetailsCard({
  housing,
  housingOwners,
}: HousingDetailsCardProps) {
  const dispatch = useDispatch();

  const [isModalStatusOpen, setIsModalStatusOpen] = useState(false);
  const [isModalNoteOpen, setIsModalNoteOpen] = useState(false);
  const [isModalOwnersOpen, setIsModalOwnersOpen] = useState(false);

  const submitHousingUpdate = (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    dispatch(updateHousing(housing, housingUpdate));
    setIsModalStatusOpen(false);
  };

  const submitHousingOwnersUpdate = (housingOwnersUpdated: HousingOwner[]) => {
    if (housing) {
      dispatch(updateHousingOwners(housing.id, housingOwnersUpdated));
      setIsModalOwnersOpen(false);
    }
  };

  return (
    <Card hasArrow={false} hasBorder={false} size="sm">
      <CardTitle>
        <span className={styles.icon}>
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
          {/*{isModalNoteOpen && */}
          {/*  <HousingNoteModal*/}
          {/*    housingList={housingList}*/}
          {/*    onClose={() => setIsModalNoteOpen(false)}*/}
          {/*    onSubmitAboutOwner={submitHousingNoteAboutOwner}*/}
          {/*    onSubmitAboutHousing={submitHousingNoteAboutHousing}*/}
          {/*  />*/}
          {/*}*/}
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
                <DetailsCard title="Emplacement">
                  <div>
                    <Text size="sm" className={styles.label}>
                      Adresse postale
                    </Text>
                    <Text className="color-bf113">
                      {housing.rawAddress.join(' - ')}
                    </Text>
                  </div>
                  {getBuildingLocation(housing) ? (
                    <div>
                      <Text size="sm" className={styles.label}>
                        Complément
                      </Text>
                      <Text>
                        {[
                          getBuildingLocation(housing)?.building,
                          getBuildingLocation(housing)?.entrance,
                          getBuildingLocation(housing)?.level,
                          getBuildingLocation(housing)?.local,
                        ].join(', ')}
                      </Text>
                    </div>
                  ) : (
                    <></>
                  )}
                  {housing.localityKind ? (
                    <div>
                      <Text size="sm" className={styles.label}>
                        Périmètres
                      </Text>
                      <Text>{LocalityKindLabels[housing.localityKind]}</Text>
                    </div>
                  ) : (
                    <></>
                  )}
                  {hasGeoPerimeters(housing) ? (
                    <div>
                      <Text size="sm" className={styles.label}>
                        Périmètres
                      </Text>
                      <Text>{housing.geoPerimeters?.join(', ')}</Text>
                    </div>
                  ) : (
                    <></>
                  )}
                </DetailsCard>
                <DetailsCard title="Caractéristiques">
                  <div>
                    <Text size="sm" className={styles.label}>
                      Type
                    </Text>
                    <Text>{housing.housingKind}</Text>
                  </div>
                  <div>
                    <Text size="sm" className={styles.label}>
                      Surface
                    </Text>
                    <Text>{housing.livingArea}</Text>
                  </div>
                  <div>
                    <Text size="sm" className={styles.label}>
                      Pièces
                    </Text>
                    <Text>{housing.roomsCount}</Text>
                  </div>
                  <div>
                    <Text size="sm" className={styles.label}>
                      Construction
                    </Text>
                    <Text>{housing.buildingYear}</Text>
                  </div>
                  <div>
                    <Text size="sm" className={styles.label}>
                      Classement cadastral
                    </Text>
                    <Text>
                      {
                        cadastralClassificationOptions.find(
                          (_) =>
                            _.value === String(housing.cadastralClassification)
                        )?.label
                      }
                    </Text>
                  </div>
                </DetailsCard>
                {housing.buildingHousingCount &&
                  housing.buildingHousingCount > 1 && (
                    <DetailsCard title="Immeuble">
                      <div>
                        <Text size="sm" className={styles.label}>
                          Nombre de logements
                        </Text>
                        <Text>{housing.buildingHousingCount}</Text>
                      </div>
                      <div>
                        <Text size="sm" className={styles.label}>
                          Taux de vacances
                        </Text>
                        <Text>{housing.buildingVacancyRate}%</Text>
                      </div>
                    </DetailsCard>
                  )}
              </Col>
              <Col spacing="mx-1w">
                <DetailsCard title="Situation">
                  <div>
                    <Text size="sm" className={styles.label}>
                      Durée de vacance au 01/01/{config.dataYear}
                    </Text>
                    <Text>
                      {config.dataYear - housing.vacancyStartYear} ans (
                      {housing.vacancyStartYear})
                    </Text>
                  </div>
                  <div>
                    <Text size="sm" className={styles.label}>
                      Cause de la vacance
                    </Text>
                    <Text>
                      {housing.vacancyReasons?.map((reason, reasonIdx) => (
                        <div key={`${housing.id}_${reasonIdx}`}>{reason}</div>
                      ))}
                    </Text>
                  </div>
                  <div>
                    <Text size="sm" className={styles.label}>
                      Taxé
                    </Text>
                    <Text>{housing.taxed ? 'Oui' : 'Non'}</Text>
                  </div>
                  <div>
                    <Text size="sm" className={styles.label}>
                      Type de propriété
                    </Text>
                    <Text>{OwnershipKindLabels[housing.ownershipKind]}</Text>
                  </div>
                </DetailsCard>
                <DetailsCard
                  title={`Tous les propriétaires (${housingOwners.length})`}
                  onModify={() => setIsModalOwnersOpen(true)}
                >
                  {housingOwners.map((housingOwner) => (
                    <Card
                      key={'owner_' + housingOwner.rank}
                      hasArrow={false}
                      href={
                        (window.location.pathname.indexOf('proprietaires') ===
                        -1
                          ? window.location.pathname
                          : '') +
                        '/proprietaires/' +
                        housingOwner.id
                      }
                      className="fr-mb-1w"
                    >
                      <CardTitle>
                        <span className={styles.iconXs}>
                          <Icon
                            name="ri-user-fill"
                            iconPosition="center"
                            size="xs"
                          />
                        </span>
                        <Text as="span">
                          <b>{housingOwner.fullName}</b>
                        </Text>
                      </CardTitle>
                      <CardDescription>
                        <Text size="sm" className={styles.label} as="span">
                          {!housingOwner.rank
                            ? 'Ancien propriétaire'
                            : housingOwner.rank === 1
                            ? 'Propriétaire principal'
                            : `${housingOwner.rank}ème ayant droit`}
                        </Text>
                        <Text
                          as="span"
                          spacing="mb-0 mr-1w"
                          className="float-right fr-link"
                        >
                          Voir la fiche
                          <Icon
                            name="ri-arrow-right-line"
                            size="lg"
                            verticalAlign="middle"
                            iconPosition="center"
                          />
                        </Text>
                      </CardDescription>
                    </Card>
                  ))}
                </DetailsCard>
                {isModalOwnersOpen && (
                  <HousingOwnersModal
                    housingOwners={housingOwners}
                    onSubmit={submitHousingOwnersUpdate}
                    onClose={() => setIsModalOwnersOpen(false)}
                  />
                )}
              </Col>
            </Row>
          </Tab>
        </Tabs>
      </CardDescription>
    </Card>
  );
}

export default HousingDetailsCard;
