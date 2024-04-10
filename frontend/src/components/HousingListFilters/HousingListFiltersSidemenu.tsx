import Aside from '../Aside/Aside';
import { Col, Container, Icon, Row, SearchableSelect, Text } from '../_dsfr';
import HousingFiltersBadges from '../HousingFiltersBadges/HousingFiltersBadges';
import AppMultiSelect from '../_app/AppMultiSelect/AppMultiSelect';
import {
  allOccupancyOptions,
  beneficiaryCountOptions,
  buildingPeriodOptions,
  cadastralClassificationOptions,
  campaignsCountOptions,
  dataYearsExcludedOptions,
  dataYearsIncludedOptions,
  energyConsumptionOptions,
  housingAreaOptions,
  housingCountOptions,
  HousingFilters,
  housingKindOptions,
  localityKindsOptions,
  multiOwnerOptions,
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
import React from 'react';
import { OwnershipKinds } from '../../models/Housing';
import {
  getSubStatusList,
  getSubStatusListOptions,
  HousingStatus,
} from '../../models/HousingState';
import { useCampaignList } from '../../hooks/useCampaignList';
import AppLinkAsButton from '../_app/AppLinkAsButton/AppLinkAsButton';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useAppSelector } from '../../hooks/useStore';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import { concat } from '../../utils/arrayUtils';
import GeoPerimetersModalLink from '../modals/GeoPerimetersModal/GeoPerimetersModalLink';
import { useCountHousingQuery } from '../../services/housing.service';
import HousingStatusMultiSelect from './HousingStatusMultiSelect';
import Accordion from '@codegouvfr/react-dsfr/Accordion';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import classNames from 'classnames';

interface TitleWithIconProps {
  icon: string;
  title: string;
}

function TitleWithIcon(props: TitleWithIconProps) {
  return (
    <>
      <Icon name={props.icon} className={styles.icon} verticalAlign="middle" />
      <Text as="span">{props.title}</Text>
    </>
  );
}

interface Props {
  filters: HousingFilters;
  expand: boolean;
  onChange: (filters: HousingFilters, label?: string) => void;
  onReset: () => void;
  onClose: () => void;
}

function HousingListFiltersSidemenu(props: Props) {
  const establishment = useAppSelector(
    (state) => state.authentication.authUser?.establishment
  );
  const expand = props.expand ?? true;
  const filters = props.filters;
  const onChangeFilters = props.onChange;
  const onResetFilters = props.onReset;
  const campaignList = useCampaignList();
  const { data: geoPerimeters } = useListGeoPerimetersQuery();
  const { localitiesOptions } = useLocalityList(establishment?.id);

  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count?.housing;

  const onChangeStatusFilter = (status: HousingStatus, isChecked: boolean) => {
    const statusList = [
      ...(filters.statusList ?? []).filter((_) => _ !== status),
      ...(isChecked ? [status] : []),
    ];
    onChangeFilters(
      {
        statusList,
        subStatus: filters.subStatus?.filter((_) =>
          getSubStatusList(statusList).includes(_)
        ),
      },
      'Statut'
    );
  };

  return (
    <Aside
      expand={expand}
      onClose={props.onClose}
      title="Tous les filtres"
      content={
        <>
          <section className={classNames(styles.asAccordionExpanded, 'bg-975')}>
            <h3>
              <span className="fr-icon-sm icon-left ds-fr--v-middle fr-icon-filter-fill"></span>
              <span className="fr-text--md">
                Filtres liés au suivi de la mobilisation
              </span>
            </h3>
            <Container as="section" fluid spacing="p-2w pb-3w">
              <Row gutters>
                <Col n="12">
                  <HousingStatusMultiSelect
                    selectedStatus={filters.statusList}
                    options={statusOptions()}
                    onChange={onChangeStatusFilter}
                  />
                </Col>
                <Col n="12">
                  <AppMultiSelect
                    label="Sous-statut de suivi"
                    options={getSubStatusListOptions(filters.statusList)}
                    initialValues={filters.subStatus}
                    onChange={(values) =>
                      onChangeFilters({ subStatus: values }, 'Sous-statut')
                    }
                  />
                </Col>
                {campaignList && (
                  <Col n="6">
                    <AppMultiSelect
                      label="Campagne"
                      options={campaignList.map((c) => ({
                        value: c.id,
                        label: c.title,
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
          </section>
          <Accordion
            label={
              <TitleWithIcon
                icon="fr-icon-map-pin-user-fill"
                title="Occupation"
              />
            }
          >
            <Container as="section" fluid>
              <Row gutters>
                <Col>
                  <AppMultiSelect
                    label="Statut d’occupation"
                    options={allOccupancyOptions}
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
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-home-4-fill" title="Logement" />
            }
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
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-building-fill" title="Bâtiment/DPE" />
            }
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
                  <Col n="6">
                    <AppMultiSelect
                      label="Étiquette DPE représentatif (CSTB)"
                      options={energyConsumptionOptions}
                      initialValues={filters.energyConsumption}
                      onChange={(values) =>
                        onChangeFilters(
                          { energyConsumption: values },
                          'Étiquette DPE représentatif (CSTB)'
                        )
                      }
                    />
                  </Col>
              </Row>
            </Container>
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-user-fill" title="Propriétaires" />
            }
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
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-france-fill" title="Localisation" />
            }
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
                  <div className="float-right">
                    <GeoPerimetersModalLink />
                  </div>
                </Col>
              </Row>
            </Container>
          </Accordion>
          <Accordion
            label={
              <TitleWithIcon icon="fr-icon-calendar-fill" title="Millésime" />
            }
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
          </Accordion>
        </>
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
              <AppLinkAsButton onClick={onResetFilters}>
                Réinitialiser les filtres
              </AppLinkAsButton>
            </Col>
            {filteredCount !== undefined && (
              <Col className="align-right">
                <Text as="span" className="color-grey-625">
                  <b>{filteredCount}</b> résultats
                </Text>
              </Col>
            )}
          </Row>
        </>
      }
    />
  );
}

export default HousingListFiltersSidemenu;
