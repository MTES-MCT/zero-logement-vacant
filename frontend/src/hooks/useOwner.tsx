import { useParams } from 'react-router-dom';
import { assert } from 'ts-essentials';

import { useFindEventsByOwnerQuery } from '../services/event.service';
import { useCountHousingQuery } from '../services/housing.service';
import { useGetOwnerQuery } from '../services/owner.service';

interface UseOwnerOptions {
  include?: ReadonlyArray<'events' | 'housings'>;
}

export function useOwner(options?: UseOwnerOptions) {
  const { id } = useParams<{ id: string }>();
  assert(id !== undefined, 'id is undefined');

  const { data: owner, ...getOwnerQuery } = useGetOwnerQuery(id);

  const { data: events, ...findOwnerEventsQuery } = useFindEventsByOwnerQuery(
    id,
    {
      skip: !options?.include?.includes('events')
    }
  );

  const { data: count, ...countHousingQuery } = useCountHousingQuery(
    {
      ownerIds: [id]
    },
    { skip: !options?.include?.includes('housings') }
  );

  return {
    count,
    countHousingQuery,
    events,
    findOwnerEventsQuery,
    owner,
    getOwnerQuery
  };
}
