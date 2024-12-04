import { useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import { EstablishmentDTO } from '@zerologementvacant/models';
import { useLazyFindEstablishmentsQuery } from '../../services/establishment.service';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';
import { fr } from '@codegouvfr/react-dsfr';

interface Props {
  className?: string;
  value?: EstablishmentDTO | null;
  onChange?(establishment: EstablishmentDTO | null): void;
}

function EstablishmentSearchableSelect(props: Props) {
  const [internalValue, setInternalValue] = useState<EstablishmentDTO | null>(
    null
  );
  const [value, onChange] =
    props.value !== undefined
      ? [props.value, props.onChange]
      : [internalValue, setInternalValue];

  const [findEstablishments, { data: establishments, isFetching }] =
    useLazyFindEstablishmentsQuery();

  async function search(query: string | undefined): Promise<void> {
    if (query) {
      await findEstablishments({ query, available: true }).unwrap();
    }
  }

  return (
    <SearchableSelectNext
      className={props.className}
      debounce={250}
      search={search}
      autocompleteProps={{
        autoHighlight: true,
        clearIcon: null,
        freeSolo: true,
        getOptionKey: (option) =>
          typeof option === 'string' ? option : option.id,
        getOptionLabel: (option) =>
          typeof option === 'string' ? option : option.name,
        isOptionEqualToValue: (option, value) => option.id === value.id,
        options: establishments ?? [],
        loading: isFetching,
        openOnFocus: true,
        value: value,
        onChange: (_, establishment) => {
          match(establishment)
            .with(Pattern.string, () => {})
            .otherwise((establishment) => {
              onChange?.(establishment);
            });
        }
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
