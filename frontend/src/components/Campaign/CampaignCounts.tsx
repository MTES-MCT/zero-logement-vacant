import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Icon from '~/components/ui/Icon';
import { displayCount } from '~/utils/stringUtils';

export interface CampaignCountsProps {
  housing: number | null;
  owners: number | null;
  isLoading: boolean;
}

function CampaignCounts(props: Readonly<CampaignCountsProps>) {
  const housingCount =
    props.housing !== null ? displayCount(props.housing, 'logement') : null;
  const ownerCount =
    props.owners !== null ? displayCount(props.owners, 'propriétaire') : null;

  return (
    <Stack component="article" direction="row" spacing="0.5rem" useFlexGap>
      <Stack component="section" direction="row" spacing="0.25rem" useFlexGap>
        <Icon name="fr-icon-home-4-fill" size="sm" />
        {props.isLoading || housingCount === null ? (
          <Skeleton animation="wave" variant="text" />
        ) : (
          <Typography component="span">{housingCount}</Typography>
        )}
      </Stack>

      <Stack component="section" direction="row" spacing="0.25rem" useFlexGap>
        <Icon name="fr-icon-user-fill" size="sm" />
        {props.isLoading || ownerCount === null ? (
          <Skeleton animation="wave" variant="text" />
        ) : (
          <Typography component="span">{ownerCount}</Typography>
        )}
      </Stack>
    </Stack>
  );
}

export default CampaignCounts;
