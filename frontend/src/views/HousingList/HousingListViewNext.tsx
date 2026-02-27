import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Tooltip from '~/Tooltip/Tooltip';
import createGroupAddHousingModal from '~/components/Group/GroupAddHousingModal';
import createGroupCreationModal from '~/components/Group/GroupCreationModal';
import { HousingDisplaySwitch } from '~/components/HousingDisplaySwitch/HousingDisplaySwitch';
import { HousingEditionProvider } from '~/components/HousingEdition/useHousingEdition';
import HousingFiltersBadges from '~/components/HousingFiltersBadges/HousingFiltersBadges';
import HousingListFiltersSidemenu from '~/components/HousingListFilters/HousingListFiltersSidemenu';
import AppSearchBar from '~/components/_app/AppSearchBar/AppSearchBar';
import HousingCreationModal from '~/components/modals/HousingCreationModal/HousingCreationModal';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFilters } from '~/hooks/useFilters';
import { useNotification } from '~/hooks/useNotification';
import { useSelection } from '~/hooks/useSelection';
import { useAppSelector } from '~/hooks/useStore';
import { useUser } from '~/hooks/useUser';
import type { Housing } from '~/models/Housing';
import {
  useAddGroupHousingMutation,
  useCreateGroupMutation
} from '~/services/group.service';
import { useCountHousingQuery } from '~/services/housing.service';
import HousingListMap from './HousingListMap';
import HousingListTabs from './HousingListTabs';
import { useHousingListTabs } from './HousingListTabsProvider';

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
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  function onFinish(housing: Housing) {
    setAlert(
      'Le logement sélectionné a bien été ajouté à votre parc de logements.'
    );
    setIsAlertVisible(true);
    navigate(`/logements/${housing.id}`);
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

  const [showExportAlert, setShowExportAlert] = useState(false);

  return (
    <HousingEditionProvider>
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
            <Stack
              component="header"
              spacing="0.75rem"
              useFlexGap
              sx={{ flexGrow: 1 }}
            >
              <Alert
                severity="success"
                description={alert}
                closable
                small
                className="fr-mb-2w"
                isClosed={!isAlertVisible}
                onClose={() => {
                  setIsAlertVisible(false);
                }}
                {...{ role: 'status' }}
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
                    onSearch={searchWithQuery}
                  />
                </Stack>
                <Tooltip
                  align="start"
                  place="bottom"
                  title="Pour retrouver une liste de logements, copiez-collez dans la barre de recherche la liste de leurs identifiants fiscaux séparés par un espace. Exemple : « 750123456789 750123456790 750123456791 »"
                />
                <HousingDisplaySwitch />
              </Stack>

              <HousingFiltersBadges
                filters={filters}
                onChange={onChangeFilters}
              />
            </Stack>

            <Stack spacing="1rem" useFlexGap>
              <Stack
                direction="row"
                component="section"
                sx={{ justifyContent: 'flex-end' }}
              >
                {!isVisitor && <HousingCreationModal onFinish={onFinish} />}

                <Button
                  className="fr-ml-3v"
                  priority="primary"
                  iconId="fr-icon-building-line"
                  onClick={() => {
                    if (hasSelected) {
                      groupAddHousingModal.open();
                      if (showExportAlert) {
                        setShowExportAlert(false);
                      }
                    } else {
                      setShowExportAlert(true);
                    }
                  }}
                >
                  Intégrer dans un groupe
                </Button>
              </Stack>

              <Alert
                className="fr-mb-2w"
                closable
                isClosed={!showExportAlert}
                severity="info"
                title="Aucun logement sélectionné"
                description="Sélectionnez d’abord les logements à intégrer dans le groupe, puis cliquez sur le bouton “Intégrer dans un groupe“."
                onClose={() => setShowExportAlert(false)}
              />

              {view === 'map' ? (
                <HousingListMap filters={filters} />
              ) : (
                <HousingListTabs filters={filters} />
              )}
            </Stack>
          </Grid>
        </Grid>
      </Stack>


      <groupAddHousingModal.Component
        count={count}
        isCounting={isCounting}
        onBack={() => {
          groupAddHousingModal.close();
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
