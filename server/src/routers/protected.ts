import fileUpload from 'express-fileupload';
import Router from 'express-promise-router';
import { param } from 'express-validator';

import schemas from '@zerologementvacant/schemas';
import accountController from '~/controllers/accountController';
import campaignController from '~/controllers/campaignController';
import contactPointController from '~/controllers/contactPointController';
import dashboardController from '~/controllers/dashboardController';
import datafoncierController from '~/controllers/datafoncierHousingController';
import eventController from '~/controllers/eventController';
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

const router = Router();

router.use(jwtCheck(true));
router.use(userCheck());

router.post('/files', upload(), fileController.create);

router.get(
  '/housing',
  validatorNext.validate({
    body: schemas.housingFilters.concat(paginationSchema),
    query: sortApi.sortSchema
  }),
  housingController.list
);
// TODO: replace by POST /housing
router.post(
  '/housing/creation',
  housingController.createValidators,
  validator.validate,
  housingController.create
);
// TODO: replace by GET /housing/count
router.post('/housing/count', housingController.count);
router.get(
  '/housing/:id',
  housingController.getValidators,
  validator.validate,
  housingController.get
);
router.post(
  '/housing/list',
  housingController.updateListValidators,
  validator.validate,
  housingController.updateList
);
// TODO: replace by PUT /housing/:id
router.post(
  '/housing/:housingId',
  [param('housingId').isUUID(), ...housingController.updateValidators],
  validator.validate,
  housingController.update
);

router.get('/groups', groupController.list);
router.post(
  '/groups',
  groupController.createValidators,
  validator.validate,
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
  campaignController.createValidators,
  validator.validate,
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
  draftController.createValidators,
  validator.validate,
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
router.get('/owners/housing/:housingId', ownerController.listByHousing);
router.put('/housing/:housingId/owners', ownerController.updateHousingOwners);

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
  '/notes/housing/:housingId',
  [isUUIDParam('housingId')],
  validator.validate,
  noteController.listByHousingId
);

// TODO: rework and merge this API with the User API
router.get('/account', [], validator.validate, accountController.get);
router.put(
  '/account',
  accountController.updateAccountValidators,
  validator.validate,
  accountController.updateAccount
);
router.put(
  '/account/password',
  accountController.updatePasswordValidators,
  validator.validate,
  accountController.updatePassword
);
router.get(
  '/account/establishments/:establishmentId',
  [isUUIDParam('establishmentId')],
  validator.validate,
  accountController.changeEstablishment
);

router.get(
  '/users/:userId',
  [isUUIDParam('userId')],
  validator.validate,
  userController.get
);

// TODO: should be /geo-perimeters
router.get('/geo/perimeters', geoController.listGeoPerimeters);
router.post('/geo/perimeters', fileUpload(), geoController.createGeoPerimeter);
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
