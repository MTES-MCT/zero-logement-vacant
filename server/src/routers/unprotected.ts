import Router from 'express-promise-router';
import rateLimit from 'express-rate-limit';
import { object } from 'yup';

import authController from '~/controllers/auth-controller';
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
 *     description: |
 *       Vérifie si un email correspond à un prospect (utilisateur potentiel).
 *       Retourne des informations sur l'existence d'un compte et l'établissement associé.
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Email du prospect à rechercher
 *         example: "prospect@collectivite.fr"
 *     responses:
 *       200:
 *         description: Prospect trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Prospect'
 *             example:
 *               email: "prospect@collectivite.fr"
 *               establishment:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 siren: "200012345"
 *               hasAccount: false
 *               hasCommitment: true
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
 *     description: |
 *       Crée un nouveau compte utilisateur via un lien d'invitation.
 *       Cette route est publique mais nécessite un lien d'invitation valide.
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
 *                 example: nouveau@collectivite.fr
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Mot de passe (min 8 caractères)
 *               firstName:
 *                 type: string
 *                 example: Jean
 *               lastName:
 *                 type: string
 *                 example: DUPONT
 *               establishmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'établissement de rattachement
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
  validatorNext.validate({
    body: schemas.signIn
  }),
  authController.signIn
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
  validatorNext.validate(authController.verifyTwoFactorValidators),
  authController.verifyTwoFactor
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
  validatorNext.validate(authController.resetPasswordValidators),
  authController.resetPassword
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
 *     description: |
 *       Crée un lien d'inscription pour un nouvel utilisateur.
 *       Le lien sera envoyé par email au prospect.
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupLinkPayload'
 *     responses:
 *       201:
 *         description: Lien d'inscription créé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupLink'
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
 *     description: |
 *       Retourne les informations du lien d'inscription, incluant l'établissement associé.
 *       Utilisé par le frontend pour pré-remplir le formulaire d'inscription.
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du lien d'inscription
 *     responses:
 *       200:
 *         description: Informations du lien
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignupLinkResponse'
 *             example:
 *               id: "123e4567-e89b-12d3-a456-426614174000"
 *               prospectEmail: "nouveau@collectivite.fr"
 *               expiresAt: "2024-02-15T14:30:00Z"
 *               establishment:
 *                 id: "123e4567-e89b-12d3-a456-426614174001"
 *                 name: "Communauté de communes du Val de Loire"
 *                 siren: "200012345"
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
 *     description: |
 *       Retourne la liste des établissements (collectivités territoriales).
 *       Cette route est publique mais peut être enrichie avec un token JWT pour filtrer par permissions.
 *
 *       **Types d'établissements disponibles:**
 *       - **Commune**: Commune
 *       - **CA**: Communauté d'Agglomération
 *       - **CC**: Communauté de Communes
 *       - **CU**: Communauté Urbaine
 *       - **ME**: Métropole
 *       - **DEP**: Département
 *       - **REG**: Région
 *       - **PETR**: Pôle d'Équilibre Territorial et Rural
 *       - **SIVOM**: Syndicat Intercommunal à Vocation Multiple
 *       - **CTU**: Collectivité Territoriale Unique
 *       - **SDED/SDER**: Services Déconcentrés de l'État
 *       - **ASSO**: Association
 *     tags: [Establishments]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche par nom ou SIREN
 *         example: "Communauté de communes"
 *       - in: query
 *         name: available
 *         schema:
 *           type: boolean
 *         description: Filtrer les établissements disponibles pour inscription
 *     responses:
 *       200:
 *         description: Liste des établissements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EstablishmentComplete'
 *             example:
 *               - id: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Communauté de communes du Val de Loire"
 *                 shortName: "CC Val de Loire"
 *                 siren: "200012345"
 *                 available: true
 *                 geoCodes: ["37001", "37002", "37003"]
 *                 kind: "CC"
 *                 source: "api-geo"
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
 *     description: Retourne les paramètres de configuration de l'établissement (inbox, etc.)
 *     tags: [Establishments, Settings]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de l'établissement
 *     responses:
 *       200:
 *         description: Paramètres de l'établissement
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SettingsComplete'
 *             example:
 *               inbox:
 *                 enabled: true
 *       404:
 *         description: Établissement non trouvé
 */
router.get(
  '/establishments/:id',
  validatorNext.validate({ params: object({ id: schemas.id }) }),
  establishmentController.get
);
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
 *     description: Retourne la liste des communes avec leurs informations fiscales (TLV, THLV)
 *     tags: [Geo]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche par nom ou code postal
 *         example: "Paris"
 *       - in: query
 *         name: establishmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par établissement
 *     responses:
 *       200:
 *         description: Liste des localités
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LocalityComplete'
 *             example:
 *               - geoCode: "75102"
 *                 name: "Paris 2e Arrondissement"
 *                 kind: "ACV"
 *                 taxKind: "TLV"
 *                 taxRate: 17
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
