import { Container, Icon, Text } from '@dataesr/react-dsfr';
import { PropsWithChildren } from 'react';

import styles from './info.module.scss';

interface Props {}

function Info(props: PropsWithChildren<Props>) {
  return (
    <Container as="section" className={styles.info} fluid>
      <Icon name="ri-information-fill" iconPosition="left" size="1x" />
      <Text as="span" size="xs">
        {props.children}
      </Text>
    </Container>
  );
}

export default Info;
