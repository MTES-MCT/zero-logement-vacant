import Alert from '@codegouvfr/react-dsfr/Alert';
import { Breadcrumb } from '@codegouvfr/react-dsfr/Breadcrumb';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import AppSearchBar from '~/components/_app/AppSearchBar/AppSearchBar';
import GroupNext, { type GroupProps } from '~/components/Group/GroupNext';
import { HousingDisplaySwitch } from '~/components/HousingDisplaySwitch/HousingDisplaySwitch';
import HousingFiltersBadges from '~/components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListFiltersSidemenu from '~/components/HousingListFilters/HousingListFiltersSidemenu';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFilters } from '~/hooks/useFilters';
import { useNotification } from '~/hooks/useNotification';
import { useAppSelector } from '~/hooks/useStore';
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
  const [removeGroup, removeGroupMutation] = useRemoveGroupMutation();
  const onGroupRemove: GroupProps['onRemove'] = () => {
    if (group) {
      removeGroup(group)
        .unwrap()
        .then(() => {
          navigate('/parc-de-logements');
        })
        .catch((error) => {
          console.error(error);
        });
    }
  };
  useNotification({
    toastId: 'remove-group',
    isError: removeGroupMutation.isError,
    isLoading: removeGroupMutation.isLoading,
    isSuccess: removeGroupMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression du groupe',
      loading: 'Suppression du groupe...',
      success: 'Groupe supprimé !'
    }
  });

  const [createCampaignFromGroup, createCampaignFromGroupMutation] =
    useCreateCampaignFromGroupMutation();
  const onCampaignCreate: GroupProps['onCreateCampaign'] = (campaign) => {
    if (group) {
      createCampaignFromGroup({
        campaign: {
          title: campaign.title,
          description: campaign.description,
          sentAt: campaign.sentAt ?? null
        },
        group
      })
        .unwrap()
        .then((created) => {
          navigate(`/campagnes/${created.id}`);
        });
    }
  };
  useNotification({
    toastId: 'create-campaign-from-group',
    isError: createCampaignFromGroupMutation.isError,
    isLoading: createCampaignFromGroupMutation.isLoading,
    isSuccess: createCampaignFromGroupMutation.isSuccess,
    message: {
      error: 'Erreur lors de la création de la campagne',
      loading: 'Création de la campagne...',
      success: 'Campagne créée !'
    }
  });

  const onGroupExport: GroupProps['onExport'] = () => {
    if (group) {
      const token = authService.authHeader()?.['x-access-token'];
      const url = `${config.apiEndpoint}/groups/${group.id}/export?x-access-token=${token}`;
      window.open(url, '_self');
    }
  };

  const [updateGroup, updateGroupMutation] = useUpdateGroupMutation();
  const onGroupUpdate: GroupProps['onUpdate'] = (payload) => {
    if (group) {
      updateGroup({
        ...payload,
        id: group.id
      });
    }
  };
  useNotification({
    toastId: 'update-group',
    isError: updateGroupMutation.isError,
    isLoading: updateGroupMutation.isLoading,
    isSuccess: updateGroupMutation.isSuccess,
    message: {
      error: 'Erreur lors de la mise à jour du groupe',
      loading: 'Mise à jour du groupe...',
      success: 'Groupe mis à jour !'
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
          <Grid
            size="grow"
            sx={{
              display: 'flex',
              flexFlow: 'column nowrap',
              gap: '1rem'
            }}
          >
            <Breadcrumb
              className="fr-mb-0"
              currentPageLabel={group?.title ?? ''}
              segments={[
                {
                  label: 'Parc de logements',
                  linkProps: {
                    to: '/parc-de-logements'
                  }
                }
              ]}
            />

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
              closable={false}
              small
              isClosed={!alert.length}
              onClose={() => {}}
            />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
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

export default GroupView;
