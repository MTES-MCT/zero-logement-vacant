import React, { useState } from 'react';
import { Button, Row } from '@dataesr/react-dsfr';
import { Housing, HousingUpdate, SelectedHousing } from '../../models/Housing';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import { useAppDispatch } from '../../hooks/useStore';
import HousingEditionSideMenu from '../../components/HousingEdition/HousingEditionSideMenu';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import HousingStatusBadge from '../../components/HousingStatusBadge/HousingStatusBadge';
import HousingSubStatusBadge from '../../components/HousingStatusBadge/HousingSubStatusBadge';
import { createCampaignBundleReminder } from '../../store/actions/campaignAction';
import { useSelection } from '../../hooks/useSelection';
import {
  useUpdateHousingListMutation,
  useUpdateHousingMutation,
} from '../../services/housing.service';
import Tab, { TabProps } from '../../components/Tab/Tab';
import HousingList, {
  HousingDisplayKey,
  HousingListProps,
} from '../../components/HousingList/HousingList';
import Help from '../../components/Help/Help';
import { Link } from 'react-router-dom';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';

export type Props = TabProps &
  Pick<HousingListProps, 'onCountFilteredHousing'> & {
    status: HousingStatus;
    query?: string;
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

  const [updateHousing] = useUpdateHousingMutation();
  const [updateHousingList] = useUpdateHousingListMutation();

  const [filteredHousingCount, setFilteredHousingCount] = useState<number>();
  const [updatingHousing, setUpdatingHousing] = useState<Housing>();
  const [updatingSelectedHousing, setUpdatingSelectedHousing] =
    useState<SelectedHousing>();
  const [reminderModalSelectedHousing, setReminderModalSelectedHousing] =
    useState<SelectedHousing>();

  const { hasSelected, selectedCount, selected, setSelected } =
    useSelection(filteredHousingCount);

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
  const submitHousingUpdate = async (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.UpdateHousing,
      value: 1,
    });
    await updateHousing({
      housingId: housing.id,
      housingUpdate,
    });
    setUpdatingHousing(undefined);
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

  const filters = {
    campaignIds: campaignBundle?.campaignIds,
    status: [status],
    query,
  };

  const modifyColumn = {
    name: 'modify',
    headerRender: () => '',
    render: (housing: Housing) => (
      <>
        <Button
          title="Mettre à jour"
          size="sm"
          secondary
          onClick={() => setUpdatingHousing(housing)}
        >
          Mettre à jour &nbsp;
          <span className="ri-edit-fill" aria-hidden="true" />
        </Button>
      </>
    ),
  };

  const statusColumn = {
    name: 'status',
    label: 'Statut',
    render: ({ status, subStatus }: Housing) => (
      <>
        <HousingStatusBadge status={status} />
        <HousingSubStatusBadge status={status} subStatus={subStatus} />
      </>
    ),
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
        <HousingList
          filters={{ ...filters, status }}
          displayKind={HousingDisplayKey.Owner}
          tableClassName="campaign"
          additionalColumns={[statusColumn, modifyColumn]}
          onCountFilteredHousing={(count) => {
            setFilteredHousingCount(count);
            onCountFilteredHousing?.(count);
          }}
          onSelectHousing={setSelected}
        >
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
                      title="Mettre à jour"
                      onClick={() => setUpdatingSelectedHousing(selected)}
                    >
                      Mettre à jour
                    </Button>
                  )}
                </Row>
              )}
            </SelectableListHeaderActions>
          </SelectableListHeader>
        </HousingList>
        <HousingEditionSideMenu
          housing={updatingHousing}
          expand={!!updatingHousing}
          onSubmit={submitHousingUpdate}
          onClose={() => setUpdatingHousing(undefined)}
        />
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
