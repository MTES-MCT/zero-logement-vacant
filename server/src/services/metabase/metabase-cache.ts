import { TTLCache } from '@isaacs/ttlcache';

import {
  findDashcardRef,
  normalizeDashboard
} from './metabase-api';
import type {
  CardValue,
  DashboardData,
  DashboardParameter,
  DashcardRef,
  MetabaseDashboardRaw,
  MetabaseService,
  TableColumnRef
} from './metabase-service';
import type { CardType, TableColumnMeta } from '@zerologementvacant/models';

export interface CacheOptions {
  ttlMs: number;
  max: number;
}

async function cached<K, V>(
  store: TTLCache<K, Promise<V>>,
  key: K,
  fetch: () => Promise<V>
): Promise<V> {
  const existing = store.get(key);
  if (existing) return existing;
  const promise = fetch().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, promise);
  return promise;
}

function cardKey(
  dashboardId: number,
  dashcardId: number,
  cardId: number,
  establishmentId: string
): string {
  return `${dashboardId}:${dashcardId}:${cardId}:${establishmentId}`;
}

class CachedMetabaseService implements MetabaseService {
  private readonly dashboardCache: TTLCache<number, Promise<MetabaseDashboardRaw>>;
  private readonly cardCache: TTLCache<string, Promise<CardValue>>;

  constructor(
    private readonly inner: MetabaseService,
    opts: CacheOptions
  ) {
    this.dashboardCache = new TTLCache({ ttl: opts.ttlMs, max: opts.max });
    this.cardCache = new TTLCache({ ttl: opts.ttlMs, max: opts.max });
  }

  fetchDashboardRaw(id: number): Promise<MetabaseDashboardRaw> {
    return cached(this.dashboardCache, id, () =>
      this.inner.fetchDashboardRaw(id)
    );
  }

  async getDashboard(id: number): Promise<DashboardData> {
    return normalizeDashboard(await this.fetchDashboardRaw(id));
  }

  async findDashcard(
    dashboardId: number,
    dashcardId: number
  ): Promise<DashcardRef | null> {
    return findDashcardRef(
      await this.fetchDashboardRaw(dashboardId),
      dashcardId
    );
  }

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
  ): Promise<CardValue> {
    const establishmentId =
      parameters.find((p) => p.slug === 'id')?.value ?? 'anonymous';
    const key = cardKey(dashboardId, dashcardId, cardId, establishmentId);
    return cached(this.cardCache, key, () =>
      this.inner.getCardValue(
        dashboardId,
        dashcardId,
        cardId,
        parameters,
        valueColumn,
        labelColumn,
        cardType,
        direction,
        format,
        decimals,
        tableColumns
      )
    );
  }

  clear(): void {
    this.dashboardCache.clear();
    this.cardCache.clear();
  }
}

export function createCachedMetabaseService(
  inner: MetabaseService,
  opts: CacheOptions
): MetabaseService & { clear: () => void } {
  return new CachedMetabaseService(inner, opts);
}

// Re-export so callers can import the type from the module they actually use.
export type { TableColumnMeta };
