import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  ButtonGroup,
  Col,
  Container,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import HousingList, {
  HousingDisplayKey,
} from '../../components/HousingList/HousingList';
import {
  changeHousingFiltering,
  changeHousingPagination,
  changeHousingSort,
} from '../../store/actions/housingAction';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';

import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';

import { CampaignKinds } from '../../models/Campaign';
import {
  HousingSort,
  SelectedHousing,
  selectedHousingCount,
} from '../../models/Housing';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import Help from '../../components/Help/Help';
import { useFilters } from '../../hooks/useFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Map, { MapProps } from '../../components/Map/Map';
import { ViewState } from 'react-map-gl';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { Pagination } from '../../../../shared/models/Pagination';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import classNames from 'classnames';
import { displayCount } from '../../utils/stringUtils';
import { filterCount, hasPerimetersFilter } from '../../models/HousingFilters';
import GeoPerimetersModalLink from '../../components/modals/GeoPerimetersModal/GeoPerimetersModalLink';
import { useListGeoPerimetersQuery } from '../../services/geo.service';
import {
  excludeWith,
  includeExcludeWith,
  includeWith,
} from '../../utils/arrayUtils';
import { GeoPerimeter } from '../../models/GeoPerimeter';
import { HousingPaginatedResult } from '../../models/PaginatedResult';
import Label from '../../components/Label/Label';

type ViewMode = 'list' | 'map';

const HousingListView = () => {
  useDocumentTitle('Parc de logements');
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { onResetFilters, setExpand, filters } = useFilters();
  const { data: perimeters } = useListGeoPerimetersQuery();

  const [view, setView] = useState<ViewMode>('list');
  const [viewLoaded, setViewLoaded] = useState<ViewMode>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [noHousingAlert, setNoHousingAlert] = useState(false);
  const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({
    all: false,
    ids: [],
  });

  const [mapViewState, setMapViewState] = useState<MapProps['viewState']>();

  function onMove(viewState: ViewState): void {
    setMapViewState(viewState);
  }

  const { totalCount, paginatedHousing } = useAppSelector(
    (state) => state.housing
  );

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

  useEffect(() => {
    const p: Pagination = view === 'map' ? { paginate: false } : {};
    dispatch(changeHousingPagination(p));
  }, [dispatch, view]);

  useEffect(() => {
    if (!paginatedHousing.loading) {
      setViewLoaded(view);
    }
  }, [paginatedHousing.loading]); //eslint-disable-line react-hooks/exhaustive-deps

  const create = () => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.CreateCampaign,
      value: selectedHousingCount(
        selectedHousing,
        paginatedHousing.filteredCount
      ),
    });
    if (!selectedHousing.all && selectedHousing?.ids.length === 0) {
      setNoHousingAlert(true);
    } else {
      setNoHousingAlert(false);
      setIsCreateModalOpen(true);
    }
  };

  const onSubmitCampaignCreation = (campaignTitle?: string) => {
    if (campaignTitle) {
      trackEvent({
        category: TrackEventCategories.HousingList,
        action: TrackEventActions.HousingList.SaveCampaign,
        value: selectedHousingCount(
          selectedHousing,
          paginatedHousing.filteredCount
        ),
      });
      dispatch(
        createCampaign(
          {
            kind: CampaignKinds.Initial,
            filters,
            title: campaignTitle,
          },
          selectedHousing.all,
          selectedHousing.ids
        )
      );
    }
  };

  const onSelectHousing = (selectedHousing: SelectedHousing) => {
    if (selectedHousing.all || selectedHousing?.ids.length !== 0) {
      setNoHousingAlert(false);
    }
    setSelectedHousing(selectedHousing);
  };

  const onSort = (sort: HousingSort) => {
    dispatch(changeHousingSort(sort));
  };

  const removeFilter = (removedFilter: any) => {
    dispatch(
      changeHousingFiltering({
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
      changeHousingFiltering({
        ...filters,
        query,
      })
    );
  };

  function housingCount({
    filteredCount,
    filteredOwnerCount,
    totalCount,
  }: Pick<
    HousingPaginatedResult,
    'filteredCount' | 'filteredOwnerCount' | 'totalCount'
  >): string {
    const items = displayCount(
      totalCount,
      'logement',
      true,
      filteredCount
    ).split(' ');
    items.splice(
      2,
      0,
      `(${displayCount(filteredOwnerCount, 'propriétaire', false)})`
    );
    return items.join(' ');
  }

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
            {noHousingAlert && (
              <Alert
                title=""
                description="Vous devez sélectionner au moins un logement."
                className="fr-my-3w"
                type="error"
                data-testid="no-housing-alert"
                closable
              />
            )}

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
                      setView('list');
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
                      setView('map');
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

            <Text spacing="mb-2w">
              {housingCount({
                filteredCount: paginatedHousing.filteredCount,
                filteredOwnerCount: paginatedHousing.filteredOwnerCount,
                totalCount,
              })}
              {view === 'map' && (
                <div className="d-inline-block fr-ml-2w">
                  <GeoPerimetersModalLink />
                </div>
              )}
            </Text>

            {view === viewLoaded && (
              <>
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
                  paginatedHousing.filteredCount > 0 && (
                    <HousingList
                      paginatedHousing={paginatedHousing}
                      onChangePagination={(page, perPage) =>
                        dispatch(changeHousingPagination({ page, perPage }))
                      }
                      filters={filters}
                      displayKind={HousingDisplayKey.Housing}
                      onSelectHousing={onSelectHousing}
                      onSort={onSort}
                    >
                      <SelectableListHeader
                        entity="logement"
                        default={
                          <Help className="fr-mb-2w fr-py-2w">
                            <b>Sélectionnez</b> les logements que vous souhaitez
                            cibler, puis cliquez sur <b>Créer la campagne</b>.
                          </Help>
                        }
                      >
                        <SelectableListHeaderActions>
                          {paginatedHousing.filteredCount > 0 && (
                            <Row justifyContent="right">
                              <Button
                                title="Créer la campagne"
                                onClick={() => create()}
                                data-testid="create-campaign-button"
                              >
                                Créer la campagne
                              </Button>
                              {isCreateModalOpen && (
                                <CampaignCreationModal
                                  housingCount={selectedHousingCount(
                                    selectedHousing,
                                    paginatedHousing.filteredCount
                                  )}
                                  filters={filters}
                                  housingExcudedCount={
                                    paginatedHousing.filteredCount -
                                    selectedHousingCount(
                                      selectedHousing,
                                      paginatedHousing.filteredCount
                                    )
                                  }
                                  onSubmit={(campaignTitle?: string) =>
                                    onSubmitCampaignCreation(campaignTitle)
                                  }
                                  onClose={() => setIsCreateModalOpen(false)}
                                />
                              )}
                            </Row>
                          )}
                        </SelectableListHeaderActions>
                      </SelectableListHeader>
                    </HousingList>
                  )
                )}
              </>
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default HousingListView;
