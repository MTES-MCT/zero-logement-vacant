import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import Autocomplete from '@mui/material/Autocomplete';
import { useState } from 'react';
import { useDebounce, useList } from 'react-use';

import addressService, {
  AddressSearchResult
} from '../../services/address.service';

interface Props extends InputProps.RegularInput {
  debounce?: number;
}

function AddressSearchableSelectNext(props?: Props) {
  const debounce = props?.debounce ?? 300;

  const [options, { set: setOptions }] = useList<AddressSearchResult>([]);
  const [value, setValue] = useState<AddressSearchResult>();
  const [inputValue, setInputValue] = useState('');

  async function search(query: string): Promise<void> {
    if (query.length >= 3) {
      const addresses = await addressService.quickSearch(query);
      setOptions(addresses);
    }
  }

  useDebounce(() => search(inputValue), debounce, [inputValue]);

  return (
    <Autocomplete
      filterOptions={(x) => x}
      options={options}
      inputValue={inputValue}
      value={value}
      clearText="Supprimer"
      closeText="Fermer"
      loadingText="Chargement..."
      noOptionsText="Aucune option"
      openText="Ouvrir"
      onChange={(_, value) => {
        setValue(value ?? undefined);
      }}
      onInputChange={(_, query) => {
        setInputValue(query);
      }}
      renderInput={(params) => (
        <Input
          label="Rechercher"
          textArea={false}
          ref={params.InputProps.ref}
          disabled={params.disabled}
          nativeInputProps={{ type: 'search', ...params.inputProps }}
          state={props?.state}
          stateRelatedMessage={props?.stateRelatedMessage}
        />
      )}
    />
  );
}

export default AddressSearchableSelectNext;
