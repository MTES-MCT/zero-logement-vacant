import Input from '@codegouvfr/react-dsfr/Input';
import Autocomplete from '@mui/material/Autocomplete';
import { useState } from 'react';
import { useDebounce } from 'react-use';
import { match, Pattern } from 'ts-pattern';

import { EstablishmentDTO } from '@zerologementvacant/models';
import { useLazyFindEstablishmentsQuery } from '../../services/establishment.service';

interface Props {
  className?: string;
  value?: string;
  // onChange?(establishment: EstablishmentDTO | null): void;
  onChange(establishmentId?: string): void;
  initialEstablishmentOption?: { value: string; label: string };
}

function EstablishmentSearchableSelect(props: Props) {
  const debounce = 300;

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<EstablishmentDTO | null>(null);
  const [query, setQuery] = useState('');

  const [findEstablishments, { data: establishments, isFetching }] =
    useLazyFindEstablishmentsQuery();

  async function search(query: string | undefined): Promise<void> {
    if (query) {
      await findEstablishments({ query, available: true }).unwrap();
    }
  }

  useDebounce(
    () => {
      if (open) {
        search(query).catch(console.error);
      }
    },
    debounce,
    [query, open]
  );

  return (
    <Autocomplete
      autoHighlight
      className={props.className}
      freeSolo
      filterOptions={(_) => _}
      getOptionKey={(option) =>
        typeof option === 'string' ? option : option.id
      }
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option.name
      }
      isOptionEqualToValue={(option, value) => option.id === value.id}
      options={establishments ?? []}
      loading={isFetching}
      clearText="Supprimer"
      closeText="Fermer"
      loadingText="Chargement..."
      noOptionsText="Aucune option."
      openText="Ouvrir"
      renderInput={(params) => (
        <Input
          nativeInputProps={{
            placeholder: 'Rechercher un établissement',
            ...params.inputProps,
            // Non-customizable props
            type: 'search'
          }}
          ref={params.InputProps.ref}
        />
      )}
      openOnFocus
      open={open}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => setOpen(false)}
      inputValue={query}
      onInputChange={(_, query) => {
        setQuery(query);
      }}
      value={value}
      onChange={(_, establishment) => {
        match(establishment)
          .with(Pattern.string, () => {})
          .otherwise((establishment) => {
            setValue(establishment);
          });
      }}
    />
  );
}

export default EstablishmentSearchableSelect;
