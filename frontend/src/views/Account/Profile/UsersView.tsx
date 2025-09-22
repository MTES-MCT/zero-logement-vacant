import { Stack, Typography } from '@mui/material';

import UserTable from '~/components/Users/UserTable';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFindUsersQuery } from '~/services/user.service';

function UsersView() {
  useDocumentTitle('Utilisateurs rattachés à votre structure');

  const { data: users, isLoading } = useFindUsersQuery();

  return (
    <Stack component="section" spacing="1.5rem">
      <Typography component="h1" variant="h3">
        Utilisateurs rattachés à votre structure
      </Typography>

      <UserTable isLoading={isLoading} users={users ?? []} />
    </Stack>
  );
}

export default UsersView;
