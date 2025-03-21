import { Housing, OccupancyKindLabels } from '../../models/Housing';
import styles from './events-history.module.scss';
import { hasValues } from '../../models/Diff';

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
      {partialHousing.occupancy && (
        <>
          <span className="color-grey-625">Occupation</span>
          {OccupancyKindLabels[partialHousing.occupancy]}
        </>
      )}
      {partialHousing.occupancyIntended && (
        <>
          <span className="color-grey-625">Occupation prévisionnelle</span>
          {OccupancyKindLabels[partialHousing.occupancyIntended]}
        </>
      )}
    </div>
  ) : (
    <div className={styles.eventContent}>-</div>
  );
};

export default EventPartialHousingContent;
