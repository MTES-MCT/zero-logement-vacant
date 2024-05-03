import Alert from '@codegouvfr/react-dsfr/Alert';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import Grid from '@mui/material/Unstable_Grid2';
import React from 'react';
import { useHistory, useParams } from 'react-router-dom';

import {
  useGetGroupQuery,
  useRemoveGroupMutation,
  useUpdateGroupMutation,
} from '../../services/group.service';
import Group from '../../components/Group/Group';
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
import { Campaign } from '../../models/Campaign';
import config from '../../utils/config';
import authService from '../../services/auth.service';
import { GroupPayload } from '../../models/GroupPayload';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import { useCampaignList } from '../../hooks/useCampaignList';
import { useCreateCampaignFromGroupMutation } from '../../services/campaign.service';
import NotFoundView from '../NotFoundView';

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

  const campaigns = useCampaignList({
    filters: {
      groupIds: [id],
    },
  });

  if (isLoadingGroup) {
    return <></>;
  }

  if (!group || !!group.archivedAt) {
    return <NotFoundView />;
  }

  return (
    <Grid container position="relative">
      <HousingListFiltersSidemenu
        filters={filters}
        expand={expand}
        onChange={onChangeFilters}
        onReset={onResetFilters}
        onClose={() => setExpand(false)}
      />

      <Grid container flexDirection="column" px={3} py={4} xs>
        <Group
          campaigns={campaigns}
          className="fr-mb-8w"
          group={group}
          onCampaignCreate={onCampaignCreate}
          onExport={onGroupExport}
          onUpdate={onGroupUpdate}
          onRemove={onGroupRemove}
        />

        <Alert
          severity="success"
          description={alert}
          closable
          small
          isClosed={!alert.length}
          onClose={() => {}}
          className="fr-mb-5w"
        />

        <Grid container mb={1} spacing={2} xs={12}>
          <Grid xs>
            <AppSearchBar
              onSearch={searchWithQuery}
              initialQuery={filters.query}
              placeholder="Rechercher (propriétaire, invariant, ref. cadastrale...)"
            />
          </Grid>
          <Grid xs="auto">
            <HousingDisplaySwitch />
          </Grid>
        </Grid>

        <Grid xs={12}>
          <HousingFiltersBadges filters={filters} onChange={removeFilter} />
        </Grid>

        {view === 'map' ? (
          <HousingListMap filters={filters} />
        ) : (
          <HousingListTabs
            filters={filters}
            showCount={false}
            showRemoveGroupHousing
          />
        )}
      </Grid>
    </Grid>
  );
}

export default GroupView;
