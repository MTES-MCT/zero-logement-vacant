import express from 'express';

import housingController from '../controllers/housingController';
import authenticateController from '../controllers/authenticateController';

const router = express.Router();

router.post('/api/authenticate', authenticateController.signin);

router.get('/api/housing', housingController.get);

export default router;
