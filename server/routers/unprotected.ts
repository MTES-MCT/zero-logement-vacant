import express from 'express';
import accountController from '../controllers/accountController';
import establishmentController from '../controllers/establishmentController';
import validator from '../middlewares/validator';
import userController from '../controllers/userController';
import resetLinkController from '../controllers/resetLinkController';
import signupLinkController from '../controllers/signupLinkController';
import prospectController from '../controllers/prospectController';
import localityController from '../controllers/localityController';
import ownerProspectController from '../controllers/ownerProspectController';

const router = express.Router();

router.get('/prospects/:email', prospectController.showProspectValidator, validator.validate, prospectController.show);

router.post('/owner-prospects', ownerProspectController.createOwnerProspectValidators, validator.validate, ownerProspectController.createOwnerProspect);

router.post('/users/creation', userController.createUserValidators, validator.validate, userController.createUser);
router.post('/authenticate', accountController.signInValidators, validator.validate, accountController.signIn);
router.post('/account/reset-password', accountController.resetPasswordValidators, validator.validate, accountController.resetPassword);

router.post('/reset-links', resetLinkController.createValidators, validator.validate, resetLinkController.create);
router.get('/reset-links/:id', resetLinkController.showValidators, validator.validate, resetLinkController.show);

router.post('/signup-links', signupLinkController.createValidators, validator.validate, signupLinkController.create);
router.get('/signup-links/:id', signupLinkController.showValidators, validator.validate, signupLinkController.show);
router.put('/signup-links/:id/prospect', prospectController.createProspectValidator, validator.validate, prospectController.upsert);

router.get('/establishments', establishmentController.listValidators, validator.validate, establishmentController.list);

router.get('/localities/:geoCode', localityController.getLocalityValidators, validator.validate, localityController.getLocality);

export default router;
