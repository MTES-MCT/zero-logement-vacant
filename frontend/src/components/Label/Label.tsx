import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import type { PropsWithChildren } from 'react';

import styles from './label.module.scss';

interface Props {
  spacing?: string;
  as?: 'p' | 'span';
}

function Label(props: PropsWithChildren<Props>) {
  return (
    <Typography
      component={props.as ?? 'p'}
      variant="body2"
      className={classNames(
        styles.label,
        props.spacing && `fr-${props.spacing}`
      )}
    >
      {props.children}
    </Typography>
  );
}

export default Label;
