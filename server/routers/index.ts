import express from 'express';

import housingController from '../controllers/housingController';

const router = express.Router();

router.get('/api/housing', housingController.get);

export default router;
