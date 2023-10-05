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
import { createCampaign } from '../../store/actions/campaignAction';
import { CampaignKinds } from '../../models/Campaign';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import { useAppDispatch } from '../../hooks/useStore';
import { HousingFilters } from '../../models/HousingFilters';
import { displayHousingCount } from '../../models/HousingCount';
import fp from 'lodash/fp';
import {
  useAddGroupHousingMutation,
  useCreateGroupMutation,
} from '../../services/group.service';
import { Group } from '../../models/Group';
import { useHistory } from 'react-router-dom';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';

export type HousingListTabProps = {
  showGroups?: boolean;
  filters: HousingFilters;
  status?: HousingStatus;
  onCountFilteredHousing?: (count?: number) => void;
};

const HousingListTab = ({
  filters,
  status,
  showGroups,
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

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [addGroupHousing] = useAddGroupHousingMutation();
  const router = useHistory();

  function selectGroup(group: Group): void {
    if (selected) {
      addGroupHousing({
        id: group.id,
        title: group.title,
        description: group.description,
        housing: {
          all: selected.all,
          ids: selected.ids,
          filters,
        },
      });
      setShowGroupModal(false);
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
          alert: 'Votre nouveau groupe a bien été créé et les logements sélectionnés ont bien été ajoutés.',
        },
      });
    } catch (error) {
      console.error(error);
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
                {showGroups && (
                  <Button
                    onClick={() => setShowGroupModal(true)}
                    priority="secondary"
                    className="fr-mr-1w"
                  >
                    Ajouter dans un groupe
                  </Button>
                )}
                <Button
                  title="Créer une campagne"
                  onClick={() => setCreatingCampaignSelectedHousing(selected)}
                  data-testid="create-campaign-button"
                >
                  Créer une campagne
                </Button>

                <GroupCreationModal
                  open={showGroupCreationModal}
                  onSubmit={doCreateGroup}
                  onClose={() => setShowGroupCreationModal(false)}
                />

                <GroupAddHousingModal
                  open={showGroupModal}
                  onSubmit={selectGroup}
                  onClose={() => setShowGroupModal(false)}
                  onGroupCreate={() => {
                    setShowGroupModal(false);
                    setShowGroupCreationModal(true);
                  }}
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
