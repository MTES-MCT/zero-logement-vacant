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
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import { useSelection } from '../../hooks/useSelection';
import {
  useCountHousingQuery,
  useUpdateHousingListMutation,
} from '../../services/housing.service';
import HousingList from '../../components/HousingList/HousingList';
import AppHelp from '../../components/_app/AppHelp/AppHelp';
import Button from '@codegouvfr/react-dsfr/Button';
import AppLink from '../../components/_app/AppLink/AppLink';
import { useCampaign } from '../../hooks/useCampaign';
import { isDefined } from '../../utils/compareUtils';

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
  const { trackEvent } = useMatomo();
  const { campaign } = useCampaign();

  const [updateHousingList] = useUpdateHousingListMutation();

  const [updatingSelectedHousing, setUpdatingSelectedHousing] =
    useState<SelectedHousing>();

  const filters = {
    campaignIds: [campaign?.id].filter(isDefined),
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

  if (!campaign) {
    return <></>;
  }

  const submitSelectedHousingUpdate =
    (status: HousingStatus) => async (housingUpdate: HousingUpdate) => {
      trackEvent({
        category: TrackEventCategories.Campaigns,
        action: TrackEventActions.Campaigns.UpdateList,
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
    <>
      {!hasSelected && (
        <AppHelp className="d-block">
          <b>{getHousingState(status).title} : </b>
          {getHousingState(status).hint}
          <div className="fr-pl-3w">
            <AppLink to="/ressources/statuts">
              En savoir plus sur les statuts
            </AppLink>
          </div>
        </AppHelp>
      )}
      <HousingList filters={filters} onSelectHousing={setSelected}>
        <SelectableListHeader entity="logement">
          <SelectableListHeaderActions>
            {hasSelected && (
              <Row justifyContent="right">
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
        // TODO fromDefaultCampaign={campaignBundle.campaignNumber === 0}
        onSubmit={submitSelectedHousingUpdate(status)}
        onClose={() => setUpdatingSelectedHousing(undefined)}
      />
    </>
  );
};

export default CampaignInProgressTab;
