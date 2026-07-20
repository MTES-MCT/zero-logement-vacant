import { fr } from '@codegouvfr/react-dsfr';
import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import { createColumnHelper } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';

import AppSearchBar from '~/components/_app/AppSearchBar/AppSearchBar';
import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import {
  createExtendedModal,
  type ExtendedModalOptions
} from '~/components/modals/ConfirmationModal/ExtendedModal';
import type { Group } from '~/models/Group';
import { useFindGroupsQuery } from '~/services/group.service';

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
      const { data: groups, isFetching } = useFindGroupsQuery(undefined, {
        skip: !queryEnabled
      });
      const [searchText, setSearchText] = useState<string>('');

      // Reset the search filter each time the flow is reopened.
      useEffect(() => {
        setSearchText('');
      }, [openCount]);

      const filteredGroups = useMemo(() => {
        const eligible = (groups ?? []).filter(isEligible);
        const matches = searchText
          ? eligible.filter((group) =>
              group.title.toLowerCase().includes(searchText.toLowerCase())
            )
          : eligible;
        return [...matches].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
      }, [groups, searchText]);

      const columns = useMemo(
        () => [
          columnHelper.accessor('title', {
            header: 'Nom du groupe'
          }),
          columnHelper.display({
            id: 'actions',
            header: 'Action',
            cell: ({ row }) => (
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
          />

          <AppSearchBar
            key={openCount}
            label="Rechercher un groupe"
            onSearch={search}
          />

          <p role="status" className={fr.cx('fr-sr-only')}>
            {statusMessage}
          </p>

          <AdvancedTable
            caption="Groupes de logements"
            columns={columns}
            data={filteredGroups}
            perPageOptions={[5, 10, 50]}
            defaultPageSize={5}
            tableProps={{ noCaption: true }}
          />
        </modal.Component>
      );
    }
  };
}

export default createSelectGroupModal;
