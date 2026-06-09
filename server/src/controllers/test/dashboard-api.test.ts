import { constants } from 'node:http2';
import nock from 'nock';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { DashboardDTO } from '@zerologementvacant/models';
import config from '~/infra/config';
import { createServer } from '~/infra/server';
import {
  Establishments,
  formatEstablishmentApi
} from '~/repositories/establishmentRepository';
import { toUserDBO, Users } from '~/repositories/userRepository';
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
      visualization_settings: { 'card.title': 'Répartition par date de construction' },
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
    cols: [{ name: 'period' }, { name: 'count' }]
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

  describe('GET /dashboards/:id', () => {
    it('returns DashboardDTO with url and cards', async () => {
      nock(METABASE_URL).get('/api/dashboard/13').reply(200, mockMetabaseDashboard);

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

    it('returns 422 for unknown slug', async () => {
      const response = await request(url)
        .get('/dashboards/unknown-slug')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
    });
  });

  describe('GET /dashboards/:did/cards/:cid', () => {
    it('returns CardDataDTO for a scalar dashcard', async () => {
      nock(METABASE_URL).get('/api/dashboard/13').reply(200, mockMetabaseDashboard);
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
        labels: ['1991 et apres', '1946 - 1990'],
        data: [3200, 1800]
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
        labels: ['1991 et apres', '1946 - 1990'],
        data: [3200, 1800]
      });
    });

    it('returns 404 when dashcard not found', async () => {
      nock(METABASE_URL).get('/api/dashboard/13').reply(200, mockMetabaseDashboard);

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
