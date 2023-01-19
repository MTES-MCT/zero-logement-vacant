import React from 'react';

import { Col, Row, SearchableSelect, Title } from '@dataesr/react-dsfr';
import {
  housingAreaOptions,
  ownerAgeOptions,
  ownerKindOptions,
  vacancyDurationOptions,
} from '../../models/HousingFilters';
import AppMultiSelect from '../AppMultiSelect/AppMultiSelect';
import ButtonLink from '../ButtonLink/ButtonLink';
import { useFilters } from '../../hooks/useFilters';
import HousingListFiltersSidemenu from './HousingListFiltersSidemenu';
import { useLocalityList } from '../../hooks/useLocalityList';

const HousingListFilters = () => {
  const { localitiesOptions } = useLocalityList();
  const { filters, length, onChangeFilters, setExpand } = useFilters();
  const localities = localitiesOptions
    // Remove those localities which are already selected
    .filter((option) => !filters.localities?.includes(option.value));

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
            onChange={(value: string) => {
              if (value) {
                const values = [...(filters.localities ?? []), value];
                onChangeFilters({ localities: values }, 'Commune');
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
            label="Surface"
            options={housingAreaOptions}
            initialValues={filters.housingAreas}
            onChange={(values) =>
              onChangeFilters({ housingAreas: values }, 'Surface')
            }
          />
        </Col>
      </Row>
    </>
  );
};

export default HousingListFilters;
