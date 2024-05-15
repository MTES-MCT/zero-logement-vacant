import { getHousingOwnerRankLabel, HousingOwner } from '../../models/Owner';
import styles from './events-history.module.scss';
import { age, birthdate } from '../../utils/dateUtils';
import { parseHousingOwner } from '../../services/owner.service';
import { capitalize } from '../../utils/stringUtils';

interface Props {
  housingOwners?: HousingOwner[];
}
const EventHousingOwnerContent = ({ housingOwners }: Props) => {
  const sortedHousingOwners = [...(housingOwners ?? [])]
    .map((_) => ({ ..._, rank: _.rank ?? 1 }))
    .sort((o1, o2) => o1.rank - o2.rank);

  return (
    <div className={styles.eventContentColContainer}>
      {sortedHousingOwners
        .map((_) => parseHousingOwner(_))
        .map((housingOwner) => (
          <div className={styles.eventContent} key={housingOwner.id}>
            <span className="color-grey-625">
              {getHousingOwnerRankLabel(housingOwner.rank)}
            </span>
            <span>{housingOwner.fullName}</span>
            {housingOwner.birthDate && (
              <span>
                né(e) le {birthdate(housingOwner.birthDate)} (
                {age(housingOwner.birthDate)} ans)
              </span>
            )}
            {housingOwner.rawAddress.map((address, i) => (
              <div className="capitalize" key={`address_${i}`}>
                {capitalize(address)}
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};
export default EventHousingOwnerContent;
