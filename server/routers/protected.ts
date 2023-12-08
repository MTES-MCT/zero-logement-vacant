import express from 'express';

import housingController from '../controllers/housingController';
import ownerController from '../controllers/ownerController';
import campaignController from '../controllers/campaignController';
import eventController from '../controllers/eventController';
import userController from '../controllers/userController';
import accountController from '../controllers/accountController';
import geoController from '../controllers/geoController';
import validator from '../middlewares/validator';
import contactPointController from '../controllers/contactPointController';
import localityController from '../controllers/localityController';
import { jwtCheck, userCheck } from '../middlewares/auth';
import housingExportController from '../controllers/housingExportController';
import settingsController from '../controllers/settingsController';
import ownerProspectController from '../controllers/ownerProspectController';
import { isUUIDParam } from '../utils/validators';
import noteController from '../controllers/noteController';
import { param } from 'express-validator';
import groupController from '../controllers/groupController';
import dashboardController from '../controllers/dashboardController';
import datafoncierController from "../controllers/datafoncierHousingController";

const router = express.Router();

router.use(jwtCheck(true))
router.use(userCheck());

router.post('/housing', housingController.listValidators, validator.validate, housingController.list);
router.post('/housing/creation', housingController.createValidators, validator.validate, housingController.create);
router.post('/housing/count', housingController.count);
router.get('/housing/:id', housingController.getValidators, validator.validate, housingController.get);
router.post('/housing/list', housingController.updateListValidators, validator.validate, housingController.updateList);
router.post('/housing/:housingId', [param('housingId').isUUID(),...housingController.updateValidators], validator.validate, housingController.update);

router.get('/groups', groupController.list)
router.post('/groups', groupController.createValidators, validator.validate, groupController.create)
router.get('/groups/:id', groupController.showValidators, validator.validate, groupController.show)
router.put('/groups/:id', groupController.updateValidators, validator.validate, groupController.update)
router.delete('/groups/:id', groupController.removeValidators, validator.validate, groupController.remove)
router.get('/groups/:id/export', housingExportController.exportGroupValidators, validator.validate, housingExportController.exportGroup)
router.post('/groups/:id/housing', groupController.addHousingValidators, validator.validate, groupController.addHousing)
router.delete('/groups/:id/housing', groupController.removeHousingValidators, validator.validate, groupController.removeHousing)

router.get('/campaigns', campaignController.listValidators, validator.validate, campaignController.listCampaigns);
router.get('/campaigns/:id', campaignController.getCampaignValidators, validator.validate, campaignController.getCampaign);
router.post('/campaigns', campaignController.createCampaignValidators, validator.validate, campaignController.createCampaign);
router.post('/campaigns/groups/:id', campaignController.createCampaignFromGroupValidators, validator.validate, campaignController.createCampaignFromGroup)
router.get('/campaigns/:id/export', housingExportController.exportCampaignValidators, validator.validate, housingExportController.exportCampaign)
router.put('/campaigns/:id', campaignController.updateCampaignValidators, validator.validate, campaignController.updateCampaign, campaignController.updateCampaign);
router.delete('/campaigns/:id', [isUUIDParam('id')], validator.validate, campaignController.removeCampaign);
router.delete('/campaigns/:id/housing', campaignController.removeHousingValidators, validator.validate, campaignController.removeHousing)

router.post('/owners', ownerController.search);
router.get('/owners/:id', ownerController.get);
router.post('/owners/creation', ownerController.ownerValidators, validator.validate, ownerController.create);
router.put('/owners/:id', [param('id').isUUID().notEmpty(), ...ownerController.ownerValidators], validator.validate, ownerController.update);
router.get('/owners/housing/:housingId', ownerController.listByHousing);
router.put('/owners/housing/:housingId', ownerController.updateHousingOwners);

router.get('/owner-prospects', ownerProspectController.findOwnerProspectsValidators, validator.validate, ownerProspectController.find)
router.put('/owner-prospects/:id', ownerProspectController.updateOwnerProspectValidators, validator.validate, ownerProspectController.update)

router.get('/events/owner/:ownerId', [isUUIDParam('ownerId')], validator.validate, eventController.listByOwnerId);
router.get('/events/housing/:housingId', [isUUIDParam('housingId')], validator.validate, eventController.listByHousingId);

router.get('/notes/housing/:housingId', [isUUIDParam('housingId')], validator.validate, noteController.listByHousingId);

router.get('/account', [], validator.validate, accountController.get);
router.put('/account', accountController.updateAccountValidators, validator.validate, accountController.updateAccount);
router.put('/account/password', accountController.updatePasswordValidators, validator.validate, accountController.updatePassword);
router.get('/account/establishments/:establishmentId', [isUUIDParam('establishmentId')], validator.validate, accountController.changeEstablishment);

router.get('/users/:userId', [isUUIDParam('userId')], validator.validate, userController.get);

router.get('/geo/perimeters', geoController.listGeoPerimeters);
router.post('/geo/perimeters', geoController.createGeoPerimeter);
router.put('/geo/perimeters/:geoPerimeterId', geoController.updateGeoPerimeterValidators, validator.validate, geoController.updateGeoPerimeter);
router.delete('/geo/perimeters', geoController.deleteGeoPerimeterListValidators, validator.validate, geoController.deleteGeoPerimeterList);

router.get('/contact-points', contactPointController.listContactPointsValidators, validator.validate, contactPointController.listContactPoints(false));
router.post('/contact-points', contactPointController.createContactPointValidators, validator.validate, contactPointController.createContactPoint);
router.put('/contact-points/:contactPointId', contactPointController.updateContactPointValidators, validator.validate, contactPointController.updateContactPoint);
router.delete('/contact-points/:contactPointId', contactPointController.deleteContactPointValidators, validator.validate, contactPointController.deleteContactPoint);

router.put('/localities/:geoCode/tax', localityController.updateLocalityTaxValidators, validator.validate, localityController.updateLocalityTax);

router.put('/establishments/:id/settings', settingsController.updateSettingsValidators, validator.validate, settingsController.updateSettings);

router.get('/dashboards/:id', dashboardController.findOneValidators, validator.validate, dashboardController.findOne);

router.get('/datafoncier/housing/:localId', datafoncierController.findOne)

export default router;
