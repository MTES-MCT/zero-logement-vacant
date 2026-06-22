import { constants } from 'node:http2';

import type { DashboardDTO } from '@zerologementvacant/models';
import nock from 'nock';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import config from '~/infra/config';
import { createServer } from '~/infra/server';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
import { metabaseAPI } from '~/services/metabase/metabase-api';

import { genEstablishmentApi, genUserApi } from '../../test/testFixtures';
import { tokenProvider } from '../../test/testUtils';

const establishment = genEstablishmentApi();
const user = genUserApi(establishment.id);

const METABASE_URL = config.metabase.domain;

const mockMetabaseDashboard = {
  id: 13,
  dashcards: [
    {
      id: 929,
      card_id: 771,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {},
      card: {
        id: 771,
        name: 'Total logements vacants',
        display: 'scalar',
        description: null,
        visualization_settings: { 'scalar.decimals': 0 }
      }
    }
  ]
};

// A dashboard with a single tab: the tab is not worth a tab UI, so it should
// be flattened to cards.
const mockMetabaseDashboardWithSingleTab = {
  id: 13,
  tabs: [{ id: 54, name: 'Portrait du parc vacant', position: 0 }],
  dashcards: [
    {
      id: 929,
      card_id: 771,
      dashboard_tab_id: 54,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {},
      card: {
        id: 771,
        name: 'Total logements vacants',
        display: 'scalar',
        description: null,
        visualization_settings: { 'scalar.decimals': 0 }
      }
    }
  ]
};

// A dashboard with two tabs: the tabs must be preserved.
const mockMetabaseDashboardWithTwoTabs = {
  id: 13,
  tabs: [
    { id: 54, name: 'Portrait du parc vacant', position: 0 },
    { id: 55, name: 'Évolution de la vacance', position: 1 }
  ],
  dashcards: [
    {
      id: 929,
      card_id: 771,
      dashboard_tab_id: 54,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {},
      card: {
        id: 771,
        name: 'Total logements vacants',
        display: 'scalar',
        description: null,
        visualization_settings: { 'scalar.decimals': 0 }
      }
    },
    {
      id: 930,
      card_id: 772,
      dashboard_tab_id: 55,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {},
      card: {
        id: 772,
        name: 'Évolution',
        display: 'scalar',
        description: null,
        visualization_settings: { 'scalar.decimals': 0 }
      }
    }
  ]
};

// Dashboard with an `id` parameter and two scalar cards: dashcard 915 does NOT
// map the parameter (a global count), dashcard 916 does. Forwarding the
// parameter to an unmapped card makes Metabase return 400.
const mockMetabaseDashboardWithUnmappedParameter = {
  id: 13,
  parameters: [{ id: '5ce08038', slug: 'id', type: 'string/contains' }],
  dashcards: [
    {
      id: 915,
      card_id: 764,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      parameter_mappings: [],
      visualization_settings: {},
      card: {
        id: 764,
        name: 'Nombre de logements',
        display: 'scalar',
        description: null,
        visualization_settings: {}
      }
    },
    {
      id: 916,
      card_id: 765,
      dashboard_tab_id: null,
      row: 0,
      col: 6,
      size_x: 6,
      size_y: 4,
      parameter_mappings: [{ parameter_id: '5ce08038', card_id: 765 }],
      visualization_settings: {},
      card: {
        id: 765,
        name: 'Logements de la structure',
        display: 'scalar',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

// Scalar card with table.columns configured and column_settings containing % —
// the % is a per-column table override, not a scalar format signal, so it
// must NOT be classified as percentage (regression guard for false-positive detection).
const mockMetabaseDashboardWithPercentColumnSettings = {
  id: 13,
  dashcards: [
    {
      id: 930,
      card_id: 772,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {},
      card: {
        id: 772,
        name: 'Total logements vacants >2 ans',
        display: 'scalar',
        description: null,
        visualization_settings: {
          'scalar.decimals': 0,
          'table.columns': [{ name: 'count', enabled: false }],
          column_settings: {
            '["name","count"]': { suffix: '%', number_style: 'percent' }
          }
        }
      }
    }
  ]
};

// Scalar card with no table.columns but column_settings containing % —
// column_settings IS the scalar format signal here, so it MUST be classified as percentage.
const mockMetabaseDashboardWithPercentScalarCard = {
  id: 13,
  dashcards: [
    {
      id: 931,
      card_id: 773,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {},
      card: {
        id: 773,
        name: 'Taux de retour a <6mois',
        display: 'scalar',
        description: null,
        visualization_settings: {
          'scalar.decimals': 1,
          column_settings: {
            '["name","rate"]': { number_style: 'percent' }
          }
        }
      }
    }
  ]
};

const mockMetabaseDashboardWithPieCard = {
  id: 13,
  dashcards: [
    {
      id: 950,
      card_id: 801,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: { 'card.title': 'Répartition par type' },
      card: {
        id: 801,
        name: 'Répartition par type',
        display: 'pie',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

// Pie dashcard using Metabase's "visualizer" format: the settings — including
// the card.title / card.description overrides — are nested under
// visualization_settings.visualization.settings instead of at the top level.
const mockMetabaseDashboardWithVisualizerPieCard = {
  id: 13,
  dashcards: [
    {
      id: 951,
      card_id: 802,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 16,
      size_y: 4,
      visualization_settings: {
        visualization: {
          display: 'pie',
          settings: {
            'card.title': 'Répartition par type de logements vacants',
            'card.description': 'En valeur relative et absolue',
            'pie.rows': [
              { key: 'APPART', name: 'Appartements', enabled: true },
              { key: 'MAISON', name: 'Maisons', enabled: true }
            ]
          }
        }
      },
      card: {
        id: 802,
        name: '[ANALYSE-parc] Répartition par type de logements (2026)',
        display: 'pie',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockCardQueryResult = {
  data: { rows: [[51884]], cols: [{ name: 'count' }] },
  status: 'completed'
};

// Multi-column scalar dashcard using scalar.field to pick the percentage column
const mockMetabaseDashboardScalarField = {
  id: 13,
  dashcards: [
    {
      id: 932,
      card_id: 774,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {
        'scalar.field': 'TAUX de retour <6 mois',
        'card.title': 'Taux de retour à <6 mois',
        'table.columns': [
          { name: 'sum', enabled: true },
          { name: 'TAUX de retour <6 mois', enabled: true }
        ],
        column_settings: {
          '["name","TAUX de retour <6 mois"]': { decimals: 1, suffix: ' %' }
        }
      },
      card: {
        id: 774,
        name: 'Taux campagnes',
        display: 'scalar',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockMultiColQueryResult = {
  data: {
    rows: [[14939, 0]],
    cols: [{ name: 'sum' }, { name: 'TAUX de retour <6 mois' }]
  },
  status: 'completed'
};

const mockPieCardQueryResult = {
  data: {
    rows: [
      ['APPART', 4876],
      ['MAISON', 652]
    ],
    cols: [{ name: 'housing_kind' }, { name: 'count' }]
  },
  status: 'completed'
};

const mockMetabaseDashboardWithBarCard = {
  id: 13,
  dashcards: [
    {
      id: 960,
      card_id: 810,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {
        'card.title': 'Répartition par date de construction'
      },
      card: {
        id: 810,
        name: 'Répartition par date de construction',
        display: 'bar',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockMetabaseDashboardWithRowCard = {
  id: 13,
  dashcards: [
    {
      id: 961,
      card_id: 811,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: { 'card.title': 'Répartition horizontale' },
      card: {
        id: 811,
        name: 'Répartition horizontale',
        display: 'row',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockBarCardQueryResult = {
  data: {
    rows: [
      ['1991 et apres', 3200],
      ['1946 - 1990', 1800]
    ],
    cols: [{ name: 'period' }, { name: 'count', display_name: 'Nombre' }]
  },
  status: 'completed'
};

const mockMetabaseDashboardWithLineCard = {
  id: 13,
  dashcards: [
    {
      id: 970,
      card_id: 820,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: {
        'card.title': 'Évolution du taux de logements vacants >2 ans'
      },
      card: {
        id: 820,
        name: 'Évolution du taux de logements vacants >2 ans',
        display: 'line',
        description: null,
        visualization_settings: {
          'graph.dimensions': ['year'],
          'graph.metrics': ['taux_logements-vacants'],
          column_settings: {
            '["name","taux_logements-vacants"]': {
              decimals: 1,
              number_style: 'decimal',
              suffix: ' %'
            }
          }
        }
      }
    }
  ]
};

const mockLineCardQueryResult = {
  data: {
    rows: [
      [2019, 24585, 210072, 1.7889104687916526],
      [2020, 24641, 211703, 1.7543445298366107],
      [2021, 22084, 215607, 1.7916857986985582]
    ],
    cols: [
      { name: 'year' },
      { name: 'count_vacant_housing_private' },
      { name: 'count_housing_private' },
      {
        name: 'taux_logements-vacants',
        display_name: 'Taux de logements vacants >2 ans'
      }
    ]
  },
  status: 'completed'
};

const mockMetabaseDashboardWithLineCardNumber = {
  id: 13,
  dashcards: [
    {
      id: 971,
      card_id: 821,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
      visualization_settings: { 'card.title': 'Évolution simple' },
      card: {
        id: 821,
        name: 'Évolution simple',
        display: 'line',
        description: null,
        visualization_settings: {
          'graph.dimensions': ['year'],
          'graph.metrics': ['count']
        }
      }
    }
  ]
};

const mockLineCardQueryResultNumber = {
  data: {
    rows: [
      [2024, 120],
      [2025, 145]
    ],
    cols: [{ name: 'year' }, { name: 'count' }]
  },
  status: 'completed'
};

const mockMetabaseDashboardWithTableCard = {
  id: 13,
  dashcards: [
    {
      id: 980,
      card_id: 830,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 12,
      size_y: 6,
      visualization_settings: { 'card.title': 'Statistiques par EPCI' },
      card: {
        id: 830,
        name: 'Statistiques par EPCI',
        display: 'table',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

// Table dashcard with PM-curated columns: count is hidden, code is shown
// with a French header override, and rate is formatted as a percentage.
const mockMetabaseDashboardWithCuratedTable = {
  id: 13,
  dashcards: [
    {
      id: 981,
      card_id: 831,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 12,
      size_y: 6,
      visualization_settings: {
        'card.title': 'Taux par EPCI',
        'table.columns': [
          { name: 'code', enabled: true },
          { name: 'count', enabled: false },
          { name: 'rate', enabled: true }
        ],
        column_settings: {
          '["name","code"]': { column_title: 'Code EPCI' },
          '["name","rate"]': {
            number_style: 'percent',
            decimals: 1,
            suffix: ' %'
          }
        }
      },
      card: {
        id: 831,
        name: 'Taux par EPCI',
        display: 'table',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockCuratedTableQueryResult = {
  data: {
    rows: [
      ['200054807', 42, 0.123],
      ['243500139', 18, 0.087]
    ],
    cols: [
      { name: 'code', display_name: 'EPCI Code', base_type: 'type/Text' },
      { name: 'count', display_name: 'Count', base_type: 'type/BigInteger' },
      { name: 'rate', display_name: 'Rate', base_type: 'type/Float' }
    ]
  },
  status: 'completed'
};

// Table dashcard with no `table.columns` configured — fallback to all query cols.
const mockMetabaseDashboardWithRawTable = {
  id: 13,
  dashcards: [
    {
      id: 982,
      card_id: 832,
      dashboard_tab_id: null,
      row: 0,
      col: 0,
      size_x: 12,
      size_y: 6,
      visualization_settings: { 'card.title': 'Logements bruts' },
      card: {
        id: 832,
        name: 'Logements bruts',
        display: 'table',
        description: null,
        visualization_settings: {}
      }
    }
  ]
};

const mockRawTableQueryResult = {
  data: {
    rows: [
      ['APPART', 4876],
      ['MAISON', 652]
    ],
    cols: [
      { name: 'housing_kind', display_name: 'Type', base_type: 'type/Text' },
      { name: 'count', display_name: 'Count', base_type: 'type/BigInteger' }
    ]
  },
  status: 'completed'
};

describe('Dashboard API', () => {
  let url: string;

  beforeAll(async () => {
    url = await createServer().testing();
    await Establishments().insert(formatEstablishmentApi(establishment));
    await Users().insert(toUserDBO(user));
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    // Cached MetabaseService keeps promises alive across tests. Without this,
    // a cached response from one test leaks into the next.
    (metabaseAPI as unknown as { clear: () => void }).clear();
  });

  describe('GET /dashboards/:id', () => {
    it('returns DashboardDTO with url and cards', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect(body.id).toBe(13);
      expect(body.url).toMatch(/embed\/dashboard/);
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0].id).toBe(929);
        expect(body.cards[0].type).toBe('flat-number');
        expect(body.cards[0].title).toBe('Total logements vacants');
      }
    });

    it('flattens a single-tab dashboard to cards instead of exposing one tab', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithSingleTab);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('tabs' in body).toBe(false);
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0].id).toBe(929);
      }
    });

    it('exposes tabs when the dashboard has more than one tab', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithTwoTabs);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('tabs' in body).toBe(true);
      if ('tabs' in body) {
        expect(body.tabs).toHaveLength(2);
        expect(body.tabs[0].title).toBe('Portrait du parc vacant');
        expect(body.tabs[0].cards).toHaveLength(1);
        expect(body.tabs[1].cards[0].id).toBe(930);
      }
    });

    it('classifies scalar card as flat-number when table.columns is set and column_settings has %', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithPercentColumnSettings);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      if ('cards' in body) {
        expect(body.cards[0].type).toBe('flat-number');
      }
    });

    it('classifies multi-column scalar as percentage using scalar.field column settings', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardScalarField);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      if ('cards' in body) {
        expect(body.cards[0].type).toBe('percentage');
        expect(body.cards[0].decimals).toBe(1);
        expect(body.cards[0].title).toBe('Taux de retour à <6 mois');
      }
    });

    it('classifies scalar card as percentage when no table.columns and column_settings has %', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithPercentScalarCard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      if ('cards' in body) {
        expect(body.cards[0].type).toBe('percentage');
      }
    });

    it('returns a pie-chart card from the dashboard', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithPieCard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0]).toMatchObject({
          id: 950,
          type: 'pie-chart',
          title: 'Répartition par type'
        });
      }
    });

    it('uses the visualizer-nested card.title and card.description override for a pie card', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithVisualizerPieCard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards[0]).toMatchObject({
          id: 951,
          type: 'pie-chart',
          title: 'Répartition par type de logements vacants',
          description: 'En valeur relative et absolue'
        });
      }
    });

    it('returns a bar-chart card when display is "bar"', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithBarCard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0]).toMatchObject({
          id: 960,
          type: 'bar-chart',
          title: 'Répartition par date de construction'
        });
      }
    });

    it('returns a bar-chart card when display is "row"', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithRowCard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0]).toMatchObject({
          id: 961,
          type: 'bar-chart',
          title: 'Répartition horizontale'
        });
      }
    });

    it('returns a line-chart card when display is "line"', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithLineCard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0]).toMatchObject({
          id: 970,
          type: 'line-chart',
          title: 'Évolution du taux de logements vacants >2 ans'
        });
      }
    });

    it('returns a table card when display is "table"', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithTableCard);

      const response = await request(url)
        .get('/dashboards/13-analyses')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as DashboardDTO;
      expect('cards' in body).toBe(true);
      if ('cards' in body) {
        expect(body.cards).toHaveLength(1);
        expect(body.cards[0]).toMatchObject({
          id: 980,
          type: 'table',
          title: 'Statistiques par EPCI'
        });
      }
    });

    it('returns 422 for unknown slug', async () => {
      const response = await request(url)
        .get('/dashboards/unknown-slug')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
    });
  });

  describe('GET /dashboards/:did/cards/:cid', () => {
    it('does not forward a dashboard parameter the dashcard does not map', async () => {
      let sentBody: unknown;
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithUnmappedParameter);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/915/card/764/query', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, mockCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/915')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(sentBody).toEqual({ parameters: [] });
    });

    it('forwards a dashboard parameter the dashcard maps', async () => {
      let sentBody: { parameters: Array<{ slug: string }> } | undefined;
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithUnmappedParameter);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/916/card/765/query', (body) => {
          sentBody = body;
          return true;
        })
        .reply(200, mockCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/916')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(sentBody?.parameters).toHaveLength(1);
      expect(sentBody?.parameters[0]).toMatchObject({
        id: '5ce08038',
        slug: 'id',
        type: 'string/contains'
      });
    });

    it('returns CardDataDTO for a scalar dashcard', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboard);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/929/card/771/query')
        .reply(200, mockCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/929')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 929,
        type: 'flat-number',
        data: 51884
      });
    });

    it('returns value from scalar.field column for multi-column query result', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardScalarField);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/932/card/774/query')
        .reply(200, mockMultiColQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/932')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 932,
        type: 'percentage',
        data: 0
      });
    });

    it('returns PieChartDataDTO for a pie-chart dashcard', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithPieCard);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/950/card/801/query')
        .reply(200, mockPieCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/950')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 950,
        type: 'pie-chart',
        labels: ['APPART', 'MAISON'],
        data: [4876, 652]
      });
    });

    it('relabels pie-chart labels using pie.rows display names', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithVisualizerPieCard);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/951/card/802/query')
        .reply(200, mockPieCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/951')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 951,
        type: 'pie-chart',
        labels: ['Appartements', 'Maisons'],
        data: [4876, 652]
      });
    });

    it('returns BarChartDataDTO with direction "vertical" for display "bar"', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithBarCard);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/960/card/810/query')
        .reply(200, mockBarCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/960')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 960,
        type: 'bar-chart',
        direction: 'vertical',
        format: 'number',
        decimals: 0,
        labels: ['1991 et apres', '1946 - 1990'],
        data: [3200, 1800],
        name: 'Nombre'
      });
    });

    it('returns BarChartDataDTO with direction "horizontal" for display "row"', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithRowCard);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/961/card/811/query')
        .reply(200, mockBarCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/961')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 961,
        type: 'bar-chart',
        direction: 'horizontal',
        format: 'number',
        decimals: 0,
        labels: ['1991 et apres', '1946 - 1990'],
        data: [3200, 1800]
      });
    });

    it('returns LineChartDataDTO with percent format for a percent-suffixed y column', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithLineCard);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/970/card/820/query')
        .reply(200, mockLineCardQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/970')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 970,
        type: 'line-chart',
        format: 'percent',
        decimals: 1,
        name: 'Taux de logements vacants >2 ans',
        labels: ['2019', '2020', '2021'],
        // Percent values are stored as display values in Metabase (1.79 for 1.79%)
        // and divided by 100 in the response to match the scalar percentage
        // convention. expect.closeTo absorbs IEEE-754 drift from the divide.
        data: [
          expect.closeTo(0.017889, 5),
          expect.closeTo(0.017543, 5),
          expect.closeTo(0.017917, 5)
        ]
      });
    });

    it('returns LineChartDataDTO with number format by default', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithLineCardNumber);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/971/card/821/query')
        .reply(200, mockLineCardQueryResultNumber);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/971')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 971,
        type: 'line-chart',
        format: 'number',
        decimals: 0,
        labels: ['2024', '2025'],
        data: [120, 145]
      });
    });

    it('returns TableDataDTO with curated columns and per-column settings', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithCuratedTable);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/981/card/831/query')
        .reply(200, mockCuratedTableQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/981')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 981,
        type: 'table',
        columns: [
          {
            name: 'code',
            displayName: 'Code EPCI', // column_title override wins
            baseType: 'string'
          },
          {
            name: 'rate',
            displayName: 'Rate', // falls back to col.display_name
            baseType: 'number',
            decimals: 1,
            suffix: ' %',
            numberStyle: 'percent'
          }
        ],
        // 'count' is filtered out because table.columns[].enabled = false.
        // Rows are aligned to the curated column order: [code, rate].
        rows: [
          ['200054807', 0.123],
          ['243500139', 0.087]
        ]
      });
      expect(response.body.columns).toHaveLength(2);
    });

    it('returns TableDataDTO with every query column when table.columns is absent', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboardWithRawTable);
      nock(METABASE_URL)
        .post('/api/dashboard/13/dashcard/982/card/832/query')
        .reply(200, mockRawTableQueryResult);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/982')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      expect(response.body).toMatchObject({
        id: 982,
        type: 'table',
        columns: [
          { name: 'housing_kind', displayName: 'Type', baseType: 'string' },
          { name: 'count', displayName: 'Count', baseType: 'number' }
        ],
        rows: [
          ['APPART', 4876],
          ['MAISON', 652]
        ]
      });
      // No decimals / suffix / numberStyle leaked when settings are absent.
      expect(response.body.columns[0]).not.toHaveProperty('decimals');
      expect(response.body.columns[1]).not.toHaveProperty('suffix');
    });

    it('returns 404 when dashcard not found', async () => {
      nock(METABASE_URL)
        .get('/api/dashboard/13')
        .reply(200, mockMetabaseDashboard);

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/9999')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_NOT_FOUND);
    });

    it('returns 400 for non-integer cid', async () => {
      const response = await request(url)
        .get('/dashboards/13-analyses/cards/not-a-number')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_BAD_REQUEST);
    });

    it('returns 422 for an invalid did', async () => {
      const response = await request(url)
        .get('/dashboards/garbage-slug/cards/929')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
    });
  });
});
