import axios from 'axios';

import type {
  CardType,
  DashboardCard,
  Tab,
  TableColumnMeta
} from '@zerologementvacant/models';
import config from '~/infra/config';
import type {
  BarChartValue,
  CardValue,
  DashboardData,
  DashboardParameter,
  DashcardRef,
  LineChartValue,
  MetabaseColumnSettings,
  MetabaseDashboardRaw,
  MetabaseDashcard,
  MetabaseDashcardVisualizationSettings,
  MetabaseQueryResult,
  MetabaseService,
  MetabaseVisualizationSettings,
  PieChartValue,
  TableColumnRef,
  TableValue
} from './metabase-service';

// ─── Normalization helpers ─────────────────────────────────────────────────────

function mergeVisualizationSettings(
  card: MetabaseVisualizationSettings,
  dashcard: MetabaseDashcardVisualizationSettings
): MetabaseVisualizationSettings {
  return {
    ...card,
    ...(dashcard['number.style'] !== undefined && { 'number.style': dashcard['number.style'] }),
    ...(dashcard['scalar.field'] !== undefined && { 'scalar.field': dashcard['scalar.field'] }),
    ...(dashcard['table.columns'] !== undefined && {
      'table.columns': dashcard['table.columns']
    }),
    ...(dashcard['graph.dimensions'] !== undefined && {
      'graph.dimensions': dashcard['graph.dimensions']
    }),
    ...(dashcard['graph.metrics'] !== undefined && {
      'graph.metrics': dashcard['graph.metrics']
    }),
    column_settings: { ...(card.column_settings ?? {}), ...(dashcard.column_settings ?? {}) }
  };
}

// Returns column settings for the active display column.
// For multi-column scalar cards, scalar.field identifies which column is shown.
// Falls back to the first enabled table column when scalar.field is absent.
function activeColumnSettings(
  settings: MetabaseVisualizationSettings
): MetabaseColumnSettings | undefined {
  const scalarField = settings['scalar.field'];
  if (scalarField !== undefined) {
    return settings.column_settings?.[JSON.stringify(['name', scalarField])];
  }
  const activeCol = (settings['table.columns'] ?? []).find((c) => c.enabled);
  if (!activeCol) return undefined;
  return settings.column_settings?.[JSON.stringify(['name', activeCol.name])];
}

function resolveAxisColumns(
  settings: MetabaseVisualizationSettings
): { labelColumn: string | null; valueColumn: string | null } {
  return {
    labelColumn: settings['graph.dimensions']?.[0] ?? null,
    valueColumn: settings['graph.metrics']?.[0] ?? null
  };
}

function detectColumnFormat(
  settings: MetabaseVisualizationSettings,
  columnName: string | null
): { format: 'number' | 'percent'; decimals: number } {
  if (columnName === null) return { format: 'number', decimals: 0 };
  const col = settings.column_settings?.[JSON.stringify(['name', columnName])];
  if (!col) return { format: 'number', decimals: 0 };
  const isPercent = col.suffix?.includes('%') === true || col.number_style === 'percent';
  return {
    format: isPercent ? 'percent' : 'number',
    decimals: col.decimals ?? 0
  };
}

function detectCardType(
  settings: MetabaseVisualizationSettings
): 'flat-number' | 'percentage' {
  if (settings['number.style'] === 'percent') return 'percentage';
  const col = activeColumnSettings(settings);
  if (col) {
    return col.suffix?.includes('%') || col.number_style === 'percent'
      ? 'percentage'
      : 'flat-number';
  }
  // When table.columns is explicitly configured but no specific field is active,
  // the column_settings are table-layout overrides — not scalar format signals.
  if (settings['table.columns'] !== undefined) return 'flat-number';
  const hasPercent = Object.values(settings.column_settings ?? {}).some(
    (c) => c.number_style === 'percent' || c.suffix?.includes('%')
  );
  return hasPercent ? 'percentage' : 'flat-number';
}

function detectDecimals(settings: MetabaseVisualizationSettings): number {
  if (settings['scalar.decimals'] !== undefined) return settings['scalar.decimals'];
  const col = activeColumnSettings(settings);
  return col?.decimals ?? 0;
}

function normalizeBaseType(
  metabaseType: string | undefined
): TableColumnMeta['baseType'] {
  if (!metabaseType) return 'unknown';
  if (/Integer|Decimal|Float|Number/.test(metabaseType)) return 'number';
  if (/Date|Time/.test(metabaseType)) return 'date';
  if (metabaseType.endsWith('Boolean')) return 'boolean';
  if (metabaseType.endsWith('Text') || metabaseType.endsWith('String')) {
    return 'string';
  }
  return 'unknown';
}

// Returns the PM-curated column names in display order. Returns null when no
// `table.columns` is configured (callers fall back to query columns).
function resolveVisibleColumnNames(
  settings: MetabaseVisualizationSettings
): string[] | null {
  const tableColumns = settings['table.columns'];
  if (!tableColumns || tableColumns.length === 0) return null;
  return tableColumns.filter((c) => c.enabled).map((c) => c.name);
}

function buildTableColumnRefs(
  settings: MetabaseVisualizationSettings
): TableColumnRef[] {
  const names = resolveVisibleColumnNames(settings);
  if (names === null) return []; // sentinel: use all query cols
  return names.map((name) => {
    const colSettings =
      settings.column_settings?.[JSON.stringify(['name', name])];
    return {
      name,
      ...(colSettings?.column_title !== undefined && {
        columnTitle: colSettings.column_title
      }),
      ...(colSettings?.decimals !== undefined && {
        decimals: colSettings.decimals
      }),
      ...(colSettings?.suffix !== undefined && { suffix: colSettings.suffix }),
      ...(colSettings?.number_style !== undefined && {
        numberStyle: colSettings.number_style
      })
    };
  });
}

function normalizeDashcard(dashcard: MetabaseDashcard): DashboardCard | null {
  if (dashcard.card === null) return null;
  const { card } = dashcard;

  if (card.display === 'pie') {
    return {
      id: dashcard.id,
      type: 'pie-chart',
      title: dashcard.visualization_settings['card.title'] ?? card.name,
      description: card.description,
      decimals: 0,
      position: { col: dashcard.col, row: dashcard.row },
      size: { width: dashcard.size_x, height: dashcard.size_y }
    };
  }

  if (card.display === 'bar' || card.display === 'row') {
    return {
      id: dashcard.id,
      type: 'bar-chart',
      title: dashcard.visualization_settings['card.title'] ?? card.name,
      description: card.description,
      decimals: 0,
      position: { col: dashcard.col, row: dashcard.row },
      size: { width: dashcard.size_x, height: dashcard.size_y }
    };
  }

  if (card.display === 'table') {
    return {
      id: dashcard.id,
      type: 'table',
      title: dashcard.visualization_settings['card.title'] ?? card.name,
      description: card.description,
      decimals: 0,
      position: { col: dashcard.col, row: dashcard.row },
      size: { width: dashcard.size_x, height: dashcard.size_y }
    };
  }

  if (card.display === 'line') {
    return {
      id: dashcard.id,
      type: 'line-chart',
      title: dashcard.visualization_settings['card.title'] ?? card.name,
      description: card.description,
      decimals: 0,
      position: { col: dashcard.col, row: dashcard.row },
      size: { width: dashcard.size_x, height: dashcard.size_y }
    };
  }

  if (card.display !== 'scalar') return null;

  const settings = mergeVisualizationSettings(
    card.visualization_settings,
    dashcard.visualization_settings
  );
  return {
    id: dashcard.id,
    type: detectCardType(settings),
    title: dashcard.visualization_settings['card.title'] ?? card.name,
    description: card.description,
    decimals: detectDecimals(settings),
    position: { col: dashcard.col, row: dashcard.row },
    size: { width: dashcard.size_x, height: dashcard.size_y }
  };
}

export function normalizeDashboard(raw: MetabaseDashboardRaw): DashboardData {
  if (raw.tabs && raw.tabs.length > 0) {
    const sortedTabs = [...raw.tabs].sort((a, b) => a.position - b.position);
    const tabs: Tab[] = sortedTabs.map((tab) => ({
      id: tab.id,
      title: tab.name,
      cards: raw.dashcards
        .filter((dc) => dc.dashboard_tab_id === tab.id)
        .map(normalizeDashcard)
        .filter((c): c is DashboardCard => c !== null)
    }));
    return { tabs };
  }
  return {
    cards: raw.dashcards
      .map(normalizeDashcard)
      .filter((c): c is DashboardCard => c !== null)
  };
}

export function findDashcardRef(
  raw: MetabaseDashboardRaw,
  dashcardId: number
): DashcardRef | null {
  const found = raw.dashcards.find((dc) => dc.id === dashcardId);
  if (!found || found.card_id === null) return null;
  const normalized = normalizeDashcard(found);
  if (!normalized) return null;

  const settings = mergeVisualizationSettings(
    found.card!.visualization_settings,
    found.visualization_settings
  );
  const dashboardParameters = (raw.parameters ?? []).map(
    (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
  );

  if (normalized.type === 'pie-chart') {
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: 'pie-chart',
      valueColumn: null,
      labelColumn: null,
      direction: null,
      format: 'number',
      decimals: 0,
      tableColumns: null,
      dashboardParameters
    };
  }

  if (normalized.type === 'bar-chart' || normalized.type === 'line-chart') {
    const { labelColumn, valueColumn } = resolveAxisColumns(settings);
    const { format, decimals } = detectColumnFormat(settings, valueColumn);
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: normalized.type,
      valueColumn,
      labelColumn,
      direction:
        normalized.type === 'bar-chart'
          ? found.card!.display === 'bar'
            ? 'vertical'
            : 'horizontal'
          : null,
      format,
      decimals,
      tableColumns: null,
      dashboardParameters
    };
  }

  if (normalized.type === 'table') {
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: 'table',
      valueColumn: null,
      labelColumn: null,
      direction: null,
      format: 'number',
      decimals: 0,
      tableColumns: buildTableColumnRefs(settings),
      dashboardParameters
    };
  }

  return {
    dashcardId: found.id,
    cardId: found.card_id,
    type: normalized.type,
    valueColumn: settings['scalar.field'] ?? null,
    labelColumn: null,
    direction: null,
    format: 'number',
    decimals: 0,
    tableColumns: null,
    dashboardParameters
  };
}

// Percent-formatted columns are stored as display values (e.g. 1.79 for 1.79%)
// in Metabase. We divide by 100 here so the response shape matches the scalar
// percentage convention — the frontend formats with Intl.NumberFormat({ style:
// 'percent' }) which multiplies back for display.
function scaleForFormat(
  values: number[],
  format: 'number' | 'percent'
): number[] {
  return format === 'percent' ? values.map((v) => v / 100) : values;
}

function extractAxisValues(
  data: MetabaseQueryResult,
  labelColumn: string | null,
  valueColumn: string | null
): { labels: string[]; values: number[] } {
  const labelIdx = labelColumn
    ? data.data.cols.findIndex((c) => c.name === labelColumn)
    : -1;
  const valueIdx = valueColumn
    ? data.data.cols.findIndex((c) => c.name === valueColumn)
    : -1;
  const xIndex = labelIdx !== -1 ? labelIdx : 0;
  const yIndex = valueIdx !== -1 ? valueIdx : 1;
  return {
    labels: data.data.rows.map((row) => String(row[xIndex])),
    values: data.data.rows.map((row) => Number(row[yIndex]))
  };
}

// ─── Implementation ────────────────────────────────────────────────────────────

interface MetabaseAPIOptions {
  domain: string;
  apiToken: string;
}

class MetabaseAPI implements MetabaseService {
  private readonly http;

  constructor(opts: MetabaseAPIOptions) {
    this.http = axios.create({
      baseURL: opts.domain,
      headers: { 'X-Api-Key': opts.apiToken },
      timeout: 10_000
    });
  }

  async fetchDashboardRaw(id: number): Promise<MetabaseDashboardRaw> {
    const { data } = await this.http.get<MetabaseDashboardRaw>(
      `/api/dashboard/${id}`
    );
    return data;
  }

  async getDashboard(id: number): Promise<DashboardData> {
    return normalizeDashboard(await this.fetchDashboardRaw(id));
  }

  async findDashcard(
    dashboardId: number,
    dashcardId: number
  ): Promise<DashcardRef | null> {
    return findDashcardRef(await this.fetchDashboardRaw(dashboardId), dashcardId);
  }

  async getCardValue(
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
  ): Promise<CardValue> {
    const { data } = await this.http.post<MetabaseQueryResult>(
      `/api/dashboard/${dashboardId}/dashcard/${dashcardId}/card/${cardId}/query`,
      { parameters }
    );

    if (cardType === 'pie-chart') {
      const result: PieChartValue = {
        labels: data.data.rows.map((row) => String(row[0])),
        data: data.data.rows.map((row) => Number(row[1]))
      };
      return result;
    }

    if (cardType === 'bar-chart') {
      if (direction === null) {
        throw new Error('direction is required for bar-chart card type');
      }
      const { labels, values } = extractAxisValues(data, labelColumn, valueColumn);
      const result: BarChartValue = {
        direction,
        format,
        decimals,
        labels,
        data: scaleForFormat(values, format)
      };
      return result;
    }

    if (cardType === 'line-chart') {
      const { labels, values } = extractAxisValues(data, labelColumn, valueColumn);
      const result: LineChartValue = {
        format,
        decimals,
        labels,
        data: scaleForFormat(values, format)
      };
      return result;
    }

    if (cardType === 'table') {
      if (tableColumns === null) {
        throw new Error('tableColumns is required for table card type');
      }
      // Refs: PM curation, or empty → use every query column in query order.
      const effectiveRefs: TableColumnRef[] =
        tableColumns.length > 0
          ? [...tableColumns]
          : data.data.cols.map((c) => ({ name: c.name }));

      const columns: TableColumnMeta[] = effectiveRefs.flatMap((ref) => {
        const index = data.data.cols.findIndex((c) => c.name === ref.name);
        if (index === -1) return [];
        const col = data.data.cols[index];
        return [
          {
            name: ref.name,
            displayName: ref.columnTitle ?? col.display_name ?? ref.name,
            baseType: normalizeBaseType(col.base_type),
            ...(ref.decimals !== undefined && { decimals: ref.decimals }),
            ...(ref.suffix !== undefined && { suffix: ref.suffix }),
            ...(ref.numberStyle !== undefined && {
              numberStyle: ref.numberStyle as TableColumnMeta['numberStyle']
            })
          }
        ];
      });

      const indices = columns.map((c) =>
        data.data.cols.findIndex((qc) => qc.name === c.name)
      );
      const rows = data.data.rows.map((row) => indices.map((i) => row[i]));

      const result: TableValue = { columns, rows };
      return result;
    }

    const colIndex = valueColumn
      ? data.data.cols.findIndex((c) => c.name === valueColumn)
      : -1;
    return data.data.rows[0][colIndex !== -1 ? colIndex : 0] as number;
  }
}

export function createMetabaseAPI(opts: MetabaseAPIOptions): MetabaseService {
  return new MetabaseAPI(opts);
}

export const metabaseAPI = createMetabaseAPI({
  domain: config.metabase.domain,
  apiToken: config.metabase.apiToken
});
