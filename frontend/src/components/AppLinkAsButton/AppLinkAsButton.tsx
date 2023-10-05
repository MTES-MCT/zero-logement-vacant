import { MouseEventHandler } from 'react';

import styles from './link-as-button.module.scss';
import AppLink, { AppLinkProps } from '../AppLink/AppLink';

export type AppLinkAsButtonProps = Omit<AppLinkProps, 'to'> & {
  onClick: MouseEventHandler;
};

function AppLinkAsButton(props: AppLinkAsButtonProps) {
  return <AppLink className={styles.buttonLink} {...props} to="#" />;
}

export default AppLinkAsButton;
