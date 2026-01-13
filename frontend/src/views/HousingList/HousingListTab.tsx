import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { HousingStatus, type Occupancy } from '@zerologementvacant/models';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import GroupRemoveHousingModal from '../../components/GroupRemoveHousingModal/GroupRemoveHousingModal';
import HousingListEditionSideMenu, {
  type BatchEditionFormSchema
} from '../../components/HousingEdition/HousingListEditionSideMenu';
import HousingList from '../../components/HousingList/HousingList';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import { useSelection } from '../../hooks/useSelection';
import type { SelectedHousing } from '../../models/Housing';
import { displayHousingCount, type HousingCount } from '../../models/HousingCount';
import type { HousingFilters } from '../../models/HousingFilters';
import {
  useGetGroupQuery,
  useRemoveGroupHousingMutation
} from '../../services/group.service';
import {
  useCountHousingQuery,
  useUpdateManyHousingMutation
} from '../../services/housing.service';
import { useNotification } from '~/hooks/useNotification';

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

function HousingListTab(props: HousingListTabProps) {
  const showCount = props.showCount ?? true;
  const [updating, setUpdating] = useState<SelectedHousing>();
  const [error, setError] = useState<string>();

  const { data: housingCount } = useCountHousingQuery({
    dataFileYearsIncluded: props.filters.dataFileYearsIncluded,
    dataFileYearsExcluded: props.filters.dataFileYearsExcluded,
    occupancies: props.filters.occupancies
  });
  const totalCount = housingCount?.housing;

  const { data: count, isLoading: isCounting } = useCountHousingQuery(
    props.filters
  );
  const filteredCount = count;

  const { selectedCount, selected, setSelected, unselectAll } = useSelection(
    filteredCount?.housing,
    { storage: 'store' }
  );
  const filteredHousingCount = filteredCount?.housing;
  const filteredOwnerCount = filteredCount?.owners;

  useEffect(() => {
    if (filteredCount !== undefined) {
      props.onCountFilteredHousing?.(filteredCount);
    }
  }, [filteredCount]); //eslint-disable-line react-hooks/exhaustive-deps

  const [updateManyHousing, updateManyHousingMutation] =
    useUpdateManyHousingMutation();

  function updateHousings(payload: BatchEditionFormSchema): void {
    updateManyHousing({
      status: payload.status ?? undefined,
      subStatus: payload.subStatus ?? undefined,
      occupancy: (payload.occupancy ?? undefined) as Occupancy | undefined,
      occupancyIntended: (payload.occupancyIntended ?? undefined) as
        | Occupancy
        | undefined,
      note: payload.note ?? undefined,
      precisions:
        payload.precisions?.map((precision) => precision.id) ?? undefined,
      filters: {
        ...props.filters,
        all: selected.all,
        housingIds: selected.ids
      }
    })
      .unwrap()
      .catch((error) => {
        if (error.data.name === 'HousingUpdateForbiddenError') {
          setError(
            'Un ou plusieurs logements sélectionnés sont au moins dans une campagne. Il n’est pas possible de leur attribuer le statut "Non suivi".'
          );
        }
      })
      .finally(() => {
        setUpdating(undefined);
        unselectAll();
      });
  }

  useNotification({
    toastId: 'housing-update-many',
    isError: updateManyHousingMutation.isError,
    isLoading: updateManyHousingMutation.isLoading,
    isSuccess: updateManyHousingMutation.isSuccess,
    message: {
      error: 'Impossible de modifier les logements sélectionnés',
      loading: 'Modification des logements sélectionnés...',
      success: 'Logements modifiés !'
    }
  })

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
        filters: props.filters
      }).unwrap();
    }
  }

  if (!props.isActive) {
    return <></>;
  }

  return (
    <>
      {updateManyHousingMutation.isSuccess && (
        <Alert
          severity="success"
          title={`La mise à jour groupée de ${updateManyHousingMutation.data.length} logements a bien été enregistrée`}
          description="Les informations saisies ont bien été appliquées aux logements sélectionnés"
          closable
          className="fr-my-2w fr-mt-2w"
          onClose={() => {
            updateManyHousingMutation.reset();
          }}
        />
      )}
      {error && (
        <Alert
          severity="error"
          title="Impossible de mettre à jour les logements sélectionnés"
          description={error}
          closable
          isClosed={!error}
          onClose={() => {
            setError(undefined);
          }}
          className="fr-mb-2w fr-mt-2w"
        />
      )}

      {showCount && isCounting ? (
        <Skeleton
          animation="wave"
          variant="rectangular"
          sx={{ margin: '1rem' }}
          height="2rem"
          width="20rem"
        />
      ) : null}

      {showCount &&
        !isCounting &&
        filteredHousingCount !== undefined &&
        filteredOwnerCount !== undefined && (
          <Typography sx={{ padding: 2 }}>
            {displayHousingCount({
              filteredHousingCount,
              filteredOwnerCount,
              totalCount,
              status: props.status
            })}
          </Typography>
        )}

      <HousingList filters={props.filters} onSelectHousing={setSelected}>
        <SelectableListHeader entity="logement" default={<></>}>
          <SelectableListHeaderActions>
            {filteredHousingCount !== undefined && filteredHousingCount > 0 && (
              <>
                {selectedCount > 1 && (
                  <Button
                    className="fr-mr-1w"
                    priority="secondary"
                    size="small"
                    onClick={() => setUpdating(selected)}
                  >
                    Mise à jour groupée
                  </Button>
                )}

                {props.showRemoveGroupHousing && (
                  <GroupRemoveHousingModal
                    housingCount={selectedCount}
                    onSubmit={doRemoveGroupHousing}
                  />
                )}

                <HousingListEditionSideMenu
                  count={selectedCount}
                  selected={selected}
                  open={!!updating}
                  onSubmit={updateHousings}
                  onClose={() => setUpdating(undefined)}
                />
              </>
            )}
          </SelectableListHeaderActions>
        </SelectableListHeader>
      </HousingList>
    </>
  );
}
export default HousingListTab;
