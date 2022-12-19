import classNames from 'classnames';
import { PropsWithChildren } from 'react';

import styles from './help.module.scss';

interface HelpProps {
  className?: string;
}

function Help(props: PropsWithChildren<HelpProps>) {
  const divClasses = classNames(props.className, styles.help);
  const iconClasses = classNames(
    'fr-icon--sm fr-icon-information-fill fr-mr-1w',
    styles.helpIcon
  );
  return (
    <div className={divClasses}>
      <span aria-hidden="true" className={iconClasses} />
      <span>{props.children}</span>
    </div>
  );
}

export default Help;
