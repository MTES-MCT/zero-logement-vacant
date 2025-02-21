import { fr } from '@codegouvfr/react-dsfr';

import styles from './housing-count.module.scss';
import { pluralize } from '../../utils/stringUtils';
import Typography from '@mui/material/Typography';

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
      </Typography>
      <span
        className={fr.cx('ri-user-fill', 'fr-icon--sm', 'fr-mr-1v')}
        aria-hidden={true}
        title="Propriétaires"
      />
      <Typography component="span" sx={{ fontSize: '0.875rem', mb: 0 }}>
        {ownerCount}
      </Typography>
    </section>
  );
}

export default HousingCount;
