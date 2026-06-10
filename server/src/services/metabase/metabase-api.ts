import axios from 'axios';

import type {
  CardType,
  TableColumnMeta
} from '@zerologementvacant/models';
import config from '~/infra/config';
import { createCachedMetabaseService } from './metabase-cache';
import {
  findDashcardRef,
  normalizeBaseType,
  normalizeDashboard
} from './metabase-normalize';
import type {
  BarChartValue,
  CardValue,
  DashboardData,
  DashboardParameter,
  DashcardRef,
  LineChartValue,
  MetabaseDashboardRaw,
  MetabaseQueryResult,
  MetabaseService,
  PieChartValue,
  TableColumnRef,
  TableValue
} from './metabase-service';

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

const baseMetabaseAPI = createMetabaseAPI({
  domain: config.metabase.domain,
  apiToken: config.metabase.apiToken
});

export const metabaseAPI = createCachedMetabaseService(baseMetabaseAPI, {
  ttlMs: config.metabase.cacheTtlMs,
  max: config.metabase.cacheMaxEntries
});
