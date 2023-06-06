import Aside from '../Aside/Aside';
import {
  Accordion,
  AccordionItem,
  Col,
  Container,
  Icon,
  Link,
  Row,
  SearchableSelect,
  Text,
} from '@dataesr/react-dsfr';
import HousingFiltersBadges from '../HousingFiltersBadges/HousingFiltersBadges';
import { useFilters } from '../../hooks/useFilters';
import AppMultiSelect from '../AppMultiSelect/AppMultiSelect';
import {
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  campaignsCountOptions,
  dataYearsExcludedOptions,
  dataYearsIncludedOptions,
  energyConsumptionOptions,
  energyConsumptionWorstOptions,
  housingAreaOptions,
  housingCountOptions,
  housingKindOptions,
  localityKindsOptions,
  multiOwnerOptions,
  occupancyOptions,
  ownerAgeOptions,
  ownerKindOptions,
  ownershipKindsOptions,
  roomsCountOptions,
  statusOptions,
  taxedOptions,
  unselectedOptions,
  vacancyDurationOptions,
  vacancyRateOptions,
} from '../../models/HousingFilters';
import styles from './housing-list-filters.module.scss';
import React, { useState } from 'react';
import { OwnershipKinds } from '../../models/Housing';
import {
  getSubStatusList,
  getSubStatusListOptions,
} from '../../models/HousingState';
import { campaignFullName } from '../../models/Campaign';
import { useCampaignList } from '../../hooks/useCampaignList';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import ButtonLink from '../ButtonLink/ButtonLink';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useFeature } from '../../hooks/useFeature';
import { useAppSelector } from '../../hooks/useStore';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import { concat } from '../../utils/arrayUtils';
import classNames from 'classnames';
import GeoPerimetersModal from '../modals/GeoPerimetersModal/GeoPerimetersModal';

interface TitleWithIconProps {
  icon: string;
  title: string;
}

function TitleWithIcon(props: TitleWithIconProps) {
  return (
    <>
      <Icon name={props.icon} className={styles.icon} />
      <Text as="span">{props.title}</Text>
    </>
  );
}

function HousingListFiltersSidemenu() {
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  const feature = useFeature({
    establishmentId: establishment?.id,
  });
  const { expand, filters, onChangeFilters, onResetFilters, setExpand } =
    useFilters();
  const campaignList = useCampaignList();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const { paginatedHousing } = useAppSelector((state) => state.housing);
  const { localitiesOptions } = useLocalityList(establishment?.id);
  const [isGeoPerimetersModalOpen, setIsGeoPerimetersModalOpen] =
    useState<boolean>(false);

  function close(): void {
    setExpand(false);
  }

  return (
    <Aside
      expand={expand}
      onClose={close}
      title="Tous les filtres"
      content={
        <Accordion>
          <AccordionItem
            title={<TitleWithIcon icon="ri-hand-coin-fill" title="Suivi" />}
            initExpand={true}
            onClick={(e) => e.preventDefault()}
            className={classNames('bg-975', 'fr-mb-2w', styles.locked)}
          >
            <Container as="section" fluid>
              <Row gutters>
                <Col n="6">
                  <AppMultiSelect
                    label="Statut"
                    options={statusOptions()}
                    initialValues={filters.status?.map((_) => _.toString())}
                    onChange={(values) =>
                      onChangeFilters(
                        {
                          status: values.map(Number),
                          subStatus: filters.subStatus?.filter(
                            (_) => getSubStatusList(values).indexOf(_) !== -1
                          ),
                        },
                        'Statut'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Sous-statut"
                    options={getSubStatusListOptions(filters.status)}
                    initialValues={filters.subStatus}
                    onChange={(values) =>
                      onChangeFilters({ subStatus: values }, 'Sous-statut')
                    }
                  />
                </Col>
                {campaignList && filters.campaignIds && (
                  <Col n="6">
                    <AppMultiSelect
                      label="Campagne"
                      options={campaignList.map((c) => ({
                        value: c.id,
                        label: campaignFullName(c),
                      }))}
                      initialValues={filters.campaignIds}
                      onChange={(values) =>
                        onChangeFilters({ campaignIds: values }, 'Campagne')
                      }
                    />
                  </Col>
                )}
                <Col n="6">
                  <AppMultiSelect
                    label="Prise de contact"
                    options={campaignsCountOptions}
                    initialValues={filters.campaignsCounts}
                    onChange={(values) =>
                      onChangeFilters(
                        { campaignsCounts: values },
                        'Prise de contact'
                      )
                    }
                  />
                </Col>
              </Row>
            </Container>
          </AccordionItem>
          {feature.isEnabled('occupancy') && (
            <AccordionItem
              title={
                <TitleWithIcon icon="ri-map-pin-user-fill" title="Occupation" />
              }
            >
              <Container as="section" fluid>
                <Row gutters>
                  <Col>
                    <AppMultiSelect
                      label="Statut d’occupation"
                      options={occupancyOptions}
                      initialValues={filters.occupancies}
                      onChange={(values) =>
                        onChangeFilters(
                          { occupancies: values },
                          'Statut d’occupation'
                        )
                      }
                    />
                  </Col>
                </Row>
              </Container>
            </AccordionItem>
          )}
          <AccordionItem
            title={<TitleWithIcon icon="ri-home-fill" title="Logement" />}
          >
            <Container as="section" fluid>
              <Row gutters>
                <Col n="6">
                  <AppMultiSelect
                    label="Type"
                    options={housingKindOptions}
                    initialValues={filters.housingKinds}
                    onChange={(values) =>
                      onChangeFilters({ housingKinds: values }, 'Type')
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Date de construction"
                    options={buildingPeriodOptions}
                    initialValues={filters.buildingPeriods}
                    onChange={(values) =>
                      onChangeFilters(
                        { buildingPeriods: values },
                        'Date de construction'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Surface"
                    options={housingAreaOptions}
                    initialValues={filters.housingAreas}
                    onChange={(values) =>
                      onChangeFilters({ housingAreas: values }, 'Surface')
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Durée de vacance"
                    options={vacancyDurationOptions}
                    initialValues={filters.vacancyDurations}
                    onChange={(values) =>
                      onChangeFilters(
                        { vacancyDurations: values },
                        'Durée de vacance'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Nombre de pièces"
                    options={roomsCountOptions}
                    initialValues={filters.roomsCounts ?? []}
                    onChange={(values) =>
                      onChangeFilters(
                        { roomsCounts: values },
                        'Nombre de pièces'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Taxé"
                    options={taxedOptions}
                    initialValues={filters.isTaxedValues}
                    onChange={(values) =>
                      onChangeFilters(
                        { isTaxedValues: values as OwnershipKinds[] },
                        'Taxé'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Classement cadastral"
                    options={cadastralClassificationOptions}
                    initialValues={filters.cadastralClassifications}
                    onChange={(values) =>
                      onChangeFilters(
                        { cadastralClassifications: values },
                        'Classement cadastral'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Type de propriété"
                    options={ownershipKindsOptions}
                    initialValues={filters.ownershipKinds}
                    onChange={(values) =>
                      onChangeFilters(
                        { ownershipKinds: values },
                        'Type de propriété'
                      )
                    }
                  />
                </Col>
              </Row>
            </Container>
          </AccordionItem>
          <AccordionItem
            title={<TitleWithIcon icon="ri-building-4-fill" title="Immeuble" />}
          >
            <Container as="section" fluid>
              <Row gutters>
                <Col n="6">
                  <AppMultiSelect
                    label="Nombre de logements"
                    options={housingCountOptions}
                    initialValues={filters.housingCounts}
                    onChange={(values) =>
                      onChangeFilters(
                        { housingCounts: values },
                        'Nombre de logements'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Taux de vacance"
                    options={vacancyRateOptions}
                    initialValues={filters.vacancyRates}
                    onChange={(values) =>
                      onChangeFilters(
                        { vacancyRates: values },
                        'Taux de vacance'
                      )
                    }
                  />
                </Col>
                {feature.isEnabled('occupancy') ? (
                  <>
                    <Col n="6">
                      <AppMultiSelect
                        label="Étiquette DPE (majoritaire)"
                        options={energyConsumptionOptions}
                        initialValues={filters.energyConsumption}
                        onChange={(values) =>
                          onChangeFilters(
                            { energyConsumption: values },
                            'Étiquette DPE (majoritaire)'
                          )
                        }
                      />
                    </Col>
                    <Col n="6">
                      <AppMultiSelect
                        label="Étiquette DPE (+ mauvaise)"
                        options={energyConsumptionWorstOptions}
                        initialValues={filters.energyConsumptionWorst}
                        onChange={(values) =>
                          onChangeFilters(
                            { energyConsumptionWorst: values },
                            'Étiquette DPE (+ mauvaise)'
                          )
                        }
                      />
                    </Col>
                  </>
                ) : (
                  <></>
                )}
              </Row>
            </Container>
          </AccordionItem>
          <AccordionItem
            title={<TitleWithIcon icon="ri-user-fill" title="Propriétaires" />}
          >
            <Container as="section" fluid>
              <Row gutters>
                <Col n="6">
                  <div data-testid="ownerkind-filter">
                    <AppMultiSelect
                      label="Type"
                      options={ownerKindOptions}
                      initialValues={filters.ownerKinds}
                      onChange={(values) =>
                        onChangeFilters({ ownerKinds: values }, 'Type')
                      }
                    />
                  </div>
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Âge"
                    options={ownerAgeOptions}
                    initialValues={filters.ownerAges}
                    onChange={(values) =>
                      onChangeFilters({ ownerAges: values }, 'Âge')
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Multi-propriétaire"
                    options={multiOwnerOptions}
                    initialValues={filters.multiOwners}
                    onChange={(values) =>
                      onChangeFilters(
                        { multiOwners: values },
                        'Multi-propriétaire'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Ayants droit"
                    options={beneficiaryCountOptions}
                    initialValues={filters.beneficiaryCounts}
                    onChange={(values) =>
                      onChangeFilters(
                        { beneficiaryCounts: values },
                        'Ayants droit'
                      )
                    }
                  />
                </Col>
              </Row>
            </Container>
          </AccordionItem>
          <AccordionItem
            title={<TitleWithIcon icon="ri-map-pin-fill" title="Emplacement" />}
          >
            <Container as="section" fluid>
              <Row gutters>
                <Col n="6">
                  <SearchableSelect
                    options={unselectedOptions(
                      localitiesOptions,
                      filters.localities
                    )}
                    label="Commune"
                    placeholder="Rechercher une commune"
                    onChange={(value: string) => {
                      if (value) {
                        onChangeFilters(
                          { localities: concat(filters.localities, value) },
                          'Commune'
                        );
                      }
                    }}
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Type de commune"
                    options={localityKindsOptions}
                    initialValues={filters.localityKinds}
                    onChange={(values) =>
                      onChangeFilters(
                        { localityKinds: values },
                        'Type de commune'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <SearchableSelect
                    options={unselectedOptions(
                      geoPerimeterOptions(geoPerimeters),
                      filters.geoPerimetersIncluded
                    )}
                    label="Périmètre inclus"
                    placeholder="Rechercher un périmètre"
                    onChange={(value: string) => {
                      if (value) {
                        onChangeFilters(
                          {
                            geoPerimetersIncluded: concat(
                              filters.geoPerimetersIncluded,
                              value
                            ),
                          },
                          'Périmètre inclus'
                        );
                      }
                    }}
                  />
                </Col>
                <Col n="6">
                  <SearchableSelect
                    options={unselectedOptions(
                      geoPerimeterOptions(geoPerimeters),
                      filters.geoPerimetersExcluded
                    )}
                    label="Périmètre exclu"
                    placeholder="Rechercher un périmètre"
                    onChange={(value: string) => {
                      if (value) {
                        onChangeFilters(
                          {
                            geoPerimetersExcluded: concat(
                              filters.geoPerimetersExcluded,
                              value
                            ),
                          },
                          'Périmètre exclu'
                        );
                      }
                    }}
                  />
                  <Link
                    href="#"
                    onClick={() => {
                      setIsGeoPerimetersModalOpen(true);
                    }}
                    className="fr-link float-right"
                    icon="ri-settings-4-fill"
                    iconPosition="left"
                  >
                    Gérer vos périmètres
                  </Link>
                  {isGeoPerimetersModalOpen && (
                    <GeoPerimetersModal
                      onClose={() => setIsGeoPerimetersModalOpen(false)}
                    />
                  )}
                </Col>
              </Row>
            </Container>
          </AccordionItem>
          <AccordionItem
            title={<TitleWithIcon icon="ri-calendar-fill" title="Millésime" />}
          >
            <Container as="section" fluid>
              <Row gutters>
                <Col n="6">
                  <AppMultiSelect
                    label="Millésime inclus"
                    options={dataYearsIncludedOptions}
                    initialValues={(filters.dataYearsIncluded ?? []).map((_) =>
                      String(_)
                    )}
                    onChange={(values) =>
                      onChangeFilters(
                        { dataYearsIncluded: values.map(Number) },
                        'Millésime inclus'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Millésime exclu"
                    defaultOption="Aucun"
                    options={dataYearsExcludedOptions}
                    initialValues={(filters.dataYearsExcluded ?? []).map((_) =>
                      String(_)
                    )}
                    onChange={(values) =>
                      onChangeFilters(
                        { dataYearsExcluded: values.map(Number) },
                        'Millésime exclu'
                      )
                    }
                  />
                </Col>
              </Row>
            </Container>
          </AccordionItem>
        </Accordion>
      }
      footer={
        <>
          <HousingFiltersBadges
            filters={filters}
            onChange={onChangeFilters}
            small
          />
          <Row gutters>
            <Col>
              <ButtonLink onClick={onResetFilters}>
                Réinitialiser les filtres
              </ButtonLink>
            </Col>
            <Col className="align-right">
              <Text as="span" className="color-grey-625">
                <b>{paginatedHousing.filteredCount}</b> résultats
              </Text>
            </Col>
          </Row>
        </>
      }
    />
  );
}

export default HousingListFiltersSidemenu;
