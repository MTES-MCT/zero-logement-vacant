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

/**
 * Documentation version - INCREMENT ONLY when markdown content changes.
 * This includes: endpoint descriptions, field descriptions in schemas,
 * the main API description, and any other user-facing documentation text.
 * DO NOT increment for: adding new schemas, adding new endpoints without
 * changing documentation prose, or technical/structural changes.
 */
const DOC_VERSION = '1.0.0';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zéro Logement Vacant API',
      version: DOC_VERSION,
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
          description: 'Logement vacant suivi par ZLV',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
            invariant: { type: 'string', description: 'Identifiant invariant fiscal', example: '1234567890' },
            localId: { type: 'string', description: 'Identifiant local fiscal (12 caractères)', example: '123456789012' },
            rawAddress: { type: 'array', items: { type: 'string' }, description: 'Adresse brute', example: ['12 RUE DE LA PAIX', '75002 PARIS'] },
            geoCode: { type: 'string', description: 'Code INSEE de la commune', example: '75102' },
            campaignIds: { type: 'array', items: { type: 'string', format: 'uuid' }, nullable: true, description: 'IDs des campagnes associées' },
            longitude: { type: 'number', nullable: true, example: 2.3522 },
            latitude: { type: 'number', nullable: true, example: 48.8566 },
            cadastralClassification: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7, 8], nullable: true, description: 'Classification cadastrale', example: 4 },
            cadastralReference: { type: 'string', nullable: true, description: 'Référence cadastrale', example: '000AB0123' },
            uncomfortable: { type: 'boolean', description: 'Logement inconfortable', example: false },
            vacancyStartYear: { type: 'integer', nullable: true, description: 'Année de début de vacance', example: 2020 },
            housingKind: { type: 'string', enum: ['APPART', 'MAISON'], description: 'Type de logement', example: 'APPART' },
            roomsCount: { type: 'integer', nullable: true, description: 'Nombre de pièces', example: 3 },
            livingArea: { type: 'number', nullable: true, description: 'Surface habitable en m²', example: 65.5 },
            buildingId: { type: 'string', nullable: true, description: 'ID du bâtiment' },
            buildingYear: { type: 'integer', nullable: true, description: 'Année de construction', example: 1920 },
            taxed: { type: 'boolean', nullable: true, description: 'Soumis à la taxe sur les logements vacants', example: true },
            dataYears: { type: 'array', items: { type: 'integer' }, deprecated: true, description: 'Années des données (deprecated, voir dataFileYears)' },
            dataFileYears: { type: 'array', items: { type: 'string' }, description: 'Fichiers sources par année' },
            beneficiaryCount: { type: 'integer', nullable: true, description: 'Nombre de bénéficiaires' },
            buildingLocation: { type: 'string', nullable: true, description: 'Emplacement dans le bâtiment' },
            rentalValue: { type: 'number', nullable: true, description: 'Valeur locative' },
            ownershipKind: { type: 'string', nullable: true, description: 'Type de propriété' },
            status: {
              type: 'integer',
              enum: [0, 1, 2, 3, 4, 5],
              description: '0=Non suivi, 1=En attente de retour, 2=Premier contact, 3=Suivi en cours, 4=Suivi terminé, 5=Suivi bloqué',
              example: 0
            },
            subStatus: { type: 'string', nullable: true, description: 'Sous-statut détaillé', example: 'En attente de réponse' },
            actualEnergyConsumption: {
              type: 'string',
              enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
              nullable: true,
              description: 'Classe énergétique DPE (modifiable par l\'utilisateur)',
              example: 'D'
            },
            energyConsumption: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], nullable: true, deprecated: true, description: 'Utiliser BuildingDTO.dpe.class' },
            energyConsumptionAt: { type: 'string', format: 'date-time', nullable: true, deprecated: true, description: 'Utiliser BuildingDTO.dpe.doneAt' },
            occupancy: {
              type: 'string',
              enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'],
              description: 'V=Vacant, L=Loué, B=Bail, RS=Résidence secondaire, P=Propriétaire, N=Non vacant, etc.',
              example: 'V'
            },
            occupancyIntended: {
              type: 'string',
              enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'],
              nullable: true,
              description: 'Occupation visée'
            },
            source: { type: 'string', enum: ['lovac', 'datafoncier-manual', 'datafoncier-import'], nullable: true, description: 'Source des données' },
            owner: { $ref: '#/components/schemas/Owner' },
            lastMutationType: { type: 'string', nullable: true, description: 'Type de dernière mutation' },
            lastMutationDate: { type: 'string', format: 'date', nullable: true, description: 'Date de dernière mutation' },
            lastTransactionDate: { type: 'string', format: 'date', nullable: true, description: 'Date de dernière transaction' },
            lastTransactionValue: { type: 'number', nullable: true, description: 'Valeur de dernière transaction en euros' },
            plotId: { type: 'string', nullable: true, description: 'ID de la parcelle' },
            plotArea: { type: 'number', nullable: true, description: 'Surface de la parcelle en m²' }
          },
          required: ['id', 'invariant', 'localId', 'rawAddress', 'geoCode', 'uncomfortable', 'housingKind', 'status', 'occupancy']
        },
        HousingUpdatePayload: {
          type: 'object',
          description: 'Données pour mettre à jour un logement',
          properties: {
            status: { type: 'integer', enum: [0, 1, 2, 3, 4, 5], description: 'Nouveau statut de suivi' },
            subStatus: { type: 'string', nullable: true, description: 'Sous-statut détaillé' },
            occupancy: { type: 'string', enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'], description: 'Occupation actuelle' },
            occupancyIntended: { type: 'string', enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'], nullable: true, description: 'Occupation visée' },
            actualEnergyConsumption: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], nullable: true, description: 'Classe énergétique DPE' }
          },
          required: ['status', 'occupancy', 'actualEnergyConsumption']
        },
        HousingBatchUpdatePayload: {
          type: 'object',
          description: 'Données pour mettre à jour plusieurs logements',
          properties: {
            filters: { $ref: '#/components/schemas/HousingFilters' },
            occupancy: { type: 'string', enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'] },
            occupancyIntended: { type: 'string', enum: ['V', 'L', 'B', 'RS', 'P', 'N', 'T', 'D', 'G', 'F', 'R', 'U', 'X', 'A', 'inconnu'] },
            status: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] },
            subStatus: { type: 'string' },
            note: { type: 'string', description: 'Note à ajouter aux logements' },
            precisions: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'IDs des précisions à associer' },
            documents: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'IDs des documents à associer' }
          },
          required: ['filters']
        },
        HousingFilters: {
          type: 'object',
          description: 'Filtres de recherche de logements',
          properties: {
            establishmentIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            groupIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            campaignIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            status: { type: 'array', items: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] } },
            occupancies: { type: 'array', items: { type: 'string' } },
            energyConsumption: { type: 'array', items: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G'] } },
            housingKinds: { type: 'array', items: { type: 'string', enum: ['APPART', 'MAISON'] } },
            query: { type: 'string', description: 'Recherche textuelle (adresse, propriétaire...)' }
          }
        },
        HousingCount: {
          type: 'object',
          description: 'Comptage de logements et propriétaires',
          properties: {
            housing: { type: 'integer', description: 'Nombre de logements', example: 1234 },
            owners: { type: 'integer', description: 'Nombre de propriétaires uniques', example: 987 }
          },
          required: ['housing', 'owners']
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
          description: 'Utilisateur de la plateforme ZLV',
          properties: {
            id: { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174002' },
            email: { type: 'string', format: 'email', example: 'user@collectivite.fr' },
            firstName: { type: 'string', nullable: true, example: 'Marie' },
            lastName: { type: 'string', nullable: true, example: 'MARTIN' },
            phone: { type: 'string', nullable: true, example: '+33123456789' },
            position: { type: 'string', nullable: true, example: 'Chargé de mission habitat' },
            timePerWeek: {
              type: 'string',
              nullable: true,
              enum: ['Moins de 0,5 jour', '0,5 jour', '1 jour', '2 jours', 'Plus de 2 jours'],
              description: 'Temps consacré à ZLV par semaine',
              example: '1 jour'
            },
            establishmentId: { type: 'string', format: 'uuid', nullable: true },
            role: {
              type: 'integer',
              enum: [0, 1, 2],
              description: '0=USUAL (utilisateur standard), 1=ADMIN (administrateur), 2=VISITOR (visiteur)',
              example: 0
            },
            activatedAt: { type: 'string', format: 'date-time', description: 'Date d\'activation du compte' },
            lastAuthenticatedAt: { type: 'string', format: 'date-time', nullable: true, description: 'Dernière connexion' },
            suspendedAt: { type: 'string', format: 'date-time', nullable: true, description: 'Date de suspension (null si actif)' },
            suspendedCause: {
              type: 'string',
              nullable: true,
              description: 'Cause(s) de suspension (séparées par virgule)',
              example: 'droits utilisateur expires'
            },
            updatedAt: { type: 'string', format: 'date-time', description: 'Dernière mise à jour' },
            kind: { type: 'string', nullable: true, description: 'Type d\'utilisateur' }
          },
          required: ['id', 'email', 'role', 'activatedAt', 'updatedAt']
        },
        UserCreationPayload: {
          type: 'object',
          description: 'Données pour créer un utilisateur',
          properties: {
            email: { type: 'string', format: 'email', example: 'nouveau@collectivite.fr' },
            firstName: { type: 'string', nullable: true, example: 'Jean' },
            lastName: { type: 'string', nullable: true, example: 'DUPONT' },
            phone: { type: 'string', nullable: true, example: '+33612345678' },
            position: { type: 'string', nullable: true, example: 'Chargé de mission habitat' },
            timePerWeek: {
              type: 'string',
              nullable: true,
              enum: ['Moins de 0,5 jour', '0,5 jour', '1 jour', '2 jours', 'Plus de 2 jours']
            }
          },
          required: ['email']
        },
        UserUpdatePayload: {
          type: 'object',
          description: 'Données pour mettre à jour un utilisateur',
          properties: {
            firstName: { type: 'string', nullable: true, example: 'Jean' },
            lastName: { type: 'string', nullable: true, example: 'DUPONT' },
            phone: { type: 'string', nullable: true, example: '+33612345678' },
            position: { type: 'string', nullable: true, example: 'Chargé de mission habitat' },
            timePerWeek: {
              type: 'string',
              nullable: true,
              enum: ['Moins de 0,5 jour', '0,5 jour', '1 jour', '2 jours', 'Plus de 2 jours']
            },
            password: {
              type: 'object',
              description: 'Changement de mot de passe',
              properties: {
                before: { type: 'string', description: 'Ancien mot de passe' },
                after: { type: 'string', description: 'Nouveau mot de passe' }
              },
              required: ['before', 'after']
            }
          }
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
        },
        // Authentication - Reset & Signup links
        ResetLink: {
          type: 'object',
          description: 'Lien de réinitialisation de mot de passe',
          properties: {
            id: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' },
            usedAt: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'createdAt', 'expiresAt']
        },
        SignupLink: {
          type: 'object',
          description: 'Lien d\'inscription',
          properties: {
            id: { type: 'string', format: 'uuid' },
            prospectEmail: { type: 'string', format: 'email' },
            expiresAt: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'prospectEmail', 'expiresAt']
        },
        SignupLinkPayload: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' }
          },
          required: ['email']
        },
        // Users - Filters
        UserFilters: {
          type: 'object',
          description: 'Filtres de recherche d\'utilisateurs',
          properties: {
            establishments: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              description: 'IDs des établissements'
            }
          }
        },
        // Owners - Complete schemas
        OwnerComplete: {
          type: 'object',
          description: 'Propriétaire complet avec tous les champs',
          properties: {
            id: { type: 'string', format: 'uuid' },
            idpersonne: { type: 'string', nullable: true, description: 'Identifiant personne (source fiscale)' },
            rawAddress: { type: 'array', items: { type: 'string' }, nullable: true },
            fullName: { type: 'string', example: 'DUPONT Jean' },
            administrator: { type: 'string', nullable: true, description: 'Administrateur de bien' },
            birthDate: { type: 'string', format: 'date', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            banAddress: { $ref: '#/components/schemas/Address' },
            additionalAddress: { type: 'string', nullable: true },
            kind: {
              type: 'string',
              enum: ['particulier', 'sci-copro', 'promoteur', 'etat-collectivite', 'bailleur-social', 'autres'],
              nullable: true,
              description: 'Type de propriétaire'
            },
            siren: { type: 'string', nullable: true, description: 'SIREN pour les personnes morales' },
            createdAt: { type: 'string', format: 'date-time', nullable: true },
            updatedAt: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'fullName']
        },
        OwnerFilters: {
          type: 'object',
          description: 'Filtres de recherche de propriétaires',
          properties: {
            search: { type: 'string', description: 'Recherche textuelle (nom, adresse)' },
            idpersonne: {
              oneOf: [
                { type: 'boolean' },
                { type: 'array', items: { type: 'string' } }
              ],
              description: 'Filtrer par identifiant personne'
            }
          }
        },
        OwnerCreationPayload: {
          type: 'object',
          description: 'Données pour créer un propriétaire',
          properties: {
            fullName: { type: 'string', example: 'DUPONT Jean' },
            birthDate: { type: 'string', format: 'date', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            rawAddress: { type: 'array', items: { type: 'string' } }
          },
          required: ['fullName']
        },
        OwnerUpdatePayload: {
          type: 'object',
          description: 'Données pour mettre à jour un propriétaire',
          properties: {
            fullName: { type: 'string' },
            birthDate: { type: 'string', format: 'date', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            phone: { type: 'string', nullable: true },
            additionalAddress: { type: 'string', nullable: true },
            banAddress: { $ref: '#/components/schemas/AddressPayload' }
          },
          required: ['fullName']
        },
        // Campaigns - Complete schemas
        CampaignComplete: {
          type: 'object',
          description: 'Campagne de contact complète',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Campagne courrier janvier 2024' },
            description: { type: 'string' },
            status: {
              type: 'string',
              enum: ['draft', 'sending', 'in-progress', 'archived'],
              description: 'draft=Envoi en attente, sending=En cours d\'envoi, in-progress=Envoyée, archived=Archivée'
            },
            filters: { $ref: '#/components/schemas/HousingFilters' },
            file: { type: 'string', nullable: true, description: 'Fichier de campagne' },
            createdAt: { type: 'string', format: 'date-time' },
            validatedAt: { type: 'string', format: 'date-time', nullable: true },
            exportedAt: { type: 'string', format: 'date-time', nullable: true },
            sentAt: { type: 'string', format: 'date-time', nullable: true },
            archivedAt: { type: 'string', format: 'date-time', nullable: true },
            confirmedAt: { type: 'string', format: 'date-time', nullable: true },
            groupId: { type: 'string', format: 'uuid', nullable: true }
          },
          required: ['id', 'title', 'description', 'status', 'filters', 'createdAt']
        },
        CampaignCreationPayload: {
          type: 'object',
          description: 'Données pour créer une campagne',
          properties: {
            title: { type: 'string', example: 'Nouvelle campagne' },
            description: { type: 'string' },
            housing: {
              type: 'object',
              properties: {
                all: { type: 'boolean', description: 'Inclure tous les logements correspondant aux filtres' },
                ids: { type: 'array', items: { type: 'string', format: 'uuid' }, description: 'IDs de logements spécifiques' },
                filters: { $ref: '#/components/schemas/HousingFilters' }
              },
              required: ['all', 'ids', 'filters']
            }
          },
          required: ['title', 'description', 'housing']
        },
        CampaignUpdatePayload: {
          type: 'object',
          description: 'Données pour mettre à jour une campagne',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'sending', 'in-progress', 'archived'] },
            file: { type: 'string' },
            sentAt: { type: 'string', format: 'date-time' }
          }
        },
        // Events - Complete schema
        Event: {
          type: 'object',
          description: 'Événement de l\'historique d\'un logement ou propriétaire',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: {
              type: 'string',
              description: 'Nom lisible de l\'événement',
              example: 'Changement de statut de suivi'
            },
            type: {
              type: 'string',
              enum: [
                'housing:created', 'housing:updated', 'housing:occupancy-updated', 'housing:status-updated',
                'housing:precision-attached', 'housing:precision-detached',
                'housing:owner-attached', 'housing:owner-updated', 'housing:owner-detached',
                'housing:perimeter-attached', 'housing:perimeter-detached',
                'housing:group-attached', 'housing:group-detached', 'housing:group-removed',
                'housing:campaign-attached', 'housing:campaign-detached', 'housing:campaign-removed',
                'housing:document-attached', 'housing:document-detached', 'housing:document-removed',
                'document:created', 'document:updated', 'document:removed',
                'owner:updated', 'campaign:updated'
              ],
              description: 'Type technique de l\'événement'
            },
            conflict: { type: 'boolean', description: 'Indique un conflit d\'informations' },
            nextOld: { type: 'object', description: 'Valeur avant modification', additionalProperties: true },
            nextNew: { type: 'object', description: 'Valeur après modification', additionalProperties: true },
            createdAt: { type: 'string', format: 'date-time' },
            createdBy: { type: 'string', format: 'uuid' },
            creator: { $ref: '#/components/schemas/User' }
          },
          required: ['id', 'name', 'type', 'createdAt', 'createdBy']
        },
        // Groups - Complete schemas
        GroupComplete: {
          type: 'object',
          description: 'Groupe de logements complet',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Logements prioritaires centre-ville' },
            description: { type: 'string' },
            housingCount: { type: 'integer', example: 42 },
            ownerCount: { type: 'integer', example: 38 },
            createdAt: { type: 'string', format: 'date-time' },
            createdBy: { $ref: '#/components/schemas/User' },
            archivedAt: { type: 'string', format: 'date-time', nullable: true }
          },
          required: ['id', 'title', 'description', 'housingCount', 'ownerCount', 'createdAt']
        },
        GroupPayload: {
          type: 'object',
          description: 'Données pour créer ou modifier un groupe',
          properties: {
            title: { type: 'string', example: 'Mon groupe de logements' },
            description: { type: 'string' },
            housing: {
              type: 'object',
              properties: {
                all: { type: 'boolean' },
                ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                filters: { $ref: '#/components/schemas/HousingFilters' }
              },
              required: ['all', 'ids', 'filters']
            }
          },
          required: ['title', 'description', 'housing']
        },
        // Establishments - Complete schemas
        EstablishmentComplete: {
          type: 'object',
          description: 'Établissement (collectivité) complet',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Communauté de communes du Val de Loire' },
            shortName: { type: 'string', example: 'CC Val de Loire' },
            siren: { type: 'string', pattern: '^[0-9]{9}$', example: '200012345' },
            available: { type: 'boolean', description: 'Disponible pour inscription' },
            geoCodes: { type: 'array', items: { type: 'string' }, description: 'Codes INSEE des communes', example: ['37001', '37002'] },
            kind: {
              type: 'string',
              enum: ['ASSO', 'CA', 'CC', 'Commune', 'CTU', 'CU', 'DEP', 'ME', 'PETR', 'REG', 'SDED', 'SDER', "Service déconcentré de l'État à compétence (inter) départementale", 'SIVOM'],
              description: 'Type d\'établissement'
            },
            source: {
              type: 'string',
              enum: ['api-geo', 'ods', 'manual'],
              description: 'Source des données'
            },
            users: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
              description: 'Utilisateurs (si autorisé)'
            }
          },
          required: ['id', 'name', 'shortName', 'siren', 'available', 'geoCodes', 'kind', 'source']
        },
        EstablishmentFilters: {
          type: 'object',
          description: 'Filtres de recherche d\'établissements',
          properties: {
            query: { type: 'string', description: 'Recherche par nom ou SIREN' },
            available: { type: 'boolean', description: 'Filtrer les établissements disponibles' }
          }
        },
        // Geo - Complete schemas
        GeoPerimeter: {
          type: 'object',
          description: 'Périmètre géographique personnalisé',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Centre-ville historique' },
            kind: { type: 'string', example: 'Quartier prioritaire' },
            geometry: {
              type: 'object',
              description: 'Géométrie GeoJSON MultiPolygon',
              properties: {
                type: { type: 'string', enum: ['MultiPolygon'] },
                coordinates: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: {
                      type: 'array',
                      items: {
                        type: 'array',
                        items: { type: 'number' }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ['id', 'name', 'kind', 'geometry']
        },
        LocalityComplete: {
          type: 'object',
          description: 'Commune avec informations fiscales',
          properties: {
            geoCode: { type: 'string', description: 'Code INSEE', example: '75102' },
            name: { type: 'string', example: 'Paris 2e Arrondissement' },
            kind: {
              type: 'string',
              enum: ['ACV', 'PVD'],
              nullable: true,
              description: 'ACV=Action Cœur de Ville, PVD=Petites Villes de Demain'
            },
            taxKind: {
              type: 'string',
              enum: ['TLV', 'THLV', 'None'],
              description: 'Type de taxe sur les logements vacants'
            },
            taxRate: {
              type: 'number',
              description: 'Taux de taxe applicable (%)',
              example: 17
            }
          },
          required: ['geoCode', 'name', 'taxKind']
        },
        // Settings - Complete schema
        SettingsComplete: {
          type: 'object',
          description: 'Paramètres d\'un établissement',
          properties: {
            inbox: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', description: 'Activer la boîte de réception', example: true }
              },
              required: ['enabled']
            }
          },
          required: ['inbox']
        },
        // Documents & Files - Complete schemas with limits
        DocumentComplete: {
          type: 'object',
          description: 'Document attaché à un logement',
          properties: {
            id: { type: 'string', format: 'uuid' },
            filename: { type: 'string', example: 'courrier_relance.pdf' },
            url: { type: 'string', format: 'uri', description: 'URL de téléchargement pré-signée' },
            contentType: { type: 'string', example: 'application/pdf' },
            sizeBytes: { type: 'integer', example: 102400, description: 'Taille en octets' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
            establishmentId: { type: 'string', format: 'uuid' },
            creator: { $ref: '#/components/schemas/User' }
          },
          required: ['id', 'filename', 'url', 'contentType', 'sizeBytes', 'createdAt', 'establishmentId', 'creator']
        },
        DocumentPayload: {
          type: 'object',
          description: 'Données pour modifier un document',
          properties: {
            filename: { type: 'string', example: 'nouveau_nom.pdf' }
          },
          required: ['filename']
        },
        FileUploadInfo: {
          type: 'object',
          description: 'Informations sur les limites d\'upload de fichiers',
          properties: {
            acceptedExtensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Extensions de fichier acceptées pour les documents de logement',
              example: ['png', 'jpg', 'heic', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
            },
            maxSizeInMiB: {
              type: 'integer',
              description: 'Taille maximale en MiB',
              example: 25
            },
            maxSizeInBytes: {
              type: 'integer',
              description: 'Taille maximale en octets',
              example: 26214400
            }
          }
        },
        FileUpload: {
          type: 'object',
          description: 'Fichier uploadé',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string', description: 'Type MIME', example: 'image/png' },
            url: { type: 'string', format: 'uri' },
            content: { type: 'string', description: 'Contenu encodé' }
          },
          required: ['id', 'type', 'url', 'content']
        },
        // Notes - Complete schema
        NoteComplete: {
          type: 'object',
          description: 'Note sur un logement',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string', example: 'Propriétaire contacté par téléphone, RDV prévu le 15/03' },
            noteKind: { type: 'string', example: 'Suivi' },
            createdBy: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
            creator: { $ref: '#/components/schemas/User' }
          },
          required: ['id', 'content', 'noteKind', 'createdBy', 'createdAt', 'creator']
        },
        NotePayload: {
          type: 'object',
          description: 'Données pour créer ou modifier une note',
          properties: {
            content: { type: 'string', minLength: 1 }
          },
          required: ['content']
        },
        // Health - Response schema with example
        HealthResponse: {
          type: 'object',
          description: 'Réponse du healthcheck',
          properties: {
            uptime: { type: 'number', description: 'Uptime du serveur en secondes', example: 3600.5 },
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', enum: ['postgres', 'redis', 'brevo', 's3'] },
                  status: { type: 'string', enum: ['up', 'down'] }
                }
              }
            }
          },
          example: {
            uptime: 86400.123,
            checks: [
              { name: 'postgres', status: 'up' },
              { name: 'redis', status: 'up' },
              { name: 'brevo', status: 'up' },
              { name: 's3', status: 'up' }
            ]
          }
        },
        // Precision schema
        Precision: {
          type: 'object',
          description: 'Précision sur un logement',
          properties: {
            id: { type: 'string', format: 'uuid' },
            label: { type: 'string', example: 'Logement insalubre' },
            category: { type: 'string', example: 'État du logement' }
          },
          required: ['id', 'label']
        },
        // Prospect schema
        Prospect: {
          type: 'object',
          description: 'Prospect (utilisateur potentiel avant création de compte)',
          properties: {
            email: { type: 'string', format: 'email', example: 'prospect@collectivite.fr' },
            establishment: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                siren: { type: 'string', example: '200012345' }
              }
            },
            hasAccount: { type: 'boolean', description: 'Indique si le prospect a déjà un compte', example: false },
            hasCommitment: { type: 'boolean', description: 'Indique si l\'établissement a signé une convention', example: true }
          },
          required: ['email', 'hasAccount', 'hasCommitment']
        },
        // SignupLink response schema
        SignupLinkResponse: {
          type: 'object',
          description: 'Informations d\'un lien d\'inscription',
          properties: {
            id: { type: 'string', format: 'uuid' },
            prospectEmail: { type: 'string', format: 'email' },
            expiresAt: { type: 'string', format: 'date-time' },
            establishment: { $ref: '#/components/schemas/EstablishmentComplete' }
          },
          required: ['id', 'prospectEmail', 'expiresAt']
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
