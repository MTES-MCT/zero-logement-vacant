import { useEffect, useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import HousingList from '../../components/HousingList/HousingList';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import {
  useCountHousingQuery,
  useUpdateHousingListMutation
} from '../../services/housing.service';
import { HousingUpdate, SelectedHousing } from '../../models/Housing';
import { HousingFilters } from '../../models/HousingFilters';
import { displayHousingCount, HousingCount } from '../../models/HousingCount';
import {
  useGetGroupQuery,
  useRemoveGroupHousingMutation
} from '../../services/group.service';
import { useParams } from 'react-router-dom';
import GroupRemoveHousingModal from '../../components/GroupRemoveHousingModal/GroupRemoveHousingModal';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import fp from 'lodash/fp';
import { HousingStatus } from '@zerologementvacant/models';
import Typography from '@mui/material/Typography';

export type HousingListTabProps = {
  isActive: boolean;
  /**
   * @default true
   */
  showCount?: boolean;
  showRemoveGroupHousing?: boolean;
  filters: HousingFilters;
  status?: HousingStatus;
  onCountFilteredHousing?: (count: HousingCount) => void;
};

const HousingListTab = ({
  filters,
  isActive,
  showCount,
  showRemoveGroupHousing,
  status,
  onCountFilteredHousing
}: HousingListTabProps) => {
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
    filteredCount?.housing,
    { storage: 'store' }
  );
  const filteredHousingCount = filteredCount?.housing;
  const filteredOwnerCount = filteredCount?.owners;

  useEffect(() => {
    if (filteredCount !== undefined) {
      onCountFilteredHousing?.(filteredCount);
    }
  }, [filteredCount]); //eslint-disable-line react-hooks/exhaustive-deps

  const submitSelectedHousingUpdate = async (housingUpdate: HousingUpdate) => {
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
          className="fr-mb-2w fr-mt-2w"
        />
      )}
      {error && (
        <Alert
          severity="error"
          title="Impossible de mettre à jour les logements sélectionnés"
          description={error}
          closable
          className="fr-mb-2w fr-mt-2w"
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
              <div>
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

                {showRemoveGroupHousing && (
                  <GroupRemoveHousingModal
                    housingCount={selectedCount}
                    onSubmit={doRemoveGroupHousing}
                  />
                )}

                <HousingListEditionSideMenu
                  housingCount={selectedCount}
                  open={!!updatingSelectedHousing}
                  onSubmit={submitSelectedHousingUpdate}
                  onClose={() => setUpdatingSelectedHousing(undefined)}
                />
              </div>
            )}
          </SelectableListHeaderActions>
        </SelectableListHeader>
      </HousingList>
    </>
  );
};
export default HousingListTab;
