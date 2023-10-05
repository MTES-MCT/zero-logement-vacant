import { Icon, Text } from '../_dsfr/index';
import classNames from 'classnames';
import { ReactNode, useRef, useState } from 'react';

import styles from './collapse.module.scss';
import { useOutsideClick } from '../../hooks/useOutsideClick';

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

  const ref = useRef(null);
  useOutsideClick(ref, () => {
    setHide(true);
  });

  function toggleHide(): void {
    if (props.content) {
      setHide(!hide);
    }
  }

  const articleClasses = classNames(styles.article, props.className, {
    [styles.dropdown]: props.dropdown,
    [styles.hidden]: hide,
  });
  const headerClasses = classNames(styles.header, {
    [styles.clickable]: props.content,
  });
  const contentClasses = classNames(styles.content);

  const collapseIcon = hide
    ? 'fr-icon-arrow-down-s-line'
    : 'fr-icon-arrow-up-s-line';

  return (
    <article className={articleClasses} ref={ref}>
      <header className={headerClasses} onClick={toggleHide}>
        {typeof props.title === 'string' ? (
          <>
            <span className={styles.headerLeft}>
              {props.icon && (
                <Icon name={props.icon} iconPosition="left" size="1x" />
              )}
              <Text as="span" size="sm">
                {props.title}
              </Text>
            </span>
            {props.content && (
              <Icon
                className="align-right"
                iconPosition="right"
                name={collapseIcon}
                size="1x"
              />
            )}
          </>
        ) : (
          <>
            <span className={styles.headerLeft}>{props.title}</span>
            {props.content && (
              <Icon
                className="align-right"
                iconPosition="right"
                name={collapseIcon}
                size="1x"
              />
            )}
          </>
        )}
      </header>
      {props.content && <main className={contentClasses}>{props.content}</main>}
    </article>
  );
}

export default Collapse;
