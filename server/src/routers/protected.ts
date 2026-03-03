import {
  ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
  MAX_HOUSING_DOCUMENT_SIZE_IN_MiB,
  UserRole
} from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import { AuthenticatedRequest } from 'express-jwt';
import Router from 'express-promise-router';
import { param } from 'express-validator';

import accountController from '~/controllers/accountController';
import buildingController from '~/controllers/buildingController';
import campaignController from '~/controllers/campaignController';
import contactPointController from '~/controllers/contactPointController';
import dashboardController from '~/controllers/dashboardController';
import datafoncierController from '~/controllers/datafoncierHousingController';
import eventController from '~/controllers/eventController';
import exportController from '~/controllers/exportController';
import fileController from '~/controllers/fileController';
import geoController from '~/controllers/geoController';
import groupController from '~/controllers/groupController';
import housingController from '~/controllers/housingController';
import housingExportController from '~/controllers/housingExportController';
import localityController from '~/controllers/localityController';
import noteController from '~/controllers/noteController';
import ownerController from '~/controllers/ownerController';
import ownerProspectController from '~/controllers/ownerProspectController';
import settingsController from '~/controllers/settingsController';
import userController from '~/controllers/userController';
import { jwtCheck, userCheck } from '~/middlewares/auth';
import { upload } from '~/middlewares/upload';
import validator from '~/middlewares/validator';
import { isUUIDParam } from '~/utils/validators';
import draftController from '~/controllers/draftController';
import validatorNext from '~/middlewares/validator-next';
import { paginationSchema } from '~/models/PaginationApi';
import sortApi from '~/models/SortApi';
import { isFeatureEnabled } from '~/services/posthogService';
import { isUUIDParam } from '~/utils/validators';

const router = Router();

router.use(jwtCheck(true));
router.use(userCheck());

/**
 * @swagger
 * /files:
 *   post:
 *     summary: Upload un fichier
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: File type not allowed
 *       413:
 *         description: File too large
 */
router.post(
  '/files',
  upload(),
  fileTypeMiddleware,
  antivirusMiddleware,
  fileController.create
);

router.post(
  '/documents',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  upload({
    accept: ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS as string[],
    multiple: true,
    maxSizeMiB: MAX_HOUSING_DOCUMENT_SIZE_IN_MiB
  }),
  documentController.create
);

router.get(
  '/documents/:id',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  documentController.get
);

router.put(
  '/documents/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.documentPayload
  }),
  documentController.update
);

router.delete(
  '/documents/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  documentController.remove
);

router.get(
  '/housing/:id/documents',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  documentController.listByHousing
);

router.post(
  '/housing/:id/documents',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingDocumentPayload
  }),
  documentController.linkToHousing
);

router.delete(
  '/housing/:housingId/documents/:documentId',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({
      housingId: schemas.id,
      documentId: schemas.id
    })
  }),
  documentController.removeByHousing
);

/**
 * @openapi
 * /housing:
 *   get:
 *     summary: List vacant housing
 *     tags: [Housing]
 *     description: Returns a paginated list of vacant housing filtered by various criteria
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 50
 *           minimum: 1
 *           maximum: 500
 *         description: Items per page
 *       - in: query
 *         name: statusList
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *             enum: [0, 1, 2, 3, 4, 5]
 *         description: "Filter by status: 0=Never contacted, 1=Waiting, 2=First contact, 3=In progress, 4=Completed, 5=Blocked"
 *       - in: query
 *         name: occupancies
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [V, L, B, RS, P, N, T, D, G, F, R, U, X, A, inconnu]
 *         description: "Filter by occupancy: V=Vacant, L=Rented, RS=Secondary residence"
 *       - in: query
 *         name: housingKinds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [APPART, MAISON]
 *         description: Filter by housing type
 *       - in: query
 *         name: energyConsumption
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [A, B, C, D, E, F, G]
 *         description: Filter by DPE energy class
 *       - in: query
 *         name: localities
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by INSEE codes
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Text search on address, owner name, or invariant
 *         example: "75002"
 *     responses:
 *       200:
 *         description: Paginated list of housing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 url:
 *                   type: string
 *                   format: uri
 *       401:
 *         description: Non authentifié
 *       413:
 *         description: Fichier trop volumineux
 */
router.post('/files', upload(), fileController.create);

/**
 * @swagger
 * /housing:
 *   get:
 *     summary: Lister les logements vacants
 *     description: Retourne une liste paginée des logements vacants selon les filtres appliqués
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: Filtrer par statut
 *       - in: query
 *         name: occupancy
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filtrer par type d'occupation
 *       - in: query
 *         name: geoPerimetersIncluded
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         description: Inclure les périmètres géographiques
 *       - in: query
 *         name: geoPerimetersExcluded
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         description: Exclure les périmètres géographiques
 *       - in: query
 *         name: vacancyYears
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: Filtrer par durée de vacance (en années)
 *       - in: query
 *         name: housingKind
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [MAISON, APPARTEMENT]
 *       - in: query
 *         name: energyConsumption
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [A, B, C, D, E, F, G]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 500
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Champ de tri
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Liste paginée des logements
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     entities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Housing'
 *       401:
 *         description: Non authentifié
 *   post:
 *     summary: Créer un logement
 *     description: Créer un nouveau logement manuellement
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - localId
 *               - geoCode
 *               - rawAddress
 *             properties:
 *               localId:
 *                 type: string
 *               geoCode:
 *                 type: string
 *               rawAddress:
 *                 type: array
 *                 items:
 *                   type: string
 *               longitude:
 *                 type: number
 *               latitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Logement créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Housing'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/housing',
  validatorNext.validate({
    query: schemas.housingFilters
      .concat(sortApi.sortSchema)
      .concat(paginationSchema)
  }),
  housingController.list
);
router.post(
  '/housing',
  housingController.createValidators,
  validator.validate,
  housingController.create
);

/**
 * @swagger
 * /housing/count:
 *   get:
 *     summary: Compter les logements
 *     description: Retourne le nombre de logements selon les filtres appliqués
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *       - in: query
 *         name: occupancy
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description: Nombre de logements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 housing:
 *                   type: integer
 *                 owners:
 *                   type: integer
 *       401:
 *         description: Non authentifié
 */
router.get('/housing/count',
  validatorNext.validate({
    query: schemas.housingFilters
      .concat(sortApi.sortSchema)
      .concat(paginationSchema)
  }),
housingController.count);

/**
 * @swagger
 * /housing/{id}:
 *   get:
 *     summary: Récupérer un logement
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails du logement
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Housing'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Logement non trouvé
 */
router.get(
  '/housing/:id',
  housingController.getValidators,
  validator.validate,
  housingController.get
);

/**
 * @swagger
 * /housing/list:
 *   post:
 *     summary: Mettre à jour plusieurs logements
 *     description: Applique une modification de statut à une liste de logements
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - housingIds
 *               - status
 *             properties:
 *               housingIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               status:
 *                 type: integer
 *               subStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logements mis à jour
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */
router.post(
  '/housing/list',
  housingController.updateListValidators,
  validator.validate,
  housingController.updateList
);

/**
 * @swagger
 * /housing/{housingId}:
 *   post:
 *     summary: Mettre à jour un logement
 *     description: Met à jour les informations d'un logement
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: housingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: integer
 *               subStatus:
 *                 type: string
 *               occupancy:
 *                 type: string
 *               precisions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Logement mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Housing'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Logement non trouvé
 */
// TODO: replace by PUT /housing/:id
router.post(
  '/housing/:housingId',
  [param('housingId').isUUID(), ...housingController.updateValidators],
  validator.validate,
  housingController.update
);

/**
 * @swagger
 * /groups:
 *   get:
 *     summary: Lister les groupes de logements
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des groupes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Non authentifié
 *   post:
 *     summary: Créer un groupe de logements
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - housingIds
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               housingIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Groupe créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */
router.get('/groups', groupController.list);
router.post(
  '/groups',
  groupController.createValidators,
  validator.validate,
  groupController.create
);

/**
 * @swagger
 * /groups/{id}:
 *   get:
 *     summary: Récupérer un groupe
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails du groupe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Groupe non trouvé
 *   put:
 *     summary: Mettre à jour un groupe
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Groupe mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Groupe non trouvé
 *   delete:
 *     summary: Supprimer un groupe
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Groupe supprimé
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Groupe non trouvé
 */
router.get(
  '/groups/:id',
  groupController.showValidators,
  validator.validate,
  groupController.show
);
router.put(
  '/groups/:id',
  groupController.updateValidators,
  validator.validate,
  groupController.update
);
router.delete(
  '/groups/:id',
  groupController.removeValidators,
  validator.validate,
  groupController.remove
);

/**
 * @swagger
 * /groups/{id}/export:
 *   get:
 *     summary: Exporter un groupe en Excel
 *     tags: [Groups, Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Fichier Excel
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Groupe non trouvé
 */
router.get(
  '/groups/:id/export',
  housingExportController.exportGroupValidators,
  validator.validate,
  housingExportController.exportGroup
);

/**
 * @swagger
 * /groups/{id}/housing:
 *   post:
 *     summary: Ajouter des logements à un groupe
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - housingIds
 *             properties:
 *               housingIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Logements ajoutés
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Groupe non trouvé
 *   delete:
 *     summary: Retirer des logements d'un groupe
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - housingIds
 *             properties:
 *               housingIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Logements retirés
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Groupe non trouvé
 */
router.post(
  '/groups/:id/housing',
  groupController.addHousingValidators,
  validator.validate,
  groupController.addHousing
);
router.delete(
  '/groups/:id/housing',
  groupController.removeHousingValidators,
  validator.validate,
  groupController.removeHousing
);

/**
 * @swagger
 * /campaigns:
 *   get:
 *     summary: Lister les campagnes
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sending, in-progress, archived]
 *     responses:
 *       200:
 *         description: Liste des campagnes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Campaign'
 *       401:
 *         description: Non authentifié
 *   post:
 *     summary: Créer une campagne
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - groupId
 *             properties:
 *               title:
 *                 type: string
 *               groupId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Campagne créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/campaigns',
  campaignController.listValidators,
  validator.validate,
  campaignController.list
);
router.post(
  '/campaigns',
  campaignController.createValidators,
  validator.validate,
  campaignController.create
);

/**
 * @swagger
 * /campaigns/{id}:
 *   get:
 *     summary: Récupérer une campagne
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails de la campagne
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Campaign'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Campaign not found
 */
router.get(
  '/campaigns/:id',
  campaignController.getCampaignValidators,
  validator.validate,
  campaignController.get
);
router.put(
  '/campaigns/:id',
  async (req, res, next) => {
    const { auth } = req as AuthenticatedRequest;
    const enabled = await isFeatureEnabled(
      'new-campaigns',
      auth.establishmentId
    );
    if (!enabled) return next('route');
    next();
  },
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.campaignUpdateNextPayload
  }),
  campaignController.updateNext
);

/**
 * @openapi
 * /campaigns/{id}:
 *   put:
 *     summary: Mettre à jour une campagne
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, sending, in-progress, archived]
 *     responses:
 *       200:
 *         description: Campagne mise à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Campagne non trouvée
 *   delete:
 *     summary: Supprimer une campagne
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Campagne supprimée
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Campagne non trouvée
 */
router.get(
  '/campaigns/:id',
  campaignController.getCampaignValidators,
  validator.validate,
  campaignController.getCampaign
);
router.put(
  '/campaigns/:id',
  campaignController.updateValidators,
  validator.validate,
  campaignController.update
);
router.delete(
  '/campaigns/:id',
  [isUUIDParam('id')],
  validator.validate,
  campaignController.removeCampaign
);

/**
 * @swagger
 * /campaigns/{id}/groups:
 *   post:
 *     summary: Créer une campagne depuis un groupe existant
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du groupe
 *     responses:
 *       201:
 *         description: Campagne créée
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Groupe non trouvé
 */
// TODO: replace by /groups/:id/campaigns
/**
 * @deprecated Replace by POST /groups/:id/campaigns
 * whenever the feature flag "new-campaigns" gets removed
 */
router.post(
  '/campaigns/:id/groups',
  campaignController.createCampaignFromGroupValidators,
  validator.validate,
  campaignController.createCampaignFromGroup
);
router.post(
  '/groups/:id/campaigns',
  validatorNext.validate({
    body: schemas.campaignCreationPayload,
    params: object({ id: schemas.id })
  }),
  campaignController.createFromGroup
);

// New route
router.post(
  '/campaigns/:id/exports',
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: object({
      type: string().oneOf(['drafts', 'recipients']).required()
    })
  }),
  exportController.exporter
);
router.get(
  '/campaigns/:id/export',
  housingExportController.exportCampaignValidators,
  validator.validate,
  housingExportController.exportCampaign
);

/**
 * @swagger
 * /campaigns/{id}/download:
 *   get:
 *     summary: Télécharger les courriers d'une campagne
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Fichier ZIP contenant les courriers PDF
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Campagne non trouvée
 */
router.get(
  '/campaigns/:id/download',
  campaignController.getCampaignValidators,
  validator.validate,
  campaignController.downloadCampaign
);

/**
 * @swagger
 * /campaigns/{id}/housing:
 *   delete:
 *     summary: Retirer des logements d'une campagne
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - housingIds
 *             properties:
 *               housingIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Logements retirés
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Campagne non trouvée
 */
router.delete(
  '/campaigns/:id/housing',
  campaignController.removeHousingValidators,
  validator.validate,
  campaignController.removeHousing
);

/**
 * @swagger
 * /drafts:
 *   get:
 *     summary: Lister les brouillons de courrier
 *     tags: [Drafts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des brouillons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Draft'
 *       401:
 *         description: Non authentifié
 *   post:
 *     summary: Créer un brouillon de courrier
 *     tags: [Drafts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *             properties:
 *               subject:
 *                 type: string
 *               body:
 *                 type: string
 *               logo:
 *                 type: array
 *                 items:
 *                   type: string
 *               sender:
 *                 type: object
 *     responses:
 *       201:
 *         description: Brouillon créé
 *       401:
 *         description: Non authentifié
 */
router.get('/drafts', draftController.list);
router.post(
  '/drafts',
  async (req, res, next) => {
    const { auth } = req as AuthenticatedRequest;
    const enabled = await isFeatureEnabled('new-campaigns', auth.establishmentId);
    if (!enabled) return next('route');
    next();
  },
  validatorNext.validate({ body: schemas.draftCreationPayload }),
  draftController.createNext
);
router.post(
  '/drafts',
  validatorNext.validate({
    body: schemas.draft
  }),
  draftController.create
);

/**
 * @swagger
 * /drafts/{id}:
 *   put:
 *     summary: Mettre à jour un brouillon
 *     tags: [Drafts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Draft'
 *     responses:
 *       200:
 *         description: Brouillon mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Brouillon non trouvé
 */
router.put(
  '/drafts/:id',
  async (req, res, next) => {
    const { auth } = req as AuthenticatedRequest;
    const enabled = await isFeatureEnabled('new-campaigns', auth.establishmentId);
    if (!enabled) return next('route');
    next();
  },
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.draftUpdatePayload
  }),
  draftController.updateNext
);
router.put(
  '/drafts/:id',
  draftController.updateValidators,
  validator.validate,
  draftController.update
);

/**
 * @swagger
 * /drafts/{id}/preview:
 *   post:
 *     summary: Prévisualiser un courrier
 *     tags: [Drafts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               housingId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Aperçu PDF du courrier
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Non authentifié
 */
router.post(
  '/drafts/:id/preview',
  draftController.previewValidators,
  validator.validate,
  draftController.preview
);

/**
 * @swagger
 * /owners:
 *   post:
 *     summary: Rechercher des propriétaires
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               q:
 *                 type: string
 *                 description: Recherche textuelle (nom, adresse)
 *               page:
 *                 type: integer
 *               perPage:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Liste des propriétaires
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     entities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Owner'
 *       401:
 *         description: Non authentifié
 */
router.post('/owners', ownerController.search);

/**
 * @swagger
 * /owners/{id}:
 *   get:
 *     summary: Récupérer un propriétaire
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Détails du propriétaire
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Owner'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Propriétaire non trouvé
 *   put:
 *     summary: Mettre à jour un propriétaire
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               rawAddress:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Propriétaire mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Propriétaire non trouvé
 */
router.get('/owners/:id', ownerController.get);
router.put(
  '/owners/:id',
  [param('id').isUUID().notEmpty(), ...ownerController.ownerValidators],
  validator.validate,
  ownerController.update
);

/**
 * @swagger
 * /owners/creation:
 *   post:
 *     summary: Créer un propriétaire
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               rawAddress:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Propriétaire créé
 *       401:
 *         description: Non authentifié
 */
router.post(
  '/owners/creation',
  ownerController.ownerValidators,
  validator.validate,
  ownerController.create
);

/**
 * @swagger
 * /owners/housing/{housingId}:
 *   get:
 *     summary: Lister les propriétaires d'un logement
 *     tags: [Owners, Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: housingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des propriétaires
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Owner'
 *       401:
 *         description: Non authentifié
 */
router.get('/owners/housing/:housingId', ownerController.listByHousing);

/**
 * @swagger
 * /housing/{housingId}/owners:
 *   put:
 *     summary: Mettre à jour les propriétaires d'un logement
 *     tags: [Owners, Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: housingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownerIds
 *             properties:
 *               ownerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Propriétaires mis à jour
 *       401:
 *         description: Non authentifié
 */
router.put('/housing/:housingId/owners', ownerController.updateHousingOwners);

/**
 * @swagger
 * /owner-prospects:
 *   get:
 *     summary: Lister les demandes de contact propriétaires
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des demandes
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/owner-prospects',
  ownerProspectController.findOwnerProspectsValidators,
  validator.validate,
  ownerProspectController.find
);

/**
 * @swagger
 * /owner-prospects/{id}:
 *   put:
 *     summary: Mettre à jour une demande de contact propriétaire
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Demande mise à jour
 *       401:
 *         description: Non authentifié
 */
router.put(
  '/owner-prospects/:id',
  ownerProspectController.updateOwnerProspectValidators,
  validator.validate,
  ownerProspectController.update
);

/**
 * @swagger
 * /owners/{id}/events:
 *   get:
 *     summary: Lister les événements d'un propriétaire
 *     tags: [Events, Owners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/owners/:id/events',
  [isUUIDParam('id')],
  validator.validate,
  eventController.listByOwnerId
);

/**
 * @swagger
 * /housing/{id}/events:
 *   get:
 *     summary: Lister les événements d'un logement
 *     tags: [Events, Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/housing/:id/events',
  [isUUIDParam('id')],
  validator.validate,
  eventController.listByHousingId
);

/**
 * @swagger
 * /notes/housing/{housingId}:
 *   get:
 *     summary: Lister les notes d'un logement
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: housingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des notes
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/notes/housing/:housingId',
  [isUUIDParam('housingId')],
  validator.validate,
  noteController.listByHousingId
);

/**
 * @swagger
 * /account:
 *   get:
 *     summary: Récupérer le compte de l'utilisateur connecté
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations du compte
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
router.get('/account', [], validator.validate, accountController.get);

/**
 * @openapi
 * /account:
 *   put:
 *     summary: Mettre à jour le compte
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               position:
 *                 type: string
 *               timePerWeek:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compte mis à jour
 *       401:
 *         description: Non authentifié
 */
// TODO: rework and merge this API with the User API
router.get('/account', [], validator.validate, accountController.get);
router.put(
  '/account',
  validatorNext.validate(accountController.updateAccountValidators),
  accountController.updateAccount
);

/**
 * @swagger
 * /account/password:
 *   put:
 *     summary: Changer le mot de passe
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Mot de passe changé
 *       400:
 *         description: Mot de passe actuel incorrect
 *       401:
 *         description: Non authentifié
 */
router.put(
  '/account/password',
  accountController.updatePasswordValidators,
  validator.validate,
  accountController.updatePassword
);

/**
 * @swagger
 * /account/establishments/{establishmentId}:
 *   get:
 *     summary: Changer d'établissement
 *     description: Pour les utilisateurs multi-établissements (admin, visitor)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: establishmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Nouveau token JWT pour l'établissement
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Non authentifié ou non autorisé
 *       404:
 *         description: Établissement non trouvé
 */
router.get(
  '/account/establishments/:establishmentId',
  [isUUIDParam('establishmentId')],
  validator.validate,
  authController.changeEstablishment
);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Récupérer un utilisateur
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Utilisateur non trouvé
 */
router.get(
  '/users/:userId',
  [isUUIDParam('userId')],
  validator.validate,
  userController.get
);

/**
 * @swagger
 * /geo/perimeters:
 *   get:
 *     summary: Lister les périmètres géographiques
 *     tags: [Geo Perimeters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des périmètres
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GeoPerimeter'
 *       401:
 *         description: Non authentifié
 *   post:
 *     summary: Créer un périmètre géographique
 *     description: Upload d'un fichier shapefile pour créer un périmètre
 *     tags: [Geo Perimeters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier shapefile (.zip)
 *     responses:
 *       201:
 *         description: Périmètre créé
 *       400:
 *         description: Fichier invalide
 *       401:
 *         description: Non authentifié
 *   delete:
 *     summary: Supprimer des périmètres géographiques
 *     tags: [Geo Perimeters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       204:
 *         description: Périmètres supprimés
 *       401:
 *         description: Non authentifié
 */
// TODO: should be /geo-perimeters
router.get('/geo/perimeters', geoController.listGeoPerimeters);
router.post('/geo/perimeters', fileUpload(), geoController.createGeoPerimeter);
router.delete(
  '/geo/perimeters',
  geoController.deleteGeoPerimeterListValidators,
  validator.validate,
  geoController.deleteGeoPerimeterList
);

/**
 * @swagger
 * /geo/perimeters/{geoPerimeterId}:
 *   put:
 *     summary: Mettre à jour un périmètre géographique
 *     tags: [Geo Perimeters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: geoPerimeterId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               kind:
 *                 type: string
 *     responses:
 *       200:
 *         description: Périmètre mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Périmètre non trouvé
 */
router.put(
  '/geo/perimeters/:geoPerimeterId',
  geoController.updateGeoPerimeterValidators,
  validator.validate,
  geoController.updateGeoPerimeter
);

/**
 * @swagger
 * /contact-points:
 *   get:
 *     summary: Lister les points de contact
 *     tags: [Contact Points]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des points de contact
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ContactPoint'
 *       401:
 *         description: Non authentifié
 *   post:
 *     summary: Créer un point de contact
 *     tags: [Contact Points]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               opening:
 *                 type: string
 *     responses:
 *       201:
 *         description: Point de contact créé
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/contact-points',
  contactPointController.listContactPointsValidators,
  validator.validate,
  contactPointController.listContactPoints(false)
);
router.post(
  '/contact-points',
  contactPointController.createContactPointValidators,
  validator.validate,
  contactPointController.createContactPoint
);

/**
 * @swagger
 * /contact-points/{id}:
 *   put:
 *     summary: Mettre à jour un point de contact
 *     tags: [Contact Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactPoint'
 *     responses:
 *       200:
 *         description: Point de contact mis à jour
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Point de contact non trouvé
 *   delete:
 *     summary: Supprimer un point de contact
 *     tags: [Contact Points]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Point de contact supprimé
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Point de contact non trouvé
 */
router.put(
  '/contact-points/:id',
  contactPointController.updateContactPointValidators,
  validator.validate,
  contactPointController.updateContactPoint
);
router.delete(
  '/contact-points/:id',
  contactPointController.deleteContactPointValidators,
  validator.validate,
  contactPointController.deleteContactPoint
);

/**
 * @swagger
 * /localities/{geoCode}/tax:
 *   put:
 *     summary: Mettre à jour la taxe d'une commune
 *     tags: [Localities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: geoCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code INSEE de la commune
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taxKind:
 *                 type: string
 *                 description: Type de taxe sur les logements vacants
 *               taxRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Taxe mise à jour
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (admin requis)
 */
router.put(
  '/localities/:geoCode/tax',
  localityController.updateLocalityTaxValidators,
  validator.validate,
  localityController.updateLocalityTax
);

/**
 * @swagger
 * /establishments/{id}/settings:
 *   put:
 *     summary: Mettre à jour les paramètres d'un établissement
 *     tags: [Establishments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inboxEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Paramètres mis à jour
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Non autorisé (admin requis)
 */
router.put(
  '/establishments/:id/settings',
  settingsController.updateSettingsValidators,
  validator.validate,
  settingsController.updateSettings
);

/**
 * @swagger
 * /dashboards/{id}:
 *   get:
 *     summary: Récupérer un tableau de bord
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Données du tableau de bord
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Tableau de bord non trouvé
 */
router.get(
  '/dashboards/:id',
  dashboardController.findOneValidators,
  validator.validate,
  dashboardController.findOne
);

/**
 * @swagger
 * /datafoncier/housing/{localId}:
 *   get:
 *     summary: Récupérer les données Datafoncier d'un logement
 *     description: Données brutes issues de la base Datafoncier (LOVAC)
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: localId
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant local du logement
 *     responses:
 *       200:
 *         description: Données Datafoncier
 *       401:
 *         description: Non authentifié
 *       404:
 *         description: Logement non trouvé
 */
router.get('/datafoncier/housing/:localId', datafoncierController.findOne);

export default router;
