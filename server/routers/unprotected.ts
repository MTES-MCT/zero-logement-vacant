import express from 'express';
import authenticateController from '../controllers/authenticateController';

const router = express.Router();

router.post('/api/authenticate', authenticateController.signin);

export default router;
