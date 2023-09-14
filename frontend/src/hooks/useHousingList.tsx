import {
  FindOptions,
  useCountHousingQuery,
  useFindHousingQuery,
} from '../services/housing.service';

export const useHousingList = (
  findOptions: FindOptions,
  useOptions: { skip: boolean } = { skip: false }
) => {
  const { data: paginatedHousing, refetch: refetchPaginatedHousing } =
    useFindHousingQuery(findOptions, useOptions);

  const { data: total } = useCountHousingQuery({
    dataYearsExcluded: findOptions.filters.dataYearsExcluded,
    dataYearsIncluded: findOptions.filters.dataYearsIncluded,
    occupancies: findOptions.filters.occupancies,
  });

  return {
    totalCount: total?.housing ?? 0,
    paginatedHousing,
    refetchPaginatedHousing,
  };
};
