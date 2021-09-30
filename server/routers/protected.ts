import express, { Request } from 'express';
import expressJWT from 'express-jwt';

import housingController from '../controllers/housingController';
import config from '../utils/config';

const  router = express.Router();

const jwtCheck = expressJWT({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    getToken: (request: Request) => request.headers['x-access-token']
});


router.post('/api/housing', jwtCheck, housingController.list);
router.get('/api/housing/:id', jwtCheck, housingController.get);

export default router;
