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
router.post(
  '/files',
  upload(),
  fileTypeMiddleware,
  antivirusMiddleware,
  fileController.create
);

/**
 * @openapi
 * /documents:
 *   post:
 *     summary: Uploader un ou plusieurs documents
 *     description: |
 *       Upload de documents pour les logements.
 *
 *       **Extensions acceptées:** png, jpg, heic, webp, pdf, doc, docx, xls, xlsx, ppt, pptx
 *
 *       **Taille maximale:** 25 MiB par fichier
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Documents uploadés
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DocumentComplete'
 *       400:
 *         description: Type de fichier non autorisé
 *       413:
 *         description: Fichier trop volumineux (max 25 MiB)
 */
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

/**
 * @openapi
 * /documents/{id}:
 *   put:
 *     summary: Modifier un document (renommer)
 *     tags: [Files]
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
 *             $ref: '#/components/schemas/DocumentPayload'
 *     responses:
 *       200:
 *         description: Document modifié
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentComplete'
 *       404:
 *         description: Document non trouvé
 */
router.put(
  '/documents/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.documentPayload
  }),
  documentController.update
);

/**
 * @openapi
 * /documents/{id}:
 *   delete:
 *     summary: Supprimer un document
 *     tags: [Files]
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
 *         description: Document supprimé
 *       404:
 *         description: Document non trouvé
 */
router.delete(
  '/documents/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  documentController.remove
);

/**
 * @openapi
 * /housing/{id}/documents:
 *   get:
 *     summary: Lister les documents d'un logement
 *     tags: [Housing, Files]
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
 *         description: Liste des documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/DocumentComplete'
 */
router.get(
  '/housing/:id/documents',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  documentController.listByHousing
);

/**
 * @openapi
 * /housing/{id}/documents:
 *   post:
 *     summary: Associer un document existant à un logement
 *     tags: [Housing, Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du logement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentId:
 *                 type: string
 *                 format: uuid
 *             required:
 *               - documentId
 *     responses:
 *       200:
 *         description: Document associé au logement
 */
router.post(
  '/housing/:id/documents',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingDocumentPayload
  }),
  documentController.linkToHousing
);

/**
 * @openapi
 * /housing/{housingId}/documents/{documentId}:
 *   delete:
 *     summary: Dissocier un document d'un logement
 *     tags: [Housing, Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: housingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du logement
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du document
 *     responses:
 *       204:
 *         description: Document dissocié du logement
 */
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
 *     description: Retourne les détails complets d'un logement avec son propriétaire principal.
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
 *         description: ID du logement
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
 *     description: |
 *       Met à jour le statut de suivi et l'occupation d'un logement.
 *       Tous les champs sont requis mais certains peuvent être null.
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
 *         description: ID du logement
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HousingUpdatePayload'
 *     responses:
 *       200:
 *         description: Logement mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Housing'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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

/**
 * @openapi
 * /buildings:
 *   get:
 *     summary: Lister les bâtiments
 *     description: Retourne la liste des bâtiments avec leurs informations DPE et nombre de logements
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: housingId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par ID de logement
 *     responses:
 *       200:
 *         description: Liste des bâtiments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   housingCount:
 *                     type: integer
 *                   vacantHousingCount:
 *                     type: integer
 *                   dpe:
 *                     type: object
 *                     properties:
 *                       class:
 *                         type: string
 *                         enum: [A, B, C, D, E, F, G]
 *                       doneAt:
 *                         type: string
 *                         format: date-time
 */
router.get(
  '/buildings',
  validatorNext.validate({ query: schemas.buildingFilters }),
  buildingController.find
);

/**
 * @openapi
 * /buildings/{id}:
 *   get:
 *     summary: Récupérer un bâtiment
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du bâtiment
 *     responses:
 *       200:
 *         description: Détails du bâtiment
 *       404:
 *         description: Bâtiment non trouvé
 */
router.get(
  '/buildings/:id',
  validatorNext.validate({
    params: object({
      id: string().required()
    })
  }),
  buildingController.get
);

/**
 * @openapi
 * /precisions:
 *   get:
 *     summary: Lister toutes les précisions disponibles
 *     description: Retourne la liste des précisions pouvant être associées aux logements
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des précisions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Precision'
 */
router.get('/precisions', precisionController.find);

/**
 * @openapi
 * /housing/{id}/precisions:
 *   get:
 *     summary: Lister les précisions d'un logement
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
 *         description: Précisions du logement
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Precision'
 */
router.get('/housing/:id/precisions', precisionController.findByHousing);

/**
 * @openapi
 * /housing/{id}/precisions:
 *   put:
 *     summary: Mettre à jour les précisions d'un logement
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
 *               precisionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Précisions mises à jour
 */
router.put(
  '/housing/:id/precisions',
  precisionController.updatePrecisionsByHousing
);

/**
 * @openapi
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
 *                 $ref: '#/components/schemas/GroupComplete'
 */
router.get('/groups', groupController.list);

/**
 * @openapi
 * /groups:
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
 *             $ref: '#/components/schemas/GroupPayload'
 *     responses:
 *       201:
 *         description: Groupe créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GroupComplete'
 *       400:
 *         description: Données invalides
 */
router.post(
  '/groups',
  validatorNext.validate({
    body: schemas.groupCreationPayload
  }),
  groupController.create
);

/**
 * @openapi
 * /groups/{id}:
 *   get:
 *     summary: Récupérer un groupe par ID
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
 *               $ref: '#/components/schemas/GroupComplete'
 *       404:
 *         description: Groupe non trouvé
 */
router.get(
  '/groups/:id',
  groupController.showValidators,
  validator.validate,
  groupController.show
);

/**
 * @openapi
 * /groups/{id}:
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
 *       404:
 *         description: Groupe non trouvé
 */
router.put(
  '/groups/:id',
  groupController.updateValidators,
  validator.validate,
  groupController.update
);

/**
 * @openapi
 * /groups/{id}:
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
 *       404:
 *         description: Groupe non trouvé
 */
router.delete(
  '/groups/:id',
  groupController.removeValidators,
  validator.validate,
  groupController.remove
);

/**
 * @openapi
 * /groups/{id}/export:
 *   get:
 *     summary: Exporter les logements d'un groupe
 *     description: |
 *       Génère un fichier CSV avec les logements du groupe.
 *
 *       **Colonnes du CSV:**
 *       - Identifiant local, Invariant, Adresse, Code postal, Commune
 *       - Statut de suivi, Sous-statut, Occupation
 *       - Année de vacance, Surface, Nombre de pièces
 *       - Propriétaire (nom, adresse, email, téléphone)
 *       - DPE, Référence cadastrale
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
 *         description: Fichier CSV d'export
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *             example: |
 *               "Identifiant local";"Invariant";"Adresse";"Code postal";"Commune";"Statut";"Occupation";"Année vacance";"Surface m²";"Pièces";"Propriétaire";"Email";"Téléphone";"DPE"
 *               "123456789012";"1234567890";"12 RUE DE LA PAIX";"75002";"PARIS";"Non suivi";"Vacant";"2020";"65";"3";"DUPONT Jean";"jean.dupont@email.com";"+33612345678";"D"
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
 * @openapi
 * /groups/{id}/housing:
 *   post:
 *     summary: Ajouter des logements à un groupe
 *     tags: [Groups, Housing]
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
 *               all:
 *                 type: boolean
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               filters:
 *                 $ref: '#/components/schemas/HousingFilters'
 *     responses:
 *       200:
 *         description: Logements ajoutés au groupe
 */
router.post(
  '/groups/:id/housing',
  groupController.addHousingValidators,
  validator.validate,
  groupController.addHousing
);

/**
 * @openapi
 * /groups/{id}/housing:
 *   delete:
 *     summary: Retirer des logements d'un groupe
 *     tags: [Groups, Housing]
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
 *               all:
 *                 type: boolean
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               filters:
 *                 $ref: '#/components/schemas/HousingFilters'
 *     responses:
 *       200:
 *         description: Logements retirés du groupe
 */
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
 *     description: |
 *       Retourne la liste des campagnes de l'établissement.
 *
 *       **Statuts possibles:**
 *       - `draft`: Envoi en attente
 *       - `sending`: En cours d'envoi
 *       - `in-progress`: Envoyée
 *       - `archived`: Archivée
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
 *                 $ref: '#/components/schemas/CampaignComplete'
 *             example:
 *               - id: "123e4567-e89b-12d3-a456-426614174004"
 *                 title: "Campagne courrier janvier 2024"
 *                 description: "Première relance des propriétaires"
 *                 status: "in-progress"
 *                 createdAt: "2024-01-01T10:00:00Z"
 *                 sentAt: "2024-01-15T14:30:00Z"
 *                 groupId: "123e4567-e89b-12d3-a456-426614174005"
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
 *     description: Crée une nouvelle campagne de contact avec sélection de logements
 *     tags: [Campaigns]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignCreationPayload'
 *     responses:
 *       201:
 *         description: Campagne créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignComplete'
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
 *     description: Retourne les détails complets d'une campagne avec ses filtres et dates
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
 *               $ref: '#/components/schemas/CampaignComplete'
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
 *             $ref: '#/components/schemas/CampaignUpdatePayload'
 *     responses:
 *       200:
 *         description: Campagne mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignComplete'
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
 * @openapi
 * /campaigns/{id}/download:
 *   get:
 *     summary: Télécharger le fichier de campagne
 *     description: Télécharge le fichier PDF/courrier généré pour la campagne
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
 *         description: Fichier de campagne
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Campagne ou fichier non trouvé
 */
router.get(
  '/campaigns/:id/download',
  campaignController.getCampaignValidators,
  validator.validate,
  campaignController.downloadCampaign
);

/**
 * @openapi
 * /campaigns/{id}/housing:
 *   delete:
 *     summary: Retirer des logements d'une campagne
 *     tags: [Campaigns, Housing]
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
 *               all:
 *                 type: boolean
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               filters:
 *                 $ref: '#/components/schemas/HousingFilters'
 *     responses:
 *       200:
 *         description: Logements retirés de la campagne
 */
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
 *     summary: Lister les propriétaires
 *     description: Retourne une liste paginée des propriétaires avec recherche textuelle
 *     tags: [Owners]
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
 *         description: Recherche par nom ou adresse
 *         example: "DUPONT"
 *     responses:
 *       200:
 *         description: Liste paginée des propriétaires
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedOwners'
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
 *     description: Recherche avancée de propriétaires avec critères multiples
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
 *                 description: Terme de recherche
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OwnerComplete'
 */
router.post('/owners', ownerController.search);

/**
 * @openapi
 * /owners/{id}:
 *   get:
 *     summary: Récupérer un propriétaire
 *     description: Retourne les détails complets d'un propriétaire avec ses informations de contact
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
 *         description: ID du propriétaire
 *     responses:
 *       200:
 *         description: Détails du propriétaire
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OwnerComplete'
 *             example:
 *               id: "123e4567-e89b-12d3-a456-426614174001"
 *               fullName: "DUPONT Jean"
 *               birthDate: "1965-03-15"
 *               email: "jean.dupont@email.com"
 *               phone: "+33612345678"
 *               rawAddress: ["15 AVENUE VICTOR HUGO", "75016 PARIS"]
 *               kind: "particulier"
 *               createdAt: "2023-01-15T10:30:00Z"
 *       404:
 *         description: Propriétaire non trouvé
 */
router.get('/owners/:id', ownerController.get);

/**
 * @openapi
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
 *             $ref: '#/components/schemas/OwnerCreationPayload'
 *     responses:
 *       201:
 *         description: Propriétaire créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OwnerComplete'
 *       400:
 *         description: Données invalides
 */
router.post(
  '/owners/creation',
  ownerController.ownerValidators,
  validator.validate,
  ownerController.create
);

/**
 * @openapi
 * /owners/{id}:
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
 *             $ref: '#/components/schemas/OwnerUpdatePayload'
 *     responses:
 *       200:
 *         description: Propriétaire mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OwnerComplete'
 *       404:
 *         description: Propriétaire non trouvé
 */
router.put(
  '/owners/:id',
  [param('id').isUUID().notEmpty(), ...ownerController.ownerValidators],
  validator.validate,
  ownerController.update
);

/**
 * @openapi
 * /housings/{id}/owners:
 *   get:
 *     summary: Lister les propriétaires d'un logement
 *     tags: [Housing, Owners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du logement
 *     responses:
 *       200:
 *         description: Liste des propriétaires
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OwnerComplete'
 */
router.get(
  '/housings/:id/owners',
  validatorNext.validate({ params: object({ id: schemas.id }) }),
  ownerController.listByHousing
);

/**
 * @openapi
 * /housing/{housingId}/owners:
 *   put:
 *     summary: Mettre à jour les propriétaires d'un logement
 *     description: Remplace la liste des propriétaires associés au logement
 *     tags: [Housing, Owners]
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
 *               ownerIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Propriétaires mis à jour
 */
router.put(
  '/housing/:housingId/owners',
  // TODO: validate inputs
  ownerController.updateHousingOwners
);

/**
 * @openapi
 * /owners/{id}/housings:
 *   get:
 *     summary: Lister les logements d'un propriétaire
 *     tags: [Owners, Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du propriétaire
 *     responses:
 *       200:
 *         description: Liste des logements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Housing'
 */
router.get(
  '/owners/:id/housings',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  housingOwnerController.listByOwner
);

/**
 * @openapi
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
 *         description: ID du propriétaire
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       404:
 *         description: Propriétaire non trouvé
 */
router.get(
  '/owners/:id/events',
  [isUUIDParam('id')],
  validator.validate,
  eventController.listByOwnerId
);

/**
 * @openapi
 * /housing/{id}/events:
 *   get:
 *     summary: Lister les événements d'un logement
 *     description: Retourne l'historique complet des modifications du logement (changements de statut, propriétaires, campagnes, etc.)
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
 *         description: ID du logement
 *     responses:
 *       200:
 *         description: Liste des événements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       404:
 *         description: Logement non trouvé
 */
router.get(
  '/housing/:id/events',
  [isUUIDParam('id')],
  validator.validate,
  eventController.listByHousingId
);

/**
 * @openapi
 * /housing/{id}/notes:
 *   get:
 *     summary: Lister les notes d'un logement
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
 *         description: Liste des notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NoteComplete'
 */
router.get(
  '/housing/:id/notes',
  [isUUIDParam('id')],
  validator.validate,
  noteController.findByHousing
);

/**
 * @openapi
 * /housing/{id}/notes:
 *   post:
 *     summary: Créer une note sur un logement
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
 *             $ref: '#/components/schemas/NotePayload'
 *     responses:
 *       201:
 *         description: Note créée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NoteComplete'
 *       400:
 *         description: Données invalides
 */
router.post(
  '/housing/:id/notes',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.notePayload
  }),
  noteController.createByHousing
);

/**
 * @openapi
 * /notes/{id}:
 *   put:
 *     summary: Modifier une note
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
 *             $ref: '#/components/schemas/NotePayload'
 *     responses:
 *       200:
 *         description: Note mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NoteComplete'
 *       404:
 *         description: Note non trouvée
 */
router.put(
  '/notes/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.notePayload
  }),
  noteController.update
);

/**
 * @openapi
 * /notes/{id}:
 *   delete:
 *     summary: Supprimer une note
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
 *       204:
 *         description: Note supprimée
 *       404:
 *         description: Note non trouvée
 */
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

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Lister les utilisateurs
 *     description: Retourne la liste des utilisateurs avec filtres optionnels. Inclut les utilisateurs de l'établissement courant.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: establishmentIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         description: Filtrer par établissements
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche textuelle (nom, email)
 *     responses:
 *       200:
 *         description: Liste des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/users',
  validatorNext.validate({
    query: schemas.userFilters
  }),
  userController.list
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur par ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Détails de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Utilisateur non trouvé
 */
router.get(
  '/users/:id',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  userController.get
);

/**
 * @openapi
 * /users/{id}:
 *   put:
 *     summary: Mettre à jour un utilisateur
 *     description: |
 *       Met à jour les informations d'un utilisateur.
 *       - Les utilisateurs USUAL peuvent modifier leur propre profil
 *       - Les ADMIN peuvent modifier tous les utilisateurs de leur établissement
 *     tags: [Users]
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
 *             $ref: '#/components/schemas/UserUpdatePayload'
 *     responses:
 *       200:
 *         description: Utilisateur mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides
 *       403:
 *         description: Non autorisé à modifier cet utilisateur
 *       404:
 *         description: Utilisateur non trouvé
 */
router.put(
  '/users/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id }),
    body: schemas.userUpdatePayload
  }),
  userController.update
);

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     description: |
 *       Supprime (soft delete) un utilisateur. Réservé aux administrateurs.
 *       L'utilisateur est marqué comme supprimé mais ses données sont conservées.
 *     tags: [Users]
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
 *         description: Utilisateur supprimé
 *       403:
 *         description: Non autorisé (admin requis)
 *       404:
 *         description: Utilisateur non trouvé
 */
router.delete(
  '/users/:id',
  hasRole([UserRole.ADMIN]),
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  userController.remove
);

/**
 * @openapi
 * /geo/perimeters:
 *   get:
 *     summary: Lister les périmètres géographiques
 *     description: Retourne les périmètres personnalisés de l'établissement (quartiers, zones prioritaires, etc.)
 *     tags: [Geo]
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
 */
router.get('/geo/perimeters', geoController.listGeoPerimeters);

/**
 * @openapi
 * /geo/perimeters:
 *   post:
 *     summary: Créer un périmètre géographique
 *     description: |
 *       Upload d'un fichier Shapefile (.zip) contenant la géométrie du périmètre.
 *
 *       **Format accepté:** Archive ZIP contenant un Shapefile valide (.shp, .shx, .dbf)
 *     tags: [Geo]
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
 *                 description: Archive ZIP contenant le Shapefile
 *               name:
 *                 type: string
 *               kind:
 *                 type: string
 *     responses:
 *       201:
 *         description: Périmètre créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GeoPerimeter'
 *       400:
 *         description: Fichier invalide ou Shapefile mal formé
 */
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

/**
 * @openapi
 * /geo/perimeters/{geoPerimeterId}:
 *   put:
 *     summary: Modifier un périmètre géographique
 *     tags: [Geo]
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
 * @openapi
 * /geo/perimeters:
 *   delete:
 *     summary: Supprimer des périmètres géographiques
 *     tags: [Geo]
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
 *     responses:
 *       204:
 *         description: Périmètres supprimés
 */
router.delete(
  '/geo/perimeters',
  geoController.deleteGeoPerimeterListValidators,
  validator.validate,
  geoController.deleteGeoPerimeterList
);

/**
 * @openapi
 * /localities/{geoCode}/tax:
 *   put:
 *     summary: Mettre à jour la taxe d'une localité
 *     tags: [Geo]
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
 *                 enum: [TLV, THLV, None]
 *               taxRate:
 *                 type: number
 *                 description: Taux de taxe en pourcentage
 *     responses:
 *       200:
 *         description: Taxe mise à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LocalityComplete'
 */
router.put(
  '/localities/:geoCode/tax',
  localityController.updateLocalityTaxValidators,
  validator.validate,
  localityController.updateLocalityTax
);

/**
 * @openapi
 * /establishments/{id}/settings:
 *   put:
 *     summary: Mettre à jour les paramètres d'un établissement
 *     tags: [Settings, Establishments]
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
 *             $ref: '#/components/schemas/SettingsComplete'
 *     responses:
 *       200:
 *         description: Paramètres mis à jour
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsComplete'
 */
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
 *     summary: Récupérer un tableau de bord
 *     tags: [Statistics]
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
 *         description: Données du tableau de bord
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
 * @openapi
 * /datafoncier/housing/{localId}:
 *   get:
 *     summary: Récupérer un logement depuis Datafoncier
 *     description: Recherche un logement dans les données Datafoncier par son identifiant local fiscal
 *     tags: [Housing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: localId
 *         required: true
 *         schema:
 *           type: string
 *         description: Identifiant local fiscal (12 caractères)
 *     responses:
 *       200:
 *         description: Logement Datafoncier trouvé
 *       404:
 *         description: Logement non trouvé dans Datafoncier
 */
router.get('/datafoncier/housing/:localId', datafoncierController.findOne);

export default router;
