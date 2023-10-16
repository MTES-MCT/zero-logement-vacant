import { Text } from '../_dsfr';
import styles from './housing-count.module.scss';
import { fr } from '@codegouvfr/react-dsfr';

interface Props {
  housingCount: number;
  ownerCount: number;
}

function HousingCount(props: Props) {
  return (
    <section className={styles.counts}>
      <i
        className={fr.cx('ri-home-2-fill', 'fr-icon--sm', 'fr-mr-1v')}
        title="Logements"
      />
      <Text as="span" spacing="mr-1w mb-0" size="sm">
        {props.housingCount}
      </Text>
      <i
        className={fr.cx('ri-user-fill', 'fr-icon--sm', 'fr-mr-1v')}
        title="Propriétaires"
      />
      <Text as="span" spacing="mb-0" size="sm">
        {props.ownerCount}
      </Text>
    </section>
  );
}

export default HousingCount;
