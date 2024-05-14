import classNames from 'classnames';
import Badge, { BadgeProps } from '@codegouvfr/react-dsfr/Badge';

export type AppBadgeProps = BadgeProps & {
  colorFamily?: string;
};

function AppBadge({ colorFamily, ...badgeProps }: AppBadgeProps) {
  return (
    <Badge
      {...badgeProps}
      className={classNames({ [`fr-badge--${colorFamily}`]: colorFamily })}
    />
  );
}

export default AppBadge;
