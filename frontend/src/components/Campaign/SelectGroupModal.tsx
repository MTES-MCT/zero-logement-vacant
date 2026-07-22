import { ClassNames } from '@emotion/react';
import { fr } from '@codegouvfr/react-dsfr';
import Alert from '@codegouvfr/react-dsfr/Alert';
import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import Stack from '@mui/material/Stack';
import { createColumnHelper } from '@tanstack/react-table';
import { Array, Order, pipe } from 'effect';
import { useEffect, useMemo, useState } from 'react';

import AppSearchBar from '~/components/_app/AppSearchBar/AppSearchBar';
import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import {
  createExtendedModal,
  type ExtendedModalOptions
} from '~/components/modals/ConfirmationModal/ExtendedModal';
import type { Group } from '~/models/Group';
import { useFindGroupsQuery } from '~/services/group.service';

import LabelNext from '../Label/LabelNext';

export type SelectGroupModalOptions = Partial<ExtendedModalOptions>;

export interface SelectGroupModalProps {
  onSelect(group: Group): void;
  /**
   * Incremented by the parent each time the flow is (re)opened. When omitted
   * (standalone usage) the groups query runs immediately. When provided, the
   * query is skipped until the first open (`0` = not yet opened), and the value
   * re-keys the search input so every reopen starts blank.
   */
  openCount?: number;
}

const columnHelper = createColumnHelper<Group>();

function isEligible(group: Group): boolean {
  return group.archivedAt === null && group.housingCount > 0;
}

export function createSelectGroupModal(
  options?: Readonly<SelectGroupModalOptions>
) {
  const modal = createExtendedModal({
    id: options?.id ?? 'select-group-modal',
    isOpenedByDefault: options?.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props: Readonly<SelectGroupModalProps>) {
      const { openCount } = props;
      const queryEnabled = openCount === undefined || openCount > 0;
      const {
        data: groups,
        isFetching,
        isError,
        refetch
      } = useFindGroupsQuery(undefined, {
        skip: !queryEnabled
      });
      const [searchText, setSearchText] = useState<string>('');

      // Reset the search filter each time the flow is reopened.
      useEffect(() => {
        setSearchText('');
      }, [openCount]);

      const filteredGroups = useMemo(() => {
        return pipe(
          groups ?? [],
          Array.filter(isEligible),
          (groups) =>
            searchText
              ? groups.filter((group) =>
                  group.title.toLowerCase().includes(searchText.toLowerCase())
                )
              : groups,
          // Most recent first: reverse the ascending Date order.
          Array.sortWith((group) => group.createdAt, Order.reverse(Order.Date))
        );
      }, [groups, searchText]);

      const columns = useMemo(
        () => [
          columnHelper.accessor('title', {
            header: 'Nom du groupe'
          }),
          columnHelper.display({
            id: 'actions',
            header: () => (
              <Stack
                direction="row"
                sx={{ justifyContent: 'flex-end', fontWeight: 'normal' }}
              >
                Action
              </Stack>
            ),
            cell: ({ row }) => (
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <Button
                  priority="secondary"
                  size="small"
                  title={`Sélectionner le groupe ${row.original.title}`}
                  nativeButtonProps={{
                    'aria-label': `Sélectionner le groupe ${row.original.title}`
                  }}
                  onClick={() => props.onSelect(row.original)}
                >
                  Sélectionner
                </Button>
              </Stack>
            )
          })
        ],
        [props]
      );

      function search(text: string): void {
        setSearchText(text);
      }

      const groupCount = filteredGroups.length;
      const statusMessage = isFetching
        ? ''
        : groupCount === 0
          ? 'Aucun groupe trouvé'
          : `${groupCount} groupe${groupCount > 1 ? 's' : ''} trouvé${
              groupCount > 1 ? 's' : ''
            }`;

      return (
        <modal.Component title="Enregistrer une campagne" size="large">
          <Stepper
            currentStep={1}
            stepCount={2}
            title="Sélectionner le groupe de logements"
            nextTitle="Créer une campagne"
            className="fr-mb-2w"
          />

          {isError ? (
            // A failed load must be distinguished from a genuine empty result:
            // show the error (announced via the Alert's own `role="alert"`) and
            // offer a retry, instead of falling through to « Aucun groupe
            // trouvé », which would misreport a technical failure as "no data".
            <>
              <Alert
                severity="error"
                title="Impossible de charger les groupes"
                description="Une erreur est survenue lors du chargement des groupes."
              />
              <Button
                className={fr.cx('fr-mt-2w')}
                priority="secondary"
                onClick={() => refetch()}
              >
                Réessayer
              </Button>
            </>
          ) : (
            <Stack>
              <AppSearchBar
                key={openCount}
                label="Rechercher un groupe"
                allowEmptySearch
                onSearch={search}
                className='fr-mb-2w'
              />

              <LabelNext role="status" sx={{ fontWeight: 'normal' }}>
                {statusMessage}
              </LabelNext>

              <ClassNames>
                {({ css }) => (
                  <AdvancedTable
                    caption="Groupes de logements"
                    columns={columns}
                    data={filteredGroups}
                    perPageOptions={[5, 10, 50]}
                    defaultPageSize={5}
                    staticPageSize
                    classes={{
                      pagination: {
                        container: css({ justifyContent: 'flex-start' })
                      }
                    }}
                    tableProps={{ noCaption: true }}
                  />
                )}
              </ClassNames>
            </Stack>
          )}
        </modal.Component>
      );
    }
  };
}

export default createSelectGroupModal;
