import express from 'express';
import accountController from '../controllers/accountController';
import monitoringController from '../controllers/monitoringController';
import establishmentController from '../controllers/establishmentController';
import validator from '../middlewares/validator';

const router = express.Router();

router.get('/api/account/prospect', accountController.getAccountValidator, validator.validate, accountController.getProspectAccount);
router.post('/api/authenticate', accountController.signin);
router.get('/api/establishments', establishmentController.searchQueryValidator, validator.validate, establishmentController.searchEstablishments);
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
