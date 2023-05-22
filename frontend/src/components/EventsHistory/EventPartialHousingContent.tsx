import { Housing } from '../../models/Housing';
import styles from './events-history.module.scss';
import { getHousingState } from '../../models/HousingState';
import React from 'react';
import { hasKey } from '../../models/HousingDiff';

interface Props {
  partialHousing: Partial<Housing>;
}

const EventPartialHousingContent = ({ partialHousing }: Props) => {
  return partialHousing && hasKey(partialHousing) ? (
    <div className={styles.eventContent}>
      {partialHousing.status !== undefined && (
        <>
          <span className="color-grey-625">Statut</span>
          {getHousingState(partialHousing.status).title}
        </>
      )}
      {partialHousing.subStatus && (
        <>
          <span className="color-grey-625">Sous-statut</span>
          {partialHousing.subStatus}
        </>
      )}
      {partialHousing.precisions && (
        <>
          <span className="color-grey-625">Précisions</span>
          {partialHousing.precisions?.join(' - ')}
        </>
      )}
      {partialHousing.vacancyReasons && (
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
    <></>
  );
};

export default EventPartialHousingContent;
