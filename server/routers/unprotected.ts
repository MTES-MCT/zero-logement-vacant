import express from 'express';
import authenticateController from '../controllers/authenticateController';
import statController from '../controllers/statController';

const router = express.Router();

router.post('/api/authenticate', authenticateController.signin);
router.post('/api/account/activation', authenticateController.activateAccount);
router.get('/api/establishments/available', authenticateController.listAvailableEstablishments);
router.get('/api/statistics/establishments/count', statController.establishmentCount);
router.get('/api/statistics/housing/contacted/count', statController.housingContactedCount);
router.get('/api/statistics/housing/waiting/count', statController.housingWaitingCount);
router.get('/api/statistics/answers/count', statController.answersCount);
router.get('/api/statistics/housing/inprogress-with-support/count', statController.housingInProgressWithSupportCount);
router.get('/api/statistics/housing/inprogress-without-support/count', statController.housingInProgressWithoutSupportCount);
router.get('/api/statistics/housing/exit-with-support/count', statController.housingExitWithSupportCount);
router.get('/api/statistics/housing/exit-without-support/count', statController.housingExitWithoutSupportCount);

export default router;
