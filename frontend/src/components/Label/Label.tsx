import { Text } from '../_dsfr/index';
import { PropsWithChildren } from 'react';

import styles from './label.module.scss';

interface Props {
  spacing?: string;
}

function Label(props: PropsWithChildren<Props>) {
  return (
    <Text size="sm" className={styles.label} spacing={props.spacing}>
      {props.children}
    </Text>
  );
}

export default Label;
