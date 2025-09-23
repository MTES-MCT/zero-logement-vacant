import { createColumnHelper } from '@tanstack/react-table';

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
      header: 'Structures'
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

  return (
    <AdvancedTable
      columns={columns}
      data={establishments as Establishment[]}
      getRowId={(establishment) => establishment.id}
      isLoading={isLoading}
      enableSorting
      enableSortingRemoval
    />
  );
}

export default EstablishmentTable;
