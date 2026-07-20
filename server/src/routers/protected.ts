import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  MAX_DOCUMENT_SIZE_IN_MiB,
  UserRole
} from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import Router from 'express-promise-router';
import { array, number, object, string } from 'yup';

import authController from '~/controllers/auth-controller';
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
import userController from '~/controllers/userController';
import config from '~/infra/config';
import antivirusMiddleware from '~/middlewares/antivirus';
import { hasRole } from '~/middlewares/auth';
import fileTypeMiddleware from '~/middlewares/fileTypeMiddleware';
import { sessionCheck } from '~/middlewares/session';
import shapefileValidationMiddleware from '~/middlewares/shapefileValidation';
import { upload } from '~/middlewares/upload';
import validator from '~/middlewares/validator';
import zipValidationMiddleware from '~/middlewares/zipValidation';
import { paginationSchema } from '~/models/PaginationApi';
import sortApi from '~/models/SortApi';

const router = Router();

router.use(sessionCheck());

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
    accept: ACCEPTED_DOCUMENT_EXTENSIONS as string[],
    multiple: true,
    maxSizeMiB: MAX_DOCUMENT_SIZE_IN_MiB
  }),
  documentController.create
);

router.get(
  '/documents/:id',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  documentController.get
);

router.put(
  '/documents/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.documentPayload
  }),
  documentController.update
);

router.delete(
  '/documents/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id })
  }),
  documentController.remove
);

router.get(
  '/housing/:id/documents',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  documentController.listByHousing
);

router.post(
  '/housing/:id/documents',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingDocumentPayload
  }),
  documentController.linkToHousing
);

router.delete(
  '/housing/:housingId/documents/:documentId',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({
      housingId: schemas.id,
      documentId: schemas.id
    })
  }),
  documentController.removeByHousing
);

router.get(
  '/housing',
  validator.validate({
    query: schemas.housingFilters
      .concat(sortApi.sortSchema)
      .concat(paginationSchema)
  }),
  housingController.list
);
router.post(
  '/housing',
  validator.validate({
    body: object({
      localId: string().required().length(12)
    })
  }),
  housingController.create
);
router.get(
  '/housing/count',
  validator.validate({
    query: schemas.housingFilters
      .concat(sortApi.sortSchema)
      .concat(paginationSchema)
  }),
  housingController.count
);
// `:id` accepts EITHER a 12-char localId OR a UUID, so we cannot reuse the
// UUID-only `schemas.id` here.
router.get(
  '/housing/:id',
  validator.validate({
    params: object({
      id: string()
        .required()
        .test(
          'localId-or-uuid',
          ':id must be a 12-char localId or a UUID',
          (value) => {
            if (!value) return false;
            if (value.length === 12) return true;
            return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              value
            );
          }
        )
    })
  }),
  housingController.get
);
router.put(
  '/housing',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    body: schemas.housingBatchUpdatePayload
  }),
  housingController.updateMany
);
router.put(
  '/housing/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingUpdatePayload
  }),
  housingController.update
);

// Buildings
router.get(
  '/buildings',
  validator.validate({ query: schemas.buildingFilters }),
  buildingController.find
);
router.get(
  '/buildings/:id',
  validator.validate({
    params: object({
      id: string().required()
    })
  }),
  buildingController.get
);

router.get('/housing/:id/precisions', precisionController.findByHousing);
router.put(
  '/housing/:id/precisions',
  precisionController.updatePrecisionsByHousing
);

router.get('/groups', groupController.list);
router.post(
  '/groups',
  validator.validate({
    body: schemas.groupCreationPayload
  }),
  groupController.create
);
router.get(
  '/groups/:id',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  groupController.show
);
router.put(
  '/groups/:id',
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.groupCreationPayload
  }),
  groupController.update
);
router.delete(
  '/groups/:id',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  groupController.remove
);
router.get(
  '/groups/:id/export',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  housingExportController.exportGroup
);
router.post(
  '/groups/:id/housing',
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.groupHousingPayload
  }),
  groupController.addHousing
);
router.delete(
  '/groups/:id/housing',
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.groupHousingPayload
  }),
  groupController.removeHousing
);

router.get(
  '/campaigns',
  validator.validate({
    query: schemas.campaignFilters.concat(schemas.sort)
  }),
  campaignController.list
);
router.get(
  '/campaigns/:id',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  campaignController.get
);
router.put(
  '/campaigns/:id',
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.campaignUpdateNextPayload
  }),
  campaignController.update
);
router.delete(
  '/campaigns/:id',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  campaignController.removeCampaign
);
router.post(
  '/groups/:id/campaigns',
  validator.validate({
    body: schemas.campaignCreationPayload,
    params: object({ id: schemas.id })
  }),
  campaignController.createFromGroup
);

// New route
router.post(
  '/campaigns/:id/exports',
  validator.validate({
    params: object({ id: schemas.id }),
    body: object({
      type: string().oneOf(['drafts', 'recipients']).required()
    })
  }),
  exportController.exporter
);
router.get(
  '/campaigns/:id/export',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  housingExportController.exportCampaign
);
router.delete(
  '/campaigns/:id/housings',
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.housingFilters
  }),
  campaignController.removeHousings
);

router.get('/drafts', draftController.list);
router.post(
  '/drafts',
  validator.validate({ body: schemas.draftCreationPayload }),
  draftController.createNext
);
router.put(
  '/drafts/:id',
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.draftUpdatePayload
  }),
  draftController.updateNext
);

router.get(
  '/owners',
  validator.validate({
    query: schemas.ownerFilters.concat(paginationSchema)
  }),
  ownerController.list
);
router.post('/owners', ownerController.search);
router.get('/owners/:id', ownerController.get);
router.post(
  '/owners/creation',
  validator.validate({ body: schemas.ownerPayload }),
  ownerController.create
);
router.put(
  '/owners/:id',
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.ownerPayload
  }),
  ownerController.update
);
router.get(
  '/housings/:id/owners',
  validator.validate({ params: object({ id: schemas.id }) }),
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
  validator.validate({
    params: object({ id: schemas.id })
  }),
  housingOwnerController.listByOwner
);

router.get(
  '/owners/:id/events',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  eventController.listByOwnerId
);
router.get(
  '/housing/:id/events',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  eventController.listByHousingId
);

router.get(
  '/housing/:id/notes',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  noteController.findByHousing
);
router.post(
  '/housing/:id/notes',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.notePayload
  }),
  noteController.createByHousing
);
router.put(
  '/notes/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
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

// TODO: rework and merge this API with the User API
router.get('/account', authController.get);
router.put(
  '/account',
  validator.validate(authController.updateAccountValidators),
  authController.updateAccount
);
router.post(
  '/account/establishments/:establishmentId',
  validator.validate({
    params: object({ establishmentId: schemas.id })
  }),
  authController.changeEstablishmentBySession
);

/* Users */

router.get(
  '/users',
  validator.validate({
    query: schemas.userFilters
  }),
  userController.list
);
router.get(
  '/users/:id',
  validator.validate({
    params: object({ id: schemas.id })
  }),
  userController.get
);
router.put(
  '/users/:id',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    params: object({ id: schemas.id }),
    body: schemas.userUpdatePayload
  }),
  userController.update
);
router.delete(
  '/users/:id',
  hasRole([UserRole.ADMIN]),
  validator.validate({
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
  validator.validate({
    params: object({ geoPerimeterId: string().uuid().required() }),
    body: object({
      kind: string().min(1).required(),
      name: string().nullable().notRequired()
    })
  }),
  geoController.updateGeoPerimeter
);
router.delete(
  '/geo/perimeters',
  validator.validate({
    body: object({
      geoPerimeterIds: array().of(string().uuid().required()).required()
    })
  }),
  geoController.deleteGeoPerimeterList
);

router.put(
  '/localities/:geoCode/tax',
  validator.validate({
    params: object({ geoCode: schemas.geoCode.required() }),
    body: object({
      taxKind: string().oneOf(['THLV', 'None']).required(),
      taxRate: number().when('taxKind', {
        is: 'THLV',
        then: (s) => s.required(),
        otherwise: (s) =>
          s.test(
            'must-not-exist-when-tax-kind-is-none',
            'taxRate must not be provided when taxKind is None',
            (v) => v === undefined
          )
      })
    })
  }),
  localityController.updateLocalityTax
);

router.get(
  '/dashboards/:id',
  validator.validate({
    params: object({
      id: string().required()
    })
  }),
  dashboardController.findOne
);

router.get(
  '/dashboards/:did/cards/:cid',
  validator.validate({
    params: object({
      did: string().required(),
      cid: string()
        .required()
        .matches(/^\d+$/, 'cid must be a positive integer')
    })
  }),
  dashboardController.findOneCard
);

router.get('/datafoncier/housing/:localId', datafoncierController.findOne);

export default router;
