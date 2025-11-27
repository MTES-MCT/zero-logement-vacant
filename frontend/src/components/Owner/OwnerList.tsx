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
    <Stack component="article" spacing="0.75rem" useFlexGap>
      {props.owners.map((owner) => (
        <OtherOwnerCard
          key={owner.id}
          id={owner.id}
          name={owner.fullName}
          propertyRight={owner.propertyRight}
        />
      ))}
    </Stack>
  );
}

export default OwnerList;
