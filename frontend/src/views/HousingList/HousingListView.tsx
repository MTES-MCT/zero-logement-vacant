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
import AppBreadcrumb from '../../components/AppBreadcrumb/AppBreadcrumb';

import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';

import { CampaignKinds } from '../../models/Campaign';
import { useLocation } from 'react-router-dom';
import {
  HousingSort,
  SelectedHousing,
  selectedHousingCount,
} from '../../models/Housing';
import { initialHousingFilters } from '../../store/reducers/housingReducer';
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
import { filterCount } from '../../models/HousingFilters';
import GeoPerimetersModalLink from '../../components/modals/GeoPerimetersModal/GeoPerimetersModalLink';

type ViewMode = 'list' | 'map';

const HousingListView = () => {
  useDocumentTitle('Base de données');
  const dispatch = useAppDispatch();
  const { search } = useLocation();
  const { trackEvent } = useMatomo();
  const { onResetFilters, setExpand, filters } = useFilters();

  const [view, setView] = useState<ViewMode>('list');
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

  const { paginatedHousing } = useAppSelector((state) => state.housing);

  useEffect(() => {
    const query = new URLSearchParams(search).get('q');
    if (query) {
      dispatch(changeHousingFiltering({ ...initialHousingFilters, query }));
    } else {
      dispatch(changeHousingFiltering(filters));
    }
  }, [search, dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const pagination: Pagination =
      view === 'map'
        ? { paginate: false }
        : {
            page: paginatedHousing.page,
            perPage: paginatedHousing.perPage,
            paginate: true,
          };
    dispatch(changeHousingPagination(pagination));
  }, [dispatch, view, paginatedHousing.page, paginatedHousing.perPage]);

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

  return (
    <>
      <HousingListFiltersSidemenu />
      <div className="bg-100">
        <Container as="section" spacing="py-4w">
          <AppBreadcrumb />
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
            {new URLSearchParams(search).get('campagne') && (
              <Alert
                title="Création d’une campagne"
                description="Pour créer une nouvelle campagne, sélectionnez les propriétaires que vous souhaitez cibler, puis cliquez sur le bouton “créer la campagne”."
                className="fr-my-3w"
                closable
              />
            )}

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

            <Text spacing="mb-0">
              {displayCount(
                paginatedHousing.totalCount,
                'logement',
                true,
                paginatedHousing.filteredCount
              )}
              {view === 'map' && (
                <span className="fr-ml-2w">
                  <GeoPerimetersModalLink />
                </span>
              )}
            </Text>

            <Text size="sm">
              (
              {displayCount(
                paginatedHousing.filteredOwnerCount,
                'propriétaire'
              )}
              )
            </Text>

            {view === 'map' ? (
              <Map
                housingList={paginatedHousing.entities}
                onMove={onMove}
                viewState={mapViewState}
              />
            ) : (
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
                    <Help className="fr-my-2w fr-py-2w">
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
            )}
          </>
        )}
      </Container>
    </>
  );
};

export default HousingListView;
