import express from 'express';

import housingController from '../controllers/housingController';
import ownerController from '../controllers/ownerController';
import campaignController from '../controllers/campaignController';
import eventController from '../controllers/eventController';
import userController from '../controllers/userController';
import accountController from '../controllers/accountController';
import monitoringController from '../controllers/monitoringController';
import geoController from '../controllers/geoController';
import validator from '../middlewares/validator';
import contactPointController from '../controllers/contactPointController';
import localityController from '../controllers/localityController';
import { jwtCheck, userCheck } from '../middlewares/auth';
import housingExportController from '../controllers/housingExportController';
import settingsController from '../controllers/settingsController';
import ownerProspectController from "../controllers/ownerProspectController";
import { isUUIDParam } from '../utils/validators';
import noteController from '../controllers/noteController';

const router = express.Router();

router.use(jwtCheck(true))
router.use(userCheck(true));

router.get('/housing/:id', housingController.get);
router.post('/housing', housingController.listValidators, validator.validate, housingController.list);
router.post('/housing/count', housingController.count);
router.post('/housing/list', housingController.updateHousingListValidators, validator.validate, housingController.updateHousingList);
router.post('/housing/:housingId', housingController.updateHousingValidators, validator.validate, housingController.updateHousing);
router.get('/housing/owner/:ownerId', housingController.listByOwner);

router.get('/housing/export/campaigns/bundles/number/:campaignNumber?', housingExportController.exportHousingByCampaignBundle);
router.get('/housing/export/campaigns/bundles/number/:campaignNumber/:reminderNumber?', housingExportController.exportHousingByCampaignBundle);

router.get('/campaigns', campaignController.listCampaigns);
router.post('/campaigns/creation', campaignController.createCampaign);
router.put('/campaigns/:campaignId', campaignController.validateStepValidators, campaignController.validateStep);
router.delete('/campaigns/:campaignId/housing', campaignController.removeHousingList);

router.get('/campaigns/bundles', campaignController.listCampaignBundles);
router.get('/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', campaignController.getCampaignBundleValidators, campaignController.getCampaignBundle);
router.put('/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', campaignController.updateCampaignBundle);
router.post('/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', campaignController.createReminderCampaign);
router.delete('/campaigns/bundles/number/:campaignNumber/:reminderNumber?', campaignController.deleteCampaignBundleValidators, campaignController.deleteCampaignBundle);

router.post('/owners', ownerController.search);
router.get('/owners/:id', ownerController.get);
router.post('/owners/creation', ownerController.create);
router.put('/owners/:ownerId', ownerController.ownerValidators, ownerController.update);
router.get('/owners/housing/:housingId', ownerController.listByHousing);
router.put('/owners/housing/:housingId', ownerController.updateHousingOwners);

router.get('/owner-prospects', ownerProspectController.findOwnerProspectsValidators, validator.validate, ownerProspectController.find)
router.put('/owner-prospects/:id', ownerProspectController.updateOwnerProspectValidators, validator.validate, ownerProspectController.update)

router.get('/events/owner/:ownerId', [isUUIDParam('ownerId')], validator.validate, eventController.listByOwnerId);
router.get('/events/housing/:housingId', [isUUIDParam('housingId')], validator.validate, eventController.listByHousingId);

router.post('/notes', noteController.createNoteValidators, validator.validate, noteController.create);

router.post('/account/password', accountController.updatePasswordValidators, validator.validate, accountController.updatePassword);
router.get('/account/establishments/:establishmentId', [isUUIDParam('establishmentId')], validator.validate, accountController.changeEstablishment);

router.post('/users', userController.list);
router.delete('/users/:userId', userController.userIdValidator, validator.validate, userController.removeUser);

router.post('/monitoring/establishments/data', monitoringController.listEstablishmentData);
router.post('/monitoring/housing/status/count', monitoringController.housingByStatusCount);
router.post('/monitoring/export', monitoringController.exportMonitoring);

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

export default router;
