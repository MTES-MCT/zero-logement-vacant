import Button from '@codegouvfr/react-dsfr/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';

import HousingHeader from '~/components/Housing/HousingHeader';
import HousingDetailsCard from '~/components/HousingDetails/HousingDetailsCard';
import { HousingEditionProvider } from '~/components/HousingEdition/useHousingEdition';
import InactiveOwnerListNext from '~/components/Owner/InactiveOwnerListNext';
import OwnerCardNext from '~/components/Owner/OwnerCardNext';
import SecondaryOwnerListNext from '~/components/Owner/SecondaryOwnerListNext';
import { useHousingOwners } from '~/components/Owner/useHousingOwners';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useHousing } from '~/hooks/useHousing';
import { useCountHousingQuery } from '~/services/housing.service';
import NotFoundView from '~/views/NotFoundView';

function HousingView() {
  const { housing, housingId, getHousingQuery } = useHousing();
  useDocumentTitle(
    housing
      ? `Fiche logement - ${housing.rawAddress.join(' ')}`
      : 'Page non trouvée'
  );
  const { owner, secondaryOwners, inactiveOwners, findOwnersQuery } =
    useHousingOwners(housingId);
  const { data: count } = useCountHousingQuery(
    housing?.owner?.id ? { ownerIds: [housing.owner.id] } : skipToken
  );

  if (getHousingQuery.isError && !housing) {
    return <NotFoundView />;
  }

  return (
    <HousingEditionProvider>
      <Container maxWidth={false} sx={{ my: '2rem' }}>
        <HousingHeader
          className="fr-mb-3w"
          housing={housing}
          isLoading={getHousingQuery.isLoading}
        />

        <Grid container columnSpacing={3}>
          {/* Set a custom order to facilitate accessibility:
        housing first, owner second */}
          <Grid order={2} size={8}>
            <HousingDetailsCard housing={housing} />
          </Grid>
          <Grid
            order={1}
            rowGap="1.5rem"
            sx={{ display: 'flex', flexFlow: 'column nowrap' }}
            size={4}
          >
            <Stack
              component="section"
              direction="row"
              spacing="1rem"
              sx={{ justifyContent: 'space-between' }}
              useFlexGap
            >
              <Typography component="h2" variant="h5">
                Propriétaires
              </Typography>
              {!secondaryOwners?.length && !inactiveOwners?.length ? null : (
                <Button
                  iconId="fr-icon-edit-fill"
                  priority="tertiary"
                  linkProps={{ to: `/logements/${housingId}/proprietaires` }}
                >
                  Modifier
                </Button>
              )}
            </Stack>

            <OwnerCardNext
              title="Destinataire principal"
              owner={owner}
              isLoading={findOwnersQuery.isLoading}
              housingCount={count?.housing}
            />
            <SecondaryOwnerListNext housingId={housingId} />
            <InactiveOwnerListNext housingId={housingId} />
          </Grid>
        </Grid>
      </Container>
    </HousingEditionProvider>
  );
}

export default HousingView;
