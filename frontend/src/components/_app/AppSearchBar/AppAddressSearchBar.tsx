import React from 'react';
import addressService, {
  AddressSearchResult,
} from '../../../services/address.service';
import AppSearchBar, { SearchResult } from './AppSearchBar';
import AppLink from '../AppLink/AppLink';

interface Props {
  label?: string;
  initialQuery?: string;
  initialSearch?: boolean;
  onSelectAddress(addressSearchResult?: AddressSearchResult): void;
}

const AppAddressSearchBar = ({
  initialQuery,
  initialSearch,
  onSelectAddress,
}: Props) => {
  const quickSearch = async (query: string): Promise<SearchResult[] | void> => {
    if (query.length > 2) {
      try {
        const _ = await addressService.quickSearch(query);
        return _.filter((address) => (address.score ?? 0) >= 0.8).map(
          (address) => ({
            title: address.label,
            onclick: () => {
              onSelectAddress(address);
            },
          })
        );
      } catch (err) {
        console.log('error', err);
      }
    }
  };

  return (
    <>
      <label className="fr-label fr-mb-1w">
        Adresse (source : 
        <AppLink
          to="https://adresse.data.gouv.fr/base-adresse-nationale#4.4/46.9/1.7"
          target="_blank"
        >
          Base Adresse Nationale
        </AppLink>
        )
      </label>
      <AppSearchBar
        onSearch={quickSearch}
        onKeySearch={quickSearch}
        placeholder="Rechercher une adresse"
        initialQuery={initialQuery}
        initialSearch={initialSearch}
      ></AppSearchBar>
    </>
  );
};

export default AppAddressSearchBar;
