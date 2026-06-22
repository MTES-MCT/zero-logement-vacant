import type {
  CardType,
  DashboardCard,
  Tab,
  TableColumnMeta
} from '@zerologementvacant/models';

// Raw payload returned by `GET /api/dashboard/:id`. Exposed on the service
// contract so wrappers (cache, instrumentation) can hold the raw payload before
// normalization.
export interface MetabaseColumnSettings {
  number_style?: string;
  decimals?: number;
  suffix?: string;
  column_title?: string;
}

export interface MetabasePieRow {
  key: string;
  name?: string;
  enabled?: boolean;
  hidden?: boolean;
}

export interface MetabaseVisualizationSettings {
  'number.style'?: string;
  'scalar.decimals'?: number;
  'scalar.field'?: string;
  'table.columns'?: Array<{ name: string; enabled: boolean }>;
  'graph.dimensions'?: string[];
  'graph.metrics'?: string[];
  'pie.rows'?: MetabasePieRow[];
  column_settings?: Record<string, MetabaseColumnSettings>;
}

export interface MetabaseCard {
  id: number;
  name: string;
  display: string;
  description: string | null;
  visualization_settings: MetabaseVisualizationSettings;
}

export interface MetabaseDashcardVisualizationSettings {
  'card.title'?: string | null;
  'card.description'?: string | null;
  'number.style'?: string;
  'scalar.field'?: string;
  'table.columns'?: Array<{ name: string; enabled: boolean }>;
  'graph.dimensions'?: string[];
  'graph.metrics'?: string[];
  'pie.rows'?: MetabasePieRow[];
  column_settings?: Record<string, MetabaseColumnSettings>;
  // "Visualizer" dashcards nest their real settings (including the title /
  // description overrides) here instead of at the top level.
  visualization?: {
    settings?: MetabaseDashcardVisualizationSettings;
  };
}

export interface MetabaseDashcardParameterMapping {
  parameter_id: string;
  card_id: number | null;
  target?: unknown;
}

export interface MetabaseDashcard {
  id: number;
  card_id: number | null;
  dashboard_tab_id: number | null;
  row: number;
  col: number;
  size_x: number;
  size_y: number;
  visualization_settings: MetabaseDashcardVisualizationSettings;
  parameter_mappings?: MetabaseDashcardParameterMapping[];
  card: MetabaseCard | null;
}

export interface MetabaseTab {
  id: number;
  name: string;
  position: number;
}

export interface MetabaseDashboardRaw {
  id: number;
  tabs?: MetabaseTab[];
  dashcards: MetabaseDashcard[];
  parameters?: Array<{ id: string; slug: string; type: string }>;
}

export interface MetabaseCol {
  name: string;
  display_name?: string;
  base_type?: string;
}

export interface MetabaseQueryResult {
  data: { rows: unknown[][]; cols: MetabaseCol[] };
}

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
  labelColumn: string | null;
  direction: 'horizontal' | 'vertical' | null;
  format: 'number' | 'percent';
  decimals: number;
  tableColumns: ReadonlyArray<TableColumnRef> | null;
  // Pie charts: maps raw query keys (e.g. "APPART") to the PM-curated display
  // names from pie.rows (e.g. "Appartements"). Null for non-pie cards.
  labelMap: Readonly<Record<string, string>> | null;
  dashboardParameters: ReadonlyArray<DashboardParameter>;
}

export type PieChartValue = { labels: string[]; data: number[] };
export type BarChartValue = {
  direction: 'horizontal' | 'vertical';
  format: 'number' | 'percent';
  decimals: number;
  labels: string[];
  data: number[];
  name: string;
};
export type LineChartValue = {
  format: 'number' | 'percent';
  decimals: number;
  labels: string[];
  data: number[];
  name: string;
};
export type TableValue = {
  columns: TableColumnMeta[];
  rows: unknown[][];
};
export type CardValue =
  | number
  | PieChartValue
  | BarChartValue
  | LineChartValue
  | TableValue;

export interface MetabaseService {
  fetchDashboardRaw(id: number): Promise<MetabaseDashboardRaw>;
  getDashboard(id: number): Promise<DashboardData>;
  findDashcard(
    dashboardId: number,
    dashcardId: number
  ): Promise<DashcardRef | null>;
  getCardValue(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    parameters: ReadonlyArray<DashboardParameter & { value: string }>,
    valueColumn: string | null,
    labelColumn: string | null,
    cardType: CardType,
    direction: 'horizontal' | 'vertical' | null,
    format: 'number' | 'percent',
    decimals: number,
    tableColumns: ReadonlyArray<TableColumnRef> | null
  ): Promise<CardValue>;
}
