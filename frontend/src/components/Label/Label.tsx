import type { PropsWithChildren } from 'react';

import { Text } from '../_dsfr';
import type { TextAs } from '../_dsfr/components/foundation/typography/Text/Text';

import styles from './label.module.scss';

interface Props {
  spacing?: string;
  as?: TextAs;
}

function Label(props: PropsWithChildren<Props>) {
  return (
    <Text
      size="sm"
      className={styles.label}
      spacing={props.spacing}
      as={props.as}
    >
      {props.children}
    </Text>
  );
}

export default Label;
