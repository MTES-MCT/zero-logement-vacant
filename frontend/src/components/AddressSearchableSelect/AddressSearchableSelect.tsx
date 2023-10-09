import React, { useState } from 'react';
import { SearchableSelect } from '../_dsfr';
import addressService, {
  AddressSearchResult,
} from '../../services/address.service';
import {
  TrackEventActions,
  TrackEventCategories,
} from '../../models/TrackEvent';
import { useMatomo } from '@datapunt/matomo-tracker-react';

interface Props {
  onSelectAddress(addressSearchResult?: AddressSearchResult): void;
}

const AddressSearchableSelect = ({ onSelectAddress }: Props) => {
  const [addressOptions, setAddressOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const { trackEvent } = useMatomo();

  const onChange = (value?: string) => {
    if (value) {
      const addressSearchResult = JSON.parse(value);
      trackEvent({
        category: TrackEventCategories.Home,
        action: TrackEventActions.Home.SelectAddress,
        name: addressSearchResult.label,
      });
      onSelectAddress(addressSearchResult);
    }
  };

  const quickSearch = (query: string) => {
    if (query.length > 2) {
      return addressService
        .quickSearch(query)
        .then((_) => {
          setAddressOptions(
            _.map((address) => ({
              value: JSON.stringify(address),
              label: address.label,
            }))
          );
        })
        .catch((err) => console.log('error', err));
    } else {
      return setAddressOptions([]);
    }
  };

  return (
    <SearchableSelect
      options={addressOptions}
      label="Indiquer l'adresse de votre logement vacant (obligatoire)"
      placeholder="Indiquer l'adresse de votre logement vacant"
      required={true}
      onTextChange={(q: string) => quickSearch(q)}
      onChange={onChange}
    />
  );
};

export default AddressSearchableSelect;
