import { Array, pipe, Predicate, String } from 'effect';

export interface AddressDTO {
  banId?: string;
  label: string;
  houseNumber?: string;
  street?: string;
  postalCode: string;
  city: string;
  cityCode?: string | null;
  latitude?: number;
  longitude?: number;
  score?: number;
}

export type AddressPayloadDTO = Pick<
  AddressDTO,
  | 'banId'
  | 'label'
  | 'houseNumber'
  | 'street'
  | 'postalCode'
  | 'city'
  | 'cityCode'
  | 'latitude'
  | 'longitude'
  | 'score'
>;

export enum AddressKinds {
  Housing = 'Housing',
  Owner = 'Owner'
}

export function formatAddress(
  address: Pick<AddressDTO, 'label'>,
  additionalAddress?: string | null
): string[] {
  const label = address.label
    .replace(/(\d{5})/, ', $1')
    .replace(/(2A|2B)(\d{3})/, ', $1$2')
    .split(',')
    .map(String.trim);

  return pipe(
    [additionalAddress, ...label],
    Array.filter(Predicate.isNotNullable),
    Array.filter(String.isNonEmpty)
  );
}
