import Tag from '@codegouvfr/react-dsfr/Tag';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Occupancy } from '@zerologementvacant/models';

import OccupancyBadge from '../Housing/OccupancyBadge';
import styles from './housing-result.module.scss';

interface Props {
  address: string;
  apartment: number | null;
  display?: 'one-line' | 'two-lines';
  floor: number | null;
  localId: string;
  occupancy: Occupancy;
}

function HousingResult(props: Props) {
  const display = props.display ?? 'one-line';
  const floor = props.floor ? (
    <Typography>- Étage {props.floor}</Typography>
  ) : null;
  const appartment = props.apartment ? (
    <Typography>- Appartement {props.apartment}</Typography>
  ) : null;
  const occupancy = (
    <Stack direction="row" sx={{ alignItems: 'center' }}>
      <Typography component="span">Statut d’occupation :&nbsp;</Typography>
      <OccupancyBadge occupancy={props.occupancy} tagProps={{ as: 'span' }} />
    </Stack>
  );

  return (
    <Box component="article" className={styles.container}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: '0.5rem' }}>
        {props.address}
      </Typography>
      {display === 'two-lines' && (
        <Stack direction="column" spacing="0.5rem">
          <Stack direction="row" sx={{ alignItems: 'center' }}>
            <Typography component="span">
              Identifiant du local :&nbsp;
            </Typography>
            <Tag as="span">{props.localId}</Tag>
            {appartment}
            {floor}
          </Stack>
          <Stack direction="row" sx={{ alignItems: 'center' }}>
            {occupancy}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}

export default HousingResult;
