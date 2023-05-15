import { Housing } from '../../models/Housing';
import styles from './events-history.module.scss';
import { getHousingState } from '../../models/HousingState';
import React from 'react';

interface Props {
  housing?: Housing;
}

const EventHousingStatutContent = ({ housing }: Props) => {
  return housing ? (
    <div className={styles.eventContent}>
      <span className="color-grey-625">Statut</span>
      {getHousingState(housing.status).title}
      {housing.subStatus && (
        <>
          <span className="color-grey-625">Sous-statut</span>
          {housing.subStatus}
        </>
      )}
      {housing.precisions && (
        <>
          <span className="color-grey-625">Précisions</span>
          {housing.precisions?.join(' - ')}
        </>
      )}
      {housing.vacancyReasons && (
        <>
          <span className="color-grey-625">Causes de la vacance</span>
          {housing.vacancyReasons?.join(' - ')}
        </>
      )}
    </div>
  ) : (
    <></>
  );
};

export default EventHousingStatutContent;
