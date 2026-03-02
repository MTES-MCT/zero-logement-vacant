import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'node:path';

import config from '~/infra/config';
import { logger } from '~/infra/logger';

// Resolve to source directory
// In bundled mode: import.meta.dirname is server/dist/app, we need server/src
// In dev mode with tsx: import.meta.dirname is server/src/infra, we need server/src
const isInDist = import.meta.dirname.includes('/dist/');
const basePath = isInDist
  ? path.resolve(import.meta.dirname, '../..', 'src')
  : path.resolve(import.meta.dirname, '..');

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zéro Logement Vacant API',
      version: '1.0.0',
      description: `
REST API for the Zéro Logement Vacant application (French vacant housing tracking platform).

## Authentication

The API uses JWT (JSON Web Token) authentication. To access protected endpoints:

1. Authenticate via \`POST /api/authenticate\`
2. Retrieve the JWT token from the response
3. Include the token in the \`Authorization: Bearer <token>\` header

## Environments

- **Production**: https://zerologementvacant.beta.gouv.fr/api
- **Staging**: https://zerologementvacant-staging.incubateur.net/api
      `,
      contact: {
        name: 'ZLV Team',
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
        description: 'API endpoints'
      },
      {
        url: '/',
        description: 'Root (health check)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained via /api/authenticate'
        }
      },
      schemas: {
        // Core entities
        Housing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            invariant: { type: 'string', example: '1234567890' },
            localId: { type: 'string', description: 'Local fiscal identifier (12 chars)', example: '123456789012' },
            rawAddress: { type: 'array', items: { type: 'string' }, example: ['12 RUE DE LA PAIX', '75002 PARIS'] },
            geoCode: { type: 'string', description: 'INSEE code', example: '75102' },
            longitude: { type: 'number', nullable: true, example: 2.3522 },
            latitude: { type: 'number', nullable: true, example: 48.8566 },
            housingKind: { type: 'string', enum: ['APPART', 'MAISON'], example: 'APPART' },
            roomsCount: { type: 'integer', nullable: true, example: 3 },
            livingArea: { type: 'number', nullable: true, description: 'In square meters', example: 65.5 },
            buildingYear: { type: 'integer', nullable: true, example: 1920 },
            vacancyStartYear: { type: 'integer', nullable: true, example: 2020 },
            status: {
              type: 'integer',
              enum: [0, 1, 2, 3, 4, 5],
              description: '0=Never contacted, 1=Waiting, 2=First contact, 3=In progress, 4=Completed, 5=Blocked',
              example: 0
            },
            subStatus: { type: 'string', nullable: true, example: 'En attente de réponse' },
            occupancy: {
              type: 'string',
              enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'],
              description: 'V=Vacant, L=Rented, RS=Secondary residence, etc.',
              example: 'V'
            },
            actualEnergyConsumption: {
              type: 'string',
              enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
              nullable: true,
              description: 'DPE energy class',
              example: 'D'
            },
            cadastralClassification: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7, 8], nullable: true, example: 4 },
            cadastralReference: { type: 'string', nullable: true, example: '000AB0123' },
            taxed: { type: 'boolean', nullable: true, example: true },
            uncomfortable: { type: 'boolean', example: false },
            owner: { $ref: '#/components/schemas/Owner' }
          },
          required: ['id', 'localId', 'geoCode', 'status', 'occupancy']
        },
        HousingUpdatePayload: {
          type: 'object',
          properties: {
            status: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] },
            subStatus: { type: 'string', nullable: true },
            occupancy: { type: 'string', enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'] },
            occupancyIntended: { type: 'string', enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'], nullable: true },
            actualEnergyConsumption: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], nullable: true }
          }
        },
        Owner: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174001' },
            fullName: { type: 'string', example: 'DUPONT Jean' },
            rawAddress: { type: 'array', items: { type: 'string' }, nullable: true, example: ['15 AVENUE VICTOR HUGO', '75016 PARIS'] },
            email: { type: 'string', format: 'email', nullable: true, example: 'jean.dupont@email.com' },
            phone: { type: 'string', nullable: true, example: '+33612345678' },
            birthDate: { type: 'string', format: 'date', nullable: true, example: '1965-03-15' },
            kind: {
              type: 'string',
              enum: ['particulier', 'sci-copro', 'promoteur', 'etat-collectivite', 'bailleur-social', 'autres'],
              nullable: true,
              example: 'particulier'
            },
            banAddress: { $ref: '#/components/schemas/Address' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'fullName']
        },
        OwnerPayload: {
          type: 'object',
          properties: {
            fullName: { type: 'string', example: 'DUPONT Jean' },
            birthDate: { type: 'string', format: 'date', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            rawAddress: { type: 'array', items: { type: 'string' } },
            banAddress: { $ref: '#/components/schemas/AddressPayload' },
            additionalAddress: { type: 'string', nullable: true }
          },
          required: ['fullName']
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174002' },
            email: { type: 'string', format: 'email', example: 'user@collectivite.fr' },
            firstName: { type: 'string', nullable: true, example: 'Marie' },
            lastName: { type: 'string', nullable: true, example: 'MARTIN' },
            phone: { type: 'string', nullable: true, example: '+33123456789' },
            position: { type: 'string', nullable: true, example: 'Chargé de mission habitat' },
            role: {
              type: 'integer',
              enum: [0, 1, 2],
              description: '0=Usual, 1=Admin, 2=Visitor',
              example: 0
            },
            establishmentId: { type: 'string', format: 'uuid', nullable: true },
            activatedAt: { type: 'string', format: 'date-time' },
            lastAuthenticatedAt: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'email', 'role']
        },
        UserCreationPayload: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', example: 'nouveau@collectivite.fr' },
            password: { type: 'string', minLength: 8, example: 'SecureP@ss123' },
            firstName: { type: 'string', example: 'Jean' },
            lastName: { type: 'string', example: 'DUPONT' },
            establishmentId: { type: 'string', format: 'uuid' }
          },
          required: ['email', 'password', 'firstName', 'lastName', 'establishmentId']
        },
        Establishment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174003' },
            name: { type: 'string', example: 'Communauté de communes du Val de Loire' },
            shortName: { type: 'string', example: 'CC Val de Loire' },
            siren: { type: 'string', pattern: '^[0-9]{9}$', example: '200012345' },
            kind: {
              type: 'string',
              enum: ['Commune', 'CA', 'CC', 'CU', 'ME', 'DEP', 'REG', 'ASSO', 'PETR', 'SIVOM'],
              example: 'CC'
            },
            available: { type: 'boolean', description: 'Available for registration', example: true },
            geoCodes: { type: 'array', items: { type: 'string' }, example: ['37001', '37002', '37003'] }
          },
          required: ['id', 'name', 'siren', 'kind']
        },
        Campaign: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174004' },
            title: { type: 'string', example: 'Campagne courrier janvier 2024' },
            description: { type: 'string', example: 'Première relance des propriétaires de logements vacants' },
            status: {
              type: 'string',
              enum: ['draft', 'sending', 'in-progress', 'archived'],
              example: 'draft'
            },
            createdAt: { type: 'string', format: 'date-time' },
            validatedAt: { type: 'string', format: 'date-time', nullable: true },
            sentAt: { type: 'string', format: 'date-time', nullable: true },
            archivedAt: { type: 'string', format: 'date-time', nullable: true },
            groupId: { type: 'string', format: 'uuid', nullable: true }
          },
          required: ['id', 'title', 'status', 'createdAt']
        },
        CampaignPayload: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Nouvelle campagne' },
            description: { type: 'string', example: 'Description de la campagne' },
            groupId: { type: 'string', format: 'uuid' }
          },
          required: ['title']
        },
        Group: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Logements prioritaires centre-ville' },
            description: { type: 'string', example: 'Logements vacants depuis plus de 5 ans en centre-ville' },
            housingCount: { type: 'integer', example: 42 },
            ownerCount: { type: 'integer', example: 38 },
            createdAt: { type: 'string', format: 'date-time' },
            archivedAt: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'title', 'housingCount', 'ownerCount', 'createdAt']
        },
        Address: {
          type: 'object',
          properties: {
            banId: { type: 'string', description: 'BAN (Base Adresse Nationale) identifier', example: '75102_1234_00012' },
            label: { type: 'string', example: '12 Rue de la Paix, 75002 Paris' },
            houseNumber: { type: 'string', example: '12' },
            street: { type: 'string', example: 'Rue de la Paix' },
            postalCode: { type: 'string', example: '75002' },
            city: { type: 'string', example: 'Paris' },
            cityCode: { type: 'string', description: 'INSEE code', example: '75102' },
            latitude: { type: 'number', example: 48.8688 },
            longitude: { type: 'number', example: 2.3306 },
            score: { type: 'number', description: 'Geocoding confidence score (0-1)', example: 0.95 }
          },
          required: ['label', 'postalCode', 'city']
        },
        AddressPayload: {
          type: 'object',
          properties: {
            banId: { type: 'string' },
            label: { type: 'string' },
            houseNumber: { type: 'string' },
            street: { type: 'string' },
            postalCode: { type: 'string' },
            city: { type: 'string' },
            cityCode: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' }
          },
          required: ['label', 'postalCode', 'city']
        },
        Locality: {
          type: 'object',
          properties: {
            geoCode: { type: 'string', description: 'INSEE code', example: '75102' },
            name: { type: 'string', example: 'Paris 2e Arrondissement' },
            kind: { type: 'string', enum: ['ACV', 'PVD'], nullable: true, description: 'ACV=Action Cœur de Ville, PVD=Petites Villes de Demain' },
            taxKind: { type: 'string', enum: ['TLV', 'THLV', 'None'], description: 'Tax type applicable' }
          },
          required: ['geoCode', 'name', 'taxKind']
        },
        Document: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            filename: { type: 'string', example: 'courrier_relance.pdf' },
            url: { type: 'string', format: 'uri', description: 'Pre-signed download URL' },
            contentType: { type: 'string', example: 'application/pdf' },
            sizeBytes: { type: 'integer', example: 102400 },
            createdAt: { type: 'string', format: 'date-time' },
            creator: { $ref: '#/components/schemas/User' }
          },
          required: ['id', 'filename', 'url', 'contentType', 'sizeBytes', 'createdAt']
        },
        Note: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string', example: 'Propriétaire contacté par téléphone, RDV prévu le 15/03' },
            noteKind: { type: 'string', example: 'Suivi' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
            creator: { $ref: '#/components/schemas/User' }
          },
          required: ['id', 'content', 'createdAt']
        },
        Settings: {
          type: 'object',
          properties: {
            inbox: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', description: 'Enable inbox feature', example: true }
              }
            }
          }
        },
        // Pagination
        PaginatedHousing: {
          type: 'object',
          properties: {
            entities: { type: 'array', items: { $ref: '#/components/schemas/Housing' } },
            page: { type: 'integer', example: 1 },
            perPage: { type: 'integer', example: 50 },
            totalCount: { type: 'integer', example: 1234 }
          },
          required: ['entities', 'page', 'perPage', 'totalCount']
        },
        PaginatedOwners: {
          type: 'object',
          properties: {
            entities: { type: 'array', items: { $ref: '#/components/schemas/Owner' } },
            page: { type: 'integer', example: 1 },
            perPage: { type: 'integer', example: 50 },
            totalCount: { type: 'integer', example: 567 }
          },
          required: ['entities', 'page', 'perPage', 'totalCount']
        },
        // Authentication
        AuthResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' }
          },
          required: ['accessToken', 'user']
        },
        TwoFactorRequired: {
          type: 'object',
          properties: {
            userId: { type: 'string', format: 'uuid' },
            require2FA: { type: 'boolean', example: true }
          },
          required: ['userId', 'require2FA']
        },
        // Errors
        Error: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'ValidationError' },
            message: { type: 'string', example: 'Invalid input data' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          },
          required: ['name', 'message']
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      { name: 'Authentication', description: 'Authentication and session management' },
      { name: 'Users', description: 'User management' },
      { name: 'Housing', description: 'Vacant housing management' },
      { name: 'Owners', description: 'Property owner management' },
      { name: 'Campaigns', description: 'Contact campaign management' },
      { name: 'Events', description: 'Event history' },
      { name: 'Groups', description: 'Housing groups' },
      { name: 'Establishments', description: 'Establishments (local authorities)' },
      { name: 'Geo', description: 'Geographic data (perimeters, localities)' },
      { name: 'Settings', description: 'User settings' },
      { name: 'Files', description: 'File management' },
      { name: 'Statistics', description: 'Statistics and dashboards' },
      { name: 'Health', description: 'Service health check' }
    ]
  },
  apis: [
    path.join(basePath, 'routers', '*.ts'),
    path.join(basePath, 'routers', '*.js'),
    path.join(basePath, 'controllers', '*.ts'),
    path.join(basePath, 'controllers', '*.js'),
    path.join(basePath, 'infra', 'server.ts')
  ]
};

const swaggerSpec = swaggerJsdoc(options) as {
  paths?: Record<string, unknown>;
};

// Log the number of paths found for debugging
const pathCount = Object.keys(swaggerSpec.paths || {}).length;
logger.debug(`Swagger: Found ${pathCount} API paths from ${basePath}`);

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
