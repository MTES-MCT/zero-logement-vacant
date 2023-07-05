import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, Row, Tabs } from '@dataesr/react-dsfr';
import {
  changeCampaignHousingPagination,
  changeCampaignHousingSort,
  createCampaignBundleReminder,
  listCampaignBundleHousing,
  updateCampaignHousingList,
} from '../../store/actions/campaignAction';
import HousingList, {
  HousingDisplayKey,
} from '../../components/HousingList/HousingList';
import {
  Housing,
  HousingSort,
  HousingUpdate,
  SelectedHousing,
  selectedHousingCount,
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

const TabContent = ({ status }: { status: HousingStatus }) => {
  const dispatch = useAppDispatch();
  const { trackEvent } = useMatomo();
  const { isCampaign } = useCampaignBundle();

  const [selectedHousing, setSelectedHousing] = useState<SelectedHousing>({
    all: false,
    ids: [],
  });
  const [updatingHousing, setUpdatingHousing] = useState<Housing | undefined>();
  const [updatingSelectedHousing, setUpdatingSelectedHousing] = useState<
    SelectedHousing | undefined
  >();
  const [reminderModalSelectedHousing, setReminderModalSelectedHousing] =
    useState<SelectedHousing | undefined>();
  const [actionAlert, setActionAlert] = useState(false);

  function hasSelected(): boolean {
    return selectedHousing.all || selectedHousing.ids.length > 0;
  }

  const { campaignBundleHousingByStatus, campaignBundle } = useAppSelector(
    (state) => state.campaign
  );

  if (!campaignBundle) {
    return <></>;
  }

  const paginatedCampaignHousing = campaignBundleHousingByStatus[status];

  const selectedCount = selectedHousingCount(
    selectedHousing,
    paginatedCampaignHousing.filteredCount
  );

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

  const submitHousingUpdate = (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.UpdateHousing,
      value: 1,
    });
    dispatch(
      updateCampaignHousingList(housingUpdate, status, false, [housing.id])
    );
    setUpdatingHousing(undefined);
  };

  const submitSelectedHousingUpdate = (housingUpdate: HousingUpdate) => {
    trackEvent({
      category: TrackEventCategories.Campaigns,
      action: TrackEventActions.Campaigns.UpdateHousing,
      value: selectedHousingCount(
        selectedHousing,
        paginatedCampaignHousing.filteredCount
      ),
    });
    dispatch(
      updateCampaignHousingList(
        housingUpdate,
        status,
        selectedHousing.all,
        selectedHousing.ids
      )
    );
    setUpdatingSelectedHousing(undefined);
  };

  const handleCampaignReminder = () => {
    if (!selectedHousing?.all && selectedHousing?.ids.length === 0) {
      setActionAlert(true);
    } else {
      setActionAlert(false);
      setReminderModalSelectedHousing(selectedHousing);
    }
  };

  const submitCampaignReminder = () => {
    dispatch(
      createCampaignBundleReminder(
        campaignBundle.kind,
        selectedHousing.all,
        selectedHousing.ids
      )
    );
  };

  const onSort = (sort: HousingSort) => {
    dispatch(changeCampaignHousingSort(sort, status));
  };

  return (
    <>
      {!hasSelected() && (
        <Row>
          <Col>
            <Help className="d-block">
              <b>{getHousingState(status).title} : </b>
              {getHousingState(status).hint}
              <Link to="/ressources" className="float-right">
                En savoir plus sur les statuts
              </Link>
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
        paginatedHousing={paginatedCampaignHousing}
        onChangePagination={(page, perPage) =>
          dispatch(changeCampaignHousingPagination(page, perPage, status))
        }
        onSort={onSort}
        displayKind={HousingDisplayKey.Owner}
        onSelectHousing={(selectedHousing: SelectedHousing) =>
          setSelectedHousing(selectedHousing)
        }
        additionalColumns={[statusColumn, modifyColumn]}
        tableClassName="campaign"
      >
        <SelectableListHeader entity="logement">
          <SelectableListHeaderActions>
            {hasSelected() && (
              <Row justifyContent="right">
                <Button
                  title="Créer une campagne de relance"
                  secondary
                  onClick={handleCampaignReminder}
                  className="fr-mx-2w"
                >
                  Créer une campagne de relance
                </Button>
                <Button
                  title="Mettre à jour le statut"
                  onClick={() => setUpdatingSelectedHousing(selectedHousing)}
                >
                  Mettre à jour le statut
                </Button>
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
        initialStatus={status}
        fromDefaultCampaign={campaignBundle.campaignNumber === 0}
        onSubmit={(campaignHousingUpdate) =>
          submitSelectedHousingUpdate(campaignHousingUpdate)
        }
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
  const dispatch = useAppDispatch();

  const { campaignBundleHousingByStatus, campaignBundle } = useAppSelector(
    (state) => state.campaign
  );
  const [searchQuery, setSearchQuery] = useState<string>();

  useEffect(() => {
    if (campaignBundle) {
      dispatch(
        listCampaignBundleHousing(
          campaignBundle,
          HousingStatus.Waiting,
          searchQuery
        )
      );
      dispatch(
        listCampaignBundleHousing(
          campaignBundle,
          HousingStatus.FirstContact,
          searchQuery
        )
      );
      dispatch(
        listCampaignBundleHousing(
          campaignBundle,
          HousingStatus.InProgress,
          searchQuery
        )
      );
      dispatch(
        listCampaignBundleHousing(
          campaignBundle,
          HousingStatus.Blocked,
          searchQuery
        )
      );
      dispatch(
        listCampaignBundleHousing(
          campaignBundle,
          HousingStatus.Completed,
          searchQuery
        )
      );
    }
  }, [dispatch, searchQuery]); //eslint-disable-line react-hooks/exhaustive-deps

  const getTabLabel = (status: HousingStatus) => {
    return `${getHousingState(status).title} (${
      campaignBundleHousingByStatus[status].loading
        ? '...'
        : campaignBundleHousingByStatus[status].filteredCount
    })`;
  };

  return (
    <>
      <Row spacing="mb-4w">
        <Col n="3">
          <AppSearchBar
            onSearch={(input: string) => {
              setSearchQuery(input);
            }}
          />
        </Col>
      </Row>
      {searchQuery && (
        <Row className="fr-pb-2w">
          <Col>
            <FilterBadges
              options={[{ value: searchQuery, label: searchQuery }]}
              filters={[searchQuery]}
              onChange={() => setSearchQuery('')}
            />
          </Col>
        </Row>
      )}
      <Row>
        <Tabs className="campaignTabs">
          <Tab label={getTabLabel(HousingStatus.Waiting)}>
            <TabContent status={HousingStatus.Waiting} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.FirstContact)}>
            <TabContent status={HousingStatus.FirstContact} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.InProgress)}>
            <TabContent status={HousingStatus.InProgress} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.Blocked)}>
            <TabContent status={HousingStatus.Blocked} />
          </Tab>
          <Tab label={getTabLabel(HousingStatus.Completed)}>
            <TabContent status={HousingStatus.Completed} />
          </Tab>
        </Tabs>
      </Row>
    </>
  );
};

export default CampaignInProgress;
