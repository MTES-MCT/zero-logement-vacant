import { HousingPaginatedResult } from './PaginatedResult';
import { displayCount } from '../utils/stringUtils';
import { HousingStatus } from './HousingState';

export interface HousingCount {
  housing: number;
  owners: number;
}

export const displayHousingCount = ({
  filteredCount,
  filteredOwnerCount,
  totalCount,
  status,
}: Pick<HousingPaginatedResult, 'filteredCount' | 'filteredOwnerCount'> & {
  totalCount: number;
  status?: HousingStatus;
}): string => {
  const items = displayCount(
    status === undefined ? totalCount : filteredCount,
    'logement',
    true,
    status === undefined ? filteredCount : undefined
  ).split(' ');
  items.splice(
    2,
    0,
    `(${displayCount(filteredOwnerCount, 'propriétaire', false)})`
  );
  return items.join(' ');
};
