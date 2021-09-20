import express, { Request } from 'express';
import expressJWT from 'express-jwt';

import housingController from '../controllers/housingController';
import config from '../utils/config';

const router = express.Router();

router.use(expressJWT({
    secret: config.auth.secret,
    algorithms: ['HS256'],
    getToken: (request: Request) => request.headers['x-access-token']
}));


router.get('/api/housing', housingController.get);

export default router;
