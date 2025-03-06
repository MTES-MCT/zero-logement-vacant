import { fr } from '@codegouvfr/react-dsfr';

import { EstablishmentDTO } from '@zerologementvacant/models';
import { useState } from 'react';
import { match, Pattern } from 'ts-pattern';
import { useLazyFindEstablishmentsQuery } from '../../services/establishment.service';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';

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
      options={establishments ?? []}
      loading={isFetching}
      label={null}
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={value}
      onChange={(establishment) => {
        match(establishment)
          .with(Pattern.string, () => {})
          .otherwise((establishment) => {
            onChange?.(establishment);
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
