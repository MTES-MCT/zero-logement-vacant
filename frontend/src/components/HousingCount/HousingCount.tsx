import { fr } from '@codegouvfr/react-dsfr';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { visuallyHidden } from '@mui/utils';

import styles from './housing-count.module.scss';
import { pluralize } from '../../utils/stringUtils';

interface Props {
  housingCount: number;
  ownerCount: number;
  suffix?: boolean;
}

function HousingCount(props: Props) {
  const housingCount = props.suffix
    ? `${props.housingCount} ${pluralize(props.housingCount)('logement')}`
    : props.housingCount;
  const ownerCount = props.suffix
    ? `${props.ownerCount} ${pluralize(props.ownerCount)('propriétaire')}`
    : props.ownerCount;

  return (
    <section className={styles.counts}>
      <span
        className={fr.cx('ri-home-2-fill', 'fr-icon--sm', 'fr-mr-1v')}
        aria-hidden={true}
        title="Logements"
      />
      <Typography component="span" sx={{ fontSize: '0.875rem', mr: 1, mb: 0 }}>
        {housingCount}
        <Box component="span" sx={visuallyHidden}>
          {pluralize(props.housingCount)('logement')}
        </Box>
      </Typography>
      <span
        className={fr.cx('ri-user-fill', 'fr-icon--sm', 'fr-mr-1v')}
        aria-hidden={true}
        title="Propriétaires"
      />
      <Typography component="span" sx={{ fontSize: '0.875rem', mb: 0 }}>
        {ownerCount}
        <Box component="span" sx={visuallyHidden}>
          {pluralize(props.ownerCount)('propriétaire')}
        </Box>
      </Typography>
    </section>
  );
}

export default HousingCount;
