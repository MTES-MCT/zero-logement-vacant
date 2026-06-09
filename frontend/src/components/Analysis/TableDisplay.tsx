import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  TableColumnMeta,
  TableDataDTO
} from '@zerologementvacant/models';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';

interface TableDisplayProps {
  chart: TableDataDTO;
  caption: string;
}

type Row = Record<string, unknown>;

function formatCell(value: unknown, meta: TableColumnMeta): string {
  if (value === null || value === undefined) return '';

  if (meta.baseType === 'number' && typeof value === 'number') {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: meta.numberStyle === 'percent' ? 'percent' : 'decimal',
      maximumFractionDigits: meta.decimals ?? 0,
      minimumFractionDigits: meta.decimals ?? 0
    }).format(value);
    return meta.suffix && meta.numberStyle !== 'percent'
      ? `${formatted}${meta.suffix}`
      : formatted;
  }

  if (meta.baseType === 'date' && typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime())
      ? String(value)
      : new Intl.DateTimeFormat('fr-FR').format(date);
  }

  return String(value);
}

function TableDisplay(props: Readonly<TableDisplayProps>) {
  const { chart, caption } = props;

  const data = useMemo<Row[]>(
    () =>
      chart.rows.map((row) =>
        Object.fromEntries(chart.columns.map((c, i) => [c.name, row[i]]))
      ),
    [chart.rows, chart.columns]
  );

  const columns = useMemo<ColumnDef<Row>[]>(
    () =>
      chart.columns.map((meta) => ({
        id: meta.name,
        accessorKey: meta.name,
        header: meta.displayName,
        cell: ({ getValue }) => formatCell(getValue(), meta)
      })),
    [chart.columns]
  );

  return (
    <AdvancedTable<Row>
      columns={columns}
      data={data}
      enableSorting
      paginate={false}
      caption={caption}
      tableProps={{ noCaption: true, bordered: true }}
    />
  );
}

export default TableDisplay;
