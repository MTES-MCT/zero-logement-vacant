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
 *     description: Établit une connexion SSE pour recevoir des événements en temps réel
 *     responses:
 *       200:
 *         description: Connexion SSE établie
 */
router.get('/sse', serverSentEventController.handle);

/**
 * @openapi
 * /prospects/{email}:
 *   get:
 *     summary: Récupérer un prospect par email
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
 *         description: Prospect trouvé
 *       404:
 *         description: Prospect non trouvé
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
 *     summary: Créer un compte utilisateur
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
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Données invalides
 *       409:
 *         description: Email déjà utilisé
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
 *     summary: Authentifier un utilisateur
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
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Authentification réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Token JWT à utiliser pour les requêtes authentifiées
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *       401:
 *         description: Email ou mot de passe incorrect
 *       403:
 *         description: Compte désactivé
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
 *     summary: Vérifier le code 2FA
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
 *         description: Code 2FA validé, token JWT retourné
 *       401:
 *         description: Code invalide ou expiré
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
 *     summary: Réinitialiser le mot de passe
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
 *         description: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Lien invalide ou expiré
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
 *     summary: Créer un lien de réinitialisation de mot de passe
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
 *         description: Lien de réinitialisation créé (email envoyé)
 *       404:
 *         description: Email non trouvé
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
 *     summary: Vérifier la validité d'un lien de réinitialisation
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
 *         description: Lien valide
 *       404:
 *         description: Lien invalide ou expiré
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
 *     summary: Créer un lien d'inscription
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
 *         description: Lien d'inscription créé
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
 *     summary: Récupérer les informations d'un lien d'inscription
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
 *         description: Informations du lien
 *       404:
 *         description: Lien non trouvé ou expiré
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
 *     summary: Mettre à jour les informations d'un prospect
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
 *         description: Prospect mis à jour
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
 *     summary: Lister les établissements (collectivités)
 *     tags: [Establishments]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche par nom ou SIREN
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filtrer les établissements disponibles
 *     responses:
 *       200:
 *         description: Liste des établissements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   siren:
 *                     type: integer
 *                   kind:
 *                     type: string
 *                     enum: [Commune, EPCI, Département, Région]
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
 *     summary: Récupérer les paramètres d'un établissement
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
 *         description: Paramètres de l'établissement
 *       404:
 *         description: Établissement non trouvé
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
 *     summary: Lister les localités (communes)
 *     tags: [Geo]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche par nom ou code postal
 *       - in: query
 *         name: establishmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par établissement
 *     responses:
 *       200:
 *         description: Liste des localités
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
 *     summary: Récupérer une localité par son code géographique
 *     tags: [Geo]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: geoCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code INSEE de la commune
 *     responses:
 *       200:
 *         description: Détails de la localité
 *       404:
 *         description: Localité non trouvée
 */
router.get(
  '/localities/:geoCode',
  localityController.getLocalityValidators,
  validator.validate,
  localityController.getLocality
);

export default router;
