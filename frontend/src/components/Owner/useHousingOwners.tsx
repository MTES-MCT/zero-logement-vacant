import {
  isInactiveOwnerRank,
  isSecondaryOwner
} from '@zerologementvacant/models';

import { Housing } from '../../models/Housing';
import { useFindOwnersByHousingQuery } from '../../services/owner.service';

export function useHousingOwners(housingId: Housing['id']) {
  const { data: housingOwners, ...query } =
    useFindOwnersByHousingQuery(housingId);
  const owner = housingOwners?.find((owner) => owner.rank === 1);
  const secondaryOwners = housingOwners?.filter(isSecondaryOwner);
  const inactiveOwners = housingOwners?.filter((housingOwner) =>
    isInactiveOwnerRank(housingOwner.rank)
  );

  return {
    query,
    owner,
    housingOwners,
    secondaryOwners,
    inactiveOwners
  };
}
