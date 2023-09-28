import React from 'react';
import { getHousingState, HousingStatus } from '../../models/HousingState';
import { Badge } from '@dataesr/react-dsfr';
import styles from './housing-status-badge.module.scss';
import classNames from 'classnames';

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
      <Badge
        text={subStatus}
        className={classNames(styles.subStatusBadgeLabel, 'fr-text--xs')}
        isSmall={true}
        colorFamily={getHousingState(status)?.colorFamily}
      ></Badge>
    </div>
  ) : (
    <></>
  );
};

export default HousingSubStatusBadge;
