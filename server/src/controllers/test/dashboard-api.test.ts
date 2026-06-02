import { constants } from 'node:http2';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { CardDataDTO, DashboardDTO } from '@zerologementvacant/models';
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

const mockMetabaseDashboard = {
  id: 13,
  ordered_tabs: [],
  dashcards: [
    {
      id: 929,
      card_id: 771,
      row: 0,
      col: 0,
      size_x: 6,
      size_y: 4,
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

const mockCardQueryResult = {
  data: { rows: [[51884]], cols: [] },
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
    vi.restoreAllMocks();
  });

  describe('GET /dashboards/:id', () => {
    it('returns DashboardDTO with url and cards', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockMetabaseDashboard
      } as Response);

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

    it('returns 422 for unknown slug', async () => {
      const response = await request(url)
        .get('/dashboards/unknown-slug')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_UNPROCESSABLE_ENTITY);
    });
  });

  describe('GET /dashboards/:did/cards/:cid', () => {
    it('returns CardDataDTO for a scalar dashcard', async () => {
      vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
        const reqUrl = String(input);
        if (reqUrl.includes('/query')) {
          return { ok: true, json: async () => mockCardQueryResult } as Response;
        }
        return {
          ok: true,
          json: async () => mockMetabaseDashboard
        } as Response;
      });

      const response = await request(url)
        .get('/dashboards/13-analyses/cards/929')
        .use(tokenProvider(user));

      expect(response.status).toBe(constants.HTTP_STATUS_OK);
      const body = response.body as CardDataDTO;
      expect(body.id).toBe(929);
      expect(body.data).toBe(51884);
    });

    it('returns 404 when dashcard not found', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => mockMetabaseDashboard
      } as Response);

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
