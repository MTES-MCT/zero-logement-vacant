import type { HousingCount } from '~/models/HousingCount';
import type { HousingFilters } from '~/models/HousingFilters';
import {
  useCountHousingByStatusQuery,
  useCountHousingQuery
} from '~/services/housing.service';

export interface ActiveHousingCount {
  data: HousingCount | undefined;
  isLoading: boolean;
  isSuccess: boolean;
}

/**
 * Count for the currently-filtered set at the active status.
 *
 * Specific statuses are read from the shared grouped count query
 * (`countHousingByStatus`), so they cost no extra request. The "all" tab
 * (`status === undefined`) still issues one real count, because distinct owners
 * cannot be summed across status groups — an owner may own housings in several
 * statuses and would be counted more than once.
 *
 * The grouped query is called with the status stripped out, so it dedupes with
 * the one `useStatusTabs` already fires: no additional network request.
 */
export function useActiveHousingCount(
  filters: HousingFilters
): ActiveHousingCount {
  const { status, ...baseFilters } = filters;

  const grouped = useCountHousingByStatusQuery(baseFilters);
  const isAll = status === undefined;
  const filtered = useCountHousingQuery(baseFilters, { skip: !isAll });

  if (isAll) {
    return {
      data: filtered.data,
      isLoading: filtered.isLoading,
      isSuccess: filtered.isSuccess
    };
  }

  return {
    data: grouped.data?.[status],
    isLoading: grouped.isLoading,
    isSuccess: grouped.isSuccess
  };
}
