import React from 'react';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import styles from './housing-status-badge.module.scss';
import AppBadge from '../AppBadge/AppBadge';

interface Props {
  status?: HousingStatus;
  inline?: boolean;
}

const HousingStatusBadge = ({ status, inline }: Props) => {
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
};

export default HousingStatusBadge;
