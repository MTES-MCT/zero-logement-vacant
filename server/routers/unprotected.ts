import express from 'express';
import authenticateController from '../controllers/authenticateController';
import statController from '../controllers/statController';

const router = express.Router();

router.post('/api/authenticate', authenticateController.signin);
router.post('/api/account/activation', authenticateController.activateAccount);
router.get('/api/establishments/available', authenticateController.listAvailableEstablishments);
router.get('/api/statistics/owners/contacted/count', statController.contactedOwnersCount);

export default router;
