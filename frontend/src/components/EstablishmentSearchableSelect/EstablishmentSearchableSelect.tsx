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
      await findEstablishments({ query }).unwrap();
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
          typeof option === 'string' ? option : (option as unknown as EstablishmentDTO).id,
        getOptionLabel: (option) =>
          typeof option === 'string' ? option : (option as unknown as EstablishmentDTO).name,
        isOptionEqualToValue: (option, value) => (option as unknown as EstablishmentDTO).id === (value as unknown as EstablishmentDTO).id,
        options: (establishments ?? []).map(establishment => ({
          label: establishment.name,
          value: establishment.id,
          ...establishment
        })),
        loading: isFetching,
        openOnFocus: true,
        value: value ? { label: value.name, value: value.id, ...value } : null,
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
