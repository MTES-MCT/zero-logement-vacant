import { Container, Grid } from '@mui/material';
import { Outlet } from 'react-router-dom';

import AccountSideMenu from '~/views/Account/AccountSideMenu';

function ProfileLayout() {
  return (
    <Container maxWidth={false} sx={{ py: 8 }}>
      <Grid container>
        <Grid size={{ xs: 12, md: 3 }}>
          <AccountSideMenu />
        </Grid>
        <Grid size={{ xs: 12, md: 9 }}>
          <Outlet />
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProfileLayout;
