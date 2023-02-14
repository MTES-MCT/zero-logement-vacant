import { ReactNode, useState } from 'react';
import { Icon } from '@dataesr/react-dsfr';

import styles from './collapse.module.scss';
import classNames from 'classnames';

interface Props {
  title: ReactNode;
  content?: ReactNode;
  defaultCollapse?: boolean;
}

function Collapse(props: Props) {
  const [hide, setHide] = useState(props.defaultCollapse ?? true);

  function toggleHide(): void {
    setHide(!hide);
  }

  const headerClasses = classNames(styles.header, {
    [styles.clickable]: props.content,
  });
  const contentClasses = classNames(styles.content, {
    [styles.hidden]: hide,
  });

  const icon = hide ? 'fr-icon-arrow-down-s-line' : 'fr-icon-arrow-up-s-line';

  return (
    <article className={styles.article}>
      <header className={headerClasses} onClick={toggleHide}>
        <span className={styles.title}>{props.title}</span>
        {props.content && <Icon name={icon} />}
      </header>
      {props.content && (
        <section className={contentClasses}>{props.content}</section>
      )}
    </article>
  );
}

export default Collapse;
