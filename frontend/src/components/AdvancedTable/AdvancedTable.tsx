import { fr } from '@codegouvfr/react-dsfr';
import {
  Pagination as TablePagination,
  PaginationProps as TablePaginationProps
} from '@codegouvfr/react-dsfr/Pagination';
import Select, { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';
import { Table, TableProps } from '@codegouvfr/react-dsfr/Table';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import {
  flexRender,
  getCoreRowModel,
  TableOptions,
  useReactTable
} from '@tanstack/react-table';
import { MouseEvent, ReactNode } from 'react';

interface AdvancedTableProps<Data extends object>
  extends Omit<TableOptions<Data>, 'data' | 'getCoreRowModel'>,
    PaginationProps {
  data?: Data[];
  isLoading?: boolean;
  paginationProps?: Omit<
    TablePaginationProps,
    'count' | 'defaultPage' | 'getPageLinkProps'
  >;
  tableProps?: Omit<TableProps, 'headers' | 'data'>;
}

interface PaginationProps {
  /**
   * @default true
   */
  paginate?: boolean;
  page?: number;
  pageCount?: number;
  perPage?: number;
  onPageChange?(page: number): void;
  onPerPageChange?(perPage: number): void;
}

const ROW_SIZE = 64;
const PER_PAGE_OPTIONS: SelectProps.Option[] = [
  '50',
  '200',
  '500'
].map<SelectProps.Option>((nb) => {
  return { label: `${nb} résultats par page`, value: nb };
});

function AdvancedTable<Data extends object>(props: AdvancedTableProps<Data>) {
  const table = useReactTable<Data>({
    manualPagination: true,
    manualSorting: true,
    ...props,
    data: props.data ?? [],
    getCoreRowModel: getCoreRowModel()
  });
  const headers: ReactNode[] = table
    .getLeafHeaders()
    .map((header) =>
      flexRender(header.column.columnDef.header, header.getContext())
    );
  const data: ReactNode[][] = table
    .getRowModel()
    .rows.map((row) => row.getVisibleCells())
    .map((cells) =>
      cells.map((cell) =>
        flexRender(cell.column.columnDef.cell, cell.getContext())
      )
    );

  const paginate = props.paginate ?? true;

  if (props?.isLoading) {
    return (
      <Skeleton
        animation="wave"
        variant="rectangular"
        width="100%"
        height={ROW_SIZE * 6}
      />
    );
  }

  return (
    <Stack>
      <Table {...props.tableProps} headers={headers} data={data} />
      {paginate ? (
        <Stack direction="row" justifyContent="center">
          <Select
            className={fr.cx('fr-mr-2w')}
            label={null}
            nativeSelectProps={{
              value: props.perPage?.toString(),
              onChange: (event) => {
                props.onPerPageChange?.(Number(event.target.value));
              }
            }}
            options={PER_PAGE_OPTIONS}
          />
          <TablePagination
            {...props.paginationProps}
            count={props.pageCount ?? 1}
            defaultPage={props.page}
            getPageLinkProps={(page: number) => ({
              to: '#',
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                props.onPageChange?.(page);
              }
            })}
            showFirstLast
          />
        </Stack>
      ) : null}
    </Stack>
  );
}

export default AdvancedTable;
