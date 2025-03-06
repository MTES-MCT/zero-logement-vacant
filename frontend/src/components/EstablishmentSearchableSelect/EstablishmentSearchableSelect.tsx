import { fr } from '@codegouvfr/react-dsfr';
import { AutocompleteValue } from '@mui/material/Autocomplete';

import { EstablishmentDTO } from '@zerologementvacant/models';
import { ReactNode } from 'react';
import { match, Pattern } from 'ts-pattern';
import { useLazyFindEstablishmentsQuery } from '../../services/establishment.service';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';

interface Props<DisableClearable extends boolean> {
  className?: string;
  disableClearable?: DisableClearable;
  label?: ReactNode;
  value: AutocompleteValue<EstablishmentDTO, false, DisableClearable, false>;
  onChange(
    establishment: AutocompleteValue<
      EstablishmentDTO,
      false,
      DisableClearable,
      false
    >
  ): void;
}

function EstablishmentSearchableSelect<
  DisableClearable extends boolean = false
>(props: Props<DisableClearable>) {
  const [findEstablishments, { data, isFetching }] =
    useLazyFindEstablishmentsQuery();
  const establishments = data ?? [];

  async function search(query: string | undefined): Promise<void> {
    if (query) {
      await findEstablishments({ query }).unwrap();
    }
  }

  return (
    <SearchableSelectNext
      className={props.className}
      disableClearable={props.disableClearable}
      debounce={250}
      search={search}
      options={establishments}
      loading={isFetching}
      label={props.label ?? null}
      getOptionKey={(option) =>
        typeof option === 'string' ? option : option.id
      }
      getOptionLabel={(option) =>
        typeof option === 'string' ? option : option.name
      }
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={props.value}
      onChange={(establishment) => {
        match(establishment)
          .with(Pattern.string, () => {})
          .otherwise((establishment) => {
            props.onChange(establishment);
          });
      }}
      autocompleteProps={{
        autoHighlight: true,
        openOnFocus: true
      }}
      inputProps={{
        classes: {
          nativeInputOrTextArea: fr.cx('fr-my-0')
        }
      }}
    />
  );
}

export default EstablishmentSearchableSelect;
