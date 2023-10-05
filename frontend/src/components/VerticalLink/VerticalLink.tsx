import AppLink from '../_app/AppLink/AppLink';
import styles from './vertical-link.module.scss';
import { Icon } from '../_dsfr/index';
import Badge from '../Badge/Badge';
import classNames from 'classnames';

interface NavLinkProps {
  badge?: number;
  current?: boolean;
  icon?: string;
  label: string;
  to: string;
}

function VerticalLink(props: NavLinkProps) {
  const classes = classNames(styles.verticalLink, {
    [styles.verticalLinkActive]: props.current,
  });

  return (
    <AppLink className={classes} size="sm" to={props.to}>
      {props.badge ? (
        <Badge content={props.badge}>
          {props.icon && (
            <Icon name={props.icon} iconPosition="center" size="2x" />
          )}
        </Badge>
      ) : (
        props.icon && <Icon name={props.icon} iconPosition="center" size="2x" />
      )}
      {props.label}
    </AppLink>
  );
}

export default VerticalLink;
