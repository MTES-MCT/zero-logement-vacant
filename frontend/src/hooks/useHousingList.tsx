import { FindOptions, useFindHousingQuery } from '../services/housing.service';

export const useHousingList = (
  findOptions: FindOptions,
  useOptions: { skip: boolean } = { skip: false }
) => {
  const { data: paginatedHousing, refetch: refetchPaginatedHousing } =
    useFindHousingQuery(findOptions, useOptions);

  return {
    paginatedHousing,
    refetchPaginatedHousing,
  };
};
