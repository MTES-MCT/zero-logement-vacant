import Tag from '@codegouvfr/react-dsfr/Tag';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Occupancy } from '@zerologementvacant/models';

import OccupancyBadge from '../Housing/OccupancyBadge';
import styles from './housing-result.module.scss';

interface Props {
  address: string;
  appartment?: number;
  display?: 'one-line' | 'two-lines';
  floor?: number;
  localId: string;
  occupancy: Occupancy;
}

function HousingResult(props: Props) {
  const display = props.display ?? 'one-line';
  const floor = props.floor ? (
    <Typography>- Étage {props.floor}</Typography>
  ) : null;
  const appartment = props.appartment ? (
    <Typography>- Appartement {props.appartment}</Typography>
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
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <Typography component="span">Identifiant du local :&nbsp;</Typography>
          <Tag as="span">{props.localId}</Tag>
          {appartment}
          {floor}
          <Typography sx={{ mx: '0.5rem' }}>—</Typography>
          {occupancy}
        </Stack>
      )}
    </Box>
  );
}

export default HousingResult;
