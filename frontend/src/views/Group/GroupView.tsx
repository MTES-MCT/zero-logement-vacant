import Alert from '@codegouvfr/react-dsfr/Alert';
import Grid from '@mui/material/Unstable_Grid2';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import Group from '../../components/Group/Group';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFilters } from '../../hooks/useFilters';
import { useAppSelector } from '../../hooks/useStore';
import { Campaign } from '../../models/Campaign';
import { GroupPayload } from '../../models/GroupPayload';
import authService from '../../services/auth.service';
import {
  useCreateCampaignFromGroupMutation,
  useFindCampaignsQuery
} from '../../services/campaign.service';

import {
  useGetGroupQuery,
  useRemoveGroupMutation,
  useUpdateGroupMutation
} from '../../services/group.service';
import config from '../../utils/config';
import HousingListMap from '../HousingList/HousingListMap';
import HousingListTabs from '../HousingList/HousingListTabs';
import HousingListTabsProvider from '../HousingList/HousingListTabsProvider';
import NotFoundView from '../NotFoundView';

interface RouterState {
  alert?: string;
}

function GroupView() {
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

  const { data: campaigns } = useFindCampaignsQuery({
    filters: {
      groupIds: [id as string]
    }
  });

  if (isLoadingGroup) {
    return null;
  }

  if (!group || !!group.archivedAt) {
    return <NotFoundView />;
  }

  return (
    <HousingListTabsProvider>
      <Grid container position="relative">
        <HousingListFiltersSidemenu
          filters={filters}
          expand={expand}
          onChange={onChangeFilters}
          onReset={onResetFilters}
          onClose={() => setExpand(false)}
        />

        <Grid display="flex" flexDirection="column" px={3} py={4} xs>
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
                onSearch={(query) => onChangeFilters({ query })}
                initialQuery={filters.query}
                placeholder="Rechercher (propriétaire, identifiant fiscal, ref. cadastrale...)"
              />
            </Grid>
            <Grid xs="auto">
              <HousingDisplaySwitch />
            </Grid>
          </Grid>

          <Grid xs={12}>
            <HousingFiltersBadges
              filters={filters}
              onChange={onChangeFilters}
            />
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
    </HousingListTabsProvider>
  );
}

export default GroupView;
