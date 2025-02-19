import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import {
  Autocomplete,
  AutocompleteProps,
  ChipTypeMap,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  AutocompleteValue
} from '@mui/material';
import { MarkOptional } from 'ts-essentials';
import { ElementType, useState } from 'react';
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
  multiple?: Multiple; // Optionnel, false par défaut
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
  const isMultiple: boolean = props.autocompleteProps?.multiple ?? false; // Défaut : false

  const [selectedValues, setSelectedValues] = useState<Option[]>(isMultiple ? [] : []);
  const [inputChange, setInputChange] = useState('');

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
    newValue: AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>
  ) => {
    let updatedSelection = Array.isArray(newValue) ? [...newValue] : [];

    const target = event.currentTarget as HTMLElement;
    const clickedValue = target.getAttribute("data-value");

    if (!clickedValue) return;

    const clickedItem = props.autocompleteProps?.options?.find(
      (opt) => (opt as Option).value === clickedValue
    ) as Option | undefined;

    if (!clickedItem) return;

    if (!((clickedItem as unknown) as Option).parent) {
      // ✅ Sélection d'un parent → Ajouter tous ses enfants
      const children = props.autocompleteProps?.options?.filter((opt) => (opt as Option).parent === clickedItem.value);
      if (!updatedSelection.some((o) => (o as Option).value === clickedItem.value)) {
        updatedSelection.push(clickedItem);
        children?.forEach((child) => {
          if (!updatedSelection.some((o) => (o as Option).value === (child as Option).value)) {
            updatedSelection.push(child);
          }
        });
      } else {
        // ❌ Désélection d'un parent → Retirer aussi tous ses enfants
        updatedSelection = updatedSelection.filter(
          (o) => (o as Option).value !== clickedItem.value && !children?.some((child) => (child as Option).value === (o as Option).value)
        );
      }
    } else {
      // ✅ Sélection ou désélection d'un enfant normalement
      if (updatedSelection.some((o) => (o as Option).value === clickedItem.value)) {
        updatedSelection = updatedSelection.filter((o) => (o as unknown as Option).value !== (clickedItem as unknown as Option).value);
      } else {
        updatedSelection.push(clickedItem);
      }

      // ❌ Vérifier si tous les enfants d'un parent sont supprimés → Retirer aussi le parent
      const parent = props.autocompleteProps?.options?.find((opt) => (opt as Option).value === (clickedItem as unknown as Option).parent);

      if (parent) {
        const hasChildrenSelected = updatedSelection.some((o) => (o as unknown as Option).parent === (clickedItem as unknown as Option).parent);
        if (!hasChildrenSelected) {
          updatedSelection = updatedSelection.filter((o) => (o as unknown as Option).value !== (parent as unknown as Option).value);
        }
      }
    }

    props.autocompleteProps?.onChange?.(event, updatedSelection as AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>, 'select-option');
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
      openText="Ouvrir"
      onChange={handleChange}
      onInputChange={(event, query, reason) => {
        setInputChange(query);
        props.autocompleteProps?.onInputChange?.(event, query, reason);
      }}
      renderOption={(props, option) => {
        const isSelected = selectedValues.some((o) => o.value === (option as Option).value);
        return (
          <ListItem
            {...props}
            data-value={(option as Option).value} // ✅ Permet d'identifier l'élément cliqué
            onClick={(event) => {
              event.preventDefault(); // ✅ Empêche la fermeture
              handleChange(event, selectedValues as AutocompleteValue<Value, Multiple, DisableClearable, FreeSolo>);
            }}
          >
            <ListItemIcon>
              {(option as Option).parent ? (
                <Checkbox className='color-bf113' checked={isSelected} /> // ✅ Case à cocher pour les enfants
              ) : (
                <>
                  <Checkbox className='color-bf113' checked={isSelected} /> {/* ✅ Case à cocher pour les parents */}
                  <span className={(option as Option).icon}></span> {/* ✅ Icône pour les parents */}
                </>
              )}
            </ListItemIcon>
            <ListItemText primary={!(option as Option).parent ? (<strong>{(option as Option).label}</strong>) : <>{(option as Option).label}</>} />
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
