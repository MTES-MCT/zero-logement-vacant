import { fr } from '@codegouvfr/react-dsfr';
import Input, { type InputProps } from '@codegouvfr/react-dsfr/Input';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Grid';
import { useDebounce, useList, usePreviousDistinct } from 'react-use';
import type { MarkOptional } from 'ts-essentials';
import type { Address } from '../../models/Address';

import addressService, {
  type AddressSearchResult
} from '../../services/address.service';

interface Props extends MarkOptional<InputProps.RegularInput, 'label'> {
  debounce?: number;
  value: Address | null;
  inputValue: string;
  open: boolean;
  onInputChange(value: string): void;
  onChange(value: Address | null): void;
  onOpen(): void;
  onClose(): void;
}

function AddressSearchableSelect(props: Props) {
  const debounce = props?.debounce ?? 300;
  const [options, { set: setOptions }] = useList<AddressSearchResult>([]);

  async function search(query: string | undefined): Promise<void> {
    if (query && query.trim().length >= 3) {
      const addresses = await addressService.quickSearch(query);
      setOptions(addresses);
    }
  }

  const previousInputValue = usePreviousDistinct(props.inputValue);
  useDebounce(
    () => {
      if (props.open && props.inputValue !== previousInputValue) {
        search(props.inputValue).catch(console.error);
      }
    },
    debounce,
    [props.inputValue, props.open, previousInputValue]
  );

  const value: AddressSearchResult | null = props.value?.banId
    ? {
        banId: props.value.banId,
        label: props.value.label,
        houseNumber: props.value.houseNumber,
        street: props.value.street,
        postalCode: props.value.postalCode,
        city: props.value.city,
        cityCode: props.value.cityCode ?? undefined,
        latitude: props.value.latitude ?? 0,
        longitude: props.value.longitude ?? 0,
        score: props.value.score ?? 0
      }
    : null;

  return (
    <Autocomplete
      className={props.className}
      disabled={props.disabled}
      // TODO: filter address options by type
      filterOptions={(options) => options}
      options={options}
      freeSolo
      isOptionEqualToValue={(option, value) => {
        return !!option.label && option.label === value.label;
      }}
      inputValue={props.inputValue}
      disablePortal={true}
      value={value}
      clearOnBlur
      openOnFocus
      clearText="Supprimer"
      closeText="Fermer"
      loadingText="Chargement..."
      noOptionsText="Aucune option"
      openText="Ouvrir"
      open={props.open}
      onOpen={props.onOpen}
      onClose={props.onClose}
      onChange={(_, value, reason) => {
        if (typeof value === 'string') {
          // User typed free text without selecting from the list
          // Invalidate the address to force re-selection
          if (reason === 'clear' || value === '') {
            props.onChange(null);
          }
          // If user is typing, we keep the current value until they select
          // But if they blur without selecting, clearOnBlur will clear
        } else {
          // User selected from the list or cleared
          props.onChange(value);
        }
      }}
      onInputChange={(_, query) => {
        props.onInputChange(query);
      }}
      renderInput={(params) => (
        <>
          <Input
            nativeLabelProps={{
              'aria-label': 'Rechercher une adresse'
            }}
            label={
              <Grid
                container
                flexDirection="row"
                justifyContent="space-between"
                size={{
                  sm: 'grow'
                }}
              >
                <a
                  className={fr.cx('fr-link--sm')}
                  href="https://zerologementvacant.crisp.help/fr/article/comment-choisir-entre-ladresse-ban-et-ladresse-lovac-1ivvuep/?bust=1705403706774"
                  rel="noreferrer"
                  target="_blank"
                >
                  Je ne trouve pas l’adresse dans la liste
                </a>
              </Grid>
            }
            hintText="Adresse la plus proche dans la BAN, au format recommandé pour vos courriers (modifiable)."
            nativeInputProps={{
              type: 'search',
              placeholder: 'Rechercher une adresse',
              ...props?.nativeInputProps,
              ...params.inputProps
            }}
            ref={params.InputProps.ref}
            state={props?.state}
            stateRelatedMessage={props?.stateRelatedMessage}
            textArea={false}
          />
        </>
      )}
    />
  );
}

export default AddressSearchableSelect;
