import type {
  DashboardCard,
  Tab
} from '@zerologementvacant/models';
import UnprocessableEntityError from '~/errors/unprocessableEntityError';

// ─── Metabase internal types (minimal subset) ────────────────────────────────

interface MetabaseVisualizationSettings {
  'number.style'?: string;
  'scalar.decimals'?: number;
  column_settings?: Record<
    string,
    { number_style?: string; decimals?: number }
  >;
}

interface MetabaseCard {
  id: number;
  name: string;
  display: string;
  description: string | null;
  visualization_settings: MetabaseVisualizationSettings;
}

interface MetabaseDashcard {
  id: number;
  card_id: number;
  row: number;
  col: number;
  size_x: number;
  size_y: number;
  card: MetabaseCard;
}

interface MetabaseTab {
  id: number;
  name: string;
  ordered_cards: MetabaseDashcard[];
}

interface MetabaseDashboard {
  id: number;
  ordered_tabs?: MetabaseTab[];
  dashcards: MetabaseDashcard[];
}

interface MetabaseQueryResult {
  data: { rows: unknown[][] };
  status: string;
}

// ─── Slug → numeric ID ───────────────────────────────────────────────────────

export function getResource(id: string): number {
  switch (id) {
    case '6-utilisateurs-de-zlv-sur-votre-structure':
      return 6;
    case '7-autres-structures-de-votre-territoires-inscrites-sur-zlv':
      return 7;
    case '13-analyses':
      return 13;
    case '15-analyses-activites':
      return 15;
    default:
      throw new UnprocessableEntityError();
  }
}

// ─── Embed URL (transitional — remove when new-analysis-page flag is removed) ─

interface CreateURLOptions {
  domain: string;
  token: string;
}

export function createURL(opts: CreateURLOptions): string {
  return `${opts.domain}/embed/dashboard/${opts.token}#bordered=true&titled=false`;
}

// ─── Metabase API client ──────────────────────────────────────────────────────

export async function fetchMetabaseDashboard(
  numericId: number,
  domain: string,
  apiToken: string
): Promise<MetabaseDashboard> {
  const response = await fetch(`${domain}/api/dashboard/${numericId}`, {
    headers: { 'X-Api-Key': apiToken }
  });
  if (!response.ok) {
    throw new Error(`Metabase API error: ${response.status}`);
  }
  return response.json() as Promise<MetabaseDashboard>;
}

export async function fetchCardQueryData(opts: {
  dashboardId: number;
  dashcardId: number;
  cardId: number;
  domain: string;
  apiToken: string;
}): Promise<number> {
  const { dashboardId, dashcardId, cardId, domain, apiToken } = opts;
  const response = await fetch(
    `${domain}/api/dashboard/${dashboardId}/dashcard/${dashcardId}/card/${cardId}/query`,
    {
      method: 'POST',
      headers: {
        'X-Api-Key': apiToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ parameters: [] })
    }
  );
  if (!response.ok) {
    throw new Error(`Metabase card query error: ${response.status}`);
  }
  const result = (await response.json()) as MetabaseQueryResult;
  return result.data.rows[0][0] as number;
}

// ─── Normalization ────────────────────────────────────────────────────────────

function detectCardType(
  settings: MetabaseVisualizationSettings
): 'flat-number' | 'percentage' {
  if (settings['number.style'] === 'percent') return 'percentage';
  const hasPercentColumn = Object.values(
    settings.column_settings ?? {}
  ).some((col) => col.number_style === 'percent');
  return hasPercentColumn ? 'percentage' : 'flat-number';
}

function detectDecimals(settings: MetabaseVisualizationSettings): number {
  if (settings['scalar.decimals'] !== undefined) {
    return settings['scalar.decimals'];
  }
  return (
    Object.values(settings.column_settings ?? {}).find(
      (col) => col.decimals !== undefined
    )?.decimals ?? 0
  );
}

function normalizeDashcard(dashcard: MetabaseDashcard): DashboardCard | null {
  if (dashcard.card.display !== 'scalar') return null;
  const { card } = dashcard;
  return {
    id: dashcard.id,
    type: detectCardType(card.visualization_settings),
    title: card.name,
    description: card.description,
    decimals: detectDecimals(card.visualization_settings),
    position: { col: dashcard.col, row: dashcard.row },
    size: { width: dashcard.size_x, height: dashcard.size_y }
  };
}

export function normalizeDashboard(
  raw: MetabaseDashboard
): { tabs: ReadonlyArray<Tab> } | { cards: ReadonlyArray<DashboardCard> } {
  if (raw.ordered_tabs && raw.ordered_tabs.length > 0) {
    const tabs: Tab[] = raw.ordered_tabs.map((tab) => ({
      id: tab.id,
      title: tab.name,
      cards: tab.ordered_cards
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

export function findDashcard(
  raw: MetabaseDashboard,
  dashcardId: number
): { dashcardId: number; cardId: number } | null {
  const allDashcards =
    raw.ordered_tabs?.length
      ? raw.ordered_tabs.flatMap((t) => t.ordered_cards)
      : raw.dashcards;
  const found = allDashcards.find((dc) => dc.id === dashcardId);
  if (!found) return null;
  if (normalizeDashcard(found) === null) return null;
  return { dashcardId: found.id, cardId: found.card_id };
}
