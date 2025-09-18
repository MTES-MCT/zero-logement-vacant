import { createColumnHelper } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import { type User } from '~/models/User';

export interface UserTableProps {
  users: ReadonlyArray<User>;
  isLoading: boolean;
}

function UserTable(props: UserTableProps) {
  const { isLoading, users } = props;

  const date = (d: Date | string) =>
    format(new Date(d), 'PPP p', { locale: fr });

  const columnHelper = createColumnHelper<User>();
  const columns = [
    columnHelper.accessor('email', {
      header: 'E-mail'
    }),
    columnHelper.accessor('activatedAt', {
      header: 'Création compte',
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? date(value) : null;
      }
    }),
    columnHelper.accessor('lastAuthenticatedAt', {
      header: 'Dernière connexion',
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? date(value) : null;
      }
    }),
    columnHelper.accessor('updatedAt', {
      header: 'Dernière mise à jour',
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? date(value) : null;
      }
    })
  ];

  return (
    <AdvancedTable
      columns={columns}
      data={users as User[]}
      getRowId={(user) => user.id}
      isLoading={isLoading}
      enableSorting
      enableSortingRemoval
    />
  );
}

export default UserTable;
