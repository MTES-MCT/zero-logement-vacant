import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import OwnerCardNext from '~/components/OwnerCard/OwnerCardNext';
import { useGetOwnerQuery } from '~/services/owner.service';

function OwnerView() {
  const params = useParams<{ id: string }>();
  const getOwnerQuery = useGetOwnerQuery(params.id ?? skipToken);

  return (
    <Container maxWidth={false} sx={{ pt: '2rem', pb: '3rem' }}>
      <Grid container columnSpacing="1rem">
        <Grid size={{ xs: 12, md: 4 }}>
          <OwnerCardNext
            title="Coordonnées"
            owner={getOwnerQuery.data ?? null}
            isLoading={getOwnerQuery.isLoading}
            housingCount={undefined}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>TODO</Grid>
      </Grid>
    </Container>
  );
}

export default OwnerView;
