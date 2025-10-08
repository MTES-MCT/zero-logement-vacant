import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { pipe, Record } from 'effect';
import { useMemo } from 'react';

import AppLink from '~/components/_app/AppLink/AppLink';
import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import type { HousingOwner } from '~/models/Owner';
import ImprovableAddressBadge from './ImprovableAddressBadge';
import OwnerKindTag from './OwnerKindTag';
import OwnerStatusTag from './OwnerStatusTag';
import PropertyRightTag from './PropertyRightTag';
import RankBadge from './RankBadge';

const HOUSING_OWNER_TABLE_COLUMN_VALUES = [
  'name',
  'kind',
  'propertyRight',
  'rank',
  'addressStatus',
  'status'
] as const;
export type HousingOwnerTableColumn =
  (typeof HOUSING_OWNER_TABLE_COLUMN_VALUES)[number];

export interface HousingOwnerTableProps {
  title: string;
  owners: HousingOwner[];
  isLoading: boolean;
  columns?: HousingOwnerTableColumn[];
}

function HousingOwnerTable(props: HousingOwnerTableProps) {
  const columns = props.columns ?? ['name', 'kind'];
  const showColumns: Record<HousingOwnerTableColumn, boolean> = pipe(
    HOUSING_OWNER_TABLE_COLUMN_VALUES,
    Record.fromIterableWith((column) => {
      const visible = columns.includes(column);
      return [column, visible] as const;
    })
  );

  const columnHelper = createColumnHelper<HousingOwner>();
  const columnDefs = useMemo(
    () => [
      columnHelper.accessor('fullName', {
        id: 'name',
        meta: {
          styles: {
            multiline: true
          }
        },
        header: 'Nom et prénom du propriétaire',
        cell: ({ cell, row }) => (
          <AppLink isSimple size="sm" to={`/proprietaires/${row.original.id}`}>
            {cell.getValue()}
          </AppLink>
        )
      }),
      columnHelper.accessor('kind', {
        header: 'Type de propriétaire',
        cell: ({ cell }) => <OwnerKindTag value={cell.getValue()} />
      }),
      columnHelper.accessor('propertyRight', {
        header: 'Nature du droit sur le bien',
        cell: ({ cell }) => {
          const value = cell.getValue();
          return value ? <PropertyRightTag value={value} /> : null;
        }
      }),
      columnHelper.accessor('rank', {
        header: 'Rang de contact',
        cell: ({ cell }) => <RankBadge value={cell.getValue()} />
      }),
      columnHelper.accessor(
        (housingOwner) => housingOwner.banAddress?.score ?? null,
        {
          id: 'addressStatus',
          header: 'Statut adresse',
          cell: ({ cell }) => (
            <ImprovableAddressBadge score={cell.getValue() ?? null} />
          )
        }
      ),
      columnHelper.accessor('rank', {
        id: 'status',
        header: 'État du propriétaire',
        cell: ({ cell }) => <OwnerStatusTag rank={cell.getValue()} />
      })
    ],
    [columnHelper]
  );

  return (
    <Stack spacing="1.5rem" useFlexGap>
      <Typography component="h2" variant="subtitle1">
        {props.title} ({props.owners.length})
      </Typography>

      <AdvancedTable
        data={props.owners}
        columns={columnDefs}
        isLoading={props.isLoading}
        paginate={false}
        enableSorting
        enableSortingRemoval
        state={{
          columnVisibility: showColumns
        }}
        tableProps={{
          className: 'fr-my-0',
          noCaption: true
        }}
      />
    </Stack>
  );
}

export default HousingOwnerTable;
