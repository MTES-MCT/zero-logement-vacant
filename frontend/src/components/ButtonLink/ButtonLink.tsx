import { Link } from '@dataesr/react-dsfr';
import { ComponentPropsWithoutRef, MouseEventHandler } from 'react';

import styles from './button-link.module.scss';

interface LinkProps extends ComponentPropsWithoutRef<typeof Link> {
  onClick: MouseEventHandler;
}

function ButtonLink(props: LinkProps) {
  return <Link className={styles.buttonLink} {...props} as={<button />} />;
}

export default ButtonLink;
