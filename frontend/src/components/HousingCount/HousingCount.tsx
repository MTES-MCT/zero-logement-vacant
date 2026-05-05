import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import Icon from '~/components/ui/Icon';
import { pluralize } from '~/utils/stringUtils';

export interface HousingCountProps {
  housingCount: number;
  ownerCount: number;
  isActive: boolean;
  suffix?: boolean;
}

function HousingCount(props: Readonly<HousingCountProps>) {
  const housingCount = props.suffix
    ? `${props.housingCount} ${pluralize(props.housingCount)('logement')}`
    : props.housingCount;
  const ownerCount = props.suffix
    ? `${props.ownerCount} ${pluralize(props.ownerCount)('propriétaire')}`
    : props.ownerCount;

  return (
    <Stack
      direction="row"
      spacing="0.25rem"
      useFlexGap
      sx={{ alignItems: 'center' }}
    >
      <Stack
        direction="row"
        component="span"
        spacing="0.125rem"
        useFlexGap
        sx={{ alignItems: 'center' }}
      >
        <Icon name="ri-home-2-line" size="xs" color="inherit" />
        <Typography
          aria-label={`Nombre de logements : ${housingCount}`}
          component="span"
          variant="caption"
          sx={{
            fontSize: props.isActive ? '0.75rem' : '0.875rem',
            fontWeight: props.isActive ? 700 : 500
          }}
        >
          {housingCount}
        </Typography>
      </Stack>

      <Stack
        direction="row"
        component="span"
        spacing="0.125rem"
        useFlexGap
        sx={{ alignItems: 'center' }}
      >
        <Icon name="ri-user-line" size="xs" color="inherit" />
        <Typography
          aria-label={`Nombre de propriétaires : ${ownerCount}`}
          component="span"
          variant="caption"
          sx={{
            fontSize: props.isActive ? '0.75rem' : '0.875rem',
            fontWeight: props.isActive ? 700 : 500
          }}
        >
          {ownerCount}
        </Typography>
      </Stack>
    </Stack>
  );
}

export default HousingCount;
