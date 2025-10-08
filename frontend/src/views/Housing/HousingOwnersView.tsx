import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { skipToken } from '@reduxjs/toolkit/query';
import { Predicate } from 'effect';
import { useParams } from 'react-router-dom';

import HousingOwnerTable from '~/components/Owner/HousingOwnerTable';
import { useHousingOwners } from '~/components/Owner/useHousingOwners';
import { useGetHousingQuery } from '~/services/housing.service';

function HousingOwnersView() {
  const { id } = useParams<{ id: string }>();
  const { data: housing } = useGetHousingQuery(id ?? skipToken);
  const { owner, secondaryOwners, inactiveOwners, findOwnersQuery } =
    useHousingOwners(id ?? skipToken);

  const activeOwners = [owner]
    .concat(secondaryOwners ?? [])
    .filter(Predicate.isNotNull);

  const housingAddress = housing?.rawAddress?.join(' ') ?? '';

  if (!id) {
    return null;
  }

  return (
    <Container maxWidth={false} sx={{ py: '2rem' }}>
      <Stack component="header" sx={{ mb: '1.5rem' }}>
        <Breadcrumb
          className="fr-mb-0"
          currentPageLabel="Modifier les propriétaires"
          segments={[
            {
              label: housingAddress,
              linkProps: {
                to: `/logements/${id}`
              }
            }
          ]}
        />
        <Typography component="h1" variant="h4">
          Modifier les propriétaires - {housingAddress}
        </Typography>
      </Stack>

      <Stack component="section" spacing="1.5rem" useFlexGap>
        <HousingOwnerTable
          title="Propriétaires"
          owners={activeOwners}
          isLoading={findOwnersQuery.isLoading}
          columns={['name', 'kind', 'propertyRight', 'rank', 'addressStatus']}
        />

        <HousingOwnerTable
          title="Propriétaires archivés"
          owners={inactiveOwners ?? []}
          isLoading={findOwnersQuery.isLoading}
          columns={['name', 'kind', 'status']}
        />
      </Stack>
    </Container>
  );
}

export default HousingOwnersView;
