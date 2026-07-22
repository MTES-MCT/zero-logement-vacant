import { fr } from '@codegouvfr/react-dsfr';
import { Pagination as TablePagination } from '@codegouvfr/react-dsfr/Pagination';
import SelectNext from '@codegouvfr/react-dsfr/SelectNext';
import { type TableProps } from '@codegouvfr/react-dsfr/Table';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { styled } from '@mui/material/styles';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type TableOptions
} from '@tanstack/react-table';
import classNames from 'classnames';
import { createRef, memo, useEffect, useState, type MouseEvent } from 'react';
import { match } from 'ts-pattern';

import SingleCheckbox from '~/components/_app/AppCheckbox/SingleCheckbox';
import SortButton from '~/components/AdvancedTable/SortButton';
import { type Selection } from '~/hooks/useSelection';

import LabelNext from '../Label/LabelNext';

/**
 *
 */
export type AdvancedTableProps<Data extends object> = Pick<
  TableOptions<Data>,
  | 'columns'
  | 'getRowId'
  | 'state'
  // Sort
  | 'enableSorting'
  | 'enableSortingRemoval'
  | 'enableMultiSort'
  | 'manualSorting'
  | 'onSortingChange'
  // Pagination
  | 'manualPagination'
  | 'onPaginationChange'
> &
  PaginationProps & {
    data?: Data[];
    isLoading?: boolean;
    tableProps?: Omit<TableProps, 'headers' | 'data'> & {
      fixedRowHeight?: boolean;
      size?: 'sm' | 'md' | 'lg';
    };
    selection?: Selection;
    onSelectionChange?(selection: Selection): void;
    /**
     * Generate an accessible label for row selection checkbox
     * @param row The table row data
     * @returns Accessible label for the checkbox
     */
    getRowSelectionLabel?(row: Data): string;
    /**
     * Accessible label for the table (RGAA 5.4).
     * Rendered as aria-label on the <table> element.
     * Use alongside noCaption: true in tableProps to preserve DSFR padding.
     */
    caption?: string;
    /**
     * Per-slot className overrides, for callers that need to restyle an
     * internal element (e.g. left-align the pagination footer inside a modal).
     */
    classes?: {
      /** Pagination footer slots. */
      pagination?: {
        /**
         * The row wrapping the page-size control and the pagination buttons.
         * When provided, this class owns the row's horizontal alignment (the
         * default `justify-content: center` is dropped so the override wins).
         */
        container?: string;
      };
    };
  };

interface PaginationProps {
  /**
   * @default true
   */
  paginate?: boolean;
  /**
   * You must define this when using server-side pagination.
   */
  pageCount?: number;
  /**
   * Options shown in the "results per page" selector.
   * @default [10, 50, 200, 500]
   */
  perPageOptions?: number[];
  /**
   * Initial/uncontrolled page size.
   * @default 50
   */
  defaultPageSize?: number;
  /**
   * When true, the "results per page" control is rendered as static,
   * non-editable text ("N lignes par page") to the left of the pagination
   * instead of an editable select. Use for small, fixed-size tables (e.g.
   * inside a modal) where changing the page size is not meaningful.
   * @default false
   */
  staticPageSize?: boolean;
}

const ROW_SIZE = 64;
const PER_PAGE_OPTIONS = [10, 50, 200, 500];
const DEFAULT_PAGE_SIZE = 50;

// Slot defaults live in a styled() component (not instance `sx`) so that, under
// this app's `StyledEngineProvider injectFirst`, they are injected first and a
// caller-supplied `classes.pagination.container` class — appended below —
// overrides them by injection order. This mirrors how MUI's own `classes` work.
const PaginationFooter = styled(Stack)({
  justifyContent: 'center',
  alignItems: 'center',
  flexWrap: 'wrap'
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

  const paginate = props.paginate ?? true;
  const staticPageSize = props.staticPageSize ?? false;
  const perPageOptions = props.perPageOptions ?? PER_PAGE_OPTIONS;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: props.defaultPageSize ?? DEFAULT_PAGE_SIZE
  });

  const table = useReactTable<Data>({
    ...props,
    data: props.data ?? [],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Sort
    enableSorting: props.enableSorting ?? false,
    getSortedRowModel: getSortedRowModel(),
    // Row Selection
    enableRowSelection: enableSelection,
    enableMultiRowSelection: enableSelection,
    state: {
      ...props.state,
      pagination: props.state?.pagination ?? pagination,
      rowSelection
    },
    // Take pagination from props when controlled or state when uncontrolled
    onPaginationChange: props.onPaginationChange ?? setPagination,
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

  const rowRefs: Record<string, React.RefObject<HTMLTableRowElement>> = {};
  rows.forEach((row) => {
    rowRefs[row.id] = createRef<HTMLTableRowElement>();
  });

  useEffect(() => {
    if (props.isLoading) {
      return;
    }

    Object.values(rowRefs).forEach((ref) => {
      // Set row height for the DSFR selection styles to work
      ref.current?.style.setProperty(
        '--row-height',
        `${ref.current?.clientHeight}px`
      );
    });
  }, [props.isLoading]);

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
    <Stack sx={{ width: '100%' }} spacing="1rem" useFlexGap>
      <div
        className={classNames(
          fr.cx('fr-table', {
            [fr.cx('fr-table--no-scroll')]: props.tableProps?.noScroll,
            [fr.cx('fr-table--layout-fixed')]: props.tableProps?.fixed,
            [fr.cx('fr-table--bordered')]: props.tableProps?.bordered,
            [fr.cx('fr-table--no-caption')]: props.tableProps?.noCaption
          }),
          props.tableProps?.size ? `fr-table--${props.tableProps.size}` : null,
          props.tableProps?.className
        )}
      >
        <div className={fr.cx('fr-table__wrapper')}>
          <div className={fr.cx('fr-table__container')}>
            <div className={fr.cx('fr-table__content')}>
              <table aria-label={props.caption}>
                <thead>
                  <tr>
                    {!enableSelection ? null : (
                      <th className={fr.cx('fr-cell--fixed')}>
                        <SingleCheckbox
                          small
                          option={{
                            label: null,
                            nativeInputProps: {
                              checked: all,
                              'aria-label': 'Sélectionner tous les éléments',
                              onChange: () => {
                                setAll(!all);
                              }
                            }
                          }}
                        />
                      </th>
                    )}

                    {headers.map((header, i) => (
                      <th
                        key={i}
                        scope="col"
                        aria-sort={match(
                          header.column.getCanSort()
                            ? header.column.getIsSorted()
                            : null
                        )
                          .with('asc', () => 'ascending' as const)
                          .with('desc', () => 'descending' as const)
                          .with(false, () => 'none' as const)
                          .otherwise(() => undefined)}
                      >
                        {header.column.getCanSort() ? (
                          <Stack
                            direction="row"
                            sx={{
                              alignItems: 'center',
                              justifyContent: 'flex-start'
                            }}
                            spacing="1rem"
                            useFlexGap
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}

                            <SortButton
                              direction={header.column.getIsSorted()}
                              title={
                                header.column.columnDef.meta?.sort?.title ??
                                `Trier par ${header.id}`
                              }
                              onCycleSort={() => header.column.toggleSorting()}
                            />
                          </Stack>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
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
                      ref={rowRefs[row.id]}
                      style={
                        props.tableProps?.fixedRowHeight
                          ? {
                              // Behaves like minHeight when used in a table
                              height: '6.25rem'
                            }
                          : undefined
                      }
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
                                'aria-label':
                                  props.getRowSelectionLabel?.(row.original) ??
                                  'Sélectionner cet élément',
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
                          <td
                            key={j}
                            className={classNames({
                              [fr.cx('fr-cell--multiline')]:
                                cell.column.columnDef.meta?.styles?.multiline
                            })}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
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
        <PaginationFooter
          direction="row"
          spacing="1rem"
          useFlexGap
          className={props.classes?.pagination?.container}
        >
          {staticPageSize ? (
            <LabelNext>
              {table.getState().pagination.pageSize} ligne
              {table.getState().pagination.pageSize > 1 ? 's' : ''} par page
            </LabelNext>
          ) : (
            <SelectNext
              label={null}
              options={perPageOptions.map((option) => ({
                label: `${option} résultats par page`,
                value: String(option)
              }))}
              nativeSelectProps={{
                value: String(table.getState().pagination.pageSize),
                onChange: (event) => {
                  const value = Number(event.target.value);
                  if (value !== null) {
                    table.setPageSize(value);
                  }
                }
              }}
            />
          )}

          <TablePagination
            count={table.getPageCount()}
            defaultPage={table.getState().pagination.pageIndex + 1}
            getPageLinkProps={(page: number) => ({
              to: '#',
              onClick: (event: MouseEvent) => {
                event.preventDefault();
                table.setPageIndex(page - 1);
              }
            })}
            showFirstLast
          />
        </PaginationFooter>
      ) : null}
    </Stack>
  );
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    styles?: {
      multiline?: boolean;
    };
    sort?: {
      title: string;
    };
  }
}

AdvancedTable.displayName = 'AdvancedTable';

export default memo(AdvancedTable) as typeof AdvancedTable;
