import React, { useEffect } from 'react';
import { Col, Row } from '../../components/_dsfr';

import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { useFilters } from '../../hooks/useFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import classNames from 'classnames';
import { filterCount } from '../../models/HousingFilters';
import housingSlice from '../../store/reducers/housingReducer';
import HousingListTabs from './HousingListTabs';
import HousingListMap from './HousingListMap';
import MainContainer from '../../components/MainContainer/MainContainer';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import GroupHeader from '../../components/GroupHeader/GroupHeader';

const HousingListView = () => {
  useDocumentTitle('Parc de logements');
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { onResetFilters, setExpand, filters, removeFilter } = useFilters();

  const { view } = useAppSelector((state) => state.housing);

  const { changeFilters, changeView } = housingSlice.actions;

  useEffect(() => {
    onResetFilters();
  }, [onResetFilters]);

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
    <MainContainer title="Votre parc de logements">
      <HousingListFiltersSidemenu />
      <Row spacing="mb-5w">
        <GroupHeader />
      </Row>
      <Row spacing="mb-1w">
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
          <ButtonsGroup
            inlineLayoutWhen="sm and up"
            buttonsSize="medium"
            alignment="right"
            buttons={[
              {
                children: 'Tableau',
                title: 'Vue tableau',
                priority: 'tertiary',
                onClick: () => {
                  trackEvent({
                    category: TrackEventCategories.HousingList,
                    action: TrackEventActions.HousingList.ListView,
                  });
                  dispatch(changeView('list'));
                },
                className: classNames('fr-mr-0', 'color-black-50', {
                  'bg-950': view !== 'list',
                }),
              },
              {
                children: 'Cartographie',
                title: 'Vue carte',
                priority: 'tertiary',
                onClick: () => {
                  trackEvent({
                    category: TrackEventCategories.HousingList,
                    action: TrackEventActions.HousingList.MapView,
                  });
                  dispatch(changeView('map'));
                },
                className: classNames('fr-ml-0', 'color-black-50', {
                  'bg-950': view !== 'map',
                }),
              },
            ]}
          />
        </Col>
      </Row>

      <Row>
        <HousingFiltersBadges
          filters={filters}
          onChange={removeFilter}
          onReset={onResetFilters}
        />
      </Row>

      {view === 'map' ? (
        <HousingListMap filters={filters} />
      ) : (
        <HousingListTabs filters={filters} showGroups />
      )}
    </MainContainer>
  );
};

export default HousingListView;
