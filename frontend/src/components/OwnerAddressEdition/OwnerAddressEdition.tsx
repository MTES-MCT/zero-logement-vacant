import CallOut from '@codegouvfr/react-dsfr/CallOut';
import { useEffect, useState } from 'react';

import { type Address, isBanEligible } from '../../models/Address';
import type { AddressSearchResult } from '../../services/address.service';
import AddressSearchableSelect from '../AddressSearchableSelect/AddressSearchableSelect';

interface Props {
  banAddress?: Address | null;
  disabled?: boolean;
  errorMessage?: string;
  help?: boolean;
  onSelectAddress(address: AddressSearchResult | null): void;
  warningVisible: boolean;
  setWarningVisible: (visible: boolean) => void;
}

function OwnerAddressEdition(props: Props) {
  const [inputValue, setInputValue] = useState(props.banAddress?.label ?? '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInputValue(props.banAddress?.label ?? '');
  }, [props.banAddress?.label]);

  return (
    <>
      <AddressSearchableSelect
        disabled={props.disabled}
        state={props.errorMessage ? 'error' : 'default'}
        stateRelatedMessage={props.errorMessage}
        value={props.banAddress ?? null}
        inputValue={inputValue}
        open={open}
        onChange={(address) => {
          props.onSelectAddress(
            address
              ? {
                  ...address,
                  banId: address.banId ?? '',
                  latitude: address.latitude ?? 0,
                  longitude: address.longitude ?? 0,
                  cityCode: address.cityCode ?? undefined,
                  // Consider that the user has validated the address
                  score: 1
                }
              : null
          );
        }}
        onInputChange={setInputValue}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
      />
      {props.warningVisible &&
        props.banAddress &&
        !isBanEligible(props.banAddress) && (
          <CallOut
            className="fr-mt-3w"
            buttonProps={{
              children: 'Ignorer',
              onClick: () => {
                props.setWarningVisible(false);
              }
            }}
          >
            L’adresse de la Base Adresse Nationale diffère de celle de la DGFIP.
          </CallOut>
        )}
    </>
  );
}

export default OwnerAddressEdition;
