import React from 'react';

import { Col, Row, SearchableSelect, Title } from '@dataesr/react-dsfr';
import { useSelector } from 'react-redux';
import {
  dataYearsIncludedOptions,
  ownerAgeOptions,
  ownerKindOptions,
  vacancyDurationOptions,
} from '../../models/HousingFilters';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import AppMultiSelect from '../AppMultiSelect/AppMultiSelect';
import ButtonLink from '../ButtonLink/ButtonLink';
import { useFilters } from '../../hooks/useFilters';
import HousingListFiltersSidemenu from './HousingListFiltersSidemenu';

const HousingListFilters = () => {
  const { establishment } = useSelector(
    (state: ApplicationState) => state.authentication.authUser
  );
  const localities = establishment.localities.map((locality) => ({
    value: locality.geoCode,
    label: locality.name,
  }));
  const { filters, length, onChangeFilters, setExpand } = useFilters();

  return (
    <>
      <HousingListFiltersSidemenu />
      <Row alignItems="middle">
        <Title as="h2" look="h4">
          Filtres les plus utilisés
        </Title>
        <ButtonLink
          className="fr-ml-2w fr-mb-3w"
          isSimple
          onClick={() => setExpand(true)}
        >
          Voir tous les filtres ({length})
        </ButtonLink>
      </Row>
      <Row gutters spacing="mb-4w">
        <Col>
          <SearchableSelect
            options={localities}
            label="Commune"
            placeholder="Rechercher une commune"
            selected={filters.localities?.[0]}
            onChange={(value: string) => {
              if (value) {
                onChangeFilters({ localities: [value] }, 'Commune');
              }
            }}
          />
        </Col>
        <Col>
          <AppMultiSelect
            label="Âge du propriétaire"
            options={ownerAgeOptions}
            initialValues={filters.ownerAges}
            onChange={(values) =>
              onChangeFilters({ ownerAges: values }, 'Âge du propriétaire')
            }
          />
        </Col>
        <Col>
          <AppMultiSelect
            label="Type de propriétaire"
            options={ownerKindOptions}
            initialValues={filters.ownerKinds}
            onChange={(values) =>
              onChangeFilters({ ownerKinds: values }, 'Type de propriétaire')
            }
          />
        </Col>
        <Col>
          <AppMultiSelect
            label="Durée de vacance"
            options={vacancyDurationOptions}
            initialValues={filters.vacancyDurations}
            onChange={(values) =>
              onChangeFilters({ vacancyDurations: values }, 'Durée de vacance')
            }
          />
        </Col>
        <Col>
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
      </Row>
    </>
  );
};

export default HousingListFilters;
