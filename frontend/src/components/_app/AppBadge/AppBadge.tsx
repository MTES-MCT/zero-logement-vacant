import Badge, { BadgeProps } from '@codegouvfr/react-dsfr/Badge';
import classNames from 'classnames';

export type AppBadgeProps = BadgeProps & {
  colorFamily?: string;
};

function AppBadge({ colorFamily, ...badgeProps }: AppBadgeProps) {
  return (
    <Badge
      {...badgeProps}
      className={classNames(
        { [`fr-badge--${colorFamily}`]: colorFamily },
        badgeProps.className
      )}
    />
  );
}

export default AppBadge;
