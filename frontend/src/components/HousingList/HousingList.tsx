import React, {
  ChangeEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
} from 'react';

import { Pagination as DSFRPagination, Table } from '../_dsfr';
import {
  Housing,
  HousingSort,
  HousingSortable,
  HousingUpdate,
  OccupancyKindLabels,
  SelectedHousing,
} from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';
import { HousingFilters } from '../../models/HousingFilters';
import classNames from 'classnames';
import { useCampaignList } from '../../hooks/useCampaignList';
import {
  campaignBundleIdUrlFragment,
  campaignFullName,
  CampaignNumberSort,
} from '../../models/Campaign';
import _ from 'lodash';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';

import SelectableListHeader from '../SelectableListHeader/SelectableListHeader';
import { findChild } from '../../utils/elementUtils';
import { useSort } from '../../hooks/useSort';
import { usePagination } from '../../hooks/usePagination';
import AppLink from '../_app/AppLink/AppLink';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import { useHousingList } from '../../hooks/useHousingList';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { Pagination } from '../../../../shared/models/Pagination';
import HousingSubStatusBadge from '../HousingStatusBadge/HousingSubStatusBadge';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import {
  useCountHousingQuery,
  useUpdateHousingMutation,
} from '../../services/housing.service';
import { isDefined } from '../../utils/compareUtils';
import Badge from '@codegouvfr/react-dsfr/Badge';
import Button from '@codegouvfr/react-dsfr/Button';
import AppCheckbox from '../_app/AppCheckbox/AppCheckbox';
import { useLocation } from 'react-router-dom';

export interface HousingListProps {
  actions?: (housing: Housing) => ReactNode | ReactNode[];
  children?: ReactElement | ReactElement[];
  filters: HousingFilters;
  onSelectHousing: (selectedHousing: SelectedHousing) => void;
}

const HousingList = ({
  actions,
  children,
  filters,
  onSelectHousing,
}: HousingListProps) => {
  const header = findChild(children, SelectableListHeader);

  const location = useLocation();
  const campaignList = useCampaignList();
  const { trackEvent } = useMatomo();

  const [updateHousing] = useUpdateHousingMutation();

  const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
  const [sort, setSort] = useState<HousingSort>();
  const [updatingHousing, setUpdatingHousing] = useState<Housing>();

  const { housingList } = useHousingList({
    filters,
    pagination,
    sort,
  });

  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count?.housing ?? 0;

  const { pageCount, rowNumber, hasPagination } = usePagination({
    ...pagination,
    count: filteredCount,
  });

  const changePerPage = (perPage: number) => {
    setPagination({
      ...pagination,
      page: 1,
      perPage,
    });
  };

  const changePage = (page: number) => {
    setPagination({
      ...pagination,
      page,
    });
  };

  const onSort = (sort: HousingSort) => {
    setSort(sort);
    setPagination({
      ...pagination,
      page: 1,
    });
  };

  const { getSortButton } = useSort<HousingSortable>({ onSort });

  // Contains unchecked elements if "allChecked" is true
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [allChecked, setAllChecked] = useState<boolean>(false);

  const checkAll = (checked: boolean) => {
    const selectedHousing = { all: checked, ids: [] };
    setAllChecked(selectedHousing.all);
    setCheckedIds(selectedHousing.ids);
    if (onSelectHousing) {
      onSelectHousing(selectedHousing);
    }
  };

  const checkOne = (id: string) => {
    const updatedCheckIds =
      checkedIds.indexOf(id) === -1
        ? [...checkedIds, id]
        : checkedIds.filter((f) => f !== id);
    setCheckedIds(updatedCheckIds);
    if (onSelectHousing) {
      onSelectHousing({ all: allChecked, ids: updatedCheckIds });
    }
  };

  const unselectAll = () => {
    setAllChecked(false);
    setCheckedIds([]);
    onSelectHousing?.({ all: false, ids: [] });
  };

  useEffect(() => {
    setAllChecked(false);
    setCheckedIds([]);
    onSelectHousing?.({ all: false, ids: [] });
  }, [housingList]); //eslint-disable-line react-hooks/exhaustive-deps

  if (!housingList) {
    return <></>;
  }

  const selectColumn = {
    name: 'select',
    headerRender: () => (
      <AppCheckbox
        onChange={(e: ChangeEvent<any>) => checkAll(e.target.checked)}
        checked={
          (allChecked && checkedIds.length === 0) ||
          (!allChecked && checkedIds.length === filteredCount)
        }
        className={checkedIds.length !== 0 ? 'indeterminate' : ''}
        options={[]}
      ></AppCheckbox>
    ),
    render: ({ id }: Housing) => (
      <AppCheckbox
        value={id}
        onChange={(e: ChangeEvent<any>) => checkOne(e.target.value)}
        checked={
          (allChecked && !checkedIds.includes(id)) ||
          (!allChecked && checkedIds.includes(id))
        }
        data-testid={'housing-check-' + id}
        options={[]}
      ></AppCheckbox>
    ),
  };

  const rowNumberColumn = {
    name: 'number',
    render: ({ rowNumber }: any) => <>#{rowNumber}</>,
  };

  const addressColumn = {
    name: 'address',
    headerRender: () => getSortButton('rawAddress', 'Adresse du logement'),
    render: ({ id, rawAddress }: Housing) => (
      <AppLink className="capitalize" isSimple to={`/logements/${id}`}>
        {rawAddress.map((line) => capitalize(line)).join('\n')}
      </AppLink>
    ),
  };

  const ownerColumn = {
    name: 'owner',
    headerRender: () => getSortButton('owner', 'Propriétaire principal'),
    render: ({ owner }: Housing) => (
      <>
        <AppLink
          isSimple
          title={owner.fullName}
          to={`/proprietaires/${owner.id}`}
        >
          {owner.fullName}
        </AppLink>
        {owner.administrator && <div>({owner.administrator})</div>}
      </>
    ),
  };

  const occupancyColumn = {
    name: 'occupancy',
    headerRender: () => getSortButton('occupancy', 'Occupation'),
    render: ({ occupancy }: Housing) => (
      <Badge className="bg-bf950 color-bf113">
        {OccupancyKindLabels[occupancy]}
      </Badge>
    ),
  };

  const campaignColumn = {
    name: 'campaign',
    label: 'Campagnes en cours',
    render: ({ campaignIds, id }: Housing) => (
      <>
        {campaignIds?.length > 0 &&
          _.uniq(
            campaignIds
              .map((campaignId) =>
                campaignList?.find((c) => c.id === campaignId)
              )
              .sort(CampaignNumberSort)
          )
            .filter(isDefined)
            .map((campaign, campaignIdx) => (
              <div key={id + '-campaign-' + campaignIdx}>
                <AppLink
                  isSimple
                  to={
                    '/campagnes/' +
                    campaignBundleIdUrlFragment({
                      campaignNumber: campaign.campaignNumber,
                      reminderNumber: campaign.reminderNumber,
                    })
                  }
                >
                  {campaignFullName(campaign).substring(0, 17) +
                    (campaignFullName(campaign).length > 17 ? '...' : '')}
                </AppLink>
              </div>
            ))}
      </>
    ),
  };

  const statusColumn = {
    name: 'status',
    headerRender: () => getSortButton('status', 'Statut de suivi'),
    render: ({ status, subStatus }: Housing) => (
      <div style={{ textAlign: 'center' }}>
        <HousingStatusBadge status={status} />
        <HousingSubStatusBadge status={status} subStatus={subStatus} />
      </div>
    ),
  };

  const actionColumn = {
    name: 'action',
    headerRender: () => '',
    render: (housing: Housing) =>
      actions ? (
        <>{actions(housing)}</>
      ) : (
        <Button
          title="Mettre à jour"
          size="small"
          priority="secondary"
          onClick={() => setUpdatingHousing(housing)}
        >
          Mettre à jour
        </Button>
      ),
  };

  const columns = [
    selectColumn,
    rowNumberColumn,
    addressColumn,
    ownerColumn,
    occupancyColumn,
    campaignColumn,
    statusColumn,
    actionColumn,
  ];
  const submitHousingUpdate = async (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    trackEvent({
      category: location.pathname.includes('parc-de-logements')
        ? TrackEventCategories.HousingList
        : TrackEventCategories.Campaigns,
      action: location.pathname.includes('parc-de-logements')
        ? TrackEventActions.HousingList.Update
        : TrackEventActions.Campaigns.Update,
      value: 1,
    });
    await updateHousing({
      housing,
      housingUpdate,
    });
    setUpdatingHousing(undefined);
  };

  return (
    <div>
      <header>
        <SelectableListHeader
          selected={
            allChecked ? filteredCount - checkedIds.length : checkedIds.length
          }
          count={filteredCount}
          onUnselectAll={unselectAll}
          entity="logement"
          {...header?.props}
        />
      </header>
      {housingList.length > 0 && (
        <>
          <Table
            caption="Logements"
            captionPosition="none"
            rowKey={(h: Housing) => `${h.id}_${h.owner.id}`}
            data={housingList.map((_, index) => ({
              ..._,
              rowNumber: rowNumber(index),
            }))}
            columns={columns}
            fixedLayout={true}
            className={classNames(
              'zlv-table',
              'with-modify-last',
              'with-row-number',
              { 'with-select': onSelectHousing }
            )}
            data-testid="housing-table"
          />
          {hasPagination && (
            <>
              <div className="fr-react-table--pagination-center nav">
                <DSFRPagination
                  onClick={changePage}
                  currentPage={pagination.page}
                  pageCount={pageCount}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <Button
                  onClick={() => changePerPage(50)}
                  priority="secondary"
                  disabled={pagination.perPage === 50}
                  title="Afficher 50 résultats par page"
                >
                  50 résultats par page
                </Button>
                <Button
                  onClick={() => changePerPage(200)}
                  className="fr-mx-3w"
                  priority="secondary"
                  disabled={pagination.perPage === 200}
                  title="Afficher 200 résultats par page"
                >
                  200 résultats par page
                </Button>
                <Button
                  onClick={() => changePerPage(500)}
                  priority="secondary"
                  disabled={pagination.perPage === 500}
                  title="Afficher 500 résultats par page"
                >
                  500 résultats par page
                </Button>
              </div>
            </>
          )}
        </>
      )}
      <HousingEditionSideMenu
        housing={updatingHousing}
        expand={!!updatingHousing}
        onSubmit={submitHousingUpdate}
        onClose={() => setUpdatingHousing(undefined)}
      />
    </div>
  );
};

export default HousingList;
