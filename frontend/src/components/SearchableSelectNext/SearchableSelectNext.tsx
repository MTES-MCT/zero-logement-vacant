import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import { Autocomplete, AutocompleteProps, ChipTypeMap } from '@mui/material';
import { AsyncOrSync, MarkOptional } from 'ts-essentials';
import * as React from 'react';

interface Props<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends React.ElementType = ChipTypeMap['defaultComponent']
> {
  autocompleteProps?: MarkOptional<
    AutocompleteProps<
      Value,
      Multiple,
      DisableClearable,
      FreeSolo,
      ChipComponent
    >,
    'renderInput'
  >;
  /**
   * Debounce calls to {@link search} (in milliseconds).
   */
  debounce?: number;
  isFetching?: boolean;
  inputProps?: MarkOptional<InputProps.RegularInput, 'label'>;
  search(query: string | undefined): Promise<void>;
}

function SearchableSelectNext<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends React.ElementType = ChipTypeMap['defaultComponent']
>(props: Props<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>) {
  function search(query: string | undefined): AsyncOrSync<void> {
    if (query) {
      props.search(query).catch(console.error);
    }
  }

  return (
    <Autocomplete
      options={props.autocompleteProps?.options ?? []}
      clearText="Supprimer"
      closeText="Fermer"
      loadingText="Chargement..."
      noOptionsText="Aucune option."
      openText="Ouvrir"
      renderInput={(params) => (
        <Input
          nativeInputProps={{
            placeholder: 'Rechercher un établissement',
            ...props.inputProps?.nativeInputProps,
            ...params.inputProps,
            // Non-customizable props
            type: 'search'
          }}
          ref={params.InputProps.ref}
          {...props.inputProps}
        />
      )}
      {...props.autocompleteProps}
      onInputChange={(event, query, reason) => {
        search(query);
        props.autocompleteProps?.onInputChange?.(event, query, reason);
      }}
    />
  );
}

export default SearchableSelectNext;
