import classNames from "classnames";
import { PropsWithChildren } from "react";

import styles from './help.module.scss'

function Help(props: PropsWithChildren<{}>) {
  const iconClasses = classNames('fr-icon--sm fr-icon-information-fill fr-mr-1w', styles.helpIcon)
  return (
    <div className={styles.help}>
      <span aria-hidden="true" className={iconClasses} />
      <span>{props.children}</span>
    </div>
  )
}

export default Help
