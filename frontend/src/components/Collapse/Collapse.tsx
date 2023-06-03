import { Icon, Text } from '@dataesr/react-dsfr';
import classNames from 'classnames';
import { ReactNode, useState } from 'react';

import styles from './collapse.module.scss';

interface Props {
  className?: string;
  dropdown?: boolean;
  /**
   * Can be provided if title is a string.
   */
  icon?: string;
  title: ReactNode;
  content?: ReactNode;
  defaultCollapse?: boolean;
}

function Collapse(props: Props) {
  const [hide, setHide] = useState(props.defaultCollapse ?? true);

  function toggleHide(): void {
    setHide(!hide);
  }

  const articleClasses = classNames(styles.article, props.className, {
    [styles.collapsed]: hide,
  });
  const headerClasses = classNames(styles.header, {
    [styles.clickable]: props.content,
  });
  const contentClasses = classNames(styles.content, {
    [styles.hidden]: hide,
  });

  const collapseIcon = hide
    ? 'fr-icon-arrow-down-s-line'
    : 'fr-icon-arrow-up-s-line';

  return (
    <article className={articleClasses}>
      <header className={headerClasses} onClick={toggleHide}>
        {typeof props.title === 'string' ? (
          <>
            {props.icon && <Icon name={props.icon} iconPosition="left" />}
            <Text as="span" className={styles.title} size="sm">
              {props.title}
            </Text>
            {props.content && (
              <Icon name={collapseIcon} iconPosition="right" size="1x" />
            )}
          </>
        ) : (
          <span className={styles.title}>{props.title}</span>
        )}
      </header>
      {props.content && <main className={contentClasses}>{props.content}</main>}
    </article>
  );
}

export default Collapse;
