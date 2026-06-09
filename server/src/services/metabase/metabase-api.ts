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
  MetabaseService,
  PieChartValue,
  TableColumnRef,
  TableValue
} from './metabase-service';

// ─── Metabase internal types (minimal subset) ─────────────────────────────────

interface MetabaseColumnSettings {
  number_style?: string;
  decimals?: number;
  suffix?: string;
  column_title?: string;
}

interface MetabaseVisualizationSettings {
  'number.style'?: string;
  'scalar.decimals'?: number;
  'scalar.field'?: string;
  'table.columns'?: Array<{ name: string; enabled: boolean }>;
  column_settings?: Record<string, MetabaseColumnSettings>;
}

interface MetabaseCard {
  id: number;
  name: string;
  display: string;
  description: string | null;
  visualization_settings: MetabaseVisualizationSettings;
}

interface MetabaseDashcardVisualizationSettings {
  'card.title'?: string | null;
  'number.style'?: string;
  'scalar.field'?: string;
  'table.columns'?: Array<{ name: string; enabled: boolean }>;
  column_settings?: Record<string, MetabaseColumnSettings>;
}

interface MetabaseDashcard {
  id: number;
  card_id: number | null;
  dashboard_tab_id: number | null;
  row: number;
  col: number;
  size_x: number;
  size_y: number;
  visualization_settings: MetabaseDashcardVisualizationSettings;
  card: MetabaseCard | null;
}

interface MetabaseTab {
  id: number;
  name: string;
  position: number;
}

interface MetabaseDashboardRaw {
  id: number;
  tabs?: MetabaseTab[];
  dashcards: MetabaseDashcard[];
  parameters?: Array<{ id: string; slug: string; type: string }>;
}

interface MetabaseCol {
  name: string;
  display_name?: string;
  base_type?: string;
}

interface MetabaseQueryResult {
  data: { rows: unknown[][]; cols: MetabaseCol[] };
}

// ─── Normalization helpers ─────────────────────────────────────────────────────

function mergeVisualizationSettings(
  card: MetabaseVisualizationSettings,
  dashcard: MetabaseDashcardVisualizationSettings
): MetabaseVisualizationSettings {
  return {
    ...card,
    ...(dashcard['number.style'] !== undefined && { 'number.style': dashcard['number.style'] }),
    ...(dashcard['scalar.field'] !== undefined && { 'scalar.field': dashcard['scalar.field'] }),
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

function normalizeDashboard(raw: MetabaseDashboardRaw): DashboardData {
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

function findDashcardRef(
  raw: MetabaseDashboardRaw,
  dashcardId: number
): DashcardRef | null {
  const found = raw.dashcards.find((dc) => dc.id === dashcardId);
  if (!found || found.card_id === null) return null;
  const normalized = normalizeDashcard(found);
  if (!normalized) return null;

  if (normalized.type === 'pie-chart') {
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: 'pie-chart',
      valueColumn: null,
      direction: null,
      dashboardParameters: (raw.parameters ?? []).map(
        (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
      )
    };
  }

  if (normalized.type === 'bar-chart') {
    return {
      dashcardId: found.id,
      cardId: found.card_id,
      type: 'bar-chart',
      valueColumn: null,
      direction: found.card!.display === 'bar' ? 'vertical' : 'horizontal',
      dashboardParameters: (raw.parameters ?? []).map(
        (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
      )
    };
  }

  const settings = mergeVisualizationSettings(
    found.card!.visualization_settings,
    found.visualization_settings
  );
  return {
    dashcardId: found.id,
    cardId: found.card_id,
    type: normalized.type,
    valueColumn: settings['scalar.field'] ?? null,
    direction: null,
    dashboardParameters: (raw.parameters ?? []).map(
      (p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type })
    )
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

  async getDashboard(id: number): Promise<DashboardData> {
    const { data } = await this.http.get<MetabaseDashboardRaw>(`/api/dashboard/${id}`);
    return normalizeDashboard(data);
  }

  async findDashcard(dashboardId: number, dashcardId: number): Promise<DashcardRef | null> {
    const { data } = await this.http.get<MetabaseDashboardRaw>(`/api/dashboard/${dashboardId}`);
    return findDashcardRef(data, dashcardId);
  }

  async getCardValue(
    dashboardId: number,
    dashcardId: number,
    cardId: number,
    parameters: ReadonlyArray<DashboardParameter & { value: string }>,
    valueColumn: string | null,
    cardType: CardType,
    direction: 'horizontal' | 'vertical' | null
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
      const result: BarChartValue = {
        direction,
        labels: data.data.rows.map((row) => String(row[0])),
        data: data.data.rows.map((row) => Number(row[1]))
      };
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
