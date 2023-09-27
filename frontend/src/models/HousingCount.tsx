import { displayCount } from '../utils/stringUtils';
import { HousingStatus } from './HousingState';

export interface HousingCount {
  housing: number;
  owners: number;
}

export const displayHousingCount = ({
  filteredHousingCount,
  filteredOwnerCount,
  totalCount,
  status,
}: {
  filteredHousingCount: number;
  filteredOwnerCount: number;
  totalCount: number;
  status?: HousingStatus;
}): string => {
  const items = displayCount(
    status === undefined ? totalCount : filteredHousingCount,
    'logement',
    true,
    status === undefined ? filteredHousingCount : undefined
  ).split(' ');
  items.splice(
    2,
    0,
    `(${displayCount(filteredOwnerCount, 'propriétaire', false)})`
  );
  return items.join(' ');
};
