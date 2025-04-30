import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  DataFileYear,
  HousingSource,
  HousingStatus,
  Occupancy
} from '@zerologementvacant/models';
import { getSource } from '../../models/Housing';
import HousingStatusBadge from '../HousingStatusBadge/HousingStatusBadge';

import OccupancyBadge from './OccupancyBadge';

export interface HousingHeaderProps {
  address: string | null;
  className?: string;
  dataFileYears: DataFileYear[];
  localId: string;
  occupancy: Occupancy;
  source: HousingSource | null;
  status: HousingStatus;
  subStatus: string | null;
}

function HousingHeader(props: HousingHeaderProps) {
  return (
    <Stack className={props.className} component="section">
      <Typography component="h1" variant="h3">
        {fallback(props.address)}
      </Typography>
      <Typography
        sx={{
          color: fr.colors.decisions.text.title.grey.default,
          fontWeight: 500,
          mb: '0.5rem'
        }}
      >
        Identifiant fiscal national : {props.localId}
      </Typography>
      <Stack
        direction="row"
        spacing="0.75rem"
        sx={{ alignItems: 'center', mb: '0.5rem' }}
      >
        <Typography component="span">
          Occupation : <OccupancyBadge occupancy={props.occupancy} />
        </Typography>
        <Typography component="span" sx={{ display: 'inline-flex' }}>
          <Typography component="span" sx={{ mr: '0.5rem' }}>
            Statut de suivi :&nbsp;
          </Typography>
          <HousingStatusBadge inline status={props.status} />
        </Typography>
        {props.subStatus ? <Typography>{props.subStatus}</Typography> : null}
      </Stack>
      <Typography
        variant="body2"
        sx={{ color: fr.colors.decisions.text.mention.grey.default }}
      >
        Source des informations :&nbsp;
        {getSource({
          dataFileYears: props.dataFileYears,
          source: props.source
        })}
      </Typography>
    </Stack>
  );
}

function fallback(
  value: string | null | undefined,
  fallback = 'Pas d’information'
): string {
  return value ?? fallback;
}

export default HousingHeader;
