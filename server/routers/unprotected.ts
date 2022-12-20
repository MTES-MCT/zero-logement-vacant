import express from 'express';
import accountController from '../controllers/accountController';
import monitoringController from '../controllers/monitoringController';
import establishmentController from '../controllers/establishmentController';
import validator from '../middlewares/validator';
import userController from '../controllers/userController';
import resetLinkController from "../controllers/resetLinkController";

const router = express.Router();

router.get('/api/prospects/:email', accountController.getAccountValidator, validator.validate, accountController.getProspectAccount);
router.post('/api/users/creation', userController.createUserValidators, validator.validate, userController.createUser);
router.post('/api/authenticate', accountController.signin);

router.post('/api/reset-links', resetLinkController.createValidators, validator.validate, resetLinkController.create)
router.get('/api/reset-links/:id', resetLinkController.show)

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
