import { useEffect, useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import HousingList from '../../components/HousingList/HousingList';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import { Row } from '../../components/_dsfr';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import {
  useCountHousingQuery,
  useUpdateHousingListMutation
} from '../../services/housing.service';
import { HousingUpdate, SelectedHousing } from '../../models/Housing';
import {
  TrackEventActions,
  TrackEventCategories
} from '../../models/TrackEvent';
import { useMatomo } from '@jonkoops/matomo-tracker-react';
import { HousingFilters } from '../../models/HousingFilters';
import { displayHousingCount, HousingCount } from '../../models/HousingCount';
import GroupAddHousingModal from '../../components/modals/GroupAddHousingModal/GroupAddHousingModal';
import {
  useAddGroupHousingMutation,
  useCreateGroupMutation,
  useGetGroupQuery,
  useRemoveGroupHousingMutation
} from '../../services/group.service';
import { Group } from '../../models/Group';
import { useParams } from 'react-router-dom';
import GroupRemoveHousingModal from '../../components/GroupRemoveHousingModal/GroupRemoveHousingModal';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import { useCreateCampaignMutation } from '../../services/campaign.service';
import fp from 'lodash/fp';
import { HousingStatus } from '@zerologementvacant/models';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom-v5-compat';

export type HousingListTabProps = {
  isActive: boolean;
  /**
   * @default true
   */
  showCount?: boolean;
  showCreateGroup?: boolean;
  showRemoveGroupHousing?: boolean;
  showCreateCampaign?: boolean;
  filters: HousingFilters;
  status?: HousingStatus;
  onCountFilteredHousing?: (count: HousingCount) => void;
};

const HousingListTab = ({
  filters,
  isActive,
  showCount,
  showCreateGroup,
  showRemoveGroupHousing,
  showCreateCampaign,
  status,
  onCountFilteredHousing
}: HousingListTabProps) => {
  const { trackEvent } = useMatomo();
  const navigate = useNavigate();
  const [
    updateHousingList,
    { isSuccess: isUpdateSuccess, data: updatedCount }
  ] = useUpdateHousingListMutation();

  const [updatingSelectedHousing, setUpdatingSelectedHousing] =
    useState<SelectedHousing>();
  const [error, setError] = useState<string>();

  const { data: housingCount } = useCountHousingQuery(
    fp.pick(['dataFileYearsIncluded', 'dataFileYearsExcluded', 'occupancies'])(
      filters
    )
  );
  const totalCount = housingCount?.housing;

  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count;

  const { selectedCount, selected, setSelected } = useSelection(
    filteredCount?.housing
  );
  const filteredHousingCount = filteredCount?.housing;
  const filteredOwnerCount = filteredCount?.owners;

  useEffect(() => {
    if (filteredCount !== undefined) {
      onCountFilteredHousing?.(filteredCount);
    }
  }, [filteredCount]); //eslint-disable-line react-hooks/exhaustive-deps

  const [createCampaign] = useCreateCampaignMutation();
  const onSubmitCampaignCreation = async (
    title: string,
    description: string
  ) => {
    if (title) {
      const created = await createCampaign({
        title,
        description,
        housing: {
          filters,
          all: selected.all,
          ids: selected.ids
        }
      }).unwrap();
      trackEvent({
        category: TrackEventCategories.HousingList,
        action: TrackEventActions.HousingList.SaveCampaign,
        value: selectedCount
      });
      navigate(`/campagnes/${created.id}`);
    }
  };

  const submitSelectedHousingUpdate = async (housingUpdate: HousingUpdate) => {
    trackEvent({
      category: TrackEventCategories.HousingList,
      action: TrackEventActions.HousingList.UpdateList,
      value: selectedCount
    });
    try {
      await updateHousingList({
        housingUpdate,
        allHousing: selected.all,
        housingIds: selected.ids,
        filters
      }).unwrap();
    } catch (error: any) {
      if (error.data.name === 'HousingUpdateForbiddenError') {
        setError(
          'Un ou plusieurs logements sélectionnés sont au moins dans une campagne. Il n’est pas possible de leur attribuer le statut "Non suivi".'
        );
      }
    }
    setUpdatingSelectedHousing(undefined);
  };

  const [addGroupHousing] = useAddGroupHousingMutation();

  function selectGroup(group: Group): void {
    if (selected) {
      addGroupHousing({
        id: group.id,
        all: selected.all,
        ids: selected.ids,
        filters
      });
      navigate(`/groupes/${group.id}`, {
        state: {
          alert: 'Les logements sélectionnés ont bien été ajoutés à ce groupe.'
        }
      });
    }
  }

  const [createGroup] = useCreateGroupMutation();
  async function doCreateGroup(
    group: Pick<Group, 'title' | 'description'>
  ): Promise<void> {
    try {
      const response = await createGroup({
        title: group.title,
        description: group.description,
        housing: {
          all: selected.all,
          ids: selected.ids,
          filters
        }
      }).unwrap();
      navigate(`/groupes/${response.group.id}`, {
        state: {
          alert:
            response.status === 202
              ? 'Votre nouveau groupe a bien été créé. Les logements vont être ajoutés au fur et à mesure...'
              : 'Votre nouveau groupe a bien été créé et les logements sélectionnés ont bien été ajoutés.'
        }
      });
    } catch (error) {
      console.error(error);
    }
  }

  const params = useParams<{ id?: string }>();
  const { data: group } = useGetGroupQuery(params?.id ?? '', {
    skip: !params?.id
  });
  const [removeGroupHousing] = useRemoveGroupHousingMutation();
  async function doRemoveGroupHousing(): Promise<void> {
    if (group) {
      await removeGroupHousing({
        id: group.id,
        all: selected.all,
        ids: selected.ids,
        filters: filters
      }).unwrap();
    }
  }

  if (!isActive) {
    return <></>;
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
      {error && (
        <Alert
          severity="error"
          title="Impossible de mettre à jour les logements sélectionnés"
          description={error}
          closable
          className="fr-mb-2w"
        />
      )}
      {(showCount ?? true) &&
        filteredHousingCount !== undefined &&
        filteredOwnerCount !== undefined && (
          <Typography sx={{ padding: 2 }}>
            {displayHousingCount({
              filteredHousingCount,
              filteredOwnerCount,
              totalCount,
              status
            })}
          </Typography>
        )}
      <HousingList filters={filters} onSelectHousing={setSelected}>
        <SelectableListHeader entity="logement" default={<></>}>
          <SelectableListHeaderActions>
            {filteredHousingCount !== undefined && filteredHousingCount > 0 && (
              <Row alignItems="middle" justifyContent="right">
                {selectedCount > 1 && (
                  <Button
                    className="fr-mr-1w"
                    priority="secondary"
                    size="small"
                    onClick={() => setUpdatingSelectedHousing(selected)}
                  >
                    Mise à jour groupée
                  </Button>
                )}
                {showCreateGroup && (
                  <GroupAddHousingModal
                    className="fr-mr-1w"
                    housingCount={selectedCount}
                    onGroupSelect={selectGroup}
                    onGroupCreate={doCreateGroup}
                  />
                )}
                {showRemoveGroupHousing && (
                  <GroupRemoveHousingModal
                    housingCount={selectedCount}
                    onSubmit={doRemoveGroupHousing}
                  />
                )}
                {showCreateCampaign && (
                  <CampaignCreationModal
                    housingCount={selectedCount}
                    filters={filters}
                    housingExcludedCount={filteredHousingCount - selectedCount}
                    onSubmit={onSubmitCampaignCreation}
                  />
                )}

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
