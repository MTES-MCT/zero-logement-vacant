import Button from '@codegouvfr/react-dsfr/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { useNavigate, useParams } from 'react-router-dom';
import { assert } from 'ts-essentials';

import HousingHeader from '~/components/Housing/HousingHeader';
import HousingDetailsCard from '~/components/HousingDetails/HousingDetailsCard';
import { HousingEditionProvider } from '~/components/HousingEdition/useHousingEdition';
import InactiveOwnerList from '~/components/Owner/InactiveOwnerList';
import OwnerCard from '~/components/Owner/OwnerCard';
import SecondaryOwnerList from '~/components/Owner/SecondaryOwnerList';
import { useHousingOwners } from '~/components/Owner/useHousingOwners';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { HousingProvider } from '~/hooks/useHousing';
import { useUser } from '~/hooks/useUser';
import {
  useCountHousingQuery,
  useGetHousingQuery
} from '~/services/housing.service';
import { unwrapError } from '~/store/store';
import NotFoundView from '~/views/NotFoundView';

function HousingView() {
  const { housingId } = useParams<{ housingId: string }>();
  assert(housingId !== undefined, 'housingId is undefined');

  const getHousingQuery = useGetHousingQuery(housingId);
  const { data: housing } = getHousingQuery;
  useDocumentTitle(
    housing
      ? `Fiche logement - ${housing.rawAddress.join(' ')}`
      : 'Page non trouvée'
  );

  const { owner, housingOwners, findOwnersQuery } = useHousingOwners(housingId);

  const { data: count } = useCountHousingQuery(
    housing?.owner?.id ? { ownerIds: [housing.owner.id] } : skipToken
  );

  const { isUsual, isAdmin } = useUser();
  const canUpdate = isUsual || isAdmin;

  const navigate = useNavigate();

  if (getHousingQuery.isError && !housing) {
    return <NotFoundView />;
  }

  return (
    <HousingProvider
      housing={housing ?? null}
      error={unwrapError(getHousingQuery.error)?.message ?? null}
      isError={getHousingQuery.isError}
      isLoading={getHousingQuery.isLoading}
      isSuccess={getHousingQuery.isSuccess}
    >
      <HousingEditionProvider>
        <Container maxWidth={false} sx={{ my: '2rem' }}>
          <HousingHeader className="fr-mb-3w" />

          <Grid container columnSpacing={3}>
            {/* Set a custom order to facilitate accessibility:
        housing first, owner second */}
            <Grid order={2} size={8}>
              <HousingDetailsCard />
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
                {!housingOwners?.length || !canUpdate ? null : (
                  <Button
                    iconId="fr-icon-edit-fill"
                    priority="tertiary"
                    linkProps={{
                      to: `/logements/${housingId}/proprietaires`,
                      'aria-label': 'Modifier les propriétaires'
                    }}
                    title="Modifier les propriétaires"
                  >
                    Modifier
                  </Button>
                )}
              </Stack>

              <OwnerCard
                title="Destinataire principal"
                id={owner?.id ?? null}
                name={owner?.fullName ?? null}
                birthdate={owner?.birthDate ?? null}
                kind={owner?.kind ?? null}
                propertyRight={owner?.propertyRight ?? null}
                dgfipAddress={owner?.rawAddress ?? null}
                banAddress={owner?.banAddress ?? null}
                additionalAddress={owner?.additionalAddress ?? null}
                email={owner?.email ?? null}
                phone={owner?.phone ?? null}
                isLoading={findOwnersQuery.isLoading}
                housingCount={count?.housing ?? null}
                relativeLocation={owner?.relativeLocation ?? null}
                onAdd={() => {
                  navigate(`/logements/${housingId}/proprietaires`, {
                    state: {
                      search: true
                    }
                  });
                }}
              />
              <SecondaryOwnerList housingId={housingId} />
              <InactiveOwnerList housingId={housingId} />
            </Grid>
          </Grid>
        </Container>
      </HousingEditionProvider>
    </HousingProvider>
  );
}

export default HousingView;
