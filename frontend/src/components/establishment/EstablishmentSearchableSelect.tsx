import { fr } from '@codegouvfr/react-dsfr';
import {
  type AutocompleteProps,
  type AutocompleteValue
} from '@mui/material/Autocomplete';

import type { EstablishmentDTO } from '@zerologementvacant/models';
import { type ReactNode } from 'react';
import { useLazyFindEstablishmentsQuery } from '../../services/establishment.service';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';

type Props<Multiple extends boolean, DisableClearable extends boolean> = Pick<
  AutocompleteProps<EstablishmentDTO, Multiple, DisableClearable, false>,
  'disableClearable' | 'multiple'
> & {
  className?: string;
  label?: ReactNode;
  /** Pre-defined options to use instead of API search. When provided, no API call is made. */
  options?: ReadonlyArray<EstablishmentDTO>;
  value: AutocompleteValue<EstablishmentDTO, Multiple, DisableClearable, false>;
  onChange(
    establishment: AutocompleteValue<
      EstablishmentDTO,
      Multiple,
      DisableClearable,
      false
    >
  ): void;
};

function EstablishmentSearchableSelect<
  Multiple extends boolean = false,
  DisableClearable extends boolean = false
>(props: Props<Multiple, DisableClearable>) {
  const [findEstablishments, { data: establishments, isFetching }] =
    useLazyFindEstablishmentsQuery();

  // Use pre-defined options if provided, otherwise use API search results
  const hasPreDefinedOptions = props.options !== undefined;
  const options = hasPreDefinedOptions
    ? props.options
    : ((establishments ?? []) as unknown as ReadonlyArray<EstablishmentDTO>);

  async function search(query: string | undefined): Promise<void> {
    // Skip API search if we have pre-defined options
    if (hasPreDefinedOptions) {
      return;
    }
    if (query) {
      await findEstablishments({ query }).unwrap();
    }
  }

  return (
    <SearchableSelectNext
      className={props.className}
      disableClearable={props.disableClearable}
      debounce={hasPreDefinedOptions ? 0 : 250}
      search={search}
      options={options}
      loading={hasPreDefinedOptions ? false : isFetching}
      label={props.label ?? null}
      getOptionKey={(option) => option.id}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={props.value}
      onChange={props.onChange}
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
