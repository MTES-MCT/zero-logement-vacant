import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import { Pagination as TablePagination } from '@codegouvfr/react-dsfr/Pagination';
import Select, { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';
import { Table } from '@codegouvfr/react-dsfr/Table';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';

import { Occupancy, Pagination } from '@zerologementvacant/models';
import { Set } from 'immutable';
import { ReactElement, ReactNode, useMemo, useState } from 'react';
import { useCampaignList } from '../../hooks/useCampaignList';
import { useHousingList } from '../../hooks/useHousingList';
import { usePagination } from '../../hooks/usePagination';
import { useSelection } from '../../hooks/useSelection';
import { useSort } from '../../hooks/useSort';
import { useUser } from '../../hooks/useUser';
import {
  Housing,
  HousingSort,
  HousingSortable,
  SelectedHousing
} from '../../models/Housing';
import { HousingFilters } from '../../models/HousingFilters';
import { useCountHousingQuery } from '../../services/housing.service';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { findChild } from '../../utils/elementUtils';
import { capitalize } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import HousingEditionSideMenu from '../HousingEdition/HousingEditionSideMenu';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';
import OccupancyTag from '../OccupancyTag/OccupancyTag';
import SelectableListHeader from '../SelectableListHeader/SelectableListHeader';

export interface HousingListProps {
  actions?: (housing: Housing) => ReactNode | ReactNode[];
  children?: ReactElement | ReactElement[];
  filters: HousingFilters;
  onSelectHousing: (selectedHousing: SelectedHousing) => void;
}

const MAX_CAMPAIGN_LENGTH = 17;
const perPageOptions: SelectProps.Option[] = [
  '50',
  '200',
  '500'
].map<SelectProps.Option>((nb) => {
  return { label: `${nb} résultats par page`, value: nb };
});

function HousingList(props: HousingListProps) {
  const { actions, children, filters, onSelectHousing } = props;
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

  const { pageCount, hasPagination, perPage, changePerPage } = usePagination({
    pagination,
    setPagination,
    count: filteredCount
  });

  const selection = useSelection(filteredCount);

  const onSort = (sort: HousingSort) => {
    setSort(sort);
    setPagination({
      ...pagination,
      page: 1
    });
  };

  const { getSortButton } = useSort<HousingSortable>({ onSort });

  const columnHelper = createColumnHelper<Housing>();
  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'check',
        header: () => (
          <Checkbox
            small
            options={[
              {
                nativeInputProps: {
                  value: 'all',
                  checked: selection.hasSelectedAll,
                  onChange: () => {
                    selection.toggleSelectAll();
                    onSelectHousing(selection.selected);
                  }
                }
              }
            ]}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            small
            options={[
              {
                nativeInputProps: {
                  value: row.original.id,
                  checked: selection.isSelected(row.original.id),
                  onChange: () => {
                    selection.toggleSelect(row.original.id);
                    onSelectHousing(selection.selected);
                  }
                }
              }
            ]}
          />
        )
      }),
      columnHelper.accessor('rawAddress', {
        header: 'Adresse logement',
        cell: ({ cell, row }) => {
          return (
            <AppLink isSimple to={`/logements/${row.original.id}`}>
              {cell
                .getValue()
                .map((line) => capitalize(line))
                .join('\n')}
            </AppLink>
          );
        }
      }),
      columnHelper.accessor('owner.fullName', {
        header: 'Propriétaire principal',
        cell: ({ cell, row }) => (
          <>
            <AppLink isSimple to={`/proprietaires/${row.original.id}`}>
              {cell.getValue()}
            </AppLink>
            {row.original.owner.administrator && (
              <Typography>{row.original.owner.administrator}</Typography>
            )}
          </>
        )
      }),
      columnHelper.accessor('occupancy', {
        header: 'Occupation',
        cell: ({ cell }) => (
          <OccupancyTag
            occupancy={cell.getValue() as Occupancy}
            tagProps={{
              small: true
            }}
          />
        )
      }),
      columnHelper.accessor('campaignIds', {
        header: 'Campagnes',
        cell: ({ cell }) => {
          return Set(cell.getValue())
            .map((id) => {
              return campaignList?.find((campaign) => campaign.id === id);
            })
            .filter((campaign) => campaign !== undefined)
            .map((campaign) => (
              <AppLink
                key={campaign.id}
                isSimple
                to={`/campagnes/${campaign.id}`}
              >
                {`${campaign.title.substring(0, MAX_CAMPAIGN_LENGTH)}${campaign.title.length > MAX_CAMPAIGN_LENGTH ? '...' : ''}`}
              </AppLink>
            ));
        }
      }),
      columnHelper.accessor(
        (value) => ({ status: value.status, subStatus: value.subStatus }),
        {
          header: 'Statuts de suivi',
          cell: ({ cell }) => {
            const { status, subStatus } = cell.getValue();
            return (
              <Stack sx={{ alignItems: 'center' }}>
                <HousingStatusBadge status={status} />
                {subStatus && (
                  <Typography align="center" variant="caption">
                    {subStatus}
                  </Typography>
                )}
              </Stack>
            );
          }
        }
      ),
      columnHelper.display({
        id: 'action',
        header: 'Action',
        cell: ({ row }) => {
          if (actions) {
            return <>{actions(row.original)}</>;
          }

          return (
            <Button
              title="Mettre à jour"
              iconId="fr-icon-edit-line"
              size="small"
              priority="secondary"
              onClick={() => setUpdatingHousing(row.original)}
            />
          );
        }
      })
    ],
    [campaignList, columnHelper, actions, selection, onSelectHousing]
  );

  const table = useReactTable<Housing>({
    data: housingList ?? [],
    columns: columns,
    state: {
      columnVisibility: {
        check: !isVisitor,
        action: !isVisitor
      }
    },
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    enableMultiRowSelection: true
  });

  const headers: ReadonlyArray<ReactNode> = table
    .getLeafHeaders()
    .map((header) =>
      flexRender(header.column.columnDef.header, header.getContext())
    );
  const data: ReadonlyArray<ReadonlyArray<ReactNode>> = table
    .getRowModel()
    .rows.map((row) => row.getVisibleCells())
    .map((cells) =>
      cells.map((cell) =>
        flexRender(cell.column.columnDef.cell, cell.getContext())
      )
    );

  return (
    <Stack sx={{ alignItems: 'center' }}>
      <SelectableListHeader
        selected={selection.selectedCount}
        count={filteredCount}
        onUnselectAll={selection.unselectAll}
        entity="logement"
        {...header?.props}
      />

      <Table
        bordered
        headers={headers}
        data={data}
        data-testid="housing-table"
      />
      <Stack direction="row">
        <Select
          className={fr.cx('fr-mr-2w')}
          label={null}
          nativeSelectProps={{
            value: perPage.toString(),
            onChange: (event) => {
              changePerPage(Number(event.target.value));
            }
          }}
          options={perPageOptions}
        />
        <TablePagination
          count={pageCount}
          defaultPage={1}
          getPageLinkProps={(page: number) => ({
            to: {
              pathname: '.',
              search: `?page=${page}`
            }
          })}
          showFirstLast
        />
      </Stack>

      <HousingEditionSideMenu
        housing={
          housingList.find((housing) => housing.id === updatingHousing) ?? null
        }
        expand={!!updatingHousing}
        onClose={() => {
          setUpdatingHousing(null);
        }}
      />
    </Stack>
  );
}

export default HousingList;
