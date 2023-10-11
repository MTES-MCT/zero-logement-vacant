import styles from './badge.module.scss';
import classNames from 'classnames';
import { PropsWithChildren } from 'react';

interface BadgeProps {
  content: number;
  inline?: boolean;
}

function Badge(props: PropsWithChildren<BadgeProps>) {
  const badgeClasses = classNames(styles.badge, {
    [styles.inline]: props.inline,
  });

  return (
    <div className={badgeClasses}>
      <div className={styles.wrapper}>
        {props.children}
        <span
          aria-atomic
          aria-label="Badge"
          aria-live="polite"
          className={styles.chip}
          role="status"
        >
          {props.content}
        </span>
      </div>
    </div>
  );
}

export default Badge;
