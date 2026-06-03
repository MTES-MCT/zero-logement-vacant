import axios from 'axios';

import type { DashboardCard, Tab } from '@zerologementvacant/models';
import config from '~/infra/config';
import type { DashboardData, DashcardRef, MetabaseService } from './metabase-service';

// ─── Metabase internal types (minimal subset) ─────────────────────────────────

interface MetabaseVisualizationSettings {
  'number.style'?: string;
  'scalar.decimals'?: number;
  column_settings?: Record<string, { number_style?: string; decimals?: number }>;
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
}

interface MetabaseQueryResult {
  data: { rows: unknown[][] };
}

// ─── Normalization helpers ─────────────────────────────────────────────────────

function detectCardType(
  settings: MetabaseVisualizationSettings
): 'flat-number' | 'percentage' {
  if (settings['number.style'] === 'percent') return 'percentage';
  const hasPercentColumn = Object.values(settings.column_settings ?? {}).some(
    (col) => col.number_style === 'percent'
  );
  return hasPercentColumn ? 'percentage' : 'flat-number';
}

function detectDecimals(settings: MetabaseVisualizationSettings): number {
  if (settings['scalar.decimals'] !== undefined) return settings['scalar.decimals'];
  return (
    Object.values(settings.column_settings ?? {}).find((col) => col.decimals !== undefined)
      ?.decimals ?? 0
  );
}

function normalizeDashcard(dashcard: MetabaseDashcard): DashboardCard | null {
  if (dashcard.card === null || dashcard.card.display !== 'scalar') return null;
  const { card } = dashcard;
  return {
    id: dashcard.id,
    type: detectCardType(card.visualization_settings),
    title: dashcard.visualization_settings['card.title'] ?? card.name,
    description: card.description,
    decimals: detectDecimals(card.visualization_settings),
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
  if (!found || found.card_id === null || normalizeDashcard(found) === null) return null;
  return { dashcardId: found.id, cardId: found.card_id };
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
    cardId: number
  ): Promise<number> {
    const { data } = await this.http.post<MetabaseQueryResult>(
      `/api/dashboard/${dashboardId}/dashcard/${dashcardId}/card/${cardId}/query`,
      { parameters: [] }
    );
    return data.data.rows[0][0] as number;
  }
}

export function createMetabaseAPI(opts: MetabaseAPIOptions): MetabaseService {
  return new MetabaseAPI(opts);
}

export const metabaseAPI = createMetabaseAPI({
  domain: config.metabase.domain,
  apiToken: config.metabase.apiToken
});
