import Alert from '@codegouvfr/react-dsfr/Alert';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import AppSearchBar from '~/components/_app/AppSearchBar/AppSearchBar';
import GroupNext from '~/components/Group/GroupNext';
import { HousingDisplaySwitch } from '~/components/HousingDisplaySwitch/HousingDisplaySwitch';
import HousingFiltersBadges from '~/components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListFiltersSidemenu from '~/components/HousingListFilters/HousingListFiltersSidemenu';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFilters } from '~/hooks/useFilters';
import { useAppSelector } from '~/hooks/useStore';
import type { Campaign } from '~/models/Campaign';
import type { GroupPayload } from '~/models/GroupPayload';
import authService from '~/services/auth.service';
import { useCreateCampaignFromGroupMutation } from '~/services/campaign.service';
import {
  useGetGroupQuery,
  useRemoveGroupMutation,
  useUpdateGroupMutation
} from '~/services/group.service';
import config from '~/utils/config';
import HousingListMap from '../HousingList/HousingListMap';
import HousingListTabs from '../HousingList/HousingListTabs';
import HousingListTabsProvider from '../HousingList/HousingListTabsProvider';
import NotFoundView from '../NotFoundView';

interface RouterState {
  alert?: string;
}

function GroupViewNext() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: group, isLoading: isLoadingGroup } = useGetGroupQuery(
    id as string
  );

  useDocumentTitle(group ? `Groupe - ${group?.title}` : 'Page non trouvée');

  const {
    filters,
    setFilters,
    onChangeFilters,
    onResetFilters,
    expand,
    setExpand
  } = useFilters({
    storage: 'state',
    initialState: {
      groupIds: [id as string]
    }
  });

  useEffect(() => {
    setFilters({
      groupIds: [id as string]
    });
  }, [setFilters, id]);

  const { view } = useAppSelector((state) => state.housing);

  const location: { state?: RouterState } = useLocation();
  const alert = location.state?.alert ?? '';
  const [removeGroup] = useRemoveGroupMutation();
  async function onGroupRemove(): Promise<void> {
    if (group) {
      try {
        await removeGroup(group).unwrap();
        navigate('/parc-de-logements');
      } catch (error) {
        console.error(error);
      }
    }
  }

  const [createCampaignFromGroup] = useCreateCampaignFromGroupMutation();
  async function onCampaignCreate(
    campaign: Pick<Campaign, 'title' | 'description'>
  ): Promise<void> {
    if (group) {
      const created = await createCampaignFromGroup({
        campaign,
        group
      }).unwrap();
      navigate(`/campagnes/${created.id}`);
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
        id: group.id
      });
    }
  }

  if (isLoadingGroup) {
    return null;
  }

  if (!group || !!group.archivedAt) {
    return <NotFoundView />;
  }

  return (
    <HousingListTabsProvider>
      <Stack direction="row">
        <HousingListFiltersSidemenu
          filters={filters}
          expand={expand}
          onChange={onChangeFilters}
          onReset={onResetFilters}
          onClose={() => setExpand(false)}
        />

        <Grid
          container
          component="section"
          sx={{ padding: '1.5rem', width: '100%' }}
        >
          <Grid size="grow">
            <GroupNext
              group={group}
              onCreateCampaign={onCampaignCreate}
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

            <Stack
              direction="row"
              spacing="0.75rem"
              useFlexGap
              sx={{ alignItems: 'center' }}
            >
              <Stack sx={{ flex: 1 }}>
                <AppSearchBar
                  initialQuery={filters.query}
                  label="Rechercher (propriétaire, identifiant fiscal, ref. cadastrale...)"
                  placeholder="Rechercher (propriétaire, identifiant fiscal, ref. cadastrale...)"
                  onSearch={(query) => onChangeFilters({ query })}
                />
              </Stack>
              <HousingDisplaySwitch />
            </Stack>

            <HousingFiltersBadges
              filters={filters}
              onChange={onChangeFilters}
            />

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
      </Stack>
    </HousingListTabsProvider>
  );
}

export default GroupViewNext;
