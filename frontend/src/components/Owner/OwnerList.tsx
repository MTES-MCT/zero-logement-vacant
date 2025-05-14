import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { HousingOwner } from '../../models/Owner';
import OtherOwnerCard from '../OwnerCard/OtherOwnerCard';

interface OwnerListProps {
  title: string;
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
    <Stack component="article">
      <Typography
        component="h2"
        variant="body1"
        sx={{ fontSize: '1.125rem', fontWeight: 700, mb: '0.5rem' }}
      >
        {props.title}
      </Typography>
      <hr />
      {props.owners.map((owner) => (
        <OtherOwnerCard key={owner.id} owner={owner} />
      ))}
    </Stack>
  );
}

export default OwnerList;
