import { fr } from '@codegouvfr/react-dsfr';
import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import Autocomplete from '@mui/material/Autocomplete';
import Grid from '@mui/material/Unstable_Grid2';
import { useDebounce, useList, usePreviousDistinct } from 'react-use';
import type { MarkOptional } from 'ts-essentials';
import { Address } from '../../models/Address';

import addressService, {
  AddressSearchResult
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

function AddressSearchableSelectNext(props: Props) {
  const debounce = props?.debounce ?? 300;
  const [options, { set: setOptions }] = useList<AddressSearchResult>([]);

  async function search(query: string | undefined): Promise<void> {
    if (query && query.length >= 3) {
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
      value={props.value}
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
      onChange={(_, value) => {
        if (typeof value !== 'string') {
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
                sm
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
            hintText="Cette adresse est la plus proche identifiée dans la Base Adresse Nationale. Ce format est recommandé pour vos courriers. Pour modifier l'adresse, commencez à saisir votre recherche et choisissez une des options dans la liste."
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

export default AddressSearchableSelectNext;
