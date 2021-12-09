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
    if (req.user && (<RequestUser>req.user).userId && (<RequestUser>req.user).establishmentId) {
        next();
    } else {
        res.sendStatus(401);
    }
};

router.use(jwtCheck)
router.use(userCheck)

router.post('/api/housing', housingController.list);
router.get('/api/housing/owner/:ownerId', housingController.listByOwner);
router.get('/api/housing/campaign/:campaignId', housingController.listByCampaign);
router.get('/api/housing/campaign/:campaignId/export', housingController.exportByCampaign);
router.get('/api/housing/normalizeAddresses', housingController.normalizeAddresses);

router.get('/api/campaigns', campaignController.list);
router.post('/api/campaigns/creation', campaignController.create);
router.get('/api/campaigns/:campaignId', campaignController.get);
router.put('/api/campaigns/:campaignId', campaignController.validateStep);
// router.get('/api/campaigns/import', campaignController.importFromAirtable);

router.get('/api/owners/:id', ownerController.get);
router.put('/api/owners/:ownerId', ownerController.ownerValidators, ownerController.update);

router.get('/api/events/owner/:ownerId', eventController.listByOwnerId);
router.post('/api/events/creation', eventController.create);

export default router;
