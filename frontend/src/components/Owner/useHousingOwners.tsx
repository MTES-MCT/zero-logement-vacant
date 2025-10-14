import { skipToken } from '@reduxjs/toolkit/query';
import {
  isInactiveOwnerRank,
  isSecondaryOwner
} from '@zerologementvacant/models';
import { Predicate } from 'effect';

import { type Housing } from '~/models/Housing';
import { useFindOwnersByHousingQuery } from '~/services/owner.service';

export function useHousingOwners(housingId: Housing['id'] | typeof skipToken) {
  const findOwnersQuery = useFindOwnersByHousingQuery(housingId ?? skipToken);

  const housingOwners = findOwnersQuery.data;
  const owner = housingOwners?.find((owner) => owner.rank === 1) ?? null;
  const secondaryOwners = housingOwners?.filter(isSecondaryOwner);
  const activeOwners = [owner]
    .concat(secondaryOwners ?? [])
    .filter(Predicate.isNotNull);
  const inactiveOwners = housingOwners?.filter((housingOwner) =>
    isInactiveOwnerRank(housingOwner.rank)
  );

  return {
    findOwnersQuery,
    owner,
    housingOwners,
    secondaryOwners,
    activeOwners,
    inactiveOwners
  };
}
