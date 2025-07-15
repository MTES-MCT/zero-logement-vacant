import { fr } from '@codegouvfr/react-dsfr';
import {
  AutocompleteProps,
  AutocompleteValue
} from '@mui/material/Autocomplete';

import { EstablishmentDTO } from '@zerologementvacant/models';
import { ReactNode } from 'react';
import { useLazyFindEstablishmentsQuery } from '../../services/establishment.service';
import SearchableSelectNext from '../SearchableSelectNext/SearchableSelectNext';

type Props<Multiple extends boolean, DisableClearable extends boolean> = Pick<
  AutocompleteProps<EstablishmentDTO, Multiple, DisableClearable, false>,
  'disableClearable' | 'multiple'
> & {
  className?: string;
  label?: ReactNode;
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

  const options = (establishments ??
    []) as unknown as ReadonlyArray<EstablishmentDTO>;

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
      options={options}
      loading={isFetching}
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
