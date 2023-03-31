import React from 'react';
import { getPrecision, HousingStatus } from '../../models/HousingState';
import { Badge } from '@dataesr/react-dsfr';
import styles from './housing-status-badge.module.scss';
import classNames from 'classnames';

interface Props {
  status?: HousingStatus;
  subStatus?: string;
  precisions?: string[];
}

const HousingPrecisionsBadges = ({ status, subStatus, precisions }: Props) => {
  return status && subStatus && precisions ? (
    <>
      {precisions.map((precision, index) => (
        <div
          key={'precision_' + index}
          style={{
            backgroundColor: `var(${
              getPrecision(status, subStatus, precision)?.bgcolor
            })`,
            color: `var(${getPrecision(status, subStatus, precision)?.color})`,
          }}
          className={classNames(styles.statusBadgeContainer, styles.inline)}
        >
          <Badge text={precision} className={styles.statusBadgeLabel}></Badge>
        </div>
      ))}
    </>
  ) : (
    <></>
  );
};

export default HousingPrecisionsBadges;
