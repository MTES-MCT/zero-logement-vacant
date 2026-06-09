import type {
  CardType,
  DashboardCard,
  Tab,
  TableColumnMeta
} from '@zerologementvacant/models';

export type DashboardData =
  | { tabs: ReadonlyArray<Tab> }
  | { cards: ReadonlyArray<DashboardCard> };

export interface DashboardParameter {
  id: string;
  slug: string;
  type: string;
}

// PM-curated column metadata, Metabase-agnostic: resolved from `table.columns`
// + `column_settings` at findDashcardRef time. Empty array means "PM did not
// curate columns — use every column from the query result, in query order".
export interface TableColumnRef {
  name: string;
  columnTitle?: string;
  decimals?: number;
  suffix?: string;
  numberStyle?: string;
}

export interface DashcardRef {
  dashcardId: number;
  cardId: number;
  type: CardType;
  valueColumn: string | null;
  direction: 'horizontal' | 'vertical' | null;
  tableColumns: ReadonlyArray<TableColumnRef> | null;
  dashboardParameters: ReadonlyArray<DashboardParameter>;
}

export type PieChartValue = { labels: string[]; data: number[] };
export type BarChartValue = {
  direction: 'horizontal' | 'vertical';
  labels: string[];
  data: number[];
};
export type TableValue = {
  columns: TableColumnMeta[];
  rows: unknown[][];
};
export type CardValue = number | PieChartValue | BarChartValue | TableValue;

export interface MetabaseService {
  getDashboard(id: number): Promise<DashboardData>;
  findDashcard(dashboardId: number, dashcardId: number): Promise<DashcardRef | null>;
  getCardValue(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    parameters: ReadonlyArray<DashboardParameter & { value: string }>,
    valueColumn: string | null,
    cardType: CardType,
    direction: 'horizontal' | 'vertical' | null,
    tableColumns: ReadonlyArray<TableColumnRef> | null
  ): Promise<CardValue>;
}
