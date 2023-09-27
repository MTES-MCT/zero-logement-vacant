import React, { useEffect, useState } from 'react';
import { Button, Row } from '@dataesr/react-dsfr';
import { HousingUpdate, SelectedHousing } from '../../models/Housing';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import { useAppDispatch } from '../../hooks/useStore';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import { createCampaignBundleReminder } from '../../store/actions/campaignAction';
import { useSelection } from '../../hooks/useSelection';
import {
  useCountHousingQuery,
  useUpdateHousingListMutation,
} from '../../services/housing.service';
import Tab, { TabProps } from '../../components/Tab/Tab';
import HousingList from '../../components/HousingList/HousingList';
import Help from '../../components/Help/Help';
import { Link } from 'react-router-dom';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';

export type Props = TabProps & {
  status: HousingStatus;
  query?: string;
  onCountFilteredHousing?: (count?: number) => void;
};

const CampaignInProgressTab = ({
  index,
  activeTab,
  label,
  status,
  query,
  onCountFilteredHousing,
}: Props) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { isCampaign, bundle: campaignBundle } = useCampaignBundle();

  const [updateHousingList] = useUpdateHousingListMutation();

  const [updatingSelectedHousing, setUpdatingSelectedHousing] =
    useState<SelectedHousing>();
  const [reminderModalSelectedHousing, setReminderModalSelectedHousing] =
    useState<SelectedHousing>();

  const filters = {
    campaignIds: campaignBundle?.campaignIds,
    status,
    query,
  };

  const { data: count } = useCountHousingQuery(filters);
  const filteredHousingCount = count?.housing ?? 0;

  const { hasSelected, selectedCount, selected, setSelected } =
    useSelection(filteredHousingCount);

  useEffect(() => {
    onCountFilteredHousing?.(filteredHousingCount);
  }, [filteredHousingCount]); //eslint-disable-line react-hooks/exhaustive-deps

  if (!campaignBundle) {
    return <></>;
  }

  const submitCampaignReminder = () => {
    dispatch(
      createCampaignBundleReminder(
        campaignBundle.kind,
        selected.all,
        selected.ids
      )
    );
  };

  const submitSelectedHousingUpdate =
    (status: HousingStatus) => async (housingUpdate: HousingUpdate) => {
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.UpdateHousing,
        value: selectedCount,
      });
      await updateHousingList({
        housingUpdate,
        allHousing: selected.all,
        housingIds: selected.ids,
        filters: {
          status,
          campaignIds: campaignBundle.campaignIds,
          query,
        },
      });
      setUpdatingSelectedHousing(undefined);
    };

  return (
    <Tab label={label} index={index} activeTab={activeTab} className="fr-px-0">
      <>
        {!hasSelected && (
          <Help className="d-block">
            <b>{getHousingState(status).title} : </b>
            {getHousingState(status).hint}
            <div className="fr-pl-3w">
              <Link to="/ressources">En savoir plus sur les statuts</Link>
            </div>
          </Help>
        )}
        <HousingList filters={filters} onSelectHousing={setSelected}>
          <SelectableListHeader entity="logement">
            <SelectableListHeaderActions>
              {hasSelected && (
                <Row justifyContent="right">
                  {status === HousingStatus.Waiting && isCampaign && (
                    <Button
                      title="Créer une campagne de relance"
                      secondary
                      onClick={() => setReminderModalSelectedHousing(selected)}
                      className="fr-mx-2w"
                    >
                      Créer une campagne de relance
                    </Button>
                  )}
                  {selectedCount > 1 && (
                    <Button
                      title="Mise à jour groupée"
                      onClick={() => setUpdatingSelectedHousing(selected)}
                    >
                      Mise à jour groupée
                    </Button>
                  )}
                </Row>
              )}
            </SelectableListHeaderActions>
          </SelectableListHeader>
        </HousingList>
        <HousingListEditionSideMenu
          housingCount={selectedCount}
          open={!!updatingSelectedHousing}
          fromDefaultCampaign={campaignBundle.campaignNumber === 0}
          onSubmit={submitSelectedHousingUpdate(status)}
          onClose={() => setUpdatingSelectedHousing(undefined)}
        />
        <CampaignCreationModal
          housingCount={selectedCount}
          open={!!reminderModalSelectedHousing}
          filters={campaignBundle.filters ?? {}}
          onSubmit={submitCampaignReminder}
          onClose={() => setReminderModalSelectedHousing(undefined)}
          isReminder={true}
        />
      </>
    </Tab>
  );
};

export default CampaignInProgressTab;
