import { useParams } from 'react-router-dom';
import { assert } from 'ts-essentials';

import { useGetHousingQuery } from '../services/housing.service';

export function useHousing() {
  const { housingId } = useParams<{ housingId: string }>();
  assert(housingId !== undefined, 'housingId is undefined');

  const { data: housing, ...getHousingQuery } = useGetHousingQuery(housingId);

  return {
    getHousingQuery,
    housing,
    housingId
  };
}
