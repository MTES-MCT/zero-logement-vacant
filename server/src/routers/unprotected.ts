import schemas from '@zerologementvacant/schemas';
import Router from 'express-promise-router';
import rateLimit from 'express-rate-limit';
import { object, string } from 'yup';

import authController from '~/controllers/auth-controller';
import establishmentController from '~/controllers/establishmentController';
import localityController from '~/controllers/localityController';
import precisionController from '~/controllers/precisionController';
import prospectController from '~/controllers/prospectController';
import resetLinkController from '~/controllers/resetLinkController';
import signupLinkController from '~/controllers/signupLinkController';
import userController from '~/controllers/userController';
import config from '~/infra/config';
import { jwtCheck, userCheck } from '~/middlewares/auth';
import { noop } from '~/middlewares/noop';
import { responseCache } from '~/middlewares/responseCache';
import validator from '~/middlewares/validator';
import { SIGNUP_LINK_LENGTH } from '~/models/SignupLinkApi';

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

router.get(
  '/prospects/:email',
  validator.validate({
    params: object({ email: schemas.email })
  }),
  prospectController.show
);

router.post(
  '/users/creation',
  rateLimiter(),
  validator.validate({
    body: object({
      email: schemas.email,
      password: schemas.password.required(),
      establishmentId: string().uuid().required(),
      firstName: string().optional(),
      lastName: string().optional()
    })
  }),
  userController.create
);

router.post(
  '/authenticate',
  rateLimiter(),
  validator.validate({
    body: schemas.signIn
  }),
  authController.signIn
);

router.post(
  '/authenticate/verify-2fa',
  rateLimiter(),
  validator.validate(authController.verifyTwoFactorValidators),
  authController.verifyTwoFactor
);

router.post(
  '/account/reset-password',
  rateLimiter(),
  validator.validate(authController.resetPasswordValidators),
  authController.resetPassword
);

router.post(
  '/reset-links',
  rateLimiter(),
  validator.validate({
    body: object({ email: schemas.email })
  }),
  resetLinkController.create
);

// reset link ids are randomstring (not UUIDs) — don't use schemas.id
router.get(
  '/reset-links/:id',
  rateLimiter(),
  validator.validate({
    params: object({
      id: string()
        .matches(/^[a-zA-Z0-9]+$/)
        .required()
    })
  }),
  resetLinkController.show
);

router.post(
  '/signup-links',
  rateLimiter(),
  validator.validate({
    body: object({ email: schemas.email })
  }),
  signupLinkController.create
);

// signup link ids are randomstring (not UUIDs) — don't use schemas.id
router.get(
  '/signup-links/:id',
  rateLimiter(),
  validator.validate({
    params: object({ id: string().required() })
  }),
  signupLinkController.show
);

// signup link ids are randomstring (not UUIDs) — don't use schemas.id
router.put(
  '/signup-links/:id/prospect',
  rateLimiter(),
  validator.validate({
    params: object({
      id: string()
        .matches(/^[a-zA-Z0-9]+$/)
        .length(SIGNUP_LINK_LENGTH)
        .required()
    })
  }),
  prospectController.upsert
);

router.get(
  '/establishments',
  jwtCheck({ required: false }),
  userCheck({ required: false }),
  validator.validate({
    query: schemas.establishmentFilters
  }),
  responseCache(config.cache.establishment),
  establishmentController.list
);

router.get(
  '/establishments/:id',
  validator.validate({ params: object({ id: schemas.id }) }),
  responseCache(config.cache.establishment),
  establishmentController.get
);

router.get(
  '/localities',
  validator.validate({
    query: object({ establishmentId: string().uuid().required() })
  }),
  responseCache(config.cache.default),
  localityController.listLocalities
);

router.get(
  '/localities/:geoCode',
  validator.validate({
    params: object({ geoCode: schemas.geoCode.required() })
  }),
  responseCache(config.cache.default),
  localityController.getLocality
);

router.get(
  '/precisions',
  responseCache(config.cache.default),
  precisionController.find
);

export default router;
