import { getHousingState, HousingStatus } from '../../models/HousingState';
import styles from './housing-status-badge.module.scss';
import classNames from 'classnames';
import AppBadge from '../_app/AppBadge/AppBadge';

interface Props {
  status?: HousingStatus;
  subStatus?: string;
  inline?: boolean;
}

const HousingSubStatusBadge = ({ status, subStatus, inline }: Props) => {
  return status && subStatus && subStatus !== getHousingState(status).title ? (
    <div
      className={
        inline ? styles.statusBadgeContainerInline : styles.statusBadgeContainer
      }
    >
      <AppBadge
        className={classNames(styles.subStatusBadgeLabel, 'fr-text--xs')}
        small
        colorFamily={getHousingState(status)?.colorFamily}
      >
        {subStatus}
      </AppBadge>
    </div>
  ) : (
    <></>
  );
};

export default HousingSubStatusBadge;
