import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import {
  Autocomplete,
  AutocompleteProps,
  ChipTypeMap,
  ListItem,
  ListItemText,
  Checkbox,
  AutocompleteValue,
  AutocompleteChangeReason
} from '@mui/material';
import { MarkOptional } from 'ts-essentials';
import { ElementType, useEffect, useState } from 'react';
import { useDebounce } from 'react-use';

interface Option {
  label: string;
  value: string;
  parent?: string;
  icon?: string;
}

interface Props<
  Value,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends ElementType = ChipTypeMap['defaultComponent']
> {
  autocompleteProps?: MarkOptional<
    AutocompleteProps<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>,
    'renderInput'
  >;
  className?: string;
  multiple?: Multiple;
  debounce?: number;
  inputProps?: MarkOptional<InputProps.RegularInput, 'label'>;
  search?(query: string | undefined): Promise<void>;
}

function SearchableSelectNext<
  Value extends Option,
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false,
  ChipComponent extends ElementType = ChipTypeMap['defaultComponent']
>(props: Props<Value, Multiple, DisableClearable, FreeSolo, ChipComponent>) {
  const isMultiple: boolean = props.autocompleteProps?.multiple ?? false;

  const [selectedValues, setSelectedValues] = useState<Option[]>(
    (props.autocompleteProps?.value as Option[]) ?? []
  );
  const [inputChange, setInputChange] = useState('');

  useEffect(() => {
    setSelectedValues((props.autocompleteProps?.value as Option[]) ?? []);
  }, [props.autocompleteProps?.value]);

  async function search(query: string | undefined): Promise<void> {
    if (query) {
      props.search?.(query).catch(console.error);
    }
  }

  useDebounce(() => {
    search(inputChange);
  }, props.debounce ?? 0, [inputChange]);

  const handleChange = (
    event: React.SyntheticEvent,
    newValue: AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>,
  ) => {
    let updatedSelection = Array.isArray(newValue) ? [...newValue] : [];

    const target = event.currentTarget as HTMLElement;
    const clickedValue = target.getAttribute("data-value");

    if (!clickedValue) return;

    const clickedItem = props.autocompleteProps?.options?.find(
      (opt) => (opt as Option).value === clickedValue
    );

    if (!clickedItem) return;

    if (!clickedItem.parent) {
      const children = props.autocompleteProps?.options?.filter(
        (opt) => (opt as Option).parent === clickedItem.value
      );

      if (!updatedSelection.some((o) => o.value === clickedItem.value)) {
        updatedSelection.push(clickedItem);
        children?.forEach((child) => {
          if (!updatedSelection.some((o) => (o as Option).value === (child as Option).value)) {
            updatedSelection.push((child as Option));
          }
        });
      } else {
        updatedSelection = updatedSelection.filter(
          (o) => (o as Option).value !== clickedItem.value && !(children?.some((child) => (child as Option).value === (o as Option).value) ?? false)
        );
      }
    } else {
      if (updatedSelection.some((o) => o.value === clickedItem.value)) {
        updatedSelection = updatedSelection.filter((o) => o.value !== clickedItem.value);
      } else {
        updatedSelection.push(clickedItem);
      }

      const parent = props.autocompleteProps?.options?.find((opt) => (opt as Option).value === clickedItem.parent);
      if (parent) {
        const allChildren = props.autocompleteProps?.options?.filter((opt) => (opt as Option).parent === clickedItem.parent);
        const allChildrenSelected = allChildren?.every((child) =>
          updatedSelection.some((o) => o.value === (child as Option).value)
        );

        if (allChildrenSelected) {
          if (!updatedSelection.some((o) => o.value === parent.value)) {
            updatedSelection.push(parent);
          }
        } else {
          const parentIndex = updatedSelection.findIndex((o) => o.value === parent.value);
          if (parentIndex !== -1) {
            updatedSelection.splice(parentIndex, 1);
          }
        }
      }
    }

    props.autocompleteProps?.onChange?.(event, updatedSelection as AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>, 'select-option' as AutocompleteChangeReason);
    setSelectedValues(updatedSelection);
  };

  return (
    <Autocomplete
      className={props.className}
      multiple={isMultiple as Multiple}
      options={(props.autocompleteProps?.options as unknown as Value[]) ?? []}
      getOptionLabel={(option) => (option as Option).label}
      value={selectedValues as unknown as AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>}
      isOptionEqualToValue={(option, value) => (option as Option).value === (value as Option).value}
      loadingText="Chargement..."
      noOptionsText="Aucune option"
      onChange={(event, value) => handleChange(event, value as AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>)}
      onInputChange={(event, query, reason) => {
        setInputChange(query);
        props.autocompleteProps?.onInputChange?.(event, query, reason);
      }}
      renderOption={(props, option) => {
        const isSelected = selectedValues.some((o) => (o as Option).value === (option as Option).value);
        const isParent = !(option as Option).parent;
        return (
          <ListItem
            {...props}
            data-value={(option as Option).value}
            onClick={(event) => {
              event.preventDefault();
              handleChange(event, selectedValues as AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>);
            }}
          >
            <>
              {isParent ? (
                <>
                  <Checkbox disableRipple size="small" checked={isSelected} />
                  <span style={{display: 'flex', alignItems: 'center'}} className={`fr-mr-1w fr-icon-1x ${(option as Option).icon}}`}></span>
                </>
              ) : (
                <Checkbox disableRipple size="small" checked={isSelected} />
              )}
            </>
            <ListItemText primary={isParent ? <strong className='fr-text--sm'>{(option as Option).label}</strong> : <span className='fr-text--sm'>{(option as Option).label}</span>} />
          </ListItem>
        );
      }}
      renderInput={(params) => (
        <Input
          {...props.inputProps}
          nativeInputProps={{
            ...props.inputProps?.nativeInputProps,
            ...params.inputProps,
            type: 'search'
          }}
          ref={params.InputProps.ref}
        />
      )}
      {...props.autocompleteProps}
    />
  );
}

export default SearchableSelectNext;
