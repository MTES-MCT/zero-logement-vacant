import React from 'react';
import {
  getHousingState,
  getSubStatus,
  HousingStatus,
} from '../../models/HousingState';
import { Badge } from '@dataesr/react-dsfr';
import styles from './housing-status-badge.module.scss';

interface Props {
  status?: HousingStatus;
  subStatus?: string;
  inline?: boolean;
}

const HousingSubStatusBadge = ({ status, subStatus, inline }: Props) => {
  return status && subStatus && subStatus !== getHousingState(status).title ? (
    <div
      style={{
        backgroundColor: `var(${getSubStatus(status, subStatus)?.bgcolor})`,
        color: `var(${getSubStatus(status, subStatus)?.color})`,
      }}
      className={
        inline ? styles.statusBadgeContainerInline : styles.statusBadgeContainer
      }
    >
      <Badge text={subStatus} className={styles.statusBadgeLabel}></Badge>
    </div>
  ) : (
    <></>
  );
};

export default HousingSubStatusBadge;
