import React, { useEffect, useState } from 'react';
import { Row } from '../../components/_dsfr';
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
import HousingList from '../../components/HousingList/HousingList';
import Help from '../../components/Help/Help';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import Button from '@codegouvfr/react-dsfr/Button';
import AppLink from '../../components/_app/AppLink/AppLink';

export type Props = {
  status: HousingStatus;
  query?: string;
  onCountFilteredHousing?: (count?: number) => void;
};

const CampaignInProgressTab = ({
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

  const filters = {
    campaignIds: campaignBundle?.campaignIds,
    status,
    query,
  };

  const { data: count, isFetching: isCounting } = useCountHousingQuery(filters);
  const filteredHousingCount = isCounting ? undefined : count?.housing;

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
    <>
      {!hasSelected && (
        <Help className="d-block">
          <b>{getHousingState(status).title} : </b>
          {getHousingState(status).hint}
          <div className="fr-pl-3w">
            <AppLink to="/ressources/statuts">
              En savoir plus sur les statuts
            </AppLink>
          </div>
        </Help>
      )}
      <HousingList filters={filters} onSelectHousing={setSelected}>
        <SelectableListHeader entity="logement">
          <SelectableListHeaderActions>
            {hasSelected && (
              <Row justifyContent="right">
                {status === HousingStatus.Waiting && isCampaign && (
                  <CampaignCreationModal
                    housingCount={selectedCount}
                    filters={campaignBundle.filters ?? {}}
                    onSubmit={submitCampaignReminder}
                    isReminder
                    openingButtonProps={{
                      children: 'Créer une campagne de relance',
                      priority: 'secondary',
                      className: 'fr-mx-2w',
                    }}
                  />
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
    </>
  );
};

export default CampaignInProgressTab;
