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
import validator from "../middlewares/validator";

const  router = express.Router();

if (config.auth.secret) {

    const jwtCheck = expressjwt({
        secret: config.auth.secret,
        algorithms: ['HS256'],
        getToken: (request: Request) => (request.headers['x-access-token'] ?? request.query['x-access-token']) as string
    });

    const userCheck = (req: JWTRequest, res: Response, next: NextFunction): void => {
        if ((<RequestUser>req.auth).userId && (<RequestUser>req.auth).establishmentId) {
            next();
        } else {
            res.sendStatus(401);
        }
    };

    router.get('/api/housing/:id', jwtCheck, userCheck, housingController.get);
    router.post('/api/housing', jwtCheck, userCheck, housingController.list);
    router.post('/api/housing/export', jwtCheck, userCheck, housingController.exportHousingWithFilters);
    router.post('/api/housing/list', jwtCheck, userCheck,  housingController.updateHousingListValidators, housingController.updateHousingList);
    router.post('/api/housing/:housingId', jwtCheck, userCheck, housingController.updateHousingValidators, housingController.updateHousing);
    router.get('/api/housing/owner/:ownerId', jwtCheck, userCheck, housingController.listByOwner);
    router.get('/api/housing/campaigns/bundles/number/:campaignNumber?/:reminderNumber?/export', jwtCheck, userCheck, housingController.exportHousingByCampaignBundle);
    router.get('/api/housing/normalizeAddresses/:establishmentId', jwtCheck, userCheck, housingController.normalizeAddresses);

    router.get('/api/campaigns', jwtCheck, userCheck, campaignController.listCampaigns);
    router.post('/api/campaigns/creation', jwtCheck, userCheck, campaignController.createCampaign);
    router.put('/api/campaigns/:campaignId', jwtCheck, userCheck, campaignController.validateStepValidators, campaignController.validateStep);
    router.delete('/api/campaigns/:campaignId/housing', jwtCheck, userCheck, campaignController.removeHousingList);

    router.get('/api/campaigns/bundles', jwtCheck, userCheck, campaignController.listCampaignBundles);
    router.get('/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', jwtCheck, userCheck, campaignController.getCampaignBundleValidators, campaignController.getCampaignBundle);
    router.put('/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', jwtCheck, userCheck, campaignController.updateCampaignBundle);
    router.post('/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', jwtCheck, userCheck, campaignController.createReminderCampaign);
    router.delete('/api/campaigns/bundles/number/:campaignNumber/:reminderNumber?', jwtCheck, userCheck, campaignController.deleteCampaignBundleValidators, campaignController.deleteCampaignBundle);

    router.post('/api/owners', jwtCheck, userCheck, ownerController.search);
    router.get('/api/owners/:id', jwtCheck, userCheck, ownerController.get);
    router.post('/api/owners/creation', jwtCheck, userCheck, ownerController.create);
    router.put('/api/owners/:ownerId', jwtCheck, userCheck, ownerController.ownerValidators, ownerController.update);
    router.get('/api/owners/housing/:housingId', jwtCheck, userCheck, ownerController.listByHousing);
    router.put('/api/owners/housing/:housingId', jwtCheck, userCheck, ownerController.updateHousingOwners);

    router.get('/api/events/owner/:ownerId', jwtCheck, userCheck, eventController.listByOwnerId);
    router.get('/api/events/housing/:housingId', jwtCheck, userCheck, eventController.listByHousingId);

    router.post('/api/account/password', jwtCheck, userCheck, accountController.updatePassword);

    router.post('/api/users', jwtCheck, userCheck, userController.list);
    router.post('/api/users/creation', jwtCheck, userCheck, userController.createUserValidators, validator.validate, userController.createUser);
    router.delete('/api/users/:userId', jwtCheck, userCheck, userController.userIdValidator, validator.validate, userController.removeUser);

    router.post('/api/monitoring/establishments/data', jwtCheck, userCheck, monitoringController.listEstablishmentData);
    router.post('/api/monitoring/housing/status/count', jwtCheck, userCheck, monitoringController.housingByStatusCount);
    router.post('/api/monitoring/housing/status/duration', jwtCheck, userCheck, monitoringController.housingByStatusDuration);
    router.post('/api/monitoring/export', jwtCheck, userCheck, monitoringController.exportMonitoring);

    router.get('/api/geo/perimeters', jwtCheck, userCheck, geoController.listGeoPerimeters);
    router.post('/api/geo/perimeters', jwtCheck, userCheck, geoController.createGeoPerimeter);
    router.put('/api/geo/perimeters/:geoPerimeterId', jwtCheck, userCheck, geoController.updateGeoPerimeterValidators, geoController.updateGeoPerimeter);
    router.delete('/api/geo/perimeters/:geoPerimeterId', jwtCheck, userCheck, geoController.deleteGeoPerimeterValidators, geoController.deleteGeoPerimeter);
}

export default router;
