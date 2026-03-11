import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

import OtherOwnerCard from '~/components/Owner/OtherOwnerCard';
import { type HousingOwner } from '~/models/Owner';

interface OwnerListProps {
  owners: ReadonlyArray<HousingOwner>;
  isLoading: boolean;
}

function OwnerList(props: OwnerListProps) {
  if (props.isLoading) {
    return (
      <Skeleton animation="wave" variant="rectangular" width="100%">
        <Skeleton animation="wave" variant="text" />
        <hr />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} animation="wave" variant="rectangular" />
        ))}
      </Skeleton>
    );
  }

  return (
    <Stack
      component="ul"
      role="list"
      spacing="0.75rem"
      useFlexGap
      sx={{ listStyle: 'none', padding: 0, margin: 0 }}
    >
      {props.owners.map((owner) => (
        <li key={owner.id} role="listitem">
          <OtherOwnerCard
            id={owner.id}
            name={owner.fullName}
            propertyRight={owner.propertyRight}
          />
        </li>
      ))}
    </Stack>
  );
}

export default OwnerList;
