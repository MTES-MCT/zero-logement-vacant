import { Col, Row } from '../../components/_dsfr';
import { Redirect, useHistory, useParams } from 'react-router-dom';
import {
  useGetGroupQuery,
  useRemoveGroupMutation,
  useUpdateGroupMutation,
} from '../../services/group.service';
import Group from '../../components/Group/Group';
import { filterCount } from '../../models/HousingFilters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFilters } from '../../hooks/useFilters';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListMap from '../HousingList/HousingListMap';
import HousingListTabs from '../HousingList/HousingListTabs';
import { useAppSelector } from '../../hooks/useStore';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import { Campaign } from '../../models/Campaign';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import { GroupPayload } from '../../models/GroupPayload';
import Button from '@codegouvfr/react-dsfr/Button';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import { useCampaignList } from '../../hooks/useCampaignList';
import MainContainer from '../../components/MainContainer/MainContainer';
import { useCreateCampaignFromGroupMutation } from '../../services/campaign.service';

interface RouterState {
  alert?: string;
}

function GroupView() {
  const { id } = useParams<{ id: string }>();
  const { data: group, isLoading: isLoadingGroup } = useGetGroupQuery(id);

  useDocumentTitle(group?.title ?? 'Groupe');

  const { trackEvent } = useMatomo();
  const {
    filters,
    setFilters,
    expand,
    removeFilter,
    setExpand,
    onChangeFilters,
    onResetFilters,
  } = useFilters({
    storage: 'state',
    initialState: {
      groupIds: [id],
    },
  });

  const { view } = useAppSelector((state) => state.housing);

  function searchWithQuery(query: string): void {
    trackEvent({
      category: TrackEventCategories.Group,
      action: TrackEventActions.HousingList.Search,
      name: query,
    });
    setFilters({
      ...filters,
      query,
    });
  }

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

  const [createCampaignFromGroup] = useCreateCampaignFromGroupMutation();
  async function onCampaignCreate(
    campaign: Pick<Campaign, 'title'>,
  ): Promise<void> {
    if (group) {
      const created = await createCampaignFromGroup({
        campaign,
        group,
      }).unwrap();
      router.push(`/campagnes/${created.id}`);
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

  const campaignList = useCampaignList({
    filters: {
      groupIds: [id],
    },
  });

  if (!group || isLoadingGroup) {
    return <></>;
  }

  if (group.archivedAt) {
    return <Redirect to="/parc-de-logements" push={false} />;
  }

  return (
    <MainContainer>
      <Row spacing="mb-5w">
        <Group
          campaigns={campaignList}
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
        <HousingListFiltersSidemenu
          filters={filters}
          expand={expand}
          onChange={onChangeFilters}
          onReset={onResetFilters}
          onClose={() => setExpand(false)}
        />
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
          <HousingDisplaySwitch />
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
        <HousingListTabs
          filters={filters}
          showCount={false}
          showRemoveGroupHousing
        />
      )}
    </MainContainer>
  );
}

export default GroupView;
