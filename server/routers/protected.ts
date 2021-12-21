import express, { NextFunction, Request, Response } from 'express';
import expressJWT from 'express-jwt';

import housingController from '../controllers/housingController';
import config from '../utils/config';
import ownerController from '../controllers/ownerController';
import campaignController from '../controllers/campaignController';
import eventController from '../controllers/eventController';
import { RequestUser } from '../models/UserApi';

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
router.get('/api/housing/owner/:ownerId', jwtCheck, userCheck, housingController.listByOwner);
router.post('/api/housing/campaign', jwtCheck, userCheck, housingController.updateCampaignHousing);
router.post('/api/housing/campaign/:campaignId', jwtCheck, userCheck, housingController.listCampaignHousing);
router.get('/api/housing/campaign/:campaignId/export', jwtCheck, userCheck, housingController.exportByCampaign);
router.get('/api/housing/normalizeAddresses', jwtCheck, userCheck, housingController.normalizeAddresses);

router.get('/api/campaigns', jwtCheck, userCheck, campaignController.list);
router.post('/api/campaigns/creation', jwtCheck, userCheck, campaignController.create);
router.get('/api/campaigns/:campaignId', jwtCheck, userCheck, campaignController.get);
router.put('/api/campaigns/:campaignId', jwtCheck, userCheck, campaignController.validateStep);
// router.get('/api/campaigns/import', campaignController.importFromAirtable);

router.get('/api/owners/:id', jwtCheck, userCheck, ownerController.get);
router.put('/api/owners/:ownerId', jwtCheck, userCheck, ownerController.ownerValidators, ownerController.update);

router.get('/api/events/owner/:ownerId', jwtCheck, userCheck, eventController.listByOwnerId);
router.post('/api/events/creation', jwtCheck, userCheck, eventController.create);

export default router;
