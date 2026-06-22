import type {
  DashboardCard,
  Tab,
  TableColumnMeta
} from '@zerologementvacant/models';

import type {
  DashboardData,
  DashboardParameter,
  DashcardRef,
  MetabaseColumnSettings,
  MetabaseDashboardRaw,
  MetabaseDashcard,
  MetabaseDashcardVisualizationSettings,
  MetabaseVisualizationSettings,
  TableColumnRef
} from './metabase-service';

function mergeVisualizationSettings(
  card: MetabaseVisualizationSettings,
  dashcard: MetabaseDashcardVisualizationSettings
): MetabaseVisualizationSettings {
  return {
    ...card,
    ...(dashcard['number.style'] !== undefined && {
      'number.style': dashcard['number.style']
    }),
    ...(dashcard['scalar.field'] !== undefined && {
      'scalar.field': dashcard['scalar.field']
    }),
    ...(dashcard['table.columns'] !== undefined && {
      'table.columns': dashcard['table.columns']
    }),
    ...(dashcard['graph.dimensions'] !== undefined && {
      'graph.dimensions': dashcard['graph.dimensions']
    }),
    ...(dashcard['graph.metrics'] !== undefined && {
      'graph.metrics': dashcard['graph.metrics']
    }),
    column_settings: {
      ...(card.column_settings ?? {}),
      ...(dashcard.column_settings ?? {})
    }
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

function resolveAxisColumns(settings: MetabaseVisualizationSettings): {
  labelColumn: string | null;
  valueColumn: string | null;
} {
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
  const isPercent =
    col.suffix?.includes('%') === true || col.number_style === 'percent';
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
  if (settings['scalar.decimals'] !== undefined)
    return settings['scalar.decimals'];
  const col = activeColumnSettings(settings);
  return col?.decimals ?? 0;
}

export function normalizeBaseType(
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

// Metabase "visualizer" dashcards nest their real settings — including the
// card.title / card.description overrides — under visualization.settings rather
// than on visualization_settings directly. Resolve to whichever holds them.
function dashcardSettings(
  dashcard: MetabaseDashcard
): MetabaseDashcardVisualizationSettings {
  return (
    dashcard.visualization_settings.visualization?.settings ??
    dashcard.visualization_settings
  );
}

function normalizeDashcard(dashcard: MetabaseDashcard): DashboardCard | null {
  if (dashcard.card === null) return null;
  const { card } = dashcard;

  const overrides = dashcardSettings(dashcard);
  const title = overrides['card.title'] ?? card.name;
  const description = overrides['card.description'] ?? card.description;
  const position = { col: dashcard.col, row: dashcard.row };
  const size = { width: dashcard.size_x, height: dashcard.size_y };

  if (card.display === 'pie') {
    return {
      id: dashcard.id,
      type: 'pie-chart',
      title,
      description,
      decimals: 0,
      position,
      size
    };
  }

  if (card.display === 'bar' || card.display === 'row') {
    return {
      id: dashcard.id,
      type: 'bar-chart',
      title,
      description,
      decimals: 0,
      position,
      size
    };
  }

  if (card.display === 'table') {
    return {
      id: dashcard.id,
      type: 'table',
      title,
      description,
      decimals: 0,
      position,
      size
    };
  }

  if (card.display === 'line') {
    return {
      id: dashcard.id,
      type: 'line-chart',
      title,
      description,
      decimals: 0,
      position,
      size
    };
  }

  if (card.display !== 'scalar') return null;

  const settings = mergeVisualizationSettings(
    card.visualization_settings,
    overrides
  );
  return {
    id: dashcard.id,
    type: detectCardType(settings),
    title,
    description,
    decimals: detectDecimals(settings),
    position,
    size
  };
}

export function normalizeDashboard(raw: MetabaseDashboardRaw): DashboardData {
  // A single Metabase tab is not worth a tab UI: flatten it to cards so the
  // frontend renders them directly. Only expose tabs when there's a real
  // multi-tab choice.
  if (raw.tabs && raw.tabs.length > 1) {
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
  // Only forward dashboard parameters this dashcard actually maps. Metabase
  // 400s if we send a parameter the card has no mapping for (e.g. a global
  // count not scoped to the establishment filter).
  const mappedParameterIds = new Set(
    (found.parameter_mappings ?? []).map((m) => m.parameter_id)
  );
  const dashboardParameters = (raw.parameters ?? [])
    .filter((p) => mappedParameterIds.has(p.id))
    .map((p): DashboardParameter => ({ id: p.id, slug: p.slug, type: p.type }));

  if (normalized.type === 'pie-chart') {
    // pie.rows carries the PM-curated key→name relabeling (e.g. APPART →
    // Appartements). It lives in the dashcard's (visualizer-aware) settings,
    // falling back to the underlying card's settings.
    const pieRows =
      dashcardSettings(found)['pie.rows'] ??
      found.card!.visualization_settings['pie.rows'] ??
      [];
    const labelMap: Record<string, string> = {};
    for (const { key, name } of pieRows) {
      if (name !== undefined) {
        labelMap[key] = name;
      }
    }
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
      labelMap: Object.keys(labelMap).length > 0 ? labelMap : null,
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
      labelMap: null,
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
      labelMap: null,
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
    labelMap: null,
    dashboardParameters
  };
}
