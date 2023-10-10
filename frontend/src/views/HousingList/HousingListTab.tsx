import React, { useEffect, useState } from 'react';
import { HousingStatus } from '../../models/HousingState';
import { useSelection } from '../../hooks/useSelection';
import HousingList from '../../components/HousingList/HousingList';
import Help from '../../components/Help/Help';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import { Row, Text } from '../../components/_dsfr';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import {
  useCountHousingQuery,
  useUpdateHousingListMutation,
} from '../../services/housing.service';
import { HousingUpdate, SelectedHousing } from '../../models/Housing';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { CampaignKinds } from '../../models/Campaign';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useAppDispatch } from '../../hooks/useStore';
import { HousingFilters } from '../../models/HousingFilters';
import { displayHousingCount } from '../../models/HousingCount';
import fp from 'lodash/fp';
import GroupAddHousingModal from '../../components/modals/GroupAddHousingModal/GroupAddHousingModal';
import {
  useAddGroupHousingMutation,
  useCreateGroupMutation,
  useGetGroupQuery,
  useRemoveGroupHousingMutation,
} from '../../services/group.service';
import { Group } from '../../models/Group';
import { useHistory, useParams } from 'react-router-dom';
import { createCampaign } from '../../store/actions/campaignAction';
import GroupRemoveHousingModal from '../../components/GroupRemoveHousingModal/GroupRemoveHousingModal';
import GroupEditionModal from '../../components/modals/GroupUpdateModal/GroupEditionModal';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';

export type HousingListTabProps = {
  showCreateGroup?: boolean;
  showRemoveGroupHousing?: boolean;
  showCreateCampaign?: boolean;
  filters: HousingFilters;
  status?: HousingStatus;
  onCountFilteredHousing?: (count?: number) => void;
};

const HousingListTab = ({
  filters,
  status,
  showCreateGroup,
  showRemoveGroupHousing,
  showCreateCampaign,
  onCountFilteredHousing,
}: HousingListTabProps) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const [
    updateHousingList,
    { isSuccess: isUpdateSuccess, data: updatedCount },
  ] = useUpdateHousingListMutation();

  const [creatingCampaignSelectedHousing, setCreatingCampaignSelectedHousing] =
    useState<SelectedHousing>();
  const [updatingSelectedHousing, setUpdatingSelectedHousing] =
    useState<SelectedHousing>();

  const { data: housingCount } = useCountHousingQuery(
    fp.pick(['dataYearsIncluded', 'dataYearsExcluded', 'occupancies'])(filters)
  );
  const totalCount = housingCount?.housing;

  const { data: count, isFetching: isCounting } = useCountHousingQuery(filters);
  const filteredHousingCount = isCounting ? undefined : count?.housing;
  const filteredOwnerCount = isCounting ? undefined : count?.owners;

  const { selectedCount, selected, setSelected } =
    useSelection(filteredHousingCount);

  useEffect(() => {
    onCountFilteredHousing?.(filteredHousingCount);
  }, [filteredHousingCount]); //eslint-disable-line react-hooks/exhaustive-deps

  const onSubmitCampaignCreation = (campaignTitle?: string) => {
    if (campaignTitle) {
      trackEvent({
        category: TrackEventCategories.HousingList,
        action: TrackEventActions.HousingList.SaveCampaign,
        value: selectedCount,
      });
      dispatch(
        createCampaign(
          {
            kind: CampaignKinds.Initial,
            filters,
            title: campaignTitle,
          },
          selected.all,
          selected.ids
        )
      );
    }
  };

  const submitSelectedHousingUpdate = async (housingUpdate: HousingUpdate) => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.UpdateHousing,
      value: selectedCount,
    });
    await updateHousingList({
      housingUpdate,
      allHousing: selected.all,
      housingIds: selected.ids,
      filters,
    });
    setUpdatingSelectedHousing(undefined);
  };

  const [showGroupHousingAdditionModal, setShowGroupHousingAdditionModal] =
    useState(false);
  const [addGroupHousing] = useAddGroupHousingMutation();
  const router = useHistory();
  function selectGroup(group: Group): void {
    if (selected) {
      addGroupHousing({
        id: group.id,
        all: selected.all,
        ids: selected.ids,
        filters,
      });
      setShowGroupHousingAdditionModal(false);
      router.push({
        pathname: `/groupes/${group.id}`,
        state: {
          alert: 'Les logements sélectionnés ont bien été ajoutés à ce groupe.',
        },
      });
    }
  }

  const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
  const [createGroup] = useCreateGroupMutation();
  async function doCreateGroup(
    group: Pick<Group, 'title' | 'description'>
  ): Promise<void> {
    try {
      const created = await createGroup({
        title: group.title,
        description: group.description,
        housing: {
          all: selected.all,
          ids: selected.ids,
          filters,
        },
      }).unwrap();
      setShowGroupCreationModal(false);
      router.push({
        pathname: `/groupes/${created.id}`,
        state: {
          alert:
            'Votre nouveau groupe a bien été créé et les logements sélectionnés ont bien été ajoutés.',
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  const [showGroupHousingRemovalModal, setShowGroupHousingRemovalModal] =
    useState(false);
  const params = useParams<{ id?: string }>();
  const { data: group } = useGetGroupQuery(params?.id ?? '', {
    skip: !params?.id,
  });
  const [removeGroupHousing] = useRemoveGroupHousingMutation();
  async function doRemoveGroupHousing() {
    try {
      if (group) {
        await removeGroupHousing({
          id: group.id,
          all: selected.all,
          ids: selected.ids,
          filters: filters,
        }).unwrap();
      }
    } finally {
      setShowGroupHousingRemovalModal(false);
    }
  }

  return (
    <>
      {isUpdateSuccess && (
        <Alert
          severity="success"
          title={`La mise à jour groupée de ${updatedCount} logements a bien été enregistrée`}
          description="Les informations saisies ont bien été appliquées aux logements sélectionnés"
          closable
          className="fr-mb-2w"
        />
      )}
      {filteredHousingCount !== undefined &&
        filteredOwnerCount !== undefined && (
          <Text spacing="mb-2w">
            {displayHousingCount({
              filteredHousingCount,
              filteredOwnerCount,
              totalCount,
              status,
            })}
          </Text>
        )}
      <HousingList filters={filters} onSelectHousing={setSelected}>
        <SelectableListHeader
          entity="logement"
          default={
            <Help className="fr-mb-2w fr-py-2w">
              <b>Sélectionnez</b> les logements que vous souhaitez cibler, puis
              cliquez sur <b>Créer une campagne</b>.
            </Help>
          }
        >
          <SelectableListHeaderActions>
            {filteredHousingCount !== undefined && filteredHousingCount > 0 && (
              <Row justifyContent="right">
                {selectedCount > 1 && (
                  <Button
                    onClick={() => setUpdatingSelectedHousing(selected)}
                    priority="secondary"
                    className="fr-mr-1w"
                  >
                    Mise à jour groupée
                  </Button>
                )}
                {showCreateGroup && (
                  <Button
                    priority="secondary"
                    className="fr-mr-1w"
                    onClick={() => setShowGroupHousingAdditionModal(true)}
                  >
                    Ajouter dans un groupe
                  </Button>
                )}
                {showRemoveGroupHousing && (
                  <Button
                    secondary
                    className="fr-mr-1w"
                    icon="ri-close-line"
                    iconPosition="left"
                    onClick={() => setShowGroupHousingRemovalModal(true)}
                  >
                    Supprimer du groupe
                  </Button>
                )}
                {showCreateCampaign && (
                  <Button
                    title="Créer une campagne"
                    onClick={() => setCreatingCampaignSelectedHousing(selected)}
                    data-testid="create-campaign-button"
                  >
                    Créer une campagne
                  </Button>
                )}

                <GroupEditionModal
                  open={showGroupCreationModal}
                  title="Création d’un nouveau groupe de logements"
                  onSubmit={doCreateGroup}
                  onClose={() => setShowGroupCreationModal(false)}
                />

                <GroupAddHousingModal
                  open={showGroupHousingAdditionModal}
                  onSubmit={selectGroup}
                  onClose={() => setShowGroupHousingAdditionModal(false)}
                  onGroupCreate={() => {
                    setShowGroupHousingAdditionModal(false);
                    setShowGroupCreationModal(true);
                  }}
                />

                <GroupRemoveHousingModal
                  open={showGroupHousingRemovalModal}
                  housingCount={selectedCount}
                  onSubmit={doRemoveGroupHousing}
                  onClose={() => setShowGroupHousingRemovalModal(false)}
                />

                <CampaignCreationModal
                  open={!!creatingCampaignSelectedHousing}
                  housingCount={selectedCount}
                  filters={filters}
                  housingExcudedCount={filteredHousingCount - selectedCount}
                  onSubmit={(campaignTitle?: string) =>
                    onSubmitCampaignCreation(campaignTitle)
                  }
                  openingButtonProps={{
                    children: 'Créer une campagne',
                  }}
                />

                <HousingListEditionSideMenu
                  housingCount={selectedCount}
                  open={!!updatingSelectedHousing}
                  onSubmit={submitSelectedHousingUpdate}
                  onClose={() => setUpdatingSelectedHousing(undefined)}
                />
              </Row>
            )}
          </SelectableListHeaderActions>
        </SelectableListHeader>
      </HousingList>
    </>
  );
};
export default HousingListTab;
