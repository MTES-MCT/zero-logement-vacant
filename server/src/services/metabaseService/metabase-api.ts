const axios = require('axios');
import config from '~/infra/config';
import { logger } from '~/infra/logger';

import { Metabase } from '~/services/metabaseService/metabase';

export class MetabaseAPI implements Metabase {

  async fetchMetabaseData(questionId: number, userId: string): Promise<[] | undefined> {
    try {
      const data = await axios.post(
        `${config.metabase.domain}/api/card/${questionId}/query`,
        {
          parameters: [
            {
              type: "text",
              target: ["variable", ["template-tag", "user_id"]],
              value: userId,
            },
          ],
        },
        {
          headers: {
            "x-api-key": config.metabase.apiToken,
            "Content-Type": "application/json",
          },
        }
      );
      return JSON.parse(data.data.data.rows[0][0]);
    } catch (error) {
      logger.error('Error while fetching data:', error);
      return undefined;
    }
  }

}

export function createMetabaseAPI(): Metabase {
  return new MetabaseAPI();
}
