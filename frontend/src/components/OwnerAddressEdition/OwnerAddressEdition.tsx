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

  return (
    <>
      {searchAddressFromLovac ? (
        <>
          {banAddress && (
            <div className="fr-p-2w fr-mb-2w bg-bf975">
              <Text size="md" className="fr-mb-2w">
                Adresse précédente :
              </Text>
              <Text size="md" className="fr-mb-2w weight-900">
                {addressToString(banAddress)}
              </Text>
              <div className="align-right">
                <Button
                  children="Appliquer"
                  priority="secondary"
                  onClick={() => {
                    setSearchAddressFromLovac(false);
                    onSelectAddress({
                      ...banAddress,
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
              <Text size="md" className="fr-mb-2w">
                L'adresse de la Base Adresse Nationale ci-dessus semble
                différente de l'adresse LOVAC ci-dessous trouvée pour ce
                logement :
              </Text>
              <Text size="md" className="fr-mb-2w weight-900">
                {rawAddress.join(' ')}
              </Text>
              <Text size="md" className="fr-mb-0">
                Source : LOVAC
                <span className="fr-ml-4w">
                  Taux de correspondance : 
                  <ScoreBadge banAddress={banAddress} />
                </span>
              </Text>
              <ButtonsGroup
                buttons={[
                  {
                    children: 'Appliquer',
                    priority: 'secondary',
                    onClick: () => {
                      setSearchAddressFromLovac(true);
                    },
                  },
                  {
                    children: 'Ignorer',
                    priority: 'secondary',
                    onClick: () =>
                      onSelectAddress({
                        ...banAddress,
                        label: addressToString(banAddress, false)!,
                        score: 1,
                      }),
                  },
                ]}
                alignment="right"
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
