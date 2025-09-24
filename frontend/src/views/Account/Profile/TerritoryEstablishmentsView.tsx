import { Stack, Typography } from '@mui/material';

import EstablishmentTable from '~/components/establishment/EstablishmentTable';
import { useDocumentTitle } from '~/hooks/useDocumentTitle';
import { useUser } from '~/hooks/useUser';
import { useFindEstablishmentsQuery } from '~/services/establishment.service';

function TerritoryEstablishmentsView() {
  useDocumentTitle('Autres structures sur votre territoire');

  const { establishment } = useUser();
  const { data: establishments, isLoading } = useFindEstablishmentsQuery(
    {
      available: true,
      active: true,
      geoCodes: establishment?.geoCodes
    },
    { skip: !establishment?.geoCodes?.length }
  );

  return (
    <Stack component="section" spacing="1.5rem">
      <Typography component="h1" variant="h3">
        Autres structures sur votre territoire
      </Typography>

      <EstablishmentTable
        isLoading={isLoading}
        establishments={establishments ?? []}
      />
    </Stack>
  );
}

export default TerritoryEstablishmentsView;
