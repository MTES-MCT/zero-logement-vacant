import Avatar from '@codegouvfr/react-dsfr/picto/Avatar';
import SearchBar from '@codegouvfr/react-dsfr/SearchBar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { match, Pattern } from 'ts-pattern';

import LabelNext from '~/components/Label/LabelNext';
import {
  createExtendedModal,
  type ExtendedModalProps
} from '~/components/modals/ConfirmationModal/ExtendedModal';
import type { Owner } from '~/models/Owner';
import { useFindOwnersNextQuery } from '~/services/owner.service';
import OwnerSearchTable from '../OwnerSearchTable';

export type OwnerSearchModalProps = Omit<
  ExtendedModalProps,
  'children' | 'title'
> & {
  onSelect: (owner: Owner) => void;
};

function createOwnerSearchModal() {
  const modal = createExtendedModal({
    id: 'owner-search-modal',
    isOpenedByDefault: false
  });

  return {
    ...modal,
    Component(props: OwnerSearchModalProps) {
      const [searchQuery, setSearchQuery] = useState<string>('');

      const {
        data: owners,
        isUninitialized,
        isFetching,
        isSuccess
      } = useFindOwnersNextQuery(
        {
          search: searchQuery,
          page: 1,
          perPage: 10
        },
        { skip: searchQuery.length < 3 }
      );

      function handleSearch(query: string): void {
        setSearchQuery(query);
      }

      function onSelectOwner(owner: Owner): void {
        props.onSelect(owner);
        setSearchQuery('');
      }

      return (
        <modal.Component
          size="large"
          {...props}
          title={
            <Stack component="header">
              <LabelNext>23 Rue des huîtres 50180 Le Marais</LabelNext>
              <Typography component="h1" variant="h4">
                Ajouter un propriétaire
              </Typography>
            </Stack>
          }
        >
          <Stack spacing="1.5rem">
            <SearchBar
              big
              label="Rechercher un propriétaire"
              renderInput={(params) => (
                <input {...params} placeholder="Stéphanie Rousseau" />
              )}
              onButtonClick={handleSearch}
            />

            {match({ owners, isFetching, isUninitialized, isSuccess })
              .with({ isUninitialized: true, isSuccess: false }, () => (
                <Stack
                  spacing="0.75rem"
                  sx={{ alignItems: 'center' }}
                  useFlexGap
                >
                  <Avatar width="7.5rem" height="7.5rem" />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 500,
                      maxWidth: '20rem',
                      textAlign: 'center'
                    }}
                  >
                    Lancez une recherche pour voir si le propriétaire se trouve
                    déjà dans la base
                  </Typography>
                </Stack>
              ))
              .with(
                Pattern.union(
                  { isSuccess: true, owners: Pattern.nonNullable },
                  { isFetching: true }
                ),
                ({ owners }) => (
                  <OwnerSearchTable
                    owners={owners ?? []}
                    isLoading={isFetching}
                    onSelect={onSelectOwner}
                  />
                )
              )
              .otherwise(() => null)}
          </Stack>
        </modal.Component>
      );
    }
  };
}

export default createOwnerSearchModal;
