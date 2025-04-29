import CallOut from '@codegouvfr/react-dsfr/CallOut';
import { useState } from 'react';

import { Address, isBanEligible } from '../../models/Address';
import { AddressSearchResult } from '../../services/address.service';
import AddressSearchableSelectNext from '../AddressSearchableSelect/AddressSearchableSelectNext';

interface Props {
  banAddress?: Address;
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
      {props.warningVisible && !isBanEligible(props.banAddress) && (
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
          Veuillez vérifier attentivement ces informations ou ignorez l’alerte.
        </CallOut>
      )}
    </>
  );
}

export default OwnerAddressEdition;
