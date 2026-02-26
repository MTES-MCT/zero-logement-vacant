import {
  ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
  MAX_HOUSING_DOCUMENT_SIZE_IN_MiB,
  UserRole
} from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import Router from 'express-promise-router';
import { param } from 'express-validator';
import { object, string } from 'yup';

import accountController from '~/controllers/accountController';
import buildingController from '~/controllers/buildingController';
import campaignController from '~/controllers/campaignController';
import dashboardController from '~/controllers/dashboardController';
import datafoncierController from '~/controllers/datafoncierHousingController';
import documentController from '~/controllers/documentController';
import draftController from '~/controllers/draftController';
import eventController from '~/controllers/eventController';
import fileController from '~/controllers/fileController';
import geoController from '~/controllers/geoController';
import groupController from '~/controllers/groupController';
import housingController from '~/controllers/housingController';
import housingExportController from '~/controllers/housingExportController';
import housingOwnerController from '~/controllers/housingOwnerController';
import localityController from '~/controllers/localityController';
import noteController from '~/controllers/noteController';
import ownerController from '~/controllers/ownerController';
import precisionController from '~/controllers/precisionController';
import settingsController from '~/controllers/settingsController';
import userController from '~/controllers/userController';
import config from '~/infra/config';
import antivirusMiddleware from '~/middlewares/antivirus';
import { hasRole, jwtCheck, userCheck } from '~/middlewares/auth';
import fileTypeMiddleware from '~/middlewares/fileTypeMiddleware';
import shapefileValidationMiddleware from '~/middlewares/shapefileValidation';
import { upload } from '~/middlewares/upload';
import validator from '~/middlewares/validator';
import validatorNext from '~/middlewares/validator-next';
import zipValidationMiddleware from '~/middlewares/zipValidation';
import { paginationSchema } from '~/models/PaginationApi';
import sortApi from '~/models/SortApi';
import { isUUIDParam } from '~/utils/validators';

const router = Router();

router.use(jwtCheck());
router.use(userCheck());

/**
 * @openapi
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
 *         description: Fichier uploadé avec succès
 *       400:
 *         description: Type de fichier non autorisé
 *       413:
 *         description: Fichier trop volumineux
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
 *     summary: Lister les logements vacants
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *         description: Filtrer par statut
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche textuelle
 *     responses:
 *       200:
 *         description: Liste paginée des logements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entities:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Housing'
 *                 page:
 *                   type: integer
 *                 perPage:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
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

/**
 * @openapi
 * /housing:
 *   post:
 *     summary: Créer un logement
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [localId]
 *             properties:
 *               localId:
 *                 type: string
 *                 description: Identifiant fiscal local (12 caractères)
 *     responses:
 *       201:
 *         description: Logement créé
 *       400:
 *         description: Données invalides
 */
router.post(
  '/housing',
  validatorNext.validate({
    body: object({
      localId: string().required().length(12)
    })
  }),
  housingController.create
);

/**
 * @openapi
 * /housing/count:
 *   get:
 *     summary: Compter les logements
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
 */
router.get(
  '/housing/count',
  validatorNext.validate({
    query: schemas.housingFilters
      .concat(sortApi.sortSchema)
      .concat(paginationSchema)
  }),
  housingController.count
);

/**
 * @openapi
 * /housing/{id}:
 *   get:
 *     summary: Récupérer un logement par ID
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
 * @openapi
 * /housing:
 *   put:
 *     summary: Mettre à jour plusieurs logements
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
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
 */
router.put(
  '/housing',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    body: schemas.housingBatchUpdatePayload
  }),
  housingController.updateMany
);

/**
 * @openapi
 * /housing/{id}:
 *   put:
 *     summary: Mettre à jour un logement
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
 *     responses:
 *       200:
 *         description: Logement mis à jour
 *       404:
 *         description: Logement non trouvé
 */
router.put(
  '/housing/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingUpdatePayload
  }),
  housingController.update
);

// Buildings
router.get(
  '/buildings',
  validatorNext.validate({ query: schemas.buildingFilters }),
  buildingController.find
);
router.get(
  '/buildings/:id',
  validatorNext.validate({
    params: object({
      id: string().required()
    })
  }),
  buildingController.get
);

router.get('/precisions', precisionController.find);
router.get('/housing/:id/precisions', precisionController.findByHousing);
router.put(
  '/housing/:id/precisions',
  precisionController.updatePrecisionsByHousing
);

router.get('/groups', groupController.list);
router.post(
  '/groups',
  validatorNext.validate({
    body: schemas.groupCreationPayload
  }),
  groupController.create
);
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
router.get(
  '/groups/:id/export',
  housingExportController.exportGroupValidators,
  validator.validate,
  housingExportController.exportGroup
);
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
 * @openapi
 * /campaigns:
 *   get:
 *     summary: Lister les campagnes
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des campagnes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [draft, sending, sent, archived]
 *                   sentAt:
 *                     type: string
 *                     format: date-time
 */
router.get(
  '/campaigns',
  campaignController.listValidators,
  validator.validate,
  campaignController.list
);

/**
 * @openapi
 * /campaigns:
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
 *             required: [title, groupId]
 *             properties:
 *               title:
 *                 type: string
 *               groupId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Campagne créée
 */
router.post(
  '/campaigns',
  validatorNext.validate({
    body: schemas.campaignCreationPayload
  }),
  campaignController.create
);

/**
 * @openapi
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
 *       404:
 *         description: Campagne non trouvée
 */
router.get(
  '/campaigns/:id',
  campaignController.getCampaignValidators,
  validator.validate,
  campaignController.getCampaign
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
 *     responses:
 *       200:
 *         description: Campagne mise à jour
 */
router.put(
  '/campaigns/:id',
  campaignController.updateValidators,
  validator.validate,
  campaignController.update
);

/**
 * @openapi
 * /campaigns/{id}:
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
 *       404:
 *         description: Campagne non trouvée
 */
router.delete(
  '/campaigns/:id',
  [isUUIDParam('id')],
  validator.validate,
  campaignController.removeCampaign
);
// TODO: replace by /groups/:id/campaigns
router.post(
  '/campaigns/:id/groups',
  campaignController.createCampaignFromGroupValidators,
  validator.validate,
  campaignController.createCampaignFromGroup
);
router.get(
  '/campaigns/:id/export',
  housingExportController.exportCampaignValidators,
  validator.validate,
  housingExportController.exportCampaign
);
router.get(
  '/campaigns/:id/download',
  campaignController.getCampaignValidators,
  validator.validate,
  campaignController.downloadCampaign
);
router.delete(
  '/campaigns/:id/housing',
  campaignController.removeHousingValidators,
  validator.validate,
  campaignController.removeHousing
);

router.get('/drafts', draftController.list);
router.post(
  '/drafts',
  validatorNext.validate({
    body: schemas.draft
  }),
  draftController.create
);
router.put(
  '/drafts/:id',
  draftController.updateValidators,
  validator.validate,
  draftController.update
);
router.post(
  '/drafts/:id/preview',
  draftController.previewValidators,
  validator.validate,
  draftController.preview
);

/**
 * @openapi
 * /owners:
 *   get:
 *     summary: Lister les propriétaires
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche par nom
 *     responses:
 *       200:
 *         description: Liste paginée des propriétaires
 */
router.get(
  '/owners',
  validatorNext.validate({
    query: schemas.ownerFilters.concat(paginationSchema)
  }),
  ownerController.list
);

/**
 * @openapi
 * /owners:
 *   post:
 *     summary: Rechercher des propriétaires
 *     tags: [Owners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: Résultats de recherche
 */
router.post('/owners', ownerController.search);

/**
 * @openapi
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
 *       404:
 *         description: Propriétaire non trouvé
 */
router.get('/owners/:id', ownerController.get);
router.post(
  '/owners/creation',
  ownerController.ownerValidators,
  validator.validate,
  ownerController.create
);
router.put(
  '/owners/:id',
  [param('id').isUUID().notEmpty(), ...ownerController.ownerValidators],
  validator.validate,
  ownerController.update
);
router.get(
  '/housings/:id/owners',
  validatorNext.validate({ params: object({ id: schemas.id }) }),
  ownerController.listByHousing
);
router.put(
  '/housing/:housingId/owners',
  // TODO: validate inputs
  ownerController.updateHousingOwners
);

// Housing owners
router.get(
  '/owners/:id/housings',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  housingOwnerController.listByOwner
);

router.get(
  '/owners/:id/events',
  [isUUIDParam('id')],
  validator.validate,
  eventController.listByOwnerId
);
router.get(
  '/housing/:id/events',
  [isUUIDParam('id')],
  validator.validate,
  eventController.listByHousingId
);

router.get(
  '/housing/:id/notes',
  [isUUIDParam('id')],
  validator.validate,
  noteController.findByHousing
);
router.post(
  '/housing/:id/notes',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.notePayload
  }),
  noteController.createByHousing
);
router.put(
  '/notes/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.notePayload
  }),
  noteController.update
);
router.delete(
  '/notes/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  noteController.remove
);

/**
 * @openapi
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
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 role:
 *                   type: string
 *                   enum: [visitor, usual, admin]
 *                 establishment:
 *                   type: object
 *       401:
 *         description: Non authentifié
 */
router.get('/account', [], validator.validate, accountController.get);

/**
 * @openapi
 * /account:
 *   put:
 *     summary: Mettre à jour le compte de l'utilisateur connecté
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compte mis à jour
 */
router.put(
  '/account',
  validatorNext.validate(accountController.updateAccountValidators),
  accountController.updateAccount
);
router.get(
  '/account/establishments/:establishmentId',
  [isUUIDParam('establishmentId')],
  validator.validate,
  accountController.changeEstablishment
);

/* Users */

router.get(
  '/users',
  validatorNext.validate({
    query: schemas.userFilters
  }),
  userController.list
);
router.get(
  '/users/:id',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  userController.get
);
router.put(
  '/users/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.userUpdatePayload
  }),
  userController.update
);
router.delete(
  '/users/:id',
  hasRole([UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  userController.remove
);

// TODO: should be /geo-perimeters
router.get('/geo/perimeters', geoController.listGeoPerimeters);
router.post(
  '/geo/perimeters',
  upload({
    accept: ['zip'],
    maxSizeMiB: config.upload.geo.maxSizeMB,
    multiple: false
  }),
  zipValidationMiddleware,
  antivirusMiddleware,
  shapefileValidationMiddleware,
  geoController.createGeoPerimeter
);
router.put(
  '/geo/perimeters/:geoPerimeterId',
  geoController.updateGeoPerimeterValidators,
  validator.validate,
  geoController.updateGeoPerimeter
);
router.delete(
  '/geo/perimeters',
  geoController.deleteGeoPerimeterListValidators,
  validator.validate,
  geoController.deleteGeoPerimeterList
);

router.put(
  '/localities/:geoCode/tax',
  localityController.updateLocalityTaxValidators,
  validator.validate,
  localityController.updateLocalityTax
);

router.put(
  '/establishments/:id/settings',
  settingsController.updateSettingsValidators,
  validator.validate,
  settingsController.updateSettings
);

router.get(
  '/dashboards/:id',
  dashboardController.findOneValidators,
  validator.validate,
  dashboardController.findOne
);

router.get('/datafoncier/housing/:localId', datafoncierController.findOne);

export default router;
