import express, { NextFunction, Request, Response } from 'express';
import expressJWT from 'express-jwt';

import housingController from '../controllers/housingController';
import config from '../utils/config';
import ownerController from '../controllers/ownerController';
import campaignController from '../controllers/campaignController';
import eventController from '../controllers/eventController';
import { RequestUser } from '../models/UserApi';
import userController from '../controllers/userController';

const  router = express.Router();

const jwtCheck = expressJWT({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    getToken: (request: Request) => request.headers['x-access-token'] ?? request.query['x-access-token'],

});

const userCheck = (req: Request, res: Response, next: NextFunction): void => {
    if ((<RequestUser>req.user).userId && (<RequestUser>req.user).establishmentId) {
        next();
    } else {
        res.sendStatus(401);
    }
};

router.post('/api/housing', jwtCheck, userCheck, housingController.list);
router.post('/api/housing/export', jwtCheck, userCheck, housingController.exportHousingWithFilters);
router.post('/api/housing/list', jwtCheck, userCheck, housingController.updateHousingList);
router.get('/api/housing/owner/:ownerId', jwtCheck, userCheck, housingController.listByOwner);
router.get('/api/housing/campaigns/bundles/number/:campaignNumber?/:reminderNumber?/export', jwtCheck, userCheck, housingController.exportHousingByCampaignBundle);
router.get('/api/housing/normalizeAddresses/:establishmentId', jwtCheck, userCheck, housingController.normalizeAddresses);
router.get('/api/housing/normalizeAddresses/:establishmentId/:perPage/:page', jwtCheck, userCheck, housingController.normalizeAddresses);

router.get('/api/campaigns', jwtCheck, userCheck, campaignController.listCampaigns);
router.post('/api/campaigns/creation', jwtCheck, userCheck, campaignController.createCampaign);
router.put('/api/campaigns/:campaignId', jwtCheck, userCheck, campaignController.validateStep);
router.delete('/api/campaigns/:campaignId/housing', jwtCheck, userCheck, campaignController.removeHousingList);

router.get('/api/campaigns/bundles', jwtCheck, userCheck, campaignController.listCampaignBundles);
router.get('/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', jwtCheck, userCheck, campaignController.getCampaignBundle);
router.post('/api/campaigns/bundles/number/:campaignNumber?/:reminderNumber?', jwtCheck, userCheck, campaignController.createReminderCampaign);
router.delete('/api/campaigns/bundles/number/:campaignNumber', jwtCheck, userCheck, campaignController.deleteCampaign);

router.get('/api/owners/:id', jwtCheck, userCheck, ownerController.get);
router.put('/api/owners/:ownerId', jwtCheck, userCheck, ownerController.ownerValidators, ownerController.update);

router.get('/api/events/owner/:ownerId', jwtCheck, userCheck, eventController.listByOwnerId);
router.post('/api/events/creation', jwtCheck, userCheck, eventController.create);

router.post('/api/users', jwtCheck, userCheck, userController.list);
router.post('/api/users/creation', jwtCheck, userCheck, userController.createUser);
router.get('/api/users/:userId/activation', userController.sendActivationEmail);

export default router;
