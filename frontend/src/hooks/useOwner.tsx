import { useParams } from 'react-router-dom';
import { assert } from 'ts-essentials';

import { useFindEventsByOwnerQuery } from '../services/event.service';
import {
  useCountHousingQuery,
  useFindHousingQuery
} from '../services/housing.service';
import { useGetOwnerQuery } from '../services/owner.service';

interface UseOwnerOptions {
  include?: ReadonlyArray<'events' | 'housings'>;
}

export function useOwner(options?: UseOwnerOptions) {
  const { ownerId } = useParams<{ ownerId: string }>();
  assert(ownerId !== undefined, 'ownerId is undefined');

  const { data: owner, ...getOwnerQuery } = useGetOwnerQuery(ownerId);

  const { data: events, ...findOwnerEventsQuery } = useFindEventsByOwnerQuery(
    ownerId,
    {
      skip: !options?.include?.includes('events')
    }
  );

  const { data: housings, ...findHousingsQuery } = useFindHousingQuery(
    { filters: { ownerIds: [ownerId] } },
    { skip: !options?.include?.includes('housings') }
  );

  const { data: count, ...countHousingQuery } = useCountHousingQuery(
    {
      ownerIds: [ownerId]
    },
    { skip: !options?.include?.includes('housings') }
  );

  return {
    count,
    countHousingQuery,
    events,
    findOwnerEventsQuery,
    housings,
    findHousingsQuery,
    owner,
    getOwnerQuery
  };
}
