import Button from '@codegouvfr/react-dsfr/Button';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { createColumnHelper, type SortingState } from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import { useDeleteUserMutation } from '~/services/user.service';
import { type User } from '~/models/User';

const deleteUserModal = createModal({
  id: 'delete-user-modal',
  isOpenedByDefault: false
});

export interface UserTableProps {
  users: ReadonlyArray<User>;
  isLoading: boolean;
}

function UserTable(props: UserTableProps) {
  const { isLoading, users } = props;

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'activatedAt', desc: true }
  ]);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const date = (d: Date | string) =>
    format(new Date(d), 'PPP p', { locale: fr });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    deleteUserModal.open();
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      try {
        await deleteUser(userToDelete.id).unwrap();
        deleteUserModal.close();
        setUserToDelete(null);
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur', error);
      }
    }
  };

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
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          iconId="fr-icon-delete-line"
          priority="tertiary no outline"
          size="small"
          title="Supprimer l'utilisateur"
          onClick={() => handleDeleteClick(row.original)}
        />
      )
    })
  ];

  return (
    <>
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
      <deleteUserModal.Component
        title="Supprimer l'utilisateur"
        buttons={[
          {
            children: 'Annuler',
            priority: 'secondary',
            onClick: () => {
              deleteUserModal.close();
              setUserToDelete(null);
            }
          },
          {
            children: 'Supprimer',
            onClick: handleDeleteConfirm,
            disabled: isDeleting
          }
        ]}
      >
        {userToDelete && (
          <p>
            Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{userToDelete.email}</strong> ?
            <br />
            Cette action est irréversible.
          </p>
        )}
      </deleteUserModal.Component>
    </>
  );
}

export default UserTable;
