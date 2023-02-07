import Aside from '../Aside/Aside';
import {
  Accordion,
  AccordionItem,
  Col,
  Container,
  Icon,
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
  vacancyDurationOptions,
  vacancyRateOptions,
} from '../../models/HousingFilters';
import { useSelector } from 'react-redux';
import styles from './housing-list-filters.module.scss';
import React from 'react';
import { OwnershipKinds } from '../../models/Housing';
import {
  getSubStatusList,
  getSubStatusListOptions,
} from '../../models/HousingState';
import { campaignFullName } from '../../models/Campaign';
import { useCampaignList } from '../../hooks/useCampaignList';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import { geoPerimeterOptions } from '../../models/GeoPerimeter';
import { useGeoPerimeterList } from '../../hooks/useGeoPerimeterList';
import ButtonLink from '../ButtonLink/ButtonLink';
import { useLocalityList } from '../../hooks/useLocalityList';
import { useFeature } from '../../hooks/useFeature';

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
  const { establishment } = useSelector(
    (state: ApplicationState) => state.authentication.authUser
  );
  const feature = useFeature({
    establishmentId: establishment.id,
  });
  const { expand, filters, onChangeFilters, onResetFilters, setExpand } =
    useFilters();
  const campaignList = useCampaignList();
  const geoPerimeters = useGeoPerimeterList();
  const { paginatedHousing } = useSelector(
    (state: ApplicationState) => state.housing
  );
  const { localitiesOptions } = useLocalityList();
  const localities = localitiesOptions
    // Remove those localities which are already selected
    .filter((option) => !filters.localities?.includes(option.value));

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
                      initialValues={filters.occupancy}
                      onChange={(values) =>
                        onChangeFilters(
                          { occupancy: values },
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
            <Container as="section" fluid className={styles.category}>
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
                    label="Étiquette DPE (majoritaire)"
                    options={energyConsumptionOptions}
                    initialValues={filters.energyConsumptions}
                    onChange={(values) =>
                      onChangeFilters(
                        { energyConsumptions: values },
                        'Étiquette DPE (majoritaire)'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Étiquette DPE (+ mauvaise)"
                    options={energyConsumptionWorstOptions}
                    initialValues={filters.energyConsumptionsWorst}
                    onChange={(values) =>
                      onChangeFilters(
                        { energyConsumptionsWorst: values },
                        'Étiquette DPE (+ mauvaise)'
                      )
                    }
                  />
                </Col>
              </Row>
            </Container>
          </AccordionItem>
          <AccordionItem
            title={<TitleWithIcon icon="ri-user-fill" title="Propriétaires" />}
          >
            <Container as="section" fluid className={styles.category}>
              <Row gutters>
                <Col n="6">
                  <AppMultiSelect
                    label="Type"
                    options={ownerKindOptions}
                    initialValues={filters.ownerKinds}
                    onChange={(values) =>
                      onChangeFilters({ ownerKinds: values }, 'Type')
                    }
                  />
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
            <Container as="section" className={styles.category} fluid>
              <Row gutters>
                <Col n="6">
                  <SearchableSelect
                    options={localities}
                    label="Commune"
                    placeholder="Rechercher une commune"
                    onChange={(value: string) => {
                      if (value) {
                        const values = [...(filters.localities ?? []), value];
                        onChangeFilters({ localities: values }, 'Commune');
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
                  <AppMultiSelect
                    label="Périmètre inclus"
                    options={geoPerimeterOptions(geoPerimeters)}
                    initialValues={filters.geoPerimetersIncluded}
                    onChange={(values) =>
                      onChangeFilters(
                        { geoPerimetersIncluded: values },
                        'Périmètre inclus'
                      )
                    }
                  />
                </Col>
                <Col n="6">
                  <AppMultiSelect
                    label="Périmètre exclu"
                    defaultOption="Aucun"
                    options={geoPerimeterOptions(geoPerimeters)}
                    initialValues={filters.geoPerimetersExcluded}
                    onChange={(values) =>
                      onChangeFilters(
                        { geoPerimetersExcluded: values },
                        'Périmètre exclu'
                      )
                    }
                  />
                </Col>
              </Row>
            </Container>
          </AccordionItem>
          <AccordionItem
            title={<TitleWithIcon icon="ri-hand-coin-fill" title="Suivi" />}
          >
            <Container as="section" fluid className={styles.category}>
              <Row gutters>
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
              </Row>
            </Container>
          </AccordionItem>
          <AccordionItem
            title={<TitleWithIcon icon="ri-calendar-fill" title="Millésime" />}
          >
            <Container as="section" fluid className={styles.category}>
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
