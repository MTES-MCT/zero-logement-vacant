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
import rateLimit from 'express-rate-limit';
import contactPointController from '../controllers/contactPointController';
import { jwtCheck, userCheck } from '../middlewares/auth';
import config from "../utils/config";
import { noop } from "../middlewares/noop";
import settingsController from "../controllers/settingsController";

const router = express.Router();
router.use(jwtCheck(false))
router.use(userCheck(false));

// Allow 10 requests by IP over 1 minute
function rateLimiter() {
  return config.environment === 'production' ? rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many request from this address, try again later please.',
    standardHeaders: true,
    legacyHeaders: false
  }) : noop();
}

router.get('/prospects/:email', prospectController.showProspectValidator, validator.validate, prospectController.show);

router.post('/owner-prospects', ownerProspectController.createOwnerProspectValidators, validator.validate, ownerProspectController.create);

router.post('/users/creation', rateLimiter(), userController.createUserValidators, validator.validate, userController.createUser);
router.post('/authenticate', rateLimiter(), accountController.signInValidators, validator.validate, accountController.signIn);
router.post('/account/reset-password', rateLimiter(), accountController.resetPasswordValidators, validator.validate, accountController.resetPassword);

router.post('/reset-links', rateLimiter(), resetLinkController.createValidators, validator.validate, resetLinkController.create);
router.get('/reset-links/:id', rateLimiter(), resetLinkController.showValidators, validator.validate, resetLinkController.show);

router.post('/signup-links', rateLimiter(), signupLinkController.createValidators, validator.validate, signupLinkController.create);
router.get('/signup-links/:id', rateLimiter(), signupLinkController.showValidators, validator.validate, signupLinkController.show);
router.put('/signup-links/:id/prospect', rateLimiter(), prospectController.createProspectValidator, validator.validate, prospectController.upsert);

router.get('/establishments', establishmentController.listValidators, validator.validate, establishmentController.list);
router.get('/establishments/:id/settings', settingsController.getSettingsValidators, validator.validate, settingsController.getSettings);

router.get('/localities', localityController.listLocalitiesValidators, validator.validate, localityController.listLocalities);
router.get('/localities/:geoCode', localityController.getLocalityValidators, validator.validate, localityController.getLocality);

router.get('/contact-points/public', contactPointController.listContactPointsValidators, validator.validate, contactPointController.listContactPoints(true));

router.get('/fail', (req, res) => {
  throw new Error("My first Sentry error!");
})

export default router;
