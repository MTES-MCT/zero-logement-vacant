import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { HousingEditionProvider } from '~/components/HousingEdition/useHousingEdition';
import AppSearchBar from '../../components/_app/AppSearchBar/AppSearchBar';
import createCampaignCreationInfoModal from '../../components/Campaign/CampaignCreationInfoModal';
import createCampaignCreationModal from '../../components/Campaign/CampaignCreationModal';
import createGroupAddHousingModal from '../../components/Group/GroupAddHousingModal';
import createGroupCreationModal from '../../components/Group/GroupCreationModal';
import createGroupOrCampaignCreationModal from '../../components/Group/GroupOrCampaignCreationModal';
import { HousingDisplaySwitch } from '../../components/HousingDisplaySwitch/HousingDisplaySwitch';
import HousingFiltersBadges from '../../components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListFiltersSidemenu from '../../components/HousingListFilters/HousingListFiltersSidemenu';
import HousingCreationModal from '../../components/modals/HousingCreationModal/HousingCreationModal';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useFilters } from '../../hooks/useFilters';
import { useNotification } from '../../hooks/useNotification';
import { useSelection } from '../../hooks/useSelection';
import { useAppSelector } from '../../hooks/useStore';
import { useUser } from '../../hooks/useUser';
import { useCreateCampaignMutation } from '../../services/campaign.service';
import {
  useAddGroupHousingMutation,
  useCreateGroupMutation
} from '../../services/group.service';
import { useCountHousingQuery } from '../../services/housing.service';
import HousingListMap from './HousingListMap';
import HousingListTabs from './HousingListTabs';
import { useHousingListTabs } from './HousingListTabsProvider';

const campaignCreationInfoModal = createCampaignCreationInfoModal();
const campaignCreationModal = createCampaignCreationModal();
const groupOrCampaignCreationModal = createGroupOrCampaignCreationModal();
const groupAddHousingModal = createGroupAddHousingModal();
const groupCreationModal = createGroupCreationModal();

const HousingListView = () => {
  useDocumentTitle('Parc de logements');

  const {
    expand,
    filters,
    setExpand,
    setFilters,
    onChangeFilters,
    onResetFilters
  } = useFilters({
    storage: 'store'
  });

  const { view } = useAppSelector((state) => state.housing);

  const searchWithQuery = (query: string) => {
    setFilters({
      ...filters,
      query
    });
  };

  const location: { state?: RouterState } = useLocation();
  const navigate = useNavigate();
  const [alert, setAlert] = useState(location.state?.alert ?? '');
  function onFinish() {
    setAlert(
      'Le logement sélectionné a bien été ajouté à votre parc de logements.'
    );
  }

  const { isVisitor } = useUser();

  const [createGroup, createGroupMutation] = useCreateGroupMutation();
  useNotification({
    toastId: 'create-group',
    isError: createGroupMutation.isError,
    isLoading: createGroupMutation.isLoading,
    isSuccess: createGroupMutation.isSuccess,
    message: {
      error: 'Impossible de créer le groupe',
      loading: 'Création du groupe...',
      success: 'Groupe créé !'
    }
  });

  const { activeStatus } = useHousingListTabs();
  const { data: totalCount } = useCountHousingQuery({
    ...filters,
    status: activeStatus.value
  });
  const { selected, hasSelected } = useSelection(totalCount?.housing ?? 0, {
    storage: 'store'
  });
  const { data: count, isLoading: isCounting } = useCountHousingQuery({
    ...filters,
    all: selected.all,
    housingIds: selected.ids,
    status: activeStatus.value
  });

  const [addGroupHousing, addGroupHousingMutation] =
    useAddGroupHousingMutation();
  useNotification({
    toastId: 'add-group-housing',
    isError: addGroupHousingMutation.isError,
    isLoading: addGroupHousingMutation.isLoading,
    isSuccess: addGroupHousingMutation.isSuccess,
    message: {
      error: 'Impossible d’ajouter ces logements au groupe',
      loading: 'Ajout des logements au groupe...',
      success: 'Logements ajoutés au groupe !'
    }
  });

  const [createCampaign, createCampaignMutation] = useCreateCampaignMutation();
  useNotification({
    toastId: 'create-campaign',
    isError: createCampaignMutation.isError,
    isLoading: createCampaignMutation.isLoading,
    isSuccess: createCampaignMutation.isSuccess,
    message: {
      error: 'Impossible de créer la campagne',
      loading: 'Création de la campagne...',
      success: 'Campagne créée !'
    }
  });

  const [showExportAlert, setShowExportAlert] = useState(false);

  return (
    <HousingEditionProvider>
      <Grid container>
        <Grid size="auto">
          <HousingListFiltersSidemenu
            filters={filters}
            expand={expand}
            onChange={onChangeFilters}
            onReset={onResetFilters}
            onClose={() => setExpand(false)}
          />
        </Grid>

        <Grid container flexDirection="column" px={3} py={4} size="grow">
          {alert && (
            <Alert
              severity="success"
              description={alert}
              closable
              small
              className="fr-mb-2w"
            />
          )}

          <Grid container mb={1} spacing={2}>
            <Grid size="grow">
              <AppSearchBar
                initialQuery={filters.query}
                label="Rechercher (propriétaire, identifiant fiscal, ref. cadastrale...)"
                placeholder="Rechercher (propriétaire, identifiant fiscal, ref. cadastrale...)"
                onSearch={searchWithQuery}
              />
            </Grid>
            <Grid size="auto">
              <HousingDisplaySwitch />
            </Grid>
            <Grid size="auto">
              {!isVisitor && <HousingCreationModal onFinish={onFinish} />}
            </Grid>
            <Grid size="auto">
              <Button
                priority="primary"
                onClick={() => {
                  if (hasSelected) {
                    groupOrCampaignCreationModal.open();
                    if (showExportAlert) {
                      setShowExportAlert(false);
                    }
                  } else {
                    setShowExportAlert(true);
                  }
                }}
              >
                Exporter ou contacter
              </Button>
            </Grid>
          </Grid>

          <Grid sx={{ mb: 3 }} size={12}>
            <HousingFiltersBadges
              filters={filters}
              onChange={onChangeFilters}
            />
          </Grid>

          <Alert
            className="fr-mb-2w"
            closable
            isClosed={!showExportAlert}
            severity="error"
            title="Aucun logement sélectionné"
            description="Sélectionnez les logements dans le tableau de l'onglet correspondant, puis cliquez sur le bouton “Exporter ou contacter“."
            onClose={() => setShowExportAlert(false)}
          />

          <Grid mb={1} size={12}>
            {view === 'map' ? (
              <HousingListMap filters={filters} />
            ) : (
              <HousingListTabs filters={filters} />
            )}
          </Grid>
        </Grid>
      </Grid>

      <groupOrCampaignCreationModal.Component
        count={count}
        isCounting={isCounting}
        onCampaign={() => {
          groupOrCampaignCreationModal.close();
          campaignCreationInfoModal.open();
        }}
        onGroup={() => {
          groupOrCampaignCreationModal.close();
          groupAddHousingModal.open();
        }}
      />

      <campaignCreationInfoModal.Component
        count={count}
        onBack={() => {
          campaignCreationInfoModal.close();
          groupOrCampaignCreationModal.open();
        }}
        onConfirm={() => {
          campaignCreationInfoModal.close();
          campaignCreationModal.open();
        }}
      />

      <campaignCreationModal.Component
        count={count}
        onBack={() => {
          campaignCreationModal.close();
          campaignCreationInfoModal.open();
        }}
        onConfirm={(payload) => {
          createCampaign({
            ...payload,
            housing: {
              all: selected.all,
              ids: selected.ids,
              filters: {
                ...filters,
                status: activeStatus.value
              }
            }
          })
            .unwrap()
            .then((campaign) => {
              campaignCreationModal.close();
              navigate(`/campagnes/${campaign.id}`);
            });
        }}
      />

      <groupAddHousingModal.Component
        count={count}
        isCounting={isCounting}
        onBack={() => {
          groupAddHousingModal.close();
          groupOrCampaignCreationModal.open();
        }}
        onExistingGroup={(group) => {
          addGroupHousing({
            id: group.id,
            all: selected.all,
            ids: selected.ids,
            filters: {
              ...filters,
              status: activeStatus.value
            }
          })
            .unwrap()
            .then(() => {
              groupAddHousingModal.close();
              navigate(`/groupes/${group.id}`);
            });
        }}
        onNewGroup={() => {
          groupAddHousingModal.close();
          groupCreationModal.open();
        }}
      />

      <groupCreationModal.Component
        count={count}
        isCounting={isCounting}
        onBack={() => {
          groupCreationModal.close();
          groupAddHousingModal.open();
        }}
        onConfirm={({ title, description }) => {
          createGroup({
            title,
            description,
            housing: {
              all: selected.all,
              ids: selected.ids,
              filters: {
                ...filters,
                status: activeStatus.value
              }
            }
          })
            .unwrap()
            .then(({ group, status }) => {
              groupCreationModal.close();
              navigate(`/groupes/${group.id}`, {
                state: {
                  alert:
                    status === 202
                      ? 'Votre nouveau groupe a bien été créé. Les logements vont être ajoutés au fur et à mesure...'
                      : 'Votre nouveau groupe a bien été créé et les logements sélectionnés ont bien été ajoutés.'
                }
              });
            });
        }}
      />
    </HousingEditionProvider>
  );
};

interface RouterState {
  alert?: string;
}

export default HousingListView;
