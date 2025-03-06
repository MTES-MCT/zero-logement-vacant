import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import {
  Autocomplete,
  AutocompleteProps,
  ChipTypeMap,
  MenuItem,
  Typography
} from '@mui/material';
import classNames from 'classnames';
import { ElementType, useState } from 'react';
import { useDebounce } from 'react-use';
import { MarkOptional } from 'ts-essentials';
import { match, Pattern } from 'ts-pattern';

import styles from './searchable-select.module.scss';

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
  search?(query: string | undefined): Promise<void>;
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
      props.search?.(query).catch(console.error);
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

  const disabled: boolean = props.autocompleteProps?.disabled ?? false;

  // Use the placeholder text to display the number of selected options
  const placeholder: string | undefined = disabled
    ? undefined
    : Array.isArray(props.autocompleteProps?.value)
      ? match(props.autocompleteProps.value.length)
          .with(1, () => '1 option sélectionnée')
          .with(
            Pattern.number.int().gte(2),
            (nb) => `${nb} options sélectionnées`
          )
          .otherwise(() => props.inputProps?.nativeInputProps?.placeholder)
      : props.inputProps?.nativeInputProps?.placeholder;

  const hasSelected =
    Array.isArray(props.autocompleteProps?.value) &&
    props.autocompleteProps.value.length > 0;

  return (
    <Autocomplete
      {...props.autocompleteProps}
      className={props.className}
      options={props.autocompleteProps?.options ?? []}
      disabled={disabled}
      disableCloseOnSelect
      clearText="Supprimer"
      closeText="Fermer"
      loadingText="Chargement..."
      noOptionsText="Aucune option"
      openText="Ouvrir"
      slotProps={{
        popper: {
          // Prevents the listbox from going above the input
          // in case there is not enough space below it
          modifiers: [
            { name: 'flip', enabled: false },
            { name: 'preventOverflow', enabled: false }
          ]
        }
      }}
      renderInput={(params) => (
        <Input
          {...props.inputProps}
          classes={{
            nativeInputOrTextArea: classNames({
              [styles.activePlaceholder]: hasSelected
            })
          }}
          disabled={disabled}
          nativeInputProps={{
            ...props.inputProps?.nativeInputProps,
            ...params.inputProps,
            // Non-customizable props
            placeholder: placeholder,
            disabled: disabled,
            type: 'search'
          }}
          ref={params.InputProps.ref}
        />
      )}
      renderOption={({ key, ...props }, option, state, ownerState) => (
        <MenuItem
          {...props}
          dense
          disableRipple
          key={key}
          onClick={(event) => {
            event.preventDefault();
            // eslint-disable-next-line react/prop-types
            props.onClick?.(event);
          }}
        >
          {!ownerState.multiple ? (
            ownerState.getOptionLabel(option)
          ) : (
            <Checkbox
              classes={{
                root: fr.cx('fr-mb-0'),
                inputGroup: fr.cx('fr-mt-0')
              }}
              options={[
                {
                  label: (
                    <Typography sx={{ mt: '0.125rem' }} variant="body2">
                      {ownerState.getOptionLabel(option)}
                    </Typography>
                  ),
                  nativeInputProps: {
                    checked: state.selected,
                    readOnly: true
                  }
                }
              ]}
              orientation="vertical"
              small
            />
          )}
        </MenuItem>
      )}
      renderTags={(values: ReadonlyArray<Value>) => {
        return match(values.length)
          .with(1, () => '1 option sélectionnée')
          .with(
            Pattern.number.int().gte(2),
            (nb) => `${nb} options sélectionnées`
          )
          .otherwise(() => '');
      }}
      inputValue={inputChange}
      onInputChange={(event, query, reason) => {
        setInputChange(query);
        props.autocompleteProps?.onInputChange?.(event, query, reason);
      }}
    />
  );
}

export default SearchableSelectNext;
