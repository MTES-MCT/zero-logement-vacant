import express from 'express';
import authenticateController from '../controllers/authenticateController';
import monitoringController from '../controllers/monitoringController';
import establishmentController from '../controllers/establishmentController';

const router = express.Router();

router.post('/api/authenticate', authenticateController.signin);
router.post('/api/account/activation', authenticateController.activateAccount);
router.get('/api/establishments/available', establishmentController.listAvailableEstablishments);
router.get('/api/statistics/establishments/count', monitoringController.establishmentCount);
router.get('/api/statistics/housing/contacted/count', monitoringController.housingContactedCount);
router.get('/api/statistics/housing/waiting/count', monitoringController.housingWaitingCount);
router.get('/api/statistics/answers/count', monitoringController.answersCount);
router.get('/api/statistics/housing/inprogress-with-support/count', monitoringController.housingInProgressWithSupportCount);
router.get('/api/statistics/housing/inprogress-without-support/count', monitoringController.housingInProgressWithoutSupportCount);
router.get('/api/statistics/housing/exit-with-support/count', monitoringController.housingExitWithSupportCount);
router.get('/api/statistics/housing/exit-without-support/count', monitoringController.housingExitWithoutSupportCount);

export default router;
