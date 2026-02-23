import CallOut from '@codegouvfr/react-dsfr/CallOut';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import SearchableSelectNext, {
  type SearchableSelectNextProps
} from '~/components/SearchableSelectNext/SearchableSelectNext';
import addressService, {
  type AddressSearchResult
} from '~/services/address.service';

type Multiple = false;
type DisableClearable = false;
type FreeSolo = false;
export type AddressSearchableSelectNextProps = Pick<
  SearchableSelectNextProps<
    AddressSearchResult,
    Multiple,
    DisableClearable,
    FreeSolo
  >,
  'disabled' | 'error' | 'value' | 'onChange'
> & {
  warning: boolean;
  onIgnoreWarning(): void;
};

function AddressSearchableSelectNext(props: AddressSearchableSelectNextProps) {
  const [options, setOptions] = useState<ReadonlyArray<AddressSearchResult>>(
    []
  );
  const [loading, setLoading] = useState(false);

  async function search(query: string | undefined): Promise<void> {
    if (query && query.length >= 3) {
      await addressService
        .quickSearch(query)
        .then((addresses) => {
          setOptions(addresses);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }

  function onChange(address: AddressSearchResult | null): void {
    props.onChange(
      address
        ? // Consider that the user has validated the address
          { ...address, score: 1 }
        : null
    );
  }

  return (
    <Stack spacing="1.5rem">
      <SearchableSelectNext
        debounce={250}
        disabled={props.disabled}
        error={props.error}
        search={search}
        options={options}
        loading={loading}
        label={null}
        hintText="Adresse la plus proche dans la BAN, au format recommandé pour vos courriers (modifiable)."
        autocompleteProps={{
          autoHighlight: true,
          openOnFocus: true
        }}
        inputProps={{
          nativeLabelProps: {
            'aria-label': 'Rechercher une adresse'
          }
        }}
        placeholder="Rechercher une adresse"
        isOptionEqualToValue={(option, value) => option.banId === value.banId}
        value={props.value}
        onChange={onChange}
      />
      {!props.warning ? null : (
        <CallOut
          buttonProps={{
            children: 'Ignorer',
            priority: 'secondary',
            nativeButtonProps: {
              'aria-label': 'Ignorer l’adresse',
              title: 'Ignorer l’adresse'
            },
            onClick: props.onIgnoreWarning
          }}
        >
          <Typography component="span" variant="body1">
            L’adresse de la Base Adresse Nationale diffère de celle de la DGFIP.
          </Typography>
        </CallOut>
      )}
    </Stack>
  );
}

export default AddressSearchableSelectNext;
