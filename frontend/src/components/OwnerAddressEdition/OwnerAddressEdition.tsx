import React, { useState } from 'react';
import { Text } from '../_dsfr';
import { Address, addressToString, isBanEligible } from '../../models/Address';
import Button from '@codegouvfr/react-dsfr/Button';
import AppAddressSearchBar from '../_app/AppSearchBar/AppAddressSearchBar';
import Badge from '@codegouvfr/react-dsfr/Badge';
import ButtonsGroup from '@codegouvfr/react-dsfr/ButtonsGroup';
import { AddressSearchResult } from '../../services/address.service';

const ScoreBadge = ({ banAddress }: { banAddress: Address }) => (
  <Badge noIcon severity="error">
    {Math.round((banAddress.score ?? 0) * 100)}%
  </Badge>
);

interface Props {
  banAddress?: Address;
  rawAddress: string[];
  onSelectAddress: (address?: AddressSearchResult) => void;
  errorMessage?: string;
}

const OwnerAddressEdition = ({
  banAddress,
  rawAddress,
  onSelectAddress,
  errorMessage,
}: Props) => {
  const [searchAddressFromLovac, setSearchAddressFromLovac] = useState(false);
  const [previousAddress, setPreviousAddress] = useState<Address | undefined>();

  return (
    <>
      {searchAddressFromLovac ? (
        <>
          {previousAddress && (
            <div className="fr-p-2w fr-mb-2w bg-bf975">
              <Text size="md" className="fr-mb-2w">
                Adresse précédente :
              </Text>
              <Text size="md" className="fr-mb-2w weight-900">
                {addressToString(previousAddress)}
              </Text>
              <div className="align-right">
                <Button
                  children="Appliquer"
                  priority="secondary"
                  onClick={() => {
                    setSearchAddressFromLovac(false);
                    onSelectAddress({
                      ...previousAddress,
                      label: addressToString(banAddress, false)!,
                    });
                  }}
                />
              </div>
            </div>
          )}
          <AppAddressSearchBar
            initialQuery={rawAddress.join(' ')}
            initialSearch
            onSelectAddress={onSelectAddress}
          />
          {errorMessage && (
            <p className="fr-error-text fr-m-2w">{errorMessage}</p>
          )}
        </>
      ) : (
        <>
          <div>
            <AppAddressSearchBar
              initialQuery={
                banAddress ? addressToString(banAddress, false) : undefined
              }
              onSelectAddress={onSelectAddress}
            />
            {errorMessage && (
              <p className="fr-error-text fr-m-2w">{errorMessage}</p>
            )}
          </div>
          {banAddress && !isBanEligible(banAddress) && (
            <div className="fr-mt-3w fr-p-2w bg-bf975">
              <Text size="md" className="color-info-425 weight-900">
                Amélioration possible
              </Text>
              <Text size="md" className="fr-mb-2w">
                L'adresse issue de la <u>Base Adresse Nationale</u>, indiquée
                dans le champ Adresse ci-dessus, semble différente de l’adresse
                issue de la <u>DGFIP</u> : <b>{rawAddress.join(' ')}</b>
              </Text>
              <Text size="md" className="fr-mb-2w">
                Modifier le champ Adresse à partir de l’adresse DGFIP ?
              </Text>
              <ButtonsGroup
                buttons={[
                  {
                    children: 'Oui',
                    priority: 'secondary',
                    onClick: () => {
                      setSearchAddressFromLovac(true);
                      setPreviousAddress(banAddress);
                      onSelectAddress(undefined);
                    },
                  },
                  {
                    children: 'Non',
                    priority: 'secondary',
                    onClick: () =>
                      onSelectAddress({
                        ...banAddress,
                        label: addressToString(banAddress, false)!,
                        score: 1,
                      }),
                  },
                ]}
                alignment="left"
                inlineLayoutWhen="sm and up"
              ></ButtonsGroup>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default OwnerAddressEdition;
