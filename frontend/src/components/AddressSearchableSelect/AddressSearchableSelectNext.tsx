import { fr } from '@codegouvfr/react-dsfr';
import Input, { InputProps } from '@codegouvfr/react-dsfr/Input';
import Autocomplete from '@mui/material/Autocomplete';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import { useDebounce, useList, usePreviousDistinct } from 'react-use';
import type { MarkOptional } from 'ts-essentials';

import addressService, {
  AddressSearchResult
} from '../../services/address.service';
import { Address } from '../../models/Address';
import { useState } from 'react';

interface Props extends MarkOptional<InputProps.RegularInput, 'label'> {
  debounce?: number;
  value: Address | null;
  inputValue: string;
  open?: boolean;
  onInputChange(value: string): void;
  onChange(value: Address | null): void;
  onOpen?(): void;
  onClose?(): void;
}

function AddressSearchableSelectNext(props: Props) {
  const debounce = props?.debounce ?? 300;
  const [focus, setFocus] = useState(false);
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
      if (focus && props.inputValue !== previousInputValue) {
        search(props.inputValue).catch(console.error);
      }
    },
    debounce,
    [props.inputValue, focus, previousInputValue]
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
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      renderInput={(params) => (
        <>
          <Input
            label={
              <Grid
                container
                flexDirection="row"
                justifyContent="space-between"
                sm
              >
                <Typography component="span">
                  Adresse (source : 
                  <a
                    href="https://adresse.data.gouv.fr/base-adresse-nationale#4.4/46.9/1.7"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Base Adresse Nationale
                  </a>
                  )
                </Typography>
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
            hintText="Commencez à taper votre recherche dans le champ de saisi et choisissez une des options proposées dans la liste (exemple : 72 rue de Varenne, Paris)"
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
