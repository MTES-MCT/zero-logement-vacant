import { Housing } from '../../models/Housing';
import styles from './events-history.module.scss';
import React from 'react';
import { hasValues } from '../../models/HousingDiff';

interface Props {
  partialHousing: Partial<Housing>;
}

const EventPartialHousingContent = ({ partialHousing }: Props) => {
  return partialHousing && hasValues(partialHousing) ? (
    <div className={styles.eventContent}>
      {partialHousing.status !== undefined && (
        <>
          <span className="color-grey-625">Statut</span>
          {partialHousing.status}
        </>
      )}
      {partialHousing.subStatus && (
        <>
          <span className="color-grey-625">Sous-statut</span>
          {partialHousing.subStatus}
        </>
      )}
      {partialHousing.precisions && partialHousing.precisions.length > 0 && (
        <>
          <span className="color-grey-625">Précisions</span>
          {partialHousing.precisions?.join(' - ')}
        </>
      )}
      {partialHousing.vacancyReasons &&
        partialHousing.vacancyReasons.length > 0 && (
          <>
            <span className="color-grey-625">Causes de la vacance</span>
            {partialHousing.vacancyReasons?.join(' - ')}
          </>
        )}
      {partialHousing.occupancy && (
        <>
          <span className="color-grey-625">Statut d'occupation</span>
          {partialHousing.occupancy}
        </>
      )}
    </div>
  ) : (
    <div className={styles.eventContent}>-</div>
  );
};

export default EventPartialHousingContent;
