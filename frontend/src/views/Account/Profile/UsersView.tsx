import Alert from '@codegouvfr/react-dsfr/Alert';
import { Stack, Typography } from '@mui/material';
import { skipToken } from '@reduxjs/toolkit/query';
import AppLink from '~/components/_app/AppLink/AppLink';

import UserTable from '~/components/Users/UserTable';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useUser } from '~/hooks/useUser';
import { useFindUsersQuery } from '~/services/user.service';

function UsersView() {
  useDocumentTitle('Utilisateurs rattachés à votre structure');

  const { isAdmin, establishment } = useUser();
  const { data: users, isLoading } = useFindUsersQuery(
    establishment
      ? {
          filters: {
            establishments: [establishment?.id]
          }
        }
      : skipToken
  );

  const allowRemoving: boolean = isAdmin;

  return (
    <Stack component="section" spacing="1.5rem">
      <Typography component="h1" variant="h3">
        Utilisateurs rattachés à votre structure
      </Typography>

      <Alert
        severity="info"
        description={
          <>
            Pour gérer les droits d’accès aux données des utilisateurs,
            rendez-vous sur&nbsp;
            <AppLink
              to="https://datafoncier.cerema.fr/portail-des-donnees-foncieres"
              target="_blank"
              rel="noopener noreferrer"
            >
              le portail Données foncières du Cerema
            </AppLink>
            .
          </>
        }
        small
      />

      <UserTable
        allowRemoving={allowRemoving}
        isLoading={isLoading}
        users={users ?? []}
      />
    </Stack>
  );
}

export default UsersView;
