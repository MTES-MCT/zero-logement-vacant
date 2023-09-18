import React, { useState } from 'react';
import { Alert, Button, Col, Row, Tabs } from '@dataesr/react-dsfr';
import { createCampaignBundleReminder } from '../../store/actions/campaignAction';
import HousingList, {
  HousingDisplayKey,
} from '../../components/HousingList/HousingList';
import {
  Housing,
  HousingSort,
  HousingUpdate,
  SelectedHousing,
} from '../../models/Housing';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';
import CampaignCreationModal from '../../components/modals/CampaignCreationModal/CampaignCreationModal';
import Tab from '../../components/Tab/Tab';
import Help from '../../components/Help/Help';
import { Link } from 'react-router-dom';
import SelectableListHeaderActions from '../../components/SelectableListHeader/SelectableListHeaderActions';
import SelectableListHeader from '../../components/SelectableListHeader/SelectableListHeader';
import FilterBadges from '../../components/FiltersBadges/FiltersBadges';
import AppSearchBar from '../../components/AppSearchBar/AppSearchBar';
import { useCampaignBundle } from '../../hooks/useCampaignBundle';
import { useAppDispatch, useAppSelector } from '../../hooks/useStore';
import HousingEditionSideMenu from '../../components/HousingEdition/HousingEditionSideMenu';
import HousingListEditionSideMenu from '../../components/HousingEdition/HousingListEditionSideMenu';
import HousingStatusBadge from '../../components/HousingStatusBadge/HousingStatusBadge';
import HousingSubStatusBadge from '../../components/HousingStatusBadge/HousingSubStatusBadge';
import { useSelection } from '../../hooks/useSelection';
import { useHousingList } from '../../hooks/useHousingList';
import campaignSlice from '../../store/reducers/campaignReducer';
import {
  useUpdateHousingListMutation,
  useUpdateHousingMutation,
} from '../../services/housing.service';

interface TabContentProps {
  status: HousingStatus;
  query?: string;
}

const TabContent = ({ status, query }: TabContentProps) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { isCampaign } = useCampaignBundle();

  const [updateHousing] = useUpdateHousingMutation();
  const [updateHousingList] = useUpdateHousingListMutation();

  const [updatingHousing, setUpdatingHousing] = useState<Housing | undefined>();
  const [updatingSelectedHousing, setUpdatingSelectedHousing] = useState<
    SelectedHousing | undefined
  >();
  const [reminderModalSelectedHousing, setReminderModalSelectedHousing] =
    useState<SelectedHousing | undefined>();
  const [actionAlert, setActionAlert] = useState(false);

  const { campaignBundle } = useAppSelector((state) => state.campaign);

  const { pagination, sort } = useAppSelector(
    (state) => state.campaign.housingByStatus[status]
  );

  const { paginatedHousing } = useHousingList(
    {
      filters: {
        campaignIds: campaignBundle?.campaignIds,
        status: [status],
        query,
      },
      pagination,
      sort,
    },
    { skip: !campaignBundle }
  );

  const { hasSelected, selectedCount, selected, setSelected } = useSelection(
    campaignBundle?.housingCount
  );

  const { changePagination, changeSort } = campaignSlice.actions;

  if (!campaignBundle) {
    return <></>;
  }

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

  const submitSelectedHousingUpdate = async (housingUpdate: HousingUpdate) => {
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
        status: [status],
        campaignIds: campaignBundle.campaignIds,
        query,
      },
    });
    setUpdatingSelectedHousing(undefined);
  };

  const handleCampaignReminder = () => {
    if (!selected?.all && selected?.ids.length === 0) {
      setActionAlert(true);
    } else {
      setActionAlert(false);
      setReminderModalSelectedHousing(selected);
    }
  };

  const submitCampaignReminder = () => {
    dispatch(
      createCampaignBundleReminder(
        campaignBundle.kind,
        selected.all,
        selected.ids
      )
    );
  };

  const onSort = (sort: HousingSort) => {
    dispatch(changeSort({ status, sort }));
  };

  return (
    <>
      {!hasSelected && (
        <Row>
          <Col>
            <Help className="d-block">
              <b>{getHousingState(status).title} : </b>
              {getHousingState(status).hint}
              <div className="fr-pl-3w">
                <Link to="/ressources">En savoir plus sur les statuts</Link>
              </div>
            </Help>
          </Col>
          {status === HousingStatus.Waiting && isCampaign && (
            <Col n="3">
              <Button
                title="Créer une campagne de relance"
                className="float-right"
                onClick={handleCampaignReminder}
              >
                Créer une campagne de relance
              </Button>
            </Col>
          )}
        </Row>
      )}
      {actionAlert && (
        <Alert
          title=""
          description="Vous devez sélectionner au moins un logement réaliser cette action."
          className="fr-my-3w"
          type="error"
          onClose={() => setActionAlert(false)}
          data-testid="no-housing-alert"
          closable
        />
      )}
      <HousingList
        filteredCount={1}
        totalCount={1}
        pagination={{
          page: pagination?.page ?? 1,
          perPage: pagination?.perPage ?? 50,
          paginate: true,
        }}
        housingList={paginatedHousing?.entities}
        onChangePagination={(page, perPage) =>
          dispatch(changePagination({ status, pagination: { page, perPage } }))
        }
        onSort={onSort}
        displayKind={HousingDisplayKey.Owner}
        onSelectHousing={setSelected}
        additionalColumns={[statusColumn, modifyColumn]}
        tableClassName="campaign"
      >
        <SelectableListHeader entity="logement">
          <SelectableListHeaderActions>
            {hasSelected && (
              <Row justifyContent="right">
                <Button
                  title="Créer une campagne de relance"
                  secondary
                  onClick={handleCampaignReminder}
                  className="fr-mx-2w"
                >
                  Créer une campagne de relance
                </Button>
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
        onSubmit={submitSelectedHousingUpdate}
        onClose={() => setUpdatingSelectedHousing(undefined)}
      />
      {reminderModalSelectedHousing && (
        <CampaignCreationModal
          housingCount={selectedCount}
          filters={campaignBundle.filters}
          onSubmit={submitCampaignReminder}
          onClose={() => setReminderModalSelectedHousing(undefined)}
          isReminder={true}
        />
      )}
    </>
  );
};

const CampaignInProgress = () => {
  const [query, setQuery] = useState<string>();

  const { campaignBundle } = useAppSelector((state) => state.campaign);

  const filters = {
    campaignIds: campaignBundle?.campaignIds,
    query,
  };

  const housingCountByStatus = [
    useHousingList(
      {
        filters: {
          ...filters,
          status: [HousingStatus.NeverContacted],
        },
      },
      { skip: !campaignBundle }
    ).paginatedHousing?.filteredCount,
    useHousingList(
      {
        filters: {
          ...filters,
          status: [HousingStatus.Waiting],
        },
      },
      { skip: !campaignBundle }
    ).paginatedHousing?.filteredCount,
    useHousingList(
      {
        filters: {
          ...filters,
          status: [HousingStatus.FirstContact],
        },
      },
      { skip: !campaignBundle }
    ).paginatedHousing?.filteredCount,
    useHousingList(
      {
        filters: {
          ...filters,
          status: [HousingStatus.InProgress],
        },
      },
      { skip: !campaignBundle }
    ).paginatedHousing?.filteredCount,
    useHousingList(
      {
        filters: {
          ...filters,
          status: [HousingStatus.Completed],
        },
      },
      { skip: !campaignBundle }
    ).paginatedHousing?.filteredCount,
    useHousingList(
      {
        filters: {
          ...filters,
          status: [HousingStatus.Blocked],
        },
      },
      { skip: !campaignBundle }
    ).paginatedHousing?.filteredCount,
  ];

  const getTabLabel = (status: HousingStatus) => {
    return `${getHousingState(status).title} (${
      housingCountByStatus[status] ?? '...'
    })`;
  };

  return (
    <>
      <Row spacing="mb-4w">
        <Col n="3">
          <AppSearchBar
            onSearch={(input: string) => {
              setQuery(input);
            }}
          />
        </Col>
      </Row>
      {query && (
        <Row className="fr-pb-2w">
          <Col>
            <FilterBadges
              options={[{ value: query, label: query }]}
              filters={[query]}
              onChange={() => setQuery('')}
            />
          </Col>
        </Row>
      )}
      <Row>
        <Tabs className="campaignTabs">
          <Tab label={getTabLabel(HousingStatus.Waiting)}>
            <TabContent status={HousingStatus.Waiting} query={query} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.FirstContact)}>
            <TabContent status={HousingStatus.FirstContact} query={query} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.InProgress)}>
            <TabContent status={HousingStatus.InProgress} query={query} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.Completed)}>
            <TabContent status={HousingStatus.Completed} query={query} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.Blocked)}>
            <TabContent status={HousingStatus.Blocked} query={query} />
          </Tab>
        </Tabs>
      </Row>
    </>
  );
};

export default CampaignInProgress;
