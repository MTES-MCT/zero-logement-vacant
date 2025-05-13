import { fr } from '@codegouvfr/react-dsfr';
import {
  Pagination as TablePagination,
  PaginationProps as TablePaginationProps
} from '@codegouvfr/react-dsfr/Pagination';
import Select, { SelectProps } from '@codegouvfr/react-dsfr/SelectNext';
import { TableProps } from '@codegouvfr/react-dsfr/Table';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import {
  flexRender,
  getCoreRowModel,
  RowSelectionState,
  TableOptions,
  useReactTable
} from '@tanstack/react-table';
import { memo, MouseEvent } from 'react';

import { Selection } from '../../hooks/useSelection';
import SingleCheckbox from '../_app/AppCheckbox/SingleCheckbox';
import styles from './advanced-table.module.scss';

export type AdvancedTableProps<Data extends object> = Pick<
  TableOptions<Data>,
  'columns' | 'getRowId'
> &
  PaginationProps & {
    data?: Data[];
    isLoading?: boolean;
    paginationProps?: Omit<
      TablePaginationProps,
      'count' | 'defaultPage' | 'getPageLinkProps'
    >;
    tableProps?: Omit<TableProps, 'headers' | 'data'>;
    selection?: Selection;
    onSelectionChange?(selection: Selection): void;
  };

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
  // Map our selection to the @tanstack/table internal selection state
  const rowSelection: RowSelectionState =
    props.selection?.ids?.reduce<RowSelectionState>((acc, id) => {
      acc[id] = true;
      return acc;
    }, {}) ?? {};
  const all = props.selection?.all ?? false;
  function setAll(value: boolean): void {
    props.onSelectionChange?.({
      all: value,
      ids: []
    });
  }

  const enableSelection = props.selection !== undefined;

  const table = useReactTable<Data>({
    manualPagination: true,
    manualSorting: true,
    ...props,
    data: props.data ?? [],
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: enableSelection,
    enableMultiRowSelection: enableSelection,
    state: {
      rowSelection: rowSelection
    },
    onRowSelectionChange(updater) {
      props.onSelectionChange?.({
        all: all,
        ids: Object.keys(
          typeof updater === 'function' ? updater(rowSelection) : updater
        )
      });
    }
  });
  const headers = table.getLeafHeaders();
  const rows = table.getRowModel().rows;

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
    <Stack sx={{ maxWidth: '100%' }}>
      <div
        className={fr.cx('fr-table', {
          [fr.cx('fr-table--no-scroll')]: props.tableProps?.noScroll,
          [fr.cx('fr-table--layout-fixed')]: props.tableProps?.fixed,
          [fr.cx('fr-table--bordered')]: props.tableProps?.bordered,
          [fr.cx('fr-table--no-caption')]: props.tableProps?.noCaption
        })}
      >
        <div className={fr.cx('fr-table__wrapper')}>
          <div className={fr.cx('fr-table__container')}>
            <div className={fr.cx('fr-table__content')}>
              <table>
                <thead>
                  <tr>
                    {!enableSelection ? null : (
                      <th
                        className={fr.cx('fr-cell--fixed')}
                        role="columnheader"
                      >
                        <SingleCheckbox
                          small
                          option={{
                            label: null,
                            nativeInputProps: {
                              checked: all,
                              onChange: () => {
                                setAll(!all);
                              }
                            }
                          }}
                        />
                      </th>
                    )}

                    {headers.map((header, i) => (
                      <th key={i} scope="col">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      aria-selected={all !== row.getIsSelected()}
                      style={{
                        ['--row-height' as any]: '6.25rem'
                      }}
                    >
                      {!row.getCanMultiSelect() ? null : (
                        <th className={fr.cx('fr-cell--fixed')} scope="row">
                          <SingleCheckbox
                            small
                            option={{
                              label: null,
                              nativeInputProps: {
                                value: row.id,
                                checked: all !== row.getIsSelected(),
                                onChange: () => {
                                  row.toggleSelected();
                                }
                              }
                            }}
                          />
                        </th>
                      )}

                      {row.getVisibleCells().map((cell, j) => {
                        return (
                          <td key={j} className={styles.cell}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                height: '5.25rem',
                                overflowY: 'auto'
                              }}
                            >
                              <Box sx={{ width: '100%' }}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </Box>
                            </Box>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

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

AdvancedTable.displayName = 'AdvancedTable';

export default memo(AdvancedTable) as typeof AdvancedTable;
