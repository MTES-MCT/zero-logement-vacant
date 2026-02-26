import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

import config from '~/infra/config';
import { logger } from '~/infra/logger';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zéro Logement Vacant API',
      version: '1.0.0',
      description: `
API REST pour l'application Zéro Logement Vacant.

## Authentification

L'API utilise l'authentification JWT (JSON Web Token). Pour accéder aux endpoints protégés :

1. Authentifiez-vous via \`POST /api/authenticate\`
2. Récupérez le token JWT dans la réponse
3. Incluez le token dans le header \`Authorization: Bearer <token>\`

## Environnements

- **Production**: https://zerologementvacant.beta.gouv.fr/api
- **Staging**: https://zerologementvacant-staging.incubateur.net/api
      `,
      contact: {
        name: 'Équipe ZLV',
        email: 'contact@zerologementvacant.beta.gouv.fr'
      },
      license: {
        name: 'AGPL-3.0',
        url: 'https://github.com/MTES-MCT/zero-logement-vacant/blob/main/LICENSE'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'Serveur courant'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via /api/authenticate'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Authentication', description: 'Authentification et gestion des sessions' },
      { name: 'Users', description: 'Gestion des utilisateurs' },
      { name: 'Housing', description: 'Gestion des logements vacants' },
      { name: 'Owners', description: 'Gestion des propriétaires' },
      { name: 'Campaigns', description: 'Gestion des campagnes de contact' },
      { name: 'Events', description: 'Historique des événements' },
      { name: 'Groups', description: 'Groupes de logements' },
      { name: 'Establishments', description: 'Établissements (collectivités)' },
      { name: 'Geo', description: 'Données géographiques (périmètres, localités)' },
      { name: 'Settings', description: 'Paramètres utilisateur' },
      { name: 'Files', description: 'Gestion des fichiers' },
      { name: 'Statistics', description: 'Statistiques et tableaux de bord' },
      { name: 'Health', description: 'Vérification de santé du service' }
    ]
  },
  apis: [
    './src/routers/*.ts',
    './src/controllers/*.ts'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  if (!config.swagger.enabled) {
    logger.info('Swagger is disabled. Set SWAGGER_ENABLED=true to enable.');
    return;
  }

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'ZLV API Documentation',
      swaggerOptions: {
        persistAuthorization: true
      }
    })
  );

  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  logger.info('Swagger UI available at /api-docs');
}

export { swaggerSpec };
