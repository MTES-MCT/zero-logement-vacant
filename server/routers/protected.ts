import express, { Request } from 'express';
import expressJWT from 'express-jwt';

import housingController from '../controllers/housingController';
import config from '../utils/config';
import ownerController from '../controllers/ownerController';
import campaignController from '../controllers/campaignController';
import eventController from '../controllers/eventController';

const  router = express.Router();

const jwtCheck = expressJWT({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    getToken: (request: Request) => request.headers['x-access-token'] ?? request.query['x-access-token']
});


router.post('/api/housing', jwtCheck, housingController.list);
router.get('/api/housing/owner/:ownerId', jwtCheck, housingController.listByOwner);
router.get('/api/housing/campaign/:campaignId', jwtCheck, housingController.listByCampaign);
router.get('/api/housing/campaign/:campaignId/export', jwtCheck, housingController.exportByCampaign);

router.post('/api/campaigns', jwtCheck, campaignController.list);
router.post('/api/campaigns/creation', jwtCheck, campaignController.create);
router.put('/api/campaigns/:campaignId', jwtCheck, campaignController.validateStep);
// router.get('/api/campaigns/import', jwtCheck, campaignController.importFromAirtable);

router.get('/api/owners/:id', jwtCheck, ownerController.get);
router.put('/api/owners/:ownerId', jwtCheck, ownerController.ownerValidators, ownerController.update);

router.get('/api/events/owner/:ownerId', jwtCheck, eventController.listByOwnerId);
router.post('/api/events/creation', jwtCheck, eventController.create);

export default router;
