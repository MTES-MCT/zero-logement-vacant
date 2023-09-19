import React, { useState } from 'react';
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
import Map, { MapProps } from '../../components/Map/Map';
import { ViewState } from 'react-map-gl';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import classNames from 'classnames';
import { filterCount, hasPerimetersFilter } from '../../models/HousingFilters';
import GeoPerimetersModalLink from '../../components/modals/GeoPerimetersModal/GeoPerimetersModalLink';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import {
  excludeWith,
  includeExcludeWith,
  includeWith,
} from '../../utils/arrayUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import Label from '../../components/Label/Label';
import { useHousingList } from '../../hooks/useHousingList';
import housingSlice from '../../store/reducers/housingReducer';
import HousingListTabs from './HousingListTabs';
import { displayHousingCount } from '../../models/HousingCount';

const HousingListView = () => {
  useDocumentTitle('Parc de logements');
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { onResetFilters, setExpand, filters } = useFilters();
  const { data: perimeters } = useListGeoPerimetersQuery();

  const [mapViewState, setMapViewState] = useState<MapProps['viewState']>();

  function onMove(viewState: ViewState): void {
    setMapViewState(viewState);
  }

  const { view } = useAppSelector((state) => state.housing);

  const { totalCount, paginatedHousing } = useHousingList({
    filters,
  });

  const { changeFilters, changeView } = housingSlice.actions;

  const perimetersIncluded = filters.geoPerimetersIncluded?.length
    ? includeExcludeWith<GeoPerimeter, 'kind'>(
        filters.geoPerimetersIncluded,
        filters.geoPerimetersExcluded ?? [],
        (perimeter) => perimeter.kind
      )(perimeters ?? [])
    : [];

  const perimetersExcluded = filters.geoPerimetersExcluded?.length
    ? includeWith<GeoPerimeter, 'kind'>(
        filters.geoPerimetersExcluded ?? [],
        (perimeter) => perimeter.kind
      )(perimeters ?? [])
    : [];

  const remainingPerimeters = excludeWith<GeoPerimeter, 'kind'>(
    [...perimetersIncluded, ...perimetersExcluded].map((p) => p.kind),
    (perimeter) => perimeter.kind
  )(perimeters ?? []);

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
        {paginatedHousing && (
          <>
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

            {view === 'map' && (
              <Text spacing="mb-2w">
                {displayHousingCount({
                  filteredCount: paginatedHousing.filteredCount,
                  filteredOwnerCount: paginatedHousing.filteredOwnerCount,
                  totalCount,
                })}
                <div className="d-inline-block fr-ml-2w">
                  <GeoPerimetersModalLink />
                </div>
              </Text>
            )}

            {view === 'map' ? (
              <>
                <Label spacing="mb-1w">
                  Les nombres affichés dans les cercles correspondent aux
                  nombres d'immeubles.
                </Label>
                <Map
                  housingList={paginatedHousing.entities}
                  hasPerimetersFilter={hasPerimetersFilter(filters)}
                  perimeters={remainingPerimeters}
                  perimetersIncluded={perimetersIncluded}
                  perimetersExcluded={perimetersExcluded}
                  onMove={onMove}
                  viewState={mapViewState}
                />
              </>
            ) : (
              <HousingListTabs filters={filters} />
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default HousingListView;
