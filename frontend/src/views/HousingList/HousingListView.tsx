import React, { useEffect, useState } from 'react';

import {
  Alert,
  Button,
  Col,
  Container,
  Row,
  Text,
  Title,
} from '@dataesr/react-dsfr';
import { useDispatch, useSelector } from 'react-redux';
import { ApplicationState } from '../../store/reducers/applicationReducers';
import HousingListFilters from '../../components/HousingListFilters/HousingListFilters';
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
import HousingListHeader from '../../components/HousingList/HousingListHeader';
import HousingListHeaderActions from '../../components/HousingList/HousingListHeaderActions';
import Help from '../../components/Help/Help';
import { useFilters } from '../../hooks/useFilters';

const HousingListView = () => {
  const dispatch = useDispatch();
  const { search } = useLocation();
  const { trackEvent } = useMatomo();
  const { onResetFilters } = useFilters();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [noHousingAlert, setNoHousingAlert] = useState(false);
  const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({
    all: false,
    ids: [],
  });

  function hasSelected(): boolean {
    return selectedHousing.all || selectedHousing.ids.length > 0;
  }

  const { paginatedHousing, filters } = useSelector(
    (state: ApplicationState) => state.housing
  );

  useEffect(() => {
    const query = new URLSearchParams(search).get('q');
    if (query) {
      dispatch(changeHousingFiltering({ ...initialHousingFilters, query }));
    } else {
      dispatch(changeHousingFiltering(filters));
    }
  }, [search, dispatch]); //eslint-disable-line react-hooks/exhaustive-deps

  const create = () => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.CreateCampaign,
      value: selectedHousingCount(selectedHousing, paginatedHousing.totalCount),
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
          paginatedHousing.totalCount
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
    return Promise.resolve();
  };

  return (
    <>
      <div className="bg-100">
        <Container as="section" spacing="py-4w">
          <AppBreadcrumb />
          <Row>
            <Col n="8">
              <Title as="h1">Base de données</Title>
              <Text size="lead" className="subtitle">
                Explorez les logements vacants de votre territoire et créez vos
                échantillons de logements à mobiliser à partir des filtres
                présents ci-dessous.
              </Text>
            </Col>
          </Row>
        </Container>
      </div>
      <Container as="section" spacing="py-4w">
        <HousingListFilters />
        <HousingFiltersBadges
          filters={filters}
          onChange={(values) => removeFilter(values)}
          onReset={onResetFilters}
        />
      </Container>
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
            {!hasSelected() && (
              <Help>
                <b>Sélectionnez</b> les logements que vous souhaitez cibler,
                puis cliquez sur <b>Créer la campagne</b>.
              </Help>
            )}
            <HousingList
              paginatedHousing={paginatedHousing}
              onChangePagination={(page, perPage) =>
                dispatch(changeHousingPagination(page, perPage))
              }
              filters={filters}
              displayKind={HousingDisplayKey.Housing}
              onSelectHousing={onSelectHousing}
              onSort={onSort}
            >
              <HousingListHeader>
                <HousingListHeaderActions>
                  {paginatedHousing.totalCount > 0 && (
                    <Row justifyContent="right">
                      {!hasSelected() && (
                        <Col n="6" spacing="mr-2w">
                          <AppSearchBar
                            onSearch={searchWithQuery}
                            initialQuery={filters.query}
                          />
                        </Col>
                      )}
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
                            paginatedHousing.totalCount
                          )}
                          filters={filters}
                          housingExcudedCount={
                            paginatedHousing.totalCount -
                            selectedHousingCount(
                              selectedHousing,
                              paginatedHousing.totalCount
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
                </HousingListHeaderActions>
              </HousingListHeader>
            </HousingList>
          </>
        )}
      </Container>
    </>
  );
};

export default HousingListView;
