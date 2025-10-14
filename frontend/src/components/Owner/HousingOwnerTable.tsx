import Button from '@codegouvfr/react-dsfr/Button';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { pipe, Record } from 'effect';
import { useMemo, type ReactNode } from 'react';

import AppLink from '~/components/_app/AppLink/AppLink';
import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import ImprovableAddressBadge from '~/components/Owner/ImprovableAddressBadge';
import OwnerKindTag from '~/components/Owner/OwnerKindTag';
import OwnerStatusTag from '~/components/Owner/OwnerStatusTag';
import PropertyRightTag from '~/components/Owner/PropertyRightTag';
import RankBadge from '~/components/Owner/RankBadge';
import { useUser } from '~/hooks/useUser';
import type { Housing } from '~/models/Housing';
import type { HousingOwner } from '~/models/Owner';

const HOUSING_OWNER_TABLE_COLUMN_VALUES = [
  'name',
  'kind',
  'propertyRight',
  'rank',
  'addressStatus',
  'status',
  'actions'
] as const;
export type HousingOwnerTableColumn =
  (typeof HOUSING_OWNER_TABLE_COLUMN_VALUES)[number];

const PROTECTED_COLUMNS: HousingOwnerTableColumn[] = ['actions'];

export interface HousingOwnerTableProps {
  title: string;
  housing: Housing | null;
  owners: HousingOwner[];
  isLoading: boolean;
  columns?: HousingOwnerTableColumn[];
  empty?: ReactNode;
  onEdit?(housingOwner: HousingOwner): void;
}

function HousingOwnerTable(props: HousingOwnerTableProps) {
  const { isGuest, isVisitor } = useUser();

  function isProtected(column: HousingOwnerTableColumn): boolean {
    return PROTECTED_COLUMNS.includes(column) && (isVisitor || isGuest);
  }

  const columns = props.columns ?? ['name', 'kind', 'actions'];
  const showColumns: Record<HousingOwnerTableColumn, boolean> = pipe(
    HOUSING_OWNER_TABLE_COLUMN_VALUES,
    Record.fromIterableWith((column) => {
      const visible = columns.includes(column) && !isProtected(column);
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
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            priority="secondary"
            size="small"
            title={`Éditer ${row.original.fullName}`}
            nativeButtonProps={{
              'aria-label': `Éditer ${row.original.fullName}`
            }}
            onClick={() => {
              props.onEdit?.(row.original);
            }}
          >
            Éditer
          </Button>
        )
      })
    ],
    [columnHelper, props.onEdit]
  );

  if (props.owners.length === 0 && !props.isLoading) {
    return props.empty ?? null;
  }

  return (
    <Stack spacing="1.5rem" useFlexGap>
      {props.isLoading ? (
        <Skeleton variant="rectangular" width={240} height={40} />
      ) : (
        <Typography component="h2" variant="subtitle1">
          {props.title} ({props.owners.length})
        </Typography>
      )}

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
