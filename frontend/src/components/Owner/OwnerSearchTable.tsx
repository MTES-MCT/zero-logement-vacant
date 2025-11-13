import Button from '@codegouvfr/react-dsfr/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import LabelNext from '~/components/Label/LabelNext';
import OwnerKindTag from '~/components/Owner/OwnerKindTag';
import type { Owner } from '~/models/Owner';
import { birthdate } from '~/utils/dateUtils';

export interface OwnerSearchTableProps {
  owners: ReadonlyArray<Owner>;
  isLoading?: boolean;
  page?: number;
  pageCount?: number;
  perPage?: number;
  onPageChange?(page: number): void;
  onPerPageChange?(perPage: number): void;
  onSelect?(owner: Owner): void;
}

function OwnerSearchTable(props: OwnerSearchTableProps) {
  const { onSelect } = props;

  const columnHelper = createColumnHelper<Owner>();
  const columnDefs = useMemo(
    () => [
      columnHelper.display({
        id: 'name',
        header: 'Propriétaires (nom, date de naissance et adresse)',
        cell: ({ row }) => (
          <Stack spacing="0.5rem" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.original.fullName}
            </Typography>

            {row.original.birthDate ? (
              <Typography variant="body2">
                {birthdate(row.original.birthDate)}
              </Typography>
            ) : null}

            <Typography variant="body2">{row.original.rawAddress}</Typography>

            <OwnerKindTag value={row.original.kind} />
          </Stack>
        )
      }),
      columnHelper.display({
        id: 'actions',
        header: () => (
          <Typography variant="body2" sx={{ textAlign: 'end' }}>
            Actions
          </Typography>
        ),
        cell: ({ row }) => (
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button
              priority="secondary"
              size="small"
              title={`Sélectionner ${row.original.fullName}`}
              nativeButtonProps={{
                'aria-label': `Sélectionner ${row.original.fullName}`
              }}
              onClick={() => {
                onSelect?.(row.original);
              }}
            >
              Sélectionner
            </Button>
          </Stack>
        )
      })
    ],
    [columnHelper, onSelect]
  );

  if (props.owners.length === 0 && !props.isLoading) {
    return <Typography>Aucun propriétaire trouvé.</Typography>;
  }

  return (
    <Stack spacing="1rem">
      <LabelNext style={{ fontWeight: 400 }}>
        {props.owners.length} propriétaires trouvés
      </LabelNext>
      <AdvancedTable
        data={props.owners as Array<Owner>}
        columns={columnDefs}
        isLoading={props.isLoading}
        paginate={true}
        page={props.page}
        pageCount={props.pageCount}
        perPage={props.perPage}
        onPageChange={props.onPageChange}
        onPerPageChange={props.onPerPageChange}
        tableProps={{
          className: 'fr-my-0',
          noCaption: true
        }}
      />
    </Stack>
  );
}

export default OwnerSearchTable;
