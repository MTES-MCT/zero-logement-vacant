import { constants } from "http2";
import request from "supertest";

import { createServer } from "../../server";

describe('Unprotected routes', () => {
  const { app } = createServer()

  describe('Rate limit', () => {
    it('should limit to 10 requests by IP over 1 minute', async () => {
      async function fetch() {
        return request(app).get('/api/owner-prospects')
      }

      const requests = new Array(11).fill(0).map(() => fetch())
      const responses = await Promise.all(requests)

      const rateLimited = responses.some(response => response.status === constants.HTTP_STATUS_TOO_MANY_REQUESTS)

      expect(rateLimited).toBe(true)
    });
  });
});
