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
import HousingList, {
  HousingDisplayKey,
} from '../../components/HousingList/HousingList';
import { createCampaign } from '../../store/actions/campaignAction';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';

import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';

import { CampaignKinds } from '../../models/Campaign';
import {
  HousingSort,
  HousingUpdate,
  SelectedHousing,
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
import { useSelection } from '../../hooks/useSelection';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import { useHousingList } from '../../hooks/useHousingList';
import housingSlice from '../../store/reducers/housingReducer';
import { useUpdateHousingListMutation } from '../../services/housing.service';

const HousingListView = () => {
  useDocumentTitle('Parc de logements');
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { onResetFilters, setExpand, filters } = useFilters();
  const { data: perimeters } = useListGeoPerimetersQuery();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [mapViewState, setMapViewState] = useState<MapProps['viewState']>();

  function onMove(viewState: ViewState): void {
    setMapViewState(viewState);
  }

  const { pagination, sort, view } = useAppSelector((state) => state.housing);

  const { totalCount, paginatedHousing } = useHousingList({
    filters,
    pagination,
    sort,
  });

  const { selectedCount, selected, setSelected } = useSelection(
    paginatedHousing?.filteredCount
  );

  const [updateHousingList] = useUpdateHousingListMutation();
  const [updatingSelectedHousing, setUpdatingSelectedHousing] = useState<
    SelectedHousing | undefined
  >();

  const { changeFilters, changePagination, changeSort, changeView } =
    housingSlice.actions;

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

  const create = () => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.CreateCampaign,
      value: selectedCount,
    });
    setIsCreateModalOpen(true);
  };

  const onSubmitCampaignCreation = (campaignTitle?: string) => {
    if (campaignTitle) {
      trackEvent({
        category: TrackEventCategories.HousingList,
        action: TrackEventActions.HousingList.SaveCampaign,
        value: selectedCount,
      });
      dispatch(
        createCampaign(
          {
            kind: CampaignKinds.Initial,
            filters,
            title: campaignTitle,
          },
          selected.all,
          selected.ids
        )
      );
    }
  };

  const submitSelectedHousingUpdate = async (housingUpdate: HousingUpdate) => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.UpdateHousing,
      value: selectedCount,
    });
    await updateHousingList({
      housingUpdate,
      allHousing: selected.all,
      housingIds: selected.ids,
      filters,
    });
    setUpdatingSelectedHousing(undefined);
  };

  const onSort = (sort: HousingSort) => {
    dispatch(changeSort(sort));
  };

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

  function housingCount({
    filteredCount,
    filteredOwnerCount,
  }: Pick<
    HousingPaginatedResult,
    'filteredCount' | 'filteredOwnerCount'
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

            <Text spacing="mb-2w">
              {housingCount({
                filteredCount: paginatedHousing.filteredCount,
                filteredOwnerCount: paginatedHousing.filteredOwnerCount,
              })}
              {view === 'map' && (
                <div className="d-inline-block fr-ml-2w">
                  <GeoPerimetersModalLink />
                </div>
              )}
            </Text>

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
                    dispatch(changePagination({ page, perPage }))
                  }
                  filters={filters}
                  displayKind={HousingDisplayKey.Housing}
                  onSelectHousing={setSelected}
                  onSort={onSort}
                >
                  <SelectableListHeader
                    entity="logement"
                    default={
                      <Help className="fr-mb-2w fr-py-2w">
                        <b>Sélectionnez</b> les logements que vous souhaitez
                        cibler, puis cliquez sur <b>Créer une campagne</b>.
                      </Help>
                    }
                  >
                    <SelectableListHeaderActions>
                      {paginatedHousing.filteredCount > 0 && (
                        <Row justifyContent="right">
                          {selectedCount > 1 && (
                            <Button
                              title="Mise à jour groupée  "
                              onClick={() =>
                                setUpdatingSelectedHousing(selected)
                              }
                              secondary
                              className="fr-mr-1w"
                            >
                              Mise à jour groupée
                            </Button>
                          )}
                          <Button
                            title="Créer une campagne"
                            onClick={() => create()}
                            data-testid="create-campaign-button"
                          >
                            Créer une campagne
                          </Button>
                          {isCreateModalOpen && (
                            <CampaignCreationModal
                              housingCount={selectedCount}
                              filters={filters}
                              housingExcudedCount={
                                paginatedHousing.filteredCount - selectedCount
                              }
                              onSubmit={(campaignTitle?: string) =>
                                onSubmitCampaignCreation(campaignTitle)
                              }
                              onClose={() => setIsCreateModalOpen(false)}
                            />
                          )}
                          <HousingListEditionSideMenu
                            housingCount={selectedCount}
                            open={!!updatingSelectedHousing}
                            onSubmit={submitSelectedHousingUpdate}
                            onClose={() =>
                              setUpdatingSelectedHousing(undefined)
                            }
                          />
                        </Row>
                      )}
                    </SelectableListHeaderActions>
                  </SelectableListHeader>
                </HousingList>
              )
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default HousingListView;
