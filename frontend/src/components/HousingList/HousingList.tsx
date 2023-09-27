import React, {
  ChangeEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
} from 'react';

import {
  Badge,
  Button,
  Pagination as DSFRPagination,
  Table,
} from '@dataesr/react-dsfr';
import {
  Housing,
  HousingSort,
  HousingSortable,
  HousingUpdate,
  OccupancyKindLabels,
  SelectedHousing,
} from '../../models/Housing';
import { capitalize } from '../../utils/stringUtils';

import { useLocation } from 'react-router-dom';
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
import Checkbox from '../Checkbox/Checkbox';
import { useSort } from '../../hooks/useSort';
import { usePagination } from '../../hooks/usePagination';
import InternalLink from '../InternalLink/InternalLink';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import { useHousingList } from '../../hooks/useHousingList';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { Pagination } from '../../../../shared/models/Pagination';
import HousingSubStatusBadge from '../HousingStatusBadge/HousingSubStatusBadge';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import { useUpdateHousingMutation } from '../../services/housing.service';
import { isDefined } from '../../utils/compareUtils';

export interface HousingListProps {
  actions?: (housing: Housing) => ReactNode | ReactNode[];
  children?: ReactElement | ReactElement[];
  filters: HousingFilters;
  onCountFilteredHousing?: (count: number) => void;
  onCountFilteredOwner?: (count: number) => void;
  onSelectHousing: (selectedHousing: SelectedHousing) => void;
}

const HousingList = ({
  actions,
  children,
  filters,
  onSelectHousing,
  onCountFilteredHousing,
  onCountFilteredOwner,
}: HousingListProps) => {
  const header = findChild(children, SelectableListHeader);

  const location = useLocation();
  const campaignList = useCampaignList();
  const { trackEvent } = useMatomo();

  const [updateHousing] = useUpdateHousingMutation();

  const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
  const [sort, setSort] = useState<HousingSort>();
  const [updatingHousing, setUpdatingHousing] = useState<Housing>();

  const { paginatedHousing } = useHousingList({
    filters,
    pagination,
    sort,
  });

  const { pageCount, rowNumber, hasPagination } =
    usePagination(paginatedHousing);

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

  const { cycleSort, getIcon } = useSort<HousingSortable>({ onSort });

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
    if (paginatedHousing?.filteredCount !== undefined) {
      onCountFilteredHousing?.(paginatedHousing.filteredCount);
    }
    if (paginatedHousing?.filteredOwnerCount !== undefined) {
      onCountFilteredOwner?.(paginatedHousing.filteredOwnerCount);
    }
  }, [paginatedHousing?.entities]); //eslint-disable-line react-hooks/exhaustive-deps

  if (!paginatedHousing) {
    return <></>;
  }

  const selectColumn = {
    name: 'select',
    headerRender: () => (
      <Checkbox
        onChange={(e: ChangeEvent<any>) => checkAll(e.target.checked)}
        checked={
          (allChecked && checkedIds.length === 0) ||
          (!allChecked && checkedIds.length === paginatedHousing.filteredCount)
        }
        className={checkedIds.length !== 0 ? 'indeterminate' : ''}
        label=""
      ></Checkbox>
    ),
    render: ({ id }: Housing) => (
      <Checkbox
        value={id}
        onChange={(e: ChangeEvent<any>) => checkOne(e.target.value)}
        checked={
          (allChecked && !checkedIds.includes(id)) ||
          (!allChecked && checkedIds.includes(id))
        }
        data-testid={'housing-check-' + id}
        label=""
      ></Checkbox>
    ),
  };

  const rowNumberColumn = {
    name: 'number',
    render: ({ rowNumber }: any) => <>#{rowNumber}</>,
  };

  const addressColumn = {
    name: 'address',
    headerRender: () => (
      <div
        style={{ cursor: 'pointer' }}
        onClick={() => cycleSort('rawAddress')}
      >
        Adresse du logement {getIcon('rawAddress')}
      </div>
    ),
    render: ({ id, rawAddress }: Housing) => (
      <InternalLink
        className="capitalize"
        isSimple
        to={`${location.pathname}/logements/${id}`}
      >
        {rawAddress.map((line) => capitalize(line)).join('\n')}
      </InternalLink>
    ),
  };

  const ownerColumn = {
    name: 'owner',
    headerRender: () => (
      <div style={{ cursor: 'pointer' }} onClick={() => cycleSort('owner')}>
        Propriétaire principal {getIcon('owner')}
      </div>
    ),
    render: ({ owner }: Housing) => (
      <>
        <InternalLink
          isSimple
          title={owner.fullName}
          to={`${location.pathname}/proprietaires/${owner.id}`}
        >
          {owner.fullName}
        </InternalLink>
        {owner.administrator && <div>({owner.administrator})</div>}
      </>
    ),
  };

  const occupancyColumn = {
    name: 'occupancy',
    headerRender: () => (
      <div style={{ cursor: 'pointer' }} onClick={() => cycleSort('occupancy')}>
        Occupation {getIcon('occupancy')}
      </div>
    ),
    render: ({ occupancy }: Housing) => (
      <Badge
        text={OccupancyKindLabels[occupancy]}
        className="bg-bf950 color-bf113"
      ></Badge>
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
                <InternalLink
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
                </InternalLink>
              </div>
            ))}
      </>
    ),
  };

  const statusColumn = {
    name: 'status',
    headerRender: () => (
      <div style={{ cursor: 'pointer' }} onClick={() => cycleSort('status')}>
        Statut de suivi {getIcon('status')}
      </div>
    ),
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
          size="sm"
          secondary
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

  return (
    <div>
      <header>
        <SelectableListHeader
          selected={
            allChecked
              ? paginatedHousing.filteredCount - checkedIds.length
              : checkedIds.length
          }
          count={paginatedHousing.filteredCount}
          total={paginatedHousing.totalCount}
          onUnselectAll={unselectAll}
          entity="logement"
          {...header?.props}
        />
      </header>
      {paginatedHousing.entities?.length > 0 && (
        <>
          <Table
            caption="Logements"
            captionPosition="none"
            rowKey={(h: Housing) => `${h.id}_${h.owner.id}`}
            data={paginatedHousing.entities.map((_, index) => ({
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
                  currentPage={paginatedHousing.page}
                  pageCount={pageCount}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <Button
                  onClick={() => changePerPage(50)}
                  secondary
                  disabled={paginatedHousing.perPage === 50}
                  title="Afficher 50 résultats par page"
                >
                  50 résultats par page
                </Button>
                <Button
                  onClick={() => changePerPage(200)}
                  className="fr-mx-3w"
                  secondary
                  disabled={paginatedHousing.perPage === 200}
                  title="Afficher 200 résultats par page"
                >
                  200 résultats par page
                </Button>
                <Button
                  onClick={() => changePerPage(500)}
                  secondary
                  disabled={paginatedHousing.perPage === 500}
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
