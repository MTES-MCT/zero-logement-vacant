import Button from '@codegouvfr/react-dsfr/Button';
import { Typography } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';

import OwnerCard from '~/components/Owner/OwnerCard';
import createOwnerEditionModal from '~/components/Owner/OwnerEditionModal';
import OwnerHousingCardGrid from '~/components/Owner/OwnerHousingCardGrid';
import OwnerKindIcon from '~/components/Owner/OwnerKindIcon';
import { useGetOwnerQuery } from '~/services/owner.service';
import NotFoundView from '~/views/NotFoundView';

const ownerEditionModal = createOwnerEditionModal();

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
            component="header"
            spacing="0.25rem"
            useFlexGap
            sx={{ mb: '1rem' }}
          >
            <Typography component="h1" variant="h3">
              {owner?.fullName}
            </Typography>
            {owner?.kind ? <OwnerKindIcon kind={owner.kind} /> : null}
          </Stack>

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
              onClick={ownerEditionModal.open}
            >
              Modifier
            </Button>
          </Stack>

          <OwnerCard
            isLoading={isLoading}
            housingCount={undefined}
            id={owner?.id ?? null}
            birthdate={owner?.birthDate ?? null}
            kind={owner?.kind ?? null}
            siren={owner?.siren ?? null}
            dgfipAddress={owner?.rawAddress ?? null}
            banAddress={owner?.banAddress ?? null}
            additionalAddress={owner?.additionalAddress ?? null}
            email={owner?.email ?? null}
            phone={owner?.phone ?? null}
            relativeLocation={null}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <OwnerHousingCardGrid />
        </Grid>

        {!owner ? null : <ownerEditionModal.Component owner={owner} />}
      </Grid>
    </Container>
  );
}

export default OwnerView;
