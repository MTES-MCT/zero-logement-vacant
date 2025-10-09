import CallOut from '@codegouvfr/react-dsfr/CallOut';
import { useState } from 'react';

import { type Address, isBanEligible } from '../../models/Address';
import type { AddressSearchResult } from '../../services/address.service';
import AddressSearchableSelectNext from '../AddressSearchableSelect/AddressSearchableSelectNext';

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
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  return (
    <>
      <AddressSearchableSelectNext
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
