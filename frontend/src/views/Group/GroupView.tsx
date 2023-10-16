import { Col, Container, Row } from '../../components/_dsfr';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import {
  useGetGroupQuery,
  useRemoveGroupMutation,
  useUpdateGroupMutation,
} from '../../services/group.service';
import Group from '../../components/Group/Group';
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
import {
  createCampaignFromGroup,
  listCampaigns,
} from '../../store/actions/campaignAction';
import {
  Campaign,
  campaignBundleIdUrlFragment,
  getCampaignBundleId,
} from '../../models/Campaign';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import { GroupPayload } from '../../models/GroupPayload';
import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { Alert } from '@codegouvfr/react-dsfr/Alert';

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

  function searchWithQuery(query: string): void {
    trackEvent({
      category: TrackEventCategories.Group,
      action: TrackEventActions.HousingList.Search,
    });
    dispatch(
      changeFilters({
        ...filters,
        query,
      })
    );
  }

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
  async function onGroupRemove(): Promise<void> {
    if (group) {
      try {
        await removeGroup(group).unwrap();
        router.push('/parc-de-logements');
      } catch (error) {
        console.error(error);
      }
    }
  }

  async function onCampaignCreate(
    campaign: Pick<Campaign, 'title'>
  ): Promise<void> {
    if (group) {
      const created = await dispatch(
        createCampaignFromGroup({ campaign, group })
      );
      const id = campaignBundleIdUrlFragment(getCampaignBundleId(created));
      router.push(`/campagnes/${id}`);
    }
  }

  async function onGroupExport(): Promise<void> {
    if (group) {
      const token = authService.authHeader()?.['x-access-token'];
      const url = `${config.apiEndpoint}/api/groups/${group.id}/export?x-access-token=${token}`;
      window.open(url, '_self');
    }
  }

  const [updateGroup] = useUpdateGroupMutation();
  function onGroupUpdate(payload: GroupPayload): void {
    if (group) {
      updateGroup({
        ...payload,
        id: group.id,
      });
    }
  }

  const { campaignList: campaigns } = useAppSelector((state) => state.campaign);
  useEffect(() => {
    dispatch(
      listCampaigns({
        filters: {
          groupIds: [id],
        },
      })
    );
  }, [dispatch, id]);

  if (!group || isLoadingGroup) {
    return <></>;
  }

  if (!!group.archivedAt) {
    return <Redirect to="/parc-de-logements" push={false} />;
  }

  return (
    <Container as="section" spacing="py-4w">
      <Row spacing="mb-5w">
        <Group
          campaigns={campaigns}
          group={group}
          onCampaignCreate={onCampaignCreate}
          onExport={onGroupExport}
          onUpdate={onGroupUpdate}
          onRemove={onGroupRemove}
        />
      </Row>

      <Alert
        severity="success"
        description={alert}
        closable
        small
        isClosed={!alert.length}
        onClose={() => {}}
        className="fr-mb-5w"
      />

      <Row spacing="mb-1w" alignItems="top">
        <HousingListFiltersSidemenu />
        <Col n="6" className="d-flex">
          <AppSearchBar
            onSearch={searchWithQuery}
            initialQuery={filters.query}
            placeholder="Rechercher (propriétaire, invariant, ref. cadastrale...)"
          />
          <Button
            title="Filtrer"
            iconId="ri-filter-fill"
            priority="secondary"
            className="fr-ml-1w"
            onClick={() => setExpand(true)}
            data-testid="filter-button"
          >
            Filtrer ({filterCount(filters)})
          </Button>
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
          onChange={(values) => removeFilter(values)}
          onReset={onResetFilters}
        />
      </Row>

      {view === 'map' ? (
        <HousingListMap filters={filters} />
      ) : (
        <HousingListTabs
          filters={filters}
          showCount={false}
          showRemoveGroupHousing
        />
      )}
    </Container>
  );
}

export default GroupView;
