import Badge from '@codegouvfr/react-dsfr/Badge';
import Button from '@codegouvfr/react-dsfr/Button';
import { Pagination } from '@zerologementvacant/models';
import classNames from 'classnames';
import _ from 'lodash';
import {
  ChangeEvent,
  ReactElement,
  ReactNode,
  useEffect,
  useState
} from 'react';
import { useCampaignList } from '../../hooks/useCampaignList';
import { useHousingList } from '../../hooks/useHousingList';
import { usePagination } from '../../hooks/usePagination';
import { useSort } from '../../hooks/useSort';
import { useUser } from '../../hooks/useUser';
import { campaignSort } from '../../models/Campaign';
import {
  Housing,
  HousingSort,
  HousingSortable,
  OccupancyKindLabels,
  SelectedHousing
} from '../../models/Housing';
import { HousingFilters } from '../../models/HousingFilters';
import { useCountHousingQuery } from '../../services/housing.service';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { isDefined } from '../../utils/compareUtils';
import { findChild } from '../../utils/elementUtils';
import { capitalize } from '../../utils/stringUtils';
import AppCheckbox from '../_app/AppCheckbox/AppCheckbox';
import AppLink from '../_app/AppLink/AppLink';

import { Pagination as DSFRPagination, Table } from '../_dsfr';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import HousingSubStatusBadge from '../HousingStatusBadge/HousingSubStatusBadge';

import SelectableListHeader from '../SelectableListHeader/SelectableListHeader';

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
  onSelectHousing
}: HousingListProps) => {
  const header = findChild(children, SelectableListHeader);

  const campaignList = useCampaignList();
  const { isVisitor } = useUser();

  const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
  const [sort, setSort] = useState<HousingSort>();
  const [updatingHousing, setUpdatingHousing] = useState<string | null>(null);

  const { housingList } = useHousingList({
    filters,
    pagination,
    sort
  });

  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count?.housing ?? 0;

  const { pageCount, hasPagination, rowNumber, changePerPage, changePage } =
    usePagination({
      pagination,
      setPagination,
      count: filteredCount
    });

  const onSort = (sort: HousingSort) => {
    setSort(sort);
    setPagination({
      ...pagination,
      page: 1
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
      ></AppCheckbox>
    )
  };

  const rowNumberColumn = {
    name: 'number',
    render: ({ rowNumber }: any) => <>#{rowNumber}</>
  };

  const addressColumn = {
    name: 'address',
    headerRender: () => getSortButton('rawAddress', 'Adresse du logement'),
    render: ({ id, rawAddress }: Housing) => (
      <>
        <AppLink className="capitalize" isSimple to={`/logements/${id}`}>
          {rawAddress.map((line) => capitalize(line)).join('\n')}
        </AppLink>
      </>
    )
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
    )
  };

  const occupancyColumn = {
    name: 'occupancy',
    headerRender: () => getSortButton('occupancy', 'Occupation'),
    render: ({ occupancy }: Housing) => (
      <Badge className="bg-bf950 color-bf113">
        {OccupancyKindLabels[occupancy]}
      </Badge>
    )
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
              .filter(isDefined)
              .sort(campaignSort)
          ).map((campaign, campaignIdx) => (
            <div key={id + '-campaign-' + campaignIdx}>
              <AppLink isSimple to={`/campagnes/${campaign.id}`}>
                {campaign.title.substring(0, 17) +
                  (campaign.title.length > 17 ? '...' : '')}
              </AppLink>
            </div>
          ))}
      </>
    )
  };

  const statusColumn = {
    name: 'status',
    headerRender: () => getSortButton('status', 'Statut de suivi'),
    render: ({ status, subStatus }: Housing) => (
      <div style={{ textAlign: 'center' }}>
        <HousingStatusBadge status={status} />
        <HousingSubStatusBadge
          status={status}
          subStatus={subStatus ?? undefined}
        />
      </div>
    )
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
          onClick={() => setUpdatingHousing(housing.id)}
        >
          Mettre à jour
        </Button>
      )
  };

  let columns = [
    rowNumberColumn,
    addressColumn,
    ownerColumn,
    occupancyColumn,
    campaignColumn,
    statusColumn
  ];

  if (!isVisitor) {
    columns = [selectColumn, ...columns, actionColumn];
  }

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
              rowNumber: rowNumber(index)
            }))}
            columns={columns}
            fixedLayout={true}
            className={classNames(
              'zlv-table',
              'with-modify-last',
              'with-row-number',
              !isVisitor ? { 'with-select': onSelectHousing } : undefined
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
        housing={
          housingList.find((housing) => housing.id === updatingHousing) ?? null
        }
        expand={!!updatingHousing}
        onClose={() => {
          setUpdatingHousing(null);
        }}
      />
    </div>
  );
};

export default HousingList;
