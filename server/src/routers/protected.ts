import { UserRole } from '@zerologementvacant/models';
import schemas from '@zerologementvacant/schemas';
import Router from 'express-promise-router';
import { param } from 'express-validator';
import { object, string } from 'yup';

import accountController from '~/controllers/accountController';
import buildingController from '~/controllers/buildingController';
import campaignController from '~/controllers/campaignController';
import contactPointController from '~/controllers/contactPointController';
import dashboardController from '~/controllers/dashboardController';
import datafoncierController from '~/controllers/datafoncierHousingController';
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
import ownerProspectController from '~/controllers/ownerProspectController';
import precisionController from '~/controllers/precisionController';
import settingsController from '~/controllers/settingsController';
import userController from '~/controllers/userController';
import { hasRole, jwtCheck, userCheck } from '~/middlewares/auth';
import { upload } from '~/middlewares/upload';
import { uploadGeo } from '~/middlewares/uploadGeo';
import zipValidationMiddleware from '~/middlewares/zipValidation';
import shapefileValidationMiddleware from '~/middlewares/shapefileValidation';
import fileTypeMiddleware from '~/middlewares/fileTypeMiddleware.memory';
import antivirusMiddleware from '~/middlewares/antivirus.memory';
import validator from '~/middlewares/validator';
import validatorNext from '~/middlewares/validator-next';
import { paginationSchema } from '~/models/PaginationApi';
import sortApi from '~/models/SortApi';
import { isUUIDParam } from '~/utils/validators';

const router = Router();

router.use(jwtCheck());
router.use(userCheck());

router.post('/files', upload(), fileTypeMiddleware, antivirusMiddleware, fileController.create);

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
router.get(
  '/housing/count',
  validatorNext.validate({
    query: schemas.housingFilters
      .concat(sortApi.sortSchema)
      .concat(paginationSchema)
  }),
  housingController.count
);
router.get(
  '/housing/:id',
  housingController.getValidators,
  validator.validate,
  housingController.get
);
router.put(
  '/housing',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validatorNext.validate({
    body: schemas.housingBatchUpdatePayload
  }),
  housingController.updateMany
);
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

router.get(
  '/campaigns',
  campaignController.listValidators,
  validator.validate,
  campaignController.list
);
router.post(
  '/campaigns',
  validatorNext.validate({
    body: schemas.campaignCreationPayload
  }),
  campaignController.create
);
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

router.get(
  '/owners',
  validatorNext.validate({
    query: schemas.ownerFilters.concat(paginationSchema)
  }),
  ownerController.list
);
router.post('/owners', ownerController.search);
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
router.put('/housing/:housingId/owners',
  // TODO: validate inputs
  ownerController.updateHousingOwners);

// Housing owners
router.get(
  '/owners/:id/housings',
  validatorNext.validate({
    params: object({ id: schemas.id })
  }),
  housingOwnerController.listByOwner
);

router.get(
  '/owner-prospects',
  ownerProspectController.findOwnerProspectsValidators,
  validator.validate,
  ownerProspectController.find
);
router.put(
  '/owner-prospects/:id',
  ownerProspectController.updateOwnerProspectValidators,
  validator.validate,
  ownerProspectController.update
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

// TODO: rework and merge this API with the User API
router.get('/account', [], validator.validate, accountController.get);
router.put(
  '/account',
  accountController.updateAccountValidators,
  validator.validate,
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
  uploadGeo(),
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
