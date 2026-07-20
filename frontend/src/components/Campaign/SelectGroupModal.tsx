import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

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
      const { data: groups } = useFindGroupsQuery();
      const [searchText, setSearchText] = useState<string>('');

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

      return (
        <modal.Component
          title="Enregistrer une campagne"
          size="large"
          onClose={() => setSearchText('')}
        >
          <Stepper
            currentStep={1}
            stepCount={2}
            title="Sélectionner le groupe de logements"
            nextTitle="Créer une campagne"
          />

          <AppSearchBar label="Rechercher un groupe" onSearch={search} />

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
