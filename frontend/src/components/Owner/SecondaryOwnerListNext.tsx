import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isSecondaryOwner } from '@zerologementvacant/models';

import OwnerListNext from '~/components/Owner/OwnerListNext';
import { useFindOwnersByHousingQuery } from '~/services/owner.service';

export interface SecondaryOwnerListProps {
  housingId: string;
}

function SecondaryOwnerListNext(props: SecondaryOwnerListProps) {
  const { data: housingOwners, isLoading } = useFindOwnersByHousingQuery(
    props.housingId
  );

  const secondaryOwners = housingOwners?.filter(isSecondaryOwner) ?? [];

  return (
    <Stack>
      <Typography component="h2" variant="h6">
        Destinataires secondaires ({secondaryOwners.length})
      </Typography>
      <hr />

      <OwnerListNext isLoading={isLoading} owners={secondaryOwners} />
    </Stack>
  );
}

export default SecondaryOwnerListNext;
