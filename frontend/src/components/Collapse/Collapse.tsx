import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';

import Icon from '~/components/ui/Icon';

import { useOutsideClick } from '../../hooks/useOutsideClick';

import styles from './collapse.module.scss';

interface Props {
  className?: string;
  dropdown?: boolean;
  /**
   * Can be provided if title is a string.
   */
  icon?: FrIconClassName | RiIconClassName;
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
    [styles.hidden]: hide
  });
  const headerClasses = classNames(styles.header, {
    [styles.clickable]: props.content
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
              {props.icon && <Icon name={props.icon} size="md" />}
              <Typography component="span" variant="body2" className="fr-mb-0">
                {props.title}
              </Typography>
            </span>
            {props.content && (
              <Icon className="align-right" name={collapseIcon} size="md" />
            )}
          </>
        ) : (
          <>
            <span className={styles.headerLeft}>{props.title}</span>
            {props.content && (
              <Icon className="align-right" name={collapseIcon} size="md" />
            )}
          </>
        )}
      </header>
      {props.content && <div className={contentClasses}>{props.content}</div>}
    </article>
  );
}

export default Collapse;
