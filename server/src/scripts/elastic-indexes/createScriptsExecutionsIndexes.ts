import { Client } from '@elastic/elasticsearch';
import { logger } from '~/infra/logger';
import config, { Env } from '~/infra/config';

const client = new Client({
  node: config.elastic.node,
  auth: {
    username: config.elastic.auth.username,
    password: config.elastic.auth.password,
  },
});

const envArray: Env[] = ['development', 'test', 'production'];

async function createIndex(env: Env) {
  try {
    await client.indices.create({
      index: `script_executions_${env}`,
      body: {
        mappings: {
          properties: {
            timestamp: { type: 'date', },
            script_name: { type: 'keyword', },
            status: { type: 'keyword', },
            message: { type: 'text', },
          },
        },
      },
    });
    logger.info('Index created:', `script_executions_${env}`);
  } catch (error) {
    logger.error('Error creating index:', error);
  }
}
envArray.forEach(env => createIndex(env));
