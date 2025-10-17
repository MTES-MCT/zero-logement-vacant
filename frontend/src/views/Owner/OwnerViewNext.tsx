import Button from '@codegouvfr/react-dsfr/Button';
import { Typography } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import OwnerCardNext from '~/components/Owner/OwnerCardNext';
import createOwnerEditionModalNext from '~/components/Owner/OwnerEditionModalNext';
import OwnerHousingCardGrid from '~/components/Owner/OwnerHousingCardGrid';
import { useGetOwnerQuery } from '~/services/owner.service';
import NotFoundView from '~/views/NotFoundView';

const ownerEditionModalNext = createOwnerEditionModalNext();

function OwnerView() {
  const params = useParams<{ id: string }>();
  const {
    data: owner,
    isLoading,
    isError
  } = useGetOwnerQuery(params.id ?? skipToken);

  if (isError || (!isLoading && !owner)) {
    return <NotFoundView />;
  }

  return (
    <Container maxWidth={false} sx={{ pt: '2rem', pb: '3rem' }}>
      <Grid container columnSpacing="3rem">
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack
            direction="row"
            spacing="1rem"
            sx={{ justifyContent: 'space-between' }}
            useFlexGap
          >
            <Typography component="h2" variant="h5">
              Coordonnées
            </Typography>
            <Button
              iconId="fr-icon-edit-fill"
              priority="tertiary"
              onClick={ownerEditionModalNext.open}
            >
              Modifier
            </Button>
          </Stack>

          <OwnerCardNext
            owner={owner ?? null}
            isLoading={isLoading}
            housingCount={undefined}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <OwnerHousingCardGrid />
        </Grid>

        {!owner ? null : <ownerEditionModalNext.Component owner={owner} />}
      </Grid>
    </Container>
  );
}

export default OwnerView;
