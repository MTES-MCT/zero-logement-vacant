import express from 'express';
import accountController from '../controllers/accountController';
import establishmentController from '../controllers/establishmentController';
import validator from '../middlewares/validator';
import userController from '../controllers/userController';
import resetLinkController from '../controllers/resetLinkController';
import signupLinkController from "../controllers/signupLinkController";

const router = express.Router();

router.get('/prospects/:email', accountController.getAccountValidator, validator.validate, accountController.getProspectAccount);
router.post('/users/creation', userController.createUserValidators, validator.validate, userController.createUser);
router.post('/authenticate', accountController.signin);
router.post('/account/reset-password', accountController.resetPasswordValidators, validator.validate, accountController.resetPassword);

router.post('/reset-links', resetLinkController.createValidators, validator.validate, resetLinkController.create);
router.get('/reset-links/:id', resetLinkController.showValidators, validator.validate, resetLinkController.show);

router.post('/signup-links', signupLinkController.createValidators, validator.validate, signupLinkController.create);
router.get('/signup-links/:id', signupLinkController.showValidators, validator.validate, signupLinkController.show);

router.get('/establishments', establishmentController.searchQueryValidator, validator.validate, establishmentController.searchEstablishments);
router.get('/establishments/available', establishmentController.listAvailableEstablishments);

export default router;
