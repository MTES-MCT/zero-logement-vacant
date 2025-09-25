import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import { type User } from '~/models/User';

export interface UserTableProps {
  users: ReadonlyArray<User>;
  isLoading: boolean;
}

function UserTable(props: UserTableProps) {
  const { isLoading, users } = props;

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'activatedAt', desc: true }
  ]);

  const date = (d: Date | string) =>
    format(new Date(d), 'PPP p', { locale: fr });

  const columnHelper = createColumnHelper<User>();
  const columns = [
    columnHelper.accessor('email', {
      header: 'E-mail',
      meta: {
        sort: {
          title: 'Trier par e-mail'
        }
      }
    }),
    columnHelper.accessor('activatedAt', {
      header: 'Création compte',
      meta: {
        sort: {
          title: 'Trier par date de création'
        }
      },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? date(value) : null;
      }
    }),
    columnHelper.accessor('lastAuthenticatedAt', {
      header: 'Dernière connexion',
      meta: {
        sort: {
          title: 'Trier par date de dernière connexion'
        }
      },
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? date(value) : null;
      }
    }),
    columnHelper.accessor('updatedAt', {
      header: 'Dernière mise à jour',
      meta: {
        sort: {
          title: 'Trier par date de dernière mise à jour'
        }
      },
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
      state={{ sorting }}
      onSortingChange={setSorting}
    />
  );
}

export default UserTable;
