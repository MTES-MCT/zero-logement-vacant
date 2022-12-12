import express, { NextFunction, Request, Response } from 'express';
import { expressjwt, Request as JWTRequest } from 'express-jwt';

import housingController from '../controllers/housingController';
import config from '../utils/config';
import ownerController from '../controllers/ownerController';
import campaignController from '../controllers/campaignController';
import eventController from '../controllers/eventController';
import { RequestUser } from '../models/UserApi';
import userController from '../controllers/userController';
import accountController from '../controllers/accountController';
import monitoringController from '../controllers/monitoringController';
import geoController from '../controllers/geoController';
import validator from '../middlewares/validator';

const router = express.Router();

const jwtCheck = expressjwt({
  secret: config.auth.secret,
  algorithms: ['HS256'],
  getToken: (request: Request) =>
    (request.headers['x-access-token'] ??
      request.query['x-access-token']) as string,
});

const userCheck = (
  req: JWTRequest<RequestUser>,
  res: Response,
  next: NextFunction
): void => {
  if (req.auth?.userId && req.auth?.establishmentId) {
    next();
  } else {
    res.sendStatus(401);
  }
};

router.use(jwtCheck, userCheck);

router.get('/api/housing/:id', housingController.get);
router.post('/api/housing', housingController.list);
router.post(
  '/api/housing/list',
  housingController.updateHousingListValidators,
  housingController.updateHousingList
);
router.post(
  '/api/housing/:housingId',
  housingController.updateHousingValidators,
  housingController.updateHousing
);
router.get('/api/housing/owner/:ownerId', housingController.listByOwner);
router.get(
  '/api/housing/campaigns/bundles/number/:campaignNumber?/:reminderNumber?/export',
  housingController.exportHousingByCampaignBundle
);
router.get(
  '/api/housing/normalizeAddresses/:establishmentId',
  housingController.normalizeAddresses
);

router.get('/api/campaigns', campaignController.listCampaigns);
router.post('/api/campaigns/creation', campaignController.createCampaign);
router.put(
  '/api/campaigns/:campaignId',
  campaignController.validateStepValidators,
  campaignController.validateStep
);
router.delete(
  '/api/campaigns/:campaignId/housing',
  campaignController.removeHousingList
);

router.get('/api/campaigns/bundles', campaignController.listCampaignBundles);
router.get(
  '/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?',
  campaignController.getCampaignBundleValidators,
  campaignController.getCampaignBundle
);
router.put(
  '/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?',
  campaignController.updateCampaignBundle
);
router.post(
  '/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?',
  campaignController.createReminderCampaign
);
router.delete(
  '/api/campaigns/bundles/number/:campaignNumber/:reminderNumber?',
  campaignController.deleteCampaignBundleValidators,
  campaignController.deleteCampaignBundle
);

router.post('/api/owners', ownerController.search);
router.get('/api/owners/:id', ownerController.get);
router.post('/api/owners/creation', ownerController.create);
router.put(
  '/api/owners/:ownerId',
  ownerController.ownerValidators,
  ownerController.update
);
router.get('/api/owners/housing/:housingId', ownerController.listByHousing);
router.put(
  '/api/owners/housing/:housingId',
  ownerController.updateHousingOwners
);

router.get('/api/events/owner/:ownerId', eventController.listByOwnerId);
router.get('/api/events/housing/:housingId', eventController.listByHousingId);
router.post(
  '/api/events',
  eventController.eventValidator,
  validator.validate,
  eventController.create
);

router.post('/api/account/password', accountController.updatePassword);

router.post('/api/users', userController.list);
router.delete(
  '/api/users/:userId',
  userController.userIdValidator,
  validator.validate,
  userController.removeUser
);

router.post(
  '/api/monitoring/establishments/data',
  monitoringController.listEstablishmentData
);
router.post(
  '/api/monitoring/housing/status/count',
  monitoringController.housingByStatusCount
);
router.post(
  '/api/monitoring/housing/status/duration',
  monitoringController.housingByStatusDuration
);
router.post('/api/monitoring/export', monitoringController.exportMonitoring);

router.get('/api/geo/perimeters', geoController.listGeoPerimeters);
router.post('/api/geo/perimeters', geoController.createGeoPerimeter);
router.put(
  '/api/geo/perimeters/:geoPerimeterId',
  geoController.updateGeoPerimeterValidators,
  geoController.updateGeoPerimeter
);
router.delete(
  '/api/geo/perimeters/:geoPerimeterId',
  geoController.deleteGeoPerimeterValidators,
  geoController.deleteGeoPerimeter
);

export default router;
