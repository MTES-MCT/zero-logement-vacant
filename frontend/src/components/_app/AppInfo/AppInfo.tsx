import { Container, Text } from '../../_dsfr';
import { PropsWithChildren } from 'react';

import styles from './app-info.module.scss';
import { fr } from '@codegouvfr/react-dsfr';

interface Props {}

function AppInfo(props: PropsWithChildren<Props>) {
  return (
    <Container as="section" className={styles.info} fluid>
      <Text as="span" size="xs">
        <span
          className={fr.cx('ri-information-fill', 'fr-mr-1v', 'fr-icon--sm')}
          aria-hidden={true}
        />
        {props.children}
      </Text>
    </Container>
  );
}

export default AppInfo;
