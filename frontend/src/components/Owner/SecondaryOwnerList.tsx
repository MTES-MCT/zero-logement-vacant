import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isSecondaryOwner } from '@zerologementvacant/models';

import OwnerList from '~/components/Owner/OwnerList';
import { useFindOwnersByHousingQuery } from '~/services/owner.service';

export interface SecondaryOwnerListProps {
  housingId: string;
}

function SecondaryOwnerList(props: SecondaryOwnerListProps) {
  const {
    data: housingOwners,
    isLoading,
    isSuccess
  } = useFindOwnersByHousingQuery(props.housingId);

  const secondaryOwners = housingOwners?.filter(isSecondaryOwner) ?? [];

  if (isSuccess && secondaryOwners.length === 0) {
    return null;
  }

  return (
    <Stack>
      <Typography component="h2" variant="h6">
        Destinataires secondaires ({secondaryOwners.length})
      </Typography>
      <hr />

      <OwnerList isLoading={isLoading} owners={secondaryOwners} />
    </Stack>
  );
}

export default SecondaryOwnerList;
