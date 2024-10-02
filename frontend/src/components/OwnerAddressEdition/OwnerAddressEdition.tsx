import Button from '@codegouvfr/react-dsfr/Button';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { Text } from '../_dsfr';
import { Address, isBanEligible } from '../../models/Address';
import { AddressSearchResult } from '../../services/address.service';
import AddressSearchableSelectNext from '../AddressSearchableSelect/AddressSearchableSelectNext';

interface Props {
  banAddress?: Address;
  disabled?: boolean;
  errorMessage?: string;
  help?: boolean;
  rawAddress: string[];
  onSelectAddress(address: AddressSearchResult | null): void;
}

function OwnerAddressEdition(props: Props) {
  const [searchAddressFromLovac, setSearchAddressFromLovac] = useState(false);
  const [previousAddress, setPreviousAddress] = useState<AddressSearchResult>();

  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  if (searchAddressFromLovac) {
    return (
      <>
        <Typography>BAN: {props.banAddress?.label}</Typography>
        <Typography>Input value: {inputValue}</Typography>
        <AddressSearchableSelectNext
          className="fr-mb-2w"
          disabled={props.disabled}
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
          stateRelatedMessage={props.errorMessage}
        />
        {previousAddress && (
          <div className="fr-p-2w fr-mb-2w bg-bf975">
            <Typography mb={2}>Adresse précédente :</Typography>
            <Typography mb={2} sx={{ fontWeight: 900 }}>
              {previousAddress.label}
            </Typography>
            <div className="align-right">
              <Button
                priority="secondary"
                onClick={() => {
                  setSearchAddressFromLovac(false);
                  props.onSelectAddress(previousAddress);
                }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Typography>BAN: {props.banAddress?.label}</Typography>
      <Typography>Input value: {inputValue}</Typography>
      <AddressSearchableSelectNext
        disabled={props.disabled}
        stateRelatedMessage={props.errorMessage}
        value={props.banAddress ?? null}
        inputValue={inputValue}
        onChange={props.onSelectAddress}
        onInputChange={setInputValue}
      />
      {props.banAddress && !isBanEligible(props.banAddress) && (
        <div className="fr-mt-3w fr-p-2w bg-bf975">
          <Text size="md" className="color-info-425 weight-900">
            Amélioration possible
          </Text>
          <Typography mb={2}>
            L’adresse issue de la <u>Base Adresse Nationale</u>, indiquée dans
            le champ Adresse ci-dessus, semble différente de l’adresse issue de
            la <u>DGFIP</u> : <b>{props.rawAddress.join(' ')}</b>
          </Typography>
          <Typography mb={2}>
            Modifier le champ Adresse à partir de l’adresse DGFIP ?
          </Typography>
          <ButtonsGroup
            buttons={[
              {
                children: 'Oui',
                priority: 'secondary',
                onClick: () => {
                  if (props.banAddress) {
                    setPreviousAddress({
                      ...props.banAddress,
                      banId: props.banAddress.banId ?? '',
                      latitude: props.banAddress.latitude ?? 0,
                      longitude: props.banAddress.longitude ?? 0,
                      score: props.banAddress.score ?? Number.NaN
                    });
                  }
                  setInputValue(props.rawAddress.join(' '));
                  setSearchAddressFromLovac(true);
                  setOpen(true);
                }
              },
              {
                children: 'Non',
                priority: 'secondary',
                onClick: () => {
                  if (props.banAddress) {
                    props.onSelectAddress({
                      ...props.banAddress,
                      banId: props.banAddress.banId ?? '',
                      latitude: props.banAddress.latitude ?? 0,
                      longitude: props.banAddress.longitude ?? 0,
                      // Consider that the user has validated the address
                      score: 1
                    });
                  }
                }
              }
            ]}
            alignment="left"
            inlineLayoutWhen="sm and up"
          ></ButtonsGroup>
        </div>
      )}
    </>
  );
}

export default OwnerAddressEdition;
