import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  createColumnHelper,
  type SortingState,
  type VisibilityState
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState } from 'react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import { createConfirmationModal } from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import { useNotification } from '~/hooks/useNotification';
import { createdBy, type User } from '~/models/User';
import { useDeleteUserMutation } from '~/services/user.service';

const deleteUserModal = createConfirmationModal({
  id: 'delete-user-modal',
  isOpenedByDefault: false
});

export interface UserTableProps {
  allowRemoving: boolean;
  users: ReadonlyArray<User>;
  isLoading: boolean;
}

function UserTable(props: UserTableProps) {
  const { allowRemoving, isLoading, users } = props;

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'activatedAt', desc: true }
  ]);

  const [removingUser, setRemovingUser] = useState<User | null>(null);
  const [deleteUser, deleteUserMutation] = useDeleteUserMutation();

  const date = (d: Date | string) =>
    format(new Date(d), 'PPP p', { locale: fr });

  useNotification({
    toastId: 'delete-user-toast',
    isError: deleteUserMutation.isError,
    isLoading: deleteUserMutation.isLoading,
    isSuccess: deleteUserMutation.isSuccess,
    message: {
      error: "Erreur lors de la suppression de l'utilisateur",
      loading: 'Suppression de l’utilisateur en cours...',
      success: 'Utilisateur supprimé !'
    }
  });

  function onCancel(): void {
    deleteUserModal.close();
  }

  function onConfirm(): void {
    if (removingUser) {
      deleteUser(removingUser.id);
      deleteUserModal.close();
    }
  }

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
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          iconId="fr-icon-delete-line"
          priority="tertiary no outline"
          size="small"
          title={`Supprimer ${createdBy(row.original)}`}
          aria-label={`Supprimer ${createdBy(row.original)}`}
          onClick={() => {
            setRemovingUser(row.original);
            deleteUserModal.open();
          }}
        />
      )
    })
  ];

  const columnVisibility: VisibilityState = {
    actions: allowRemoving
  };

  return (
    <>
      <AdvancedTable
        columns={columns}
        data={users as User[]}
        getRowId={(user) => user.id}
        isLoading={isLoading}
        enableSorting
        enableSortingRemoval
        state={{ sorting, columnVisibility }}
        onSortingChange={setSorting}
      />

      <deleteUserModal.Component
        title="Supprimer l’utilisateur"
        onClose={onCancel}
        onSubmit={onConfirm}
      >
        {removingUser ? (
          <Stack spacing="1.5rem" useFlexGap>
            <Typography>
              Êtes-vous sûr de vouloir supprimer l’utilisateur&nbsp;
              <Typography component="span" sx={{ fontWeight: 700 }}>
                {removingUser.email}
              </Typography>
              &nbsp;?
            </Typography>
            <Typography>Cette action est irréversible.</Typography>
          </Stack>
        ) : null}
      </deleteUserModal.Component>
    </>
  );
}

export default UserTable;
