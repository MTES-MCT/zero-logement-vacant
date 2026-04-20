import { apiReference } from '@scalar/express-api-reference';
import { Express } from 'express';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import config from '~/infra/config';
import { logger } from '~/infra/logger';

const yamlSpec = readFileSync(
  path.join(import.meta.dirname, 'openapi.yaml'),
  'utf-8'
);

export function setupApiDocs(app: Express): void {
  if (!config.swagger.enabled) {
    logger.info('API docs are disabled. Set SWAGGER_ENABLED=true to enable.');
    return;
  }

  app.get('/api-docs.yaml', (_req, res) => {
    res.setHeader('Content-Type', 'application/yaml');
    res.send(yamlSpec);
  });

  app.use(
    '/api-docs',
    apiReference({
      content: yamlSpec
    })
  );

  logger.info('API reference available at /api-docs');
}
