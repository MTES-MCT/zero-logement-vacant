import { useParams } from 'react-router-dom';
import { useFindEventsByOwnerQuery } from '../services/event.service';
import { useGetOwnerQuery } from '../services/owner.service';
import {
  useCountHousingQuery,
  useFindHousingQuery
} from '../services/housing.service';

export function useOwner() {
  const { ownerId, } = useParams<{ ownerId: string }>();

  const { data: owner, } = useGetOwnerQuery(ownerId);

  const { data: events, } = useFindEventsByOwnerQuery(ownerId);

  const { data: paginatedHousing, } = useFindHousingQuery({
    filters: { ownerIds: [ownerId], },
  });

  const { data: count, } = useCountHousingQuery({
    ownerIds: [ownerId],
  });

  return {
    events,
    paginatedHousing,
    owner,
    count,
  };
}
