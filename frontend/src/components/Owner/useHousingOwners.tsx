import {
  isInactiveOwnerRank,
  isSecondaryOwner
} from '@zerologementvacant/models';

import { type Housing } from '~/models/Housing';
import { useFindOwnersByHousingQuery } from '~/services/owner.service';

export function useHousingOwners(housingId: Housing['id']) {
  const findOwnersQuery = useFindOwnersByHousingQuery(housingId);

  const housingOwners = findOwnersQuery.data;
  const owner = housingOwners?.find((owner) => owner.rank === 1) ?? null;
  const secondaryOwners = housingOwners?.filter(isSecondaryOwner);
  const inactiveOwners = housingOwners?.filter((housingOwner) =>
    isInactiveOwnerRank(housingOwner.rank)
  );

  return {
    findOwnersQuery,
    owner,
    housingOwners,
    secondaryOwners,
    inactiveOwners
  };
}
