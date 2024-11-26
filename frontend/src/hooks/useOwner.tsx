import { useParams } from 'react-router-dom';
import { assert } from 'ts-essentials';

import { useFindEventsByOwnerQuery } from '../services/event.service';
import { useGetOwnerQuery } from '../services/owner.service';
import {
  useCountHousingQuery,
  useFindHousingQuery
} from '../services/housing.service';

interface UseOwnerOptions {
  include?: ReadonlyArray<'events' | 'housings'>;
}

export function useOwner(options?: UseOwnerOptions) {
  const { ownerId } = useParams<{ ownerId: string }>();
  assert(ownerId !== undefined, 'ownerId is undefined');

  const { data: owner } = useGetOwnerQuery(ownerId);

  const { data: events } = useFindEventsByOwnerQuery(ownerId, {
    skip: !options?.include?.includes('events')
  });

  const { data: paginatedHousing } = useFindHousingQuery(
    {
      filters: { ownerIds: [ownerId] }
    },
    { skip: !options?.include?.includes('housings') }
  );

  const { data: count } = useCountHousingQuery(
    {
      ownerIds: [ownerId]
    },
    { skip: !options?.include?.includes('housings') }
  );

  return {
    events,
    paginatedHousing,
    owner,
    count
  };
}
