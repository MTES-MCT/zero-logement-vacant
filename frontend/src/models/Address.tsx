import { type AddressDTO } from '@zerologementvacant/models';

import config from '~/utils/config';

export type Address = AddressDTO;

export const isBanEligible = (
  address: Pick<Address, 'score'> | null | undefined
): boolean => {
  return (
    address?.score !== undefined && address.score >= config.banEligibleScore
  );
};
