import React, { useState } from 'react';
import { HousingStatus } from '../../models/HousingState';
import { useSelection } from '../../hooks/useSelection';
import Tab, { TabProps } from '../../components/Tab/Tab';
import HousingList, {
  HousingDisplayKey,
  HousingListProps,
} from '../../components/HousingList/HousingList';
import Help from '../../components/Help/Help';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import { Button, Row, Text } from '@dataesr/react-dsfr';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import { useUpdateHousingListMutation } from '../../services/housing.service';
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
import Alert from '../../components/Alert/Alert';
import { useHousingList } from '../../hooks/useHousingList';
import { displayHousingCount } from '../../models/HousingCount';

export type HousingListTabProps = TabProps &
  Pick<HousingListProps, 'onCountFilteredHousing'> & {
    filters: HousingFilters;
    status?: HousingStatus;
  };

const HousingListTab = ({
  index,
  activeTab,
  label,
  filters,
  status,
  onCountFilteredHousing,
}: HousingListTabProps) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const [
    updateHousingList,
    { isSuccess: isUpdateSuccess, data: updatedCount },
  ] = useUpdateHousingListMutation();

  const [filteredHousingCount, setFilteredHousingCount] = useState<number>();
  const [filteredOwnerCount, setFilteredOwnerCount] = useState<number>();
  const [creatingCampaignSelectedHousing, setCreatingCampaignSelectedHousing] =
    useState<SelectedHousing>();
  const [updatingSelectedHousing, setUpdatingSelectedHousing] =
    useState<SelectedHousing>();

  const { selectedCount, selected, setSelected } =
    useSelection(filteredHousingCount);

  const { totalCount } = useHousingList(
    {
      filters,
    },
    { skipListing: true }
  );

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

  return (
    <Tab label={label} index={index} activeTab={activeTab} className="fr-px-0">
      {isUpdateSuccess && (
        <Alert
          type="success"
          title={`La mise à jour groupée de ${updatedCount} logements a bien été enregistrée`}
          description="Les informations saisies ont bien été appliquées aux logements sélectionnés"
          closable
          className="fr-mb-2w"
        />
      )}
      {filteredHousingCount && filteredOwnerCount && (
        <Text spacing="mb-2w">
          {displayHousingCount({
            filteredCount: filteredHousingCount,
            filteredOwnerCount,
            totalCount,
            status,
          })}
        </Text>
      )}
      <HousingList
        filters={filters}
        displayKind={HousingDisplayKey.Housing}
        onCountFilteredHousing={(count) => {
          setFilteredHousingCount(count);
          onCountFilteredHousing?.(count);
        }}
        onCountFilteredOwner={setFilteredOwnerCount}
        onSelectHousing={setSelected}
      >
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
                    title="Mise à jour groupée  "
                    onClick={() => setUpdatingSelectedHousing(selected)}
                    secondary
                    className="fr-mr-1w"
                  >
                    Mise à jour groupée
                  </Button>
                )}
                <Button
                  title="Créer une campagne"
                  onClick={() => setCreatingCampaignSelectedHousing(selected)}
                  data-testid="create-campaign-button"
                >
                  Créer une campagne
                </Button>
                <CampaignCreationModal
                  open={!!creatingCampaignSelectedHousing}
                  housingCount={selectedCount}
                  filters={filters}
                  housingExcudedCount={filteredHousingCount - selectedCount}
                  onSubmit={(campaignTitle?: string) =>
                    onSubmitCampaignCreation(campaignTitle)
                  }
                  onClose={() => setCreatingCampaignSelectedHousing(undefined)}
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
    </Tab>
  );
};
export default HousingListTab;
