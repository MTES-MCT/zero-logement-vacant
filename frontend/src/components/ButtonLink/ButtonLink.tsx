import { MouseEventHandler } from 'react';

import styles from './button-link.module.scss';
import AppLink, { AppLinkProps } from '../AppLink/AppLink';

export type ButtonLinkProps = Omit<AppLinkProps, 'to'> & {
  onClick: MouseEventHandler;
};

function ButtonLink(props: ButtonLinkProps) {
  return <AppLink className={styles.buttonLink} {...props} to="#" />;
}

export default ButtonLink;
