import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import { Autocomplete, AutocompleteProps, ChipTypeMap } from '@mui/material';
import { MarkOptional } from 'ts-essentials';
import { ElementType, useState } from 'react';
import { useDebounce } from 'react-use';

interface Props<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends ElementType = ChipTypeMap['defaultComponent']
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
  className?: string;
  /**
   * Debounce calls to {@link search} (in milliseconds).
   */
  debounce?: number;
  inputProps?: MarkOptional<InputProps.RegularInput, 'label'>;
  search(query: string | undefined): Promise<void>;
}

function SearchableSelectNext<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends ElementType = ChipTypeMap['defaultComponent']
>(props: Props<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>) {
  async function search(query: string | undefined): Promise<void> {
    if (query) {
      props.search(query).catch(console.error);
    }
  }

  const [inputChange, setInputChange] = useState('');

  useDebounce(
    () => {
      search(inputChange);
    },
    props.debounce ?? 0,
    [inputChange]
  );

  return (
    <Autocomplete
      className={props.className}
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
      inputValue={inputChange}
      onInputChange={(event, query, reason) => {
        setInputChange(query);
        props.autocompleteProps?.onInputChange?.(event, query, reason);
      }}
      {...props.autocompleteProps}
    />
  );
}

export default SearchableSelectNext;
