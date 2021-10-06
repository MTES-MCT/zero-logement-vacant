import express, { Request } from 'express';
import expressJWT from 'express-jwt';

import housingController from '../controllers/housingController';
import config from '../utils/config';
import ownerController from '../controllers/ownerController';
import campaignController from '../controllers/campaignController';

const  router = express.Router();

const jwtCheck = expressJWT({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    getToken: (request: Request) => request.headers['x-access-token']
});


router.post('/api/housing', jwtCheck, housingController.list);
router.get('/api/housing/owner/:ownerId', jwtCheck, housingController.listByOwner);

router.post('/api/campaigns', jwtCheck, campaignController.list);

router.get('/api/owners/:id', jwtCheck, ownerController.get);

export default router;
