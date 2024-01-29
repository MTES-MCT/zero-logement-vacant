import { Text } from '../_dsfr';
import { PropsWithChildren } from 'react';

import styles from './label.module.scss';
import { TextAs } from '../_dsfr/components/foundation/typography/Text/Text';

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
