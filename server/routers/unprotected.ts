import express from 'express';
import accountController from '../controllers/accountController';
import monitoringController from '../controllers/monitoringController';
import establishmentController from '../controllers/establishmentController';
import validator from '../middlewares/validator';
import userController from '../controllers/userController';

const router = express.Router();

router.get(
  '/prospects/:email',
  accountController.getAccountValidator,
  validator.validate,
  accountController.getProspectAccount
);
router.post(
  '/users/creation',
  userController.createUserValidators,
  validator.validate,
  userController.createUser
);
router.post('/authenticate', accountController.signin);
router.get(
  '/establishments',
  establishmentController.searchQueryValidator,
  validator.validate,
  establishmentController.searchEstablishments
);
router.get(
  '/establishments/available',
  establishmentController.listAvailableEstablishments
);
router.get(
  '/statistics/establishments/count',
  monitoringController.establishmentCount
);
router.get(
  '/statistics/housing/contacted/count',
  monitoringController.housingContactedCount
);
router.get(
  '/statistics/housing/waiting/count',
  monitoringController.housingWaitingCount
);
router.get('/statistics/answers/count', monitoringController.answersCount);
router.get(
  '/statistics/housing/inprogress-with-support/count',
  monitoringController.housingInProgressWithSupportCount
);
router.get(
  '/statistics/housing/inprogress-without-support/count',
  monitoringController.housingInProgressWithoutSupportCount
);
router.get(
  '/statistics/housing/exit-with-support/count',
  monitoringController.housingExitWithSupportCount
);
router.get(
  '/statistics/housing/exit-without-support/count',
  monitoringController.housingExitWithoutSupportCount
);

export default router;
