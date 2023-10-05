import { Icon, Text } from '@dataesr/react-dsfr';

import styles from './housing-count.module.scss';

interface Props {
  housingCount: number;
  ownerCount: number;
}

function HousingCount(props: Props) {
  return (
    <section className={styles.counts}>
      <Icon
        name="ri-home-2-fill"
        iconPosition="center"
        size="sm"
        title="Logements"
        className={styles.icon}
      />
      <Text as="span" spacing="mr-1w mb-0" size="sm">
        {props.housingCount}
      </Text>
      <Icon
        name="ri-user-fill"
        iconPosition="center"
        size="sm"
        title="Propriétaires"
        className={styles.icon}
      />
      <Text as="span" spacing="mb-0" size="sm">
        {props.ownerCount}
      </Text>
    </section>
  );
}

export default HousingCount;
