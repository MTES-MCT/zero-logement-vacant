import React from 'react';
import {
  Button,
  ButtonGroup,
  Col,
  Container,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';

import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { useFilters } from '../../hooks/useFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import classNames from 'classnames';
import { filterCount } from '../../models/HousingFilters';
import housingSlice from '../../store/reducers/housingReducer';
import HousingListTabs from './HousingListTabs';
import HousingListMap from './HousingListMap';

const HousingListView = () => {
  useDocumentTitle('Parc de logements');
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { onResetFilters, setExpand, filters } = useFilters();

  const { view } = useAppSelector((state) => state.housing);

  const { changeFilters, changeView } = housingSlice.actions;

  const removeFilter = (removedFilter: any) => {
    dispatch(
      changeFilters({
        ...filters,
        ...removedFilter,
      })
    );
  };

  const searchWithQuery = (query: string) => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.Search,
    });
    dispatch(
      changeFilters({
        ...filters,
        query,
      })
    );
  };

  return (
    <>
      <HousingListFiltersSidemenu />
      <div className="bg-100">
        <Container as="section" spacing="py-4w">
          <Title as="h1">Parc de logements</Title>
          <Text size="lead" className="subtitle">
            Explorez le parc vacant de votre territoire, mettez à jour les
            dossiers pour lesquels vous avez des informations et créez des
            échantillons de logements à mobiliser en priorité.
          </Text>
        </Container>
      </div>
      <Container as="section" spacing="py-4w mb-4w">
        <Row>
          <Col n="6">
            <div className="d-flex">
              <AppSearchBar
                onSearch={searchWithQuery}
                initialQuery={filters.query}
                placeholder="Rechercher (propriétaire, invariant, ref. cadastrale...)"
              />
              <Button
                title="Filtrer"
                icon="ri-filter-fill"
                secondary
                className="fr-ml-1w"
                onClick={() => setExpand(true)}
                data-testid="filter-button"
              >
                Filtrer ({filterCount(filters)})
              </Button>
            </div>
          </Col>

          <Col>
            <ButtonGroup isInlineFrom="sm" size="md" align="right">
              <Button
                title="Vue liste"
                tertiary
                onClick={() => {
                  trackEvent({
                    category: TrackEventCategories.HousingList,
                    action: TrackEventActions.HousingList.ListView,
                  });
                  dispatch(changeView('list'));
                }}
                className={classNames('fr-mr-0', 'color-black-50', {
                  'bg-950': view !== 'list',
                })}
              >
                Tableau
              </Button>
              <Button
                title="Vue carte"
                tertiary
                onClick={() => {
                  trackEvent({
                    category: TrackEventCategories.HousingList,
                    action: TrackEventActions.HousingList.MapView,
                  });
                  dispatch(changeView('map'));
                }}
                className={classNames('fr-ml-0', 'color-black-50', {
                  'bg-950': view !== 'map',
                })}
              >
                Cartographie
              </Button>
            </ButtonGroup>
          </Col>
        </Row>

        <HousingFiltersBadges
          filters={filters}
          onChange={(values) => removeFilter(values)}
          onReset={onResetFilters}
        />

        {view === 'map' ? (
          <HousingListMap filters={filters} />
        ) : (
          <HousingListTabs filters={filters} />
        )}
      </Container>
    </>
  );
};

export default HousingListView;
