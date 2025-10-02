import Badge, { type BadgeProps } from '@codegouvfr/react-dsfr/Badge';
import classNames from 'classnames';

import type { ColorFamily } from '~/models/ColorFamily';

export type AppBadgeProps = BadgeProps & {
  colorFamily?: ColorFamily;
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
