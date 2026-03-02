import {
  ACCEPTED_HOUSING_DOCUMENT_EXTENSIONS,
  MAX_HOUSING_DOCUMENT_SIZE_IN_MiB,
  UserRole
} from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import { AuthenticatedRequest } from 'express-jwt';
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
import exportController from '~/controllers/exportController';
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
import { isFeatureEnabled } from '~/services/posthogService';
import { isUUIDParam } from '~/utils/validators';

const router = Router();

router.use(jwtCheck());
router.use(userCheck());

/**
 * @openapi
 * /files:
 *   post:
 *     summary: Upload a file
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
 *               $ref: '#/components/schemas/PaginatedHousing'
 *             example:
 *               entities:
 *                 - id: 123e4567-e89b-12d3-a456-426614174000
 *                   localId: "123456789012"
 *                   rawAddress: ["12 RUE DE LA PAIX", "75002 PARIS"]
 *                   geoCode: "75102"
 *                   housingKind: APPART
 *                   roomsCount: 3
 *                   livingArea: 65.5
 *                   status: 0
 *                   occupancy: V
 *                   vacancyStartYear: 2020
 *                   owner:
 *                     id: 223e4567-e89b-12d3-a456-426614174001
 *                     fullName: DUPONT Jean
 *               page: 1
 *               perPage: 50
 *               totalCount: 1234
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *     summary: Create a housing
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
 *                 description: Local fiscal identifier (12 characters)
 *     responses:
 *       201:
 *         description: Housing created
 *       400:
 *         description: Invalid data
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
 *     summary: Count housing
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
 *         description: Housing count
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
 *     summary: Get a housing by ID
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
 *         description: Housing details
 *       404:
 *         description: Housing not found
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
 *     summary: Update multiple housing
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
 *         description: Housing updated
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
 *     summary: Update a housing
 *     tags: [Housing]
 *     description: Update status, occupancy, and other attributes of a specific housing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HousingUpdatePayload'
 *           example:
 *             status: 2
 *             subStatus: "Premier contact établi"
 *             occupancy: V
 *             occupancyIntended: L
 *             actualEnergyConsumption: D
 *     responses:
 *       200:
 *         description: Housing updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Housing'
 *       400:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Housing not found
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
 *     summary: List campaigns
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of campaigns
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
 *     summary: Create a campaign
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
 *         description: Campaign created
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
 *     summary: Get a campaign
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
 *         description: Campaign details
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
 *     summary: Update a campaign
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
 *         description: Campaign updated
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
 *     summary: Delete a campaign
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
 *         description: Campaign deleted
 *       404:
 *         description: Campaign not found
 */
router.delete(
  '/campaigns/:id',
  [isUUIDParam('id')],
  validator.validate,
  campaignController.removeCampaign
);
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
 *     summary: List owners
 *     tags: [Owners]
 *     description: Returns a paginated list of property owners
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by owner name
 *         example: DUPONT
 *     responses:
 *       200:
 *         description: Paginated list of owners
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedOwners'
 *             example:
 *               entities:
 *                 - id: 123e4567-e89b-12d3-a456-426614174001
 *                   fullName: DUPONT Jean
 *                   email: jean.dupont@email.com
 *                   phone: "+33612345678"
 *                   birthDate: "1965-03-15"
 *                   kind: particulier
 *                   rawAddress: ["15 AVENUE VICTOR HUGO", "75016 PARIS"]
 *               page: 1
 *               perPage: 50
 *               totalCount: 567
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
 *     summary: Search owners
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
 *         description: Search results
 */
router.post('/owners', ownerController.search);

/**
 * @openapi
 * /owners/{id}:
 *   get:
 *     summary: Get an owner
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
 *         description: Owner details
 *       404:
 *         description: Owner not found
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
 *     summary: Get the current user's account
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account information
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
 *         description: Not authenticated
 */
router.get('/account', [], validator.validate, accountController.get);

/**
 * @openapi
 * /account:
 *   put:
 *     summary: Update the current user's account
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
 *         description: Account updated
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

/**
 * @openapi
 * /dashboards/{id}:
 *   get:
 *     summary: Get Metabase dashboard URL
 *     tags: [Statistics]
 *     description: Returns a signed Metabase embed URL for the specified dashboard
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - 6-utilisateurs-de-zlv-sur-votre-structure
 *             - 7-autres-structures-de-votre-territoires-inscrites-sur-zlv
 *             - 13-analyses
 *             - 15-analyses-activites
 *         description: Dashboard identifier
 *     responses:
 *       200:
 *         description: Dashboard URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   format: uri
 *                   description: Signed Metabase embed URL (valid for 10 minutes)
 *       400:
 *         description: Invalid dashboard ID
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/dashboards/:id',
  dashboardController.findOneValidators,
  validator.validate,
  dashboardController.findOne
);

router.get('/datafoncier/housing/:localId', datafoncierController.findOne);

export default router;
