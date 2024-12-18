import { BadgeProps } from '@codegouvfr/react-dsfr/Badge';

import { HousingStatus } from '@zerologementvacant/models';
import { getHousingState } from '../../models/HousingState';
import styles from './housing-status-badge.module.scss';
import AppBadge from '../_app/AppBadge/AppBadge';

interface Props {
  badgeProps?: Omit<BadgeProps, 'children'>;
  status?: HousingStatus;
  inline?: boolean;
}

function HousingStatusBadge({ badgeProps, status, inline }: Props) {
  return status !== undefined ? (
    <div
      className={
        inline ? styles.statusBadgeContainerInline : styles.statusBadgeContainer
      }
    >
      <AppBadge
        {...badgeProps}
        className={styles.statusBadgeLabel}
        colorFamily={getHousingState(status)?.colorFamily}
      >
        {getHousingState(status).title}
      </AppBadge>
    </div>
  ) : (
    <></>
  );
}

export default HousingStatusBadge;
