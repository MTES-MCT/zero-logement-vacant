import { FindOptions, useFindHousingQuery } from '../services/housing.service';

export const useHousingList = (
  findOptions: FindOptions,
  useOptions: { skip: boolean } = { skip: false }
) => {
  const { data: paginatedHousing, refetch: refetchHousingList } =
    useFindHousingQuery(findOptions, useOptions);

  return {
    housingList: paginatedHousing?.entities,
    refetchHousingList,
  };
};
