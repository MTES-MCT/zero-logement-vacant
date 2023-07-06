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
      style={{
        backgroundColor: `var(${getHousingState(status)?.bgcolor})`,
        color: `var(${getHousingState(status)?.color})`,
      }}
      className={
        inline ? styles.statusBadgeContainerInline : styles.statusBadgeContainer
      }
    >
      <Badge
        text={getHousingState(status).title}
        className={styles.statusBadgeLabel}
      ></Badge>
    </div>
  ) : (
    <></>
  );
};

export default HousingStatusBadge;
