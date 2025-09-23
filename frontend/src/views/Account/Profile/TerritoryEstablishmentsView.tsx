import { Stack, Typography } from '@mui/material';

import EstablishmentTable from '~/components/establishment/EstablishmentTable';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useFindEstablishmentsQuery } from '~/services/establishment.service';

function TerritoryEstablishmentsView() {
  useDocumentTitle('Autres structures sur votre territoire');

  const { data: establishments, isLoading } = useFindEstablishmentsQuery({
    available: true
  });

  return (
    <Stack component="section" spacing="1.5rem">
      <Typography component="h1" variant="h3">
        Utilisateurs rattachés à votre structure
      </Typography>

      <EstablishmentTable
        isLoading={isLoading}
        establishments={establishments ?? []}
      />
    </Stack>
  );
}

export default TerritoryEstablishmentsView;
