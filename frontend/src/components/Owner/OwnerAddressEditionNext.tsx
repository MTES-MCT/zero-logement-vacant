import AddressSearchableSelectNext, {
  type AddressSearchableSelectNextProps
} from '~/components/Address/AddressSearchableSelectNext';
import { isBanEligible, type Address } from '~/models/Address';
import type { AddressSearchResult } from '~/services/address.service';
import { useIgnoredAddresses } from './useIgnoredAddresses';

export type OwnerAddressEditionNextProps = Pick<
  AddressSearchableSelectNextProps,
  'disabled' | 'error'
> & {
  address: Address | null;
  onChange(address: Address | null): void;
};

function OwnerAddressEditionNext(props: OwnerAddressEditionNextProps) {
  const { address, ...rest } = props;
  const value: AddressSearchResult | null =
    address &&
    !!address.banId &&
    !!address.latitude &&
    !!address.longitude &&
    !!address.score
      ? {
          banId: address.banId,
          label: address.label,
          score: address.score,
          latitude: address.latitude,
          longitude: address.longitude,
          postalCode: address.postalCode,
          city: address.city
        }
      : null;

  const { isIgnored, ignoreWarning } = useIgnoredAddresses();

  const hasWarning: boolean =
    !!address &&
    !!address.banId &&
    !isIgnored(address.banId) &&
    !isBanEligible(address);

  return (
    <AddressSearchableSelectNext
      {...rest}
      value={value}
      warning={hasWarning}
      onIgnoreWarning={() => {
        if (address?.banId) {
          ignoreWarning(address.banId);
        }
      }}
    />
  );
}

export default OwnerAddressEditionNext;
