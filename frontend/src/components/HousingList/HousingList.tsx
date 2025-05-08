import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';

import { Occupancy, Pagination } from '@zerologementvacant/models';
import { Set } from 'immutable';
import { ReactElement, ReactNode, useMemo, useState } from 'react';
import { useCampaignList } from '../../hooks/useCampaignList';
import { usePagination } from '../../hooks/usePagination';
import { useSelection } from '../../hooks/useSelection';
import { useSort } from '../../hooks/useSort';
import {
  Housing,
  HousingSort,
  HousingSortable,
  HousingUpdate,
  SelectedHousing
} from '../../models/Housing';
import { HousingFilters } from '../../models/HousingFilters';
import {
  useCountHousingQuery,
  useFindHousingQuery,
  useUpdateHousingMutation
} from '../../services/housing.service';
import { DefaultPagination } from '../../store/reducers/housingReducer';
import { findChild } from '../../utils/elementUtils';
import { capitalize } from '../../utils/stringUtils';
import AppLink from '../_app/AppLink/AppLink';
import AdvancedTable from '../AdvancedTable/AdvancedTable';
import AdvancedTableHeader from '../AdvancedTable/AdvancedTableHeader';
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

function HousingList(props: HousingListProps) {
  const { actions, children, filters } = props;
  const header = findChild(children, SelectableListHeader);

  const campaignList = useCampaignList();

  const [updateHousing] = useUpdateHousingMutation();

  const [pagination, setPagination] = useState<Pagination>(DefaultPagination);
  const [sort, setSort] = useState<HousingSort>();
  const [updatingHousing, setUpdatingHousing] = useState<Housing>();

  const { data: housings, isLoading: isLoadingHousings } = useFindHousingQuery({
    filters,
    pagination,
    sort
  });
  const housingList = housings?.entities;

  const { data: count } = useCountHousingQuery(filters);
  const filteredCount = count?.housing ?? 0;

  const { pageCount, page, perPage, changePerPage, changePage } = usePagination(
    {
      pagination,
      setPagination,
      count: filteredCount
    }
  );

  const { selected, selectedCount, setSelected, unselectAll } = useSelection(
    filteredCount,
    { storage: 'store' }
  );

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
      columnHelper.accessor('rawAddress', {
        header: () => (
          <AdvancedTableHeader
            title="Adresse logement"
            sort={getSortButton('rawAddress', 'Adresse logement')}
          />
        ),
        cell: ({ cell, row }) => {
          return (
            <AppLink isSimple size="sm" to={`/logements/${row.original.id}`}>
              {cell
                .getValue()
                .map((line) => capitalize(line))
                .join('\n')}
            </AppLink>
          );
        }
      }),
      columnHelper.accessor('owner.fullName', {
        header: () => (
          <AdvancedTableHeader
            title="Propriétaire principal"
            sort={getSortButton('owner', 'Trier par propriétaire principal')}
          />
        ),
        cell: ({ cell, row }) => (
          <>
            <AppLink
              isSimple
              size="sm"
              to={`/proprietaires/${row.original.id}`}
            >
              {cell.getValue()}
            </AppLink>
            {row.original.owner.administrator && (
              <Typography variant="body2">
                {row.original.owner.administrator}
              </Typography>
            )}
          </>
        )
      }),
      columnHelper.accessor('occupancy', {
        header: () => (
          <AdvancedTableHeader
            title="Occupation"
            sort={getSortButton('occupancy', 'Trier par occupation')}
          />
        ),
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
          return (
            <Stack>
              {Set(cell.getValue())
                .map((id) => {
                  return campaignList?.find((campaign) => campaign.id === id);
                })
                .filter((campaign) => campaign !== undefined)
                .map((campaign) => (
                  <AppLink
                    key={campaign.id}
                    isSimple
                    size="sm"
                    to={`/campagnes/${campaign.id}`}
                  >
                    {`${campaign.title.substring(0, MAX_CAMPAIGN_LENGTH)}${campaign.title.length > MAX_CAMPAIGN_LENGTH ? '...' : ''}`}
                  </AppLink>
                ))}
            </Stack>
          );
        }
      }),
      columnHelper.accessor(
        (value) => ({ status: value.status, subStatus: value.subStatus }),
        {
          id: 'status',
          header: () => (
            <AdvancedTableHeader
              title="Statuts de suivi"
              sort={getSortButton('status', 'Trier par statut de suivi')}
            />
          ),
          cell: ({ cell }) => {
            const { status, subStatus } = cell.getValue();
            return (
              <Stack sx={{ alignItems: 'center', textAlign: 'center' }}>
                <HousingStatusBadge
                  badgeProps={{ small: true }}
                  status={status}
                />
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
        header: () => <Typography variant="body2">Action</Typography>,
        cell: ({ row }) => {
          if (actions) {
            return <>{actions(row.original)}</>;
          }

          return (
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: 'flex-end' }}
            >
              <Button
                title="Mettre à jour"
                iconId="fr-icon-edit-line"
                size="small"
                priority="secondary"
                onClick={() => setUpdatingHousing(row.original)}
              />
            </Stack>
          );
        }
      })
    ],
    [columnHelper, getSortButton, campaignList, actions]
  );

  const submitHousingUpdate = async (
    housing: Housing,
    housingUpdate: HousingUpdate
  ) => {
    await updateHousing({
      housing,
      housingUpdate
    });
    setUpdatingHousing(undefined);
  };

  return (
    <Stack sx={{ alignItems: 'center' }}>
      <SelectableListHeader
        selected={selectedCount}
        count={filteredCount}
        onUnselectAll={unselectAll}
        entity="logement"
        {...header?.props}
      />

      <AdvancedTable
        columns={columns}
        data={housingList ?? []}
        getRowId={(housing) => housing.id}
        isLoading={isLoadingHousings}
        page={page}
        pageCount={pageCount}
        perPage={perPage}
        selection={selected}
        tableProps={{ noCaption: true, noScroll: true }}
        onPageChange={changePage}
        onPerPageChange={changePerPage}
        onSelectionChange={setSelected}
      />

      <HousingEditionSideMenu
        housing={updatingHousing ?? null}
        expand={!!updatingHousing}
        onSubmit={submitHousingUpdate}
        onClose={() => setUpdatingHousing(undefined)}
      />
    </Stack>
  );
}

export default HousingList;
