import { createColumnHelper, SortingState } from '@tanstack/react-table';
import { byKind } from '@zerologementvacant/models';
import { useState } from 'react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import type { Establishment } from '~/models/Establishment';

export interface EstablishmentTableProps {
  establishments: ReadonlyArray<Establishment>;
  isLoading: boolean;
}

function EstablishmentTable(props: EstablishmentTableProps) {
  const { isLoading, establishments } = props;

  const columnHelper = createColumnHelper<Establishment>();
  const columns = [
    columnHelper.accessor('name', {
      header: 'Structures',
      sortingFn: (a, b) => byKind(a.original.kind, b.original.kind)
    }),
    columnHelper.accessor('users', {
      header: "Nombre d'utilisateurs",
      cell: ({ getValue }) => {
        const users = getValue();
        return users ? users.length : 0;
      }
    }),
    columnHelper.accessor('users', {
      id: 'contacts',
      header: 'Contacts',
      enableSorting: false,
      cell: ({ getValue }) => {
        const users = getValue();
        return users ? users.map((user) => user.email).join('; ') : null;
      }
    })
  ];

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: true }
  ]);

  return (
    <AdvancedTable
      columns={columns}
      data={establishments as Establishment[]}
      getRowId={(establishment) => establishment.id}
      isLoading={isLoading}
      enableSorting
      enableSortingRemoval
      state={{
        sorting
      }}
      onSortingChange={setSorting}
    />
  );
}

export default EstablishmentTable;
