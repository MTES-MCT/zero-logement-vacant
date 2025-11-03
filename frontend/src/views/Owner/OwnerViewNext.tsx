import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import { Typography } from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router-dom';
import { match } from 'ts-pattern';

import OwnerCardNext from '~/components/Owner/OwnerCardNext';
import createOwnerEditionModalNext from '~/components/Owner/OwnerEditionModalNext';
import OwnerHousingCardGrid from '~/components/Owner/OwnerHousingCardGrid';
import Icon from '~/components/ui/Icon';
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

  const icon = match(owner?.kind)
    .returnType<FrIconClassName | RiIconClassName | null>()
    .with('Particulier', () => 'fr-icon-user-line')
    .with(
      'SCI, Copropriété, Autres personnes morales',
      () => 'fr-icon-building-line'
    )
    .with(
      'Promoteur, Investisseur privé',
      () => 'fr-icon-money-euro-circle-line'
    )
    .with('Etat et collectivité territoriale', () => 'fr-icon-france-line')
    .with(
      'Bailleur social, Aménageur, Investisseur public',
      () => 'fr-icon-government-line'
    )
    .with('Autres', () => 'fr-icon-info-line')
    .otherwise(() => null);

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
            {!icon ? null : (
              <Stack
                component="section"
                direction="row"
                spacing="0.25rem"
                useFlexGap
              >
                <Icon name={icon} />
                <Typography sx={{ fontWeight: 500 }}>{owner?.kind}</Typography>
              </Stack>
            )}
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
              onClick={ownerEditionModalNext.open}
            >
              Modifier
            </Button>
          </Stack>

          <OwnerCardNext
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
