import { Array, pipe } from 'effect';
import AddressSearchableSelectNext, {
  type AddressSearchableSelectNextProps
} from '~/components/Address/AddressSearchableSelectNext';
import { isBanEligible, type Address } from '~/models/Address';
import type { AddressSearchResult } from '~/services/address.service';

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

  function listIgnored(): ReadonlyArray<string> {
    return pipe(localStorage.getItem('address-warning-visible'), (warnings) =>
      warnings ? (JSON.parse(warnings) as ReadonlyArray<string>) : []
    );
  }

  const isIgnored: boolean = pipe(
    listIgnored(),
    Array.contains(address?.banId)
  );
  const hasWarning: boolean =
    !!address && !isIgnored && !isBanEligible(address);

  function ignoreWarning(): void {
    if (!address?.banId) {
      return;
    }

    const ignored = pipe(listIgnored(), Array.append(address.banId), (ids) =>
      JSON.stringify(ids)
    );
    localStorage.setItem('address-warning-visible', ignored);
  }

  return (
    <AddressSearchableSelectNext
      {...rest}
      value={value}
      warning={hasWarning}
      onIgnoreWarning={ignoreWarning}
    />
  );
}

export default OwnerAddressEditionNext;
