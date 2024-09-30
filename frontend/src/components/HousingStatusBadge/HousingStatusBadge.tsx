import { getHousingState } from '../../models/HousingState';
import styles from './housing-status-badge.module.scss';
import AppBadge from '../_app/AppBadge/AppBadge';
import { HousingStatus } from '@zerologementvacant/models';

interface Props {
  status?: HousingStatus;
  inline?: boolean;
}

function HousingStatusBadge({ status, inline }: Props) {
  return status !== undefined ? (
    <div
      className={
        inline ? styles.statusBadgeContainerInline : styles.statusBadgeContainer
      }
    >
      <AppBadge
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
