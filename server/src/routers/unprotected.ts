import Router from 'express-promise-router';
import rateLimit from 'express-rate-limit';

import accountController from '~/controllers/accountController';
import establishmentController from '~/controllers/establishmentController';
import localityController from '~/controllers/localityController';
import prospectController from '~/controllers/prospectController';
import resetLinkController from '~/controllers/resetLinkController';
import rnbController from '~/controllers/rnbController';
import settingsController from '~/controllers/settingsController';
import signupLinkController from '~/controllers/signupLinkController';
import userController from '~/controllers/userController';
import config from '~/infra/config';
import { noop } from '~/middlewares/noop';
import validator from '~/middlewares/validator';
import serverSentEventController from '~/controllers/serverSentEventController';
import validatorNext from '~/middlewares/validator-next';
import schemas from '@zerologementvacant/schemas';
import { jwtCheck, userCheck } from '~/middlewares/auth';

const router = Router();

// Allow 10 requests by IP over 1 minute
function rateLimiter() {
  return config.app.env === 'production'
    ? rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        message: 'Too many request from this address, try again later please.',
        standardHeaders: true,
        legacyHeaders: false
      })
    : noop();
}

router.get('/sse', serverSentEventController.handle);

router.get(
  '/prospects/:email',
  prospectController.showProspectValidator,
  validator.validate,
  prospectController.show
);

router.post(
  '/users/creation',
  rateLimiter(),
  userController.createUserValidators,
  validator.validate,
  userController.create
);
router.post(
  '/authenticate',
  rateLimiter(),
  validatorNext.validate(accountController.signInValidators),
  accountController.signIn
);
router.post(
  '/authenticate/verify-2fa',
  rateLimiter(),
  validatorNext.validate(accountController.verifyTwoFactorValidators),
  accountController.verifyTwoFactor
);
router.post(
  '/account/reset-password',
  rateLimiter(),
  validatorNext.validate(accountController.resetPasswordValidators),
  accountController.resetPassword
);

router.post(
  '/reset-links',
  rateLimiter(),
  resetLinkController.createValidators,
  validator.validate,
  resetLinkController.create
);
router.get(
  '/reset-links/:id',
  rateLimiter(),
  resetLinkController.showValidators,
  validator.validate,
  resetLinkController.show
);

router.post(
  '/signup-links',
  rateLimiter(),
  signupLinkController.createValidators,
  validator.validate,
  signupLinkController.create
);
router.get(
  '/signup-links/:id',
  rateLimiter(),
  signupLinkController.showValidators,
  validator.validate,
  signupLinkController.show
);
router.put(
  '/signup-links/:id/prospect',
  rateLimiter(),
  prospectController.createProspectValidator,
  validator.validate,
  prospectController.upsert
);

router.get(
  '/establishments',
  jwtCheck({ required: false }),
  userCheck({ required: false }),
  validatorNext.validate({
    query: schemas.establishmentFilters
  }),
  establishmentController.list
);
router.get(
  '/establishments/:id/settings',
  settingsController.getSettingsValidators,
  validator.validate,
  settingsController.getSettings
);

router.get(
  '/localities',
  localityController.listLocalitiesValidators,
  validator.validate,
  localityController.listLocalities
);
router.get(
  '/localities/:geoCode',
  localityController.getLocalityValidators,
  validator.validate,
  localityController.getLocality
);

// RNB Buildings
router.get(
  '/rnb/buildings',
  rnbController.getBuildingsValidators,
  validator.validate,
  rnbController.getBuildings
);

// RNB Housing lookup by rnb_id
router.get(
  '/rnb/housing/:rnbId',
  rnbController.getHousingByRnbIdValidators,
  validator.validate,
  rnbController.getHousingByRnbId
);

export default router;
