import Router from 'express-promise-router';
import rateLimit from 'express-rate-limit';

import accountController from '~/controllers/accountController';
import establishmentController from '~/controllers/establishmentController';
import localityController from '~/controllers/localityController';
import prospectController from '~/controllers/prospectController';
import resetLinkController from '~/controllers/resetLinkController';
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

/**
 * @openapi
 * /sse:
 *   get:
 *     summary: Server-Sent Events endpoint
 *     tags: [Events]
 *     description: Establishes an SSE connection to receive real-time events
 *     responses:
 *       200:
 *         description: SSE connection established
 */
router.get('/sse', serverSentEventController.handle);

/**
 * @openapi
 * /prospects/{email}:
 *   get:
 *     summary: Get a prospect by email
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Prospect found
 *       404:
 *         description: Prospect not found
 */
router.get(
  '/prospects/:email',
  prospectController.showProspectValidator,
  validator.validate,
  prospectController.show
);

/**
 * @openapi
 * /users/creation:
 *   post:
 *     summary: Create a user account
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, establishmentId]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               establishmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid data
 *       409:
 *         description: Email already in use
 */
router.post(
  '/users/creation',
  rateLimiter(),
  userController.createUserValidators,
  validator.validate,
  userController.create
);

/**
 * @openapi
 * /authenticate:
 *   post:
 *     summary: Authenticate a user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@collectivite.fr
 *               password:
 *                 type: string
 *                 format: password
 *                 example: MySecureP@ssword123
 *           example:
 *             email: user@collectivite.fr
 *             password: MySecureP@ssword123
 *     responses:
 *       200:
 *         description: Authentication successful (or 2FA required)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/AuthResponse'
 *                 - $ref: '#/components/schemas/TwoFactorRequired'
 *             examples:
 *               success:
 *                 summary: Successful authentication
 *                 value:
 *                   accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3OC0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODkwYWIiLCJpYXQiOjE2NDAwMDAwMDB9.signature
 *                   user:
 *                     id: 12345678-1234-1234-1234-1234567890ab
 *                     email: user@collectivite.fr
 *                     firstName: Marie
 *                     lastName: MARTIN
 *                     role: 0
 *               twoFactor:
 *                 summary: 2FA code required
 *                 value:
 *                   userId: 12345678-1234-1234-1234-1234567890ab
 *                   require2FA: true
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               name: AuthenticationError
 *               message: Invalid email or password
 *       403:
 *         description: Account suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               name: ForbiddenError
 *               message: Account suspended
 */
router.post(
  '/authenticate',
  rateLimiter(),
  validatorNext.validate(accountController.signInValidators),
  accountController.signIn
);

/**
 * @openapi
 * /authenticate/verify-2fa:
 *   post:
 *     summary: Verify 2FA code
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, code]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               code:
 *                 type: string
 *                 pattern: '^\d{6}$'
 *     responses:
 *       200:
 *         description: 2FA code validated, JWT token returned
 *       401:
 *         description: Invalid or expired code
 */
router.post(
  '/authenticate/verify-2fa',
  rateLimiter(),
  validatorNext.validate(accountController.verifyTwoFactorValidators),
  accountController.verifyTwoFactor
);

/**
 * @openapi
 * /account/reset-password:
 *   post:
 *     summary: Reset password
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetLinkId, password]
 *             properties:
 *               resetLinkId:
 *                 type: string
 *                 format: uuid
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired link
 */
router.post(
  '/account/reset-password',
  rateLimiter(),
  validatorNext.validate(accountController.resetPasswordValidators),
  accountController.resetPassword
);

/**
 * @openapi
 * /reset-links:
 *   post:
 *     summary: Create a password reset link
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Reset link created (email sent)
 *       404:
 *         description: Email not found
 */
router.post(
  '/reset-links',
  rateLimiter(),
  resetLinkController.createValidators,
  validator.validate,
  resetLinkController.create
);

/**
 * @openapi
 * /reset-links/{id}:
 *   get:
 *     summary: Check reset link validity
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Link is valid
 *       404:
 *         description: Invalid or expired link
 */
router.get(
  '/reset-links/:id',
  rateLimiter(),
  resetLinkController.showValidators,
  validator.validate,
  resetLinkController.show
);

/**
 * @openapi
 * /signup-links:
 *   post:
 *     summary: Create a signup link
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [establishmentId]
 *             properties:
 *               establishmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Signup link created
 */
router.post(
  '/signup-links',
  rateLimiter(),
  signupLinkController.createValidators,
  validator.validate,
  signupLinkController.create
);

/**
 * @openapi
 * /signup-links/{id}:
 *   get:
 *     summary: Get signup link information
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Link information
 *       404:
 *         description: Link not found or expired
 */
router.get(
  '/signup-links/:id',
  rateLimiter(),
  signupLinkController.showValidators,
  validator.validate,
  signupLinkController.show
);

/**
 * @openapi
 * /signup-links/{id}/prospect:
 *   put:
 *     summary: Update prospect information
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Prospect updated
 */
router.put(
  '/signup-links/:id/prospect',
  rateLimiter(),
  prospectController.createProspectValidator,
  validator.validate,
  prospectController.upsert
);

/**
 * @openapi
 * /establishments:
 *   get:
 *     summary: List establishments (local authorities)
 *     tags: [Establishments]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search by name or SIREN
 *         example: Nantes
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filter establishments available for registration
 *         example: true
 *       - in: query
 *         name: kind
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Commune, CA, CC, CU, ME, DEP, REG, ASSO, PETR, SIVOM]
 *         description: Filter by establishment type
 *     responses:
 *       200:
 *         description: List of establishments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Establishment'
 *             example:
 *               - id: 123e4567-e89b-12d3-a456-426614174000
 *                 name: Nantes Métropole
 *                 shortName: Nantes Métropole
 *                 siren: "244400404"
 *                 kind: ME
 *                 available: true
 *                 geoCodes: ["44109", "44020", "44143"]
 *               - id: 223e4567-e89b-12d3-a456-426614174001
 *                 name: Commune de Nantes
 *                 shortName: Nantes
 *                 siren: "214401093"
 *                 kind: Commune
 *                 available: false
 *                 geoCodes: ["44109"]
 */
router.get(
  '/establishments',
  jwtCheck({ required: false }),
  userCheck({ required: false }),
  validatorNext.validate({
    query: schemas.establishmentFilters
  }),
  establishmentController.list
);

/**
 * @openapi
 * /establishments/{id}/settings:
 *   get:
 *     summary: Get establishment settings
 *     tags: [Establishments, Settings]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Establishment settings
 *       404:
 *         description: Establishment not found
 */
router.get(
  '/establishments/:id/settings',
  settingsController.getSettingsValidators,
  validator.validate,
  settingsController.getSettings
);

/**
 * @openapi
 * /localities:
 *   get:
 *     summary: List localities (municipalities)
 *     tags: [Geo]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search by name or postal code
 *       - in: query
 *         name: establishmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by establishment
 *     responses:
 *       200:
 *         description: List of localities
 */
router.get(
  '/localities',
  localityController.listLocalitiesValidators,
  validator.validate,
  localityController.listLocalities
);

/**
 * @openapi
 * /localities/{geoCode}:
 *   get:
 *     summary: Get a locality by geographic code
 *     tags: [Geo]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: geoCode
 *         required: true
 *         schema:
 *           type: string
 *         description: INSEE code of the municipality
 *     responses:
 *       200:
 *         description: Locality details
 *       404:
 *         description: Locality not found
 */
router.get(
  '/localities/:geoCode',
  localityController.getLocalityValidators,
  validator.validate,
  localityController.getLocality
);

export default router;
