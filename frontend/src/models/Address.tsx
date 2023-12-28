import { reduceStringArray } from '../utils/stringUtils';

export interface Address {
  street?: string;
  houseNumber?: string;
  postalCode: string;
  city: string;
  latitude?: number;
  longitude?: number;
  score?: number;
}

export const addressToString = (address?: Address, breakLine = true) => {
  if (address) {
    return reduceStringArray(
      [
        address.street?.startsWith(address.houseNumber ?? '')
          ? address.street
          : [address.houseNumber, address.street].join(' '),
        [address.postalCode, address.city].join(' '),
      ],
      breakLine
    );
  }
};
