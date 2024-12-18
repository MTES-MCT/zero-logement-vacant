import { fr } from '@codegouvfr/react-dsfr';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import {
  Autocomplete,
  AutocompleteProps,
  AutocompleteValue,
  ChipTypeMap,
  MenuItem,
  Typography
} from '@mui/material';
import classNames from 'classnames';
import { List } from 'immutable';
import { ChangeEvent, ElementType, Fragment, ReactNode, useState } from 'react';
import { useDebounce } from 'react-use';
import { match, Pattern } from 'ts-pattern';

import styles from './searchable-select.module.scss';

export type SearchableSelectNextProps<
  Value,
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends ElementType = ChipTypeMap['defaultComponent']
> = Pick<
  AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>,
  | 'disabled'
  | 'disableClearable'
  | 'freeSolo'
  | 'loading'
  | 'multiple'
  | 'options'
  | 'getOptionKey'
  | 'getOptionLabel'
  | 'groupBy'
  | 'value'
> &
  Pick<InputProps.RegularInput, 'label' | 'hintText'> & {
    className?: string;
    /**
     * Debounce calls to {@link search} (in milliseconds).
     */
    debounce?: number;
    search?(query: string | undefined): Promise<void>;
    placeholder?: string;

    // Custom autocomplete functions
    isOptionEqualToValue(option: Value, value: Value): boolean;
    renderGroup?(group: string): ReactNode;
    onChange(
      value: AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>
    ): void;

    /**
     * Pass props through to the Autocomplete component.
     * Prefer using the top-level values when possible.
     */
    autocompleteProps?: Partial<
      AutocompleteProps<
        Value,
        Multiple,
        DisableClearable,
        FreeSolo,
        ChipComponent
      >
    >;

    /**
     * Pass props through to the Input component.
     * Prefer using the top-level values when possible.
     */
    inputProps?: Partial<InputProps.RegularInput>;
  };

function SearchableSelectNext<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends ElementType = ChipTypeMap['defaultComponent']
>(
  props: SearchableSelectNextProps<
    Value,
    Multiple,
    DisableClearable,
    FreeSolo,
    ChipComponent
  >
) {
  async function search(query: string | undefined): Promise<void> {
    if (query) {
      props.search?.(query).catch(console.error);
    }
  }

  const value = props.value;
  const [inputChange, setInputChange] = useState('');

  useDebounce(
    () => {
      search(inputChange);
    },
    props.debounce ?? 0,
    [inputChange]
  );

  const disabled: boolean = props.disabled ?? false;

  // Use the placeholder text to display the number of selected options
  const placeholder: string | undefined = disabled
    ? undefined
    : Array.isArray(value)
      ? match(value.length)
          .with(1, () => '1 option sélectionnée')
          .with(
            Pattern.number.int().gte(2),
            (nb) => `${nb} options sélectionnées`
          )
          .otherwise(() => props.placeholder)
      : props.placeholder;

  const hasSelected = Array.isArray(value) && value.length > 0;
  const multiple = props.multiple;

  const groups =
    multiple && props.groupBy
      ? List(props.options).groupBy(props.groupBy)
      : null;

  function isGroupSelected(group: string): boolean {
    if (!Array.isArray(value)) {
      return false;
    }

    const options = groups?.get(group) ?? List();
    return options.every((option) =>
      value.some((v) => props.isOptionEqualToValue?.(option, v))
    );
  }

  function onGroupClick(group: string): void {
    if (multiple) {
      if (isGroupSelected(group)) {
        const groupOptions = groups?.get(group);
        const values: Value[] = (value as Value[]).filter((value) => {
          return !groupOptions?.some((option) =>
            props.isOptionEqualToValue(option, value)
          );
        });
        return props.onChange(
          values as AutocompleteValue<
            Value,
            Multiple,
            DisableClearable,
            FreeSolo
          >
        );
      }

      const groupOptions = groups?.get(group) ?? List();
      const values: Value[] =
        (value as Value[])
          .filter(
            (value) =>
              !groupOptions?.some((option) =>
                props.isOptionEqualToValue(option, value)
              )
          )
          .concat(groupOptions.toArray()) ?? [];
      return props.onChange(
        values as AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>
      );
    }
  }

  function renderGroup(group: string): ReactNode {
    return props.renderGroup?.(group) ?? group;
  }

  const onChange: AutocompleteProps<
    Value,
    Multiple,
    DisableClearable,
    FreeSolo,
    ChipComponent
  >['onChange'] = (_, value) => {
    props.onChange(value);
  };

  function noop(event: ChangeEvent): void {
    event.stopPropagation();
    event.preventDefault();
  }

  return (
    <Autocomplete
      {...props.autocompleteProps}
      multiple={props.multiple}
      className={props.className}
      options={props.options ?? []}
      disabled={disabled}
      disableCloseOnSelect={multiple}
      clearText="Supprimer"
      closeText="Fermer"
      loadingText="Chargement..."
      noOptionsText="Aucune option"
      openText="Ouvrir"
      getOptionKey={props.getOptionKey}
      getOptionLabel={props.getOptionLabel}
      isOptionEqualToValue={props.isOptionEqualToValue}
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
          label={props.inputProps?.label ?? null}
          {...props.inputProps}
          classes={{
            nativeInputOrTextArea: classNames({
              [styles.activePlaceholder]: hasSelected
            })
          }}
          disabled={disabled}
          label={props.label ?? props.inputProps?.label}
          hintText={props.hintText ?? props.inputProps?.hintText}
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
          sx={{
            whiteSpace: 'normal',
            wordBreak: 'break-word'
          }}
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
      groupBy={props.groupBy}
      renderGroup={({ key, group, children }) => {
        if (!group) {
          return children;
        }

        return (
          <Fragment key={key}>
            <MenuItem
              dense
              disableRipple
              selected={isGroupSelected(group)}
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                backgroundColor:
                  fr.colors.decisions.background.default.grey.default,
                whiteSpace: 'normal',
                wordBreak: 'break-word'
              }}
              onClick={() => {
                onGroupClick(group);
              }}
            >
              <Checkbox
                classes={{
                  root: fr.cx('fr-mb-0'),
                  inputGroup: fr.cx('fr-mt-0')
                }}
                options={[
                  {
                    label: renderGroup(group),
                    nativeInputProps: {
                      checked: isGroupSelected(group),
                      onClick: noop,
                      onChange: noop
                    }
                  }
                ]}
                orientation="vertical"
                small
              />
            </MenuItem>
            {children}
          </Fragment>
        );
      }}
      renderTags={(values: ReadonlyArray<Value>) => {
        return match(values.length)
          .with(1, () => '1 option sélectionnée')
          .with(
            Pattern.number.int().gte(2),
            (nb) => `${nb} options sélectionnées`
          )
          .otherwise(() => '');
      }}
      filterOptions={props.freeSolo ? (x) => x : undefined}
      inputValue={inputChange}
      onInputChange={(_, query) => {
        setInputChange(query);
      }}
      value={props.value}
      onChange={onChange}
    />
  );
}

export default SearchableSelectNext;
