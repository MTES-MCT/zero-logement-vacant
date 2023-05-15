import { getHousingOwnerRankLabel, HousingOwner } from '../../models/Owner';
import styles from './events-history.module.scss';
import React from 'react';
import { age, birthdate } from '../../utils/dateUtils';
import { parseHousingOwner } from '../../services/owner.service';

interface Props {
  housingOwners?: HousingOwner[];
}
const EventHousingOwnerContent = ({ housingOwners }: Props) => {
  const sortedHousingOwners = [...(housingOwners ?? [])].sort(
    (o1, o2) => o1.rank - o2.rank
  );

  return (
    <div className={styles.eventContentColContainer}>
      {sortedHousingOwners
        .map((_) => parseHousingOwner(_))
        .map((housingOwner) => (
          <div className={styles.eventContent}>
            <span className="color-grey-625">
              {getHousingOwnerRankLabel(housingOwner)}
            </span>
            <span>{housingOwner.fullName}</span>
            {housingOwner.birthDate && (
              <span>
                né(e) le {birthdate(housingOwner.birthDate)} (
                {age(housingOwner.birthDate)} ans)
              </span>
            )}
          </div>
        ))}
    </div>
  );
};
export default EventHousingOwnerContent;
