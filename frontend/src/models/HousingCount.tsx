import { HousingStatus } from '@zerologementvacant/models';
import { displayCount } from '../utils/stringUtils';

export interface HousingCount {
  housing: number;
  owners: number;
}

export const displayHousingCount = ({
  filteredHousingCount,
  filteredOwnerCount,
  totalCount,
  status
}: {
  filteredHousingCount: number;
  filteredOwnerCount: number;
  totalCount?: number;
  status?: HousingStatus;
}): string => {
  if (totalCount === undefined) {
    return 'Comptage des logements...';
  }
  const items = displayCount(
    status === undefined ? totalCount : filteredHousingCount,
    'logement',
    { capitalize: true },
    status === undefined ? filteredHousingCount : undefined
  ).split(' ');
  items.splice(
    2,
    0,
    `(${displayCount(filteredOwnerCount, 'propriétaire', {
      capitalize: false
    })})`
  );
  return items.join(' ');
};
