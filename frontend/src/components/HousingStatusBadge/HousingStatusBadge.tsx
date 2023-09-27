import React from 'react';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import { Badge } from '@dataesr/react-dsfr';
import styles from './housing-status-badge.module.scss';

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
      <Badge
        text={getHousingState(status).title}
        className={styles.statusBadgeLabel}
        colorFamily={getHousingState(status)?.colorFamily}
      ></Badge>
    </div>
  ) : (
    <></>
  );
};

export default HousingStatusBadge;
