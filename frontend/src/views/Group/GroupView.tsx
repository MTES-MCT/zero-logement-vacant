import { Button, ButtonGroup, Col, Container, Row } from '@dataesr/react-dsfr';
import { useHistory, useParams } from 'react-router-dom';
import {
  useGetGroupQuery,
  useRemoveGroupMutation,
} from '../../services/group.service';
import Group from '../../components/Group/Group';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { filterCount } from '../../models/HousingFilters';
import React, { useEffect } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFilters } from '../../hooks/useFilters';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import classNames from 'classnames';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListMap from '../HousingList/HousingListMap';
import HousingListTabs from '../HousingList/HousingListTabs';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import housingSlice from '../../store/reducers/housingReducer';
import Alert from '../../components/Alert/Alert';

interface RouterState {
  alert?: string;
}

function GroupView() {
  const { id } = useParams<{ id: string }>();
  const { data: group, isLoading: isLoadingGroup } = useGetGroupQuery(id);

  useDocumentTitle(group?.title ?? 'Groupe');

  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { onResetFilters, setExpand, filters, removeFilter } = useFilters();

  const { view } = useAppSelector((state) => state.housing);

  const { changeFilters, changeView } = housingSlice.actions;

  function searchWithQuery(query: string): void {}

  useEffect(() => {
    dispatch(
      changeFilters({
        groupIds: [id],
      })
    );
  }, [changeFilters, dispatch, id]);

  const router = useHistory<RouterState | undefined>();
  const alert = router.location.state?.alert ?? '';
  const [removeGroup] = useRemoveGroupMutation();

  async function doRemoveGroup(): Promise<void> {
    if (group) {
      try {
        await removeGroup(group).unwrap();
        router.push('/parc-de-logements');
      } catch (error) {
        console.error(error);
      }
    }
  }

  if (!group || isLoadingGroup) {
    return <></>;
  }

  return (
    <Container as="section" spacing="py-4w mb-4w">
      <Row spacing="mb-5w">
        <Group group={group} onRemove={doRemoveGroup} />
      </Row>

      <Alert
        type="success"
        description={alert}
        closable
        small
        show={alert.length > 0}
        className="fr-mb-5w"
      />

      <Row spacing="mb-1w">
        <HousingListFiltersSidemenu />
        <Col n="6" className="d-flex">
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

      <Row>
        <HousingFiltersBadges
          filters={filters}
          onChange={(values) => removeFilter(values)}
          onReset={onResetFilters}
        />
      </Row>

      {view === 'map' ? (
        <HousingListMap filters={filters} />
      ) : (
        <HousingListTabs filters={filters} />
      )}
    </Container>
  );
}

export default GroupView;
