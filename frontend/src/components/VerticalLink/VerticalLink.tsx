import InternalLink from '../InternalLink/InternalLink';
import styles from './vertical-link.module.scss';
import { Icon } from '@dataesr/react-dsfr';
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
    <InternalLink
      className={classes}
      current={props.current}
      display="flex"
      size="sm"
      to={props.to}
      verticalIconPosition="middle"
    >
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
    </InternalLink>
  );
}

export default VerticalLink;
