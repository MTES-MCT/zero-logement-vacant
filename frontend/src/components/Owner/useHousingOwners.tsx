import { skipToken } from '@reduxjs/toolkit/query';
import {
  isDoNotContactOwnerRank,
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
  const doNotContactOwners = housingOwners?.filter((housingOwner) =>
    isDoNotContactOwnerRank(housingOwner.rank)
  );
  // Do-not-contact owners are still current owners of the housing: they appear
  // among the active owners (after the secondaries) but are never recipients.
  const activeOwners = [owner]
    .concat(secondaryOwners ?? [])
    .concat(doNotContactOwners ?? [])
    .filter(Predicate.isNotNull);
  const inactiveOwners = housingOwners?.filter((housingOwner) =>
    isInactiveOwnerRank(housingOwner.rank)
  );

  return {
    findOwnersQuery,
    owner,
    housingOwners,
    secondaryOwners,
    doNotContactOwners,
    activeOwners,
    inactiveOwners
  };
}
