import Router from 'express-promise-router';
import rateLimit from 'express-rate-limit';
import { object } from 'yup';

import accountController from '~/controllers/accountController';
import contactPointController from '~/controllers/contactPointController';
import establishmentController from '~/controllers/establishmentController';
import localityController from '~/controllers/localityController';
import ownerProspectController from '~/controllers/ownerProspectController';
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
 * @swagger
 * /sse:
 *   get:
 *     summary: Server-Sent Events endpoint
 *     description: Connexion SSE pour recevoir des notifications en temps réel
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Connexion SSE établie
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/sse', serverSentEventController.handle);

/**
 * @swagger
 * /prospects/{email}:
 *   get:
 *     summary: Récupérer un prospect par email
 *     tags: [Authentication]
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
 * @swagger
 * /owner-prospects:
 *   post:
 *     summary: Créer une demande de contact propriétaire
 *     description: Permet à un propriétaire de soumettre une demande de contact via le formulaire public
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - firstName
 *               - lastName
 *               - address
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Demande créée
 *       400:
 *         description: Données invalides
 */
router.post(
  '/owner-prospects',
  ownerProspectController.createOwnerProspectValidators,
  validator.validate,
  ownerProspectController.create
);

/**
 * @swagger
 * /users/creation:
 *   post:
 *     summary: Créer un compte utilisateur
 *     description: Création d'un compte avec un lien d'invitation valide
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - signupLink
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
 *               signupLink:
 *                 type: string
 *                 description: Lien d'invitation
 *     responses:
 *       201:
 *         description: Compte créé
 *       400:
 *         description: Données invalides ou lien expiré
 *       409:
 *         description: Email déjà utilisé
 */
router.post(
  '/users/creation',
  rateLimiter(),
  userController.createUserValidators,
  validator.validate,
  userController.createUser
);

/**
 * @swagger
 * /authenticate:
 *   post:
 *     summary: Authentification
 *     description: Authentifie un utilisateur avec email et mot de passe et retourne un token JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               establishmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID de l'établissement (optionnel pour utilisateurs multi-établissements)
 *     responses:
 *       200:
 *         description: Authentification réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 establishment:
 *                   $ref: '#/components/schemas/Establishment'
 *                 accessToken:
 *                   type: string
 *                   description: JWT token à utiliser dans le header x-access-token
 *       401:
 *         description: Email ou mot de passe incorrect
 *       429:
 *         description: Trop de tentatives (rate limit)
 */
router.post(
  '/authenticate',
  rateLimiter(),
  accountController.signInValidators,
  validator.validate,
  accountController.signIn
);

/**
 * @swagger
 * /account/reset-password:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     description: Utilise un lien de réinitialisation pour changer le mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - password
 *             properties:
 *               key:
 *                 type: string
 *                 description: Clé du lien de réinitialisation
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé
 *       400:
 *         description: Lien invalide ou expiré
 *       429:
 *         description: Trop de tentatives (rate limit)
 */
router.post(
  '/account/reset-password',
  rateLimiter(),
  accountController.resetPasswordValidators,
  validator.validate,
  accountController.resetPassword
);

/**
 * @swagger
 * /reset-links:
 *   post:
 *     summary: Demander un lien de réinitialisation de mot de passe
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email envoyé (même si l'email n'existe pas pour éviter l'énumération)
 *       429:
 *         description: Trop de tentatives
 */
router.post(
  '/reset-links',
  rateLimiter(),
  resetLinkController.createValidators,
  validator.validate,
  resetLinkController.create
);

/**
 * @swagger
 * /reset-links/{id}:
 *   get:
 *     summary: Vérifier la validité d'un lien de réinitialisation
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lien valide
 *       404:
 *         description: Lien non trouvé ou expiré
 */
router.get(
  '/reset-links/:id',
  rateLimiter(),
  resetLinkController.showValidators,
  validator.validate,
  resetLinkController.show
);

/**
 * @swagger
 * /signup-links:
 *   post:
 *     summary: Créer un lien d'inscription (admin uniquement)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - establishmentId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               establishmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Lien créé
 *       429:
 *         description: Trop de tentatives
 */
router.post(
  '/signup-links',
  rateLimiter(),
  signupLinkController.createValidators,
  validator.validate,
  signupLinkController.create
);

/**
 * @swagger
 * /signup-links/{id}:
 *   get:
 *     summary: Récupérer les informations d'un lien d'inscription
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 * @swagger
 * /signup-links/{id}/prospect:
 *   put:
 *     summary: Enregistrer un prospect via lien d'inscription
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Prospect enregistré
 */
router.put(
  '/signup-links/:id/prospect',
  rateLimiter(),
  prospectController.createProspectValidator,
  validator.validate,
  prospectController.upsert
);

/**
 * @swagger
 * /establishments:
 *   get:
 *     summary: Lister les établissements
 *     description: Liste tous les établissements avec filtres optionnels
 *     tags: [Establishments]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche textuelle sur le nom
 *       - in: query
 *         name: kind
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filtrer par type d'établissement
 *     responses:
 *       200:
 *         description: Liste des établissements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Establishment'
 */
router.get(
  '/establishments',
  validatorNext.validate({
    query: schemas.establishmentFilters
  }),
  establishmentController.list
);

/**
 * @swagger
 * /establishments/{id}/settings:
 *   get:
 *     summary: Récupérer les paramètres d'un établissement
 *     tags: [Establishments]
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
 * @swagger
 * /localities:
 *   get:
 *     summary: Lister les communes
 *     tags: [Localities]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Recherche textuelle
 *       - in: query
 *         name: establishmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par établissement
 *     responses:
 *       200:
 *         description: Liste des communes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Locality'
 */
router.get(
  '/localities',
  localityController.listLocalitiesValidators,
  validator.validate,
  localityController.listLocalities
);

/**
 * @swagger
 * /localities/{geoCode}:
 *   get:
 *     summary: Récupérer une commune par code INSEE
 *     tags: [Localities]
 *     parameters:
 *       - in: path
 *         name: geoCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Code INSEE de la commune
 *     responses:
 *       200:
 *         description: Détails de la commune
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Locality'
 *       404:
 *         description: Commune non trouvée
 */
router.get(
  '/localities/:geoCode',
  localityController.getLocalityValidators,
  validator.validate,
  localityController.getLocality
);

/**
 * @swagger
 * /contact-points/public:
 *   get:
 *     summary: Lister les points de contact publics
 *     description: Points de contact visibles publiquement pour un établissement
 *     tags: [Contact Points]
 *     parameters:
 *       - in: query
 *         name: establishmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Liste des points de contact
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ContactPoint'
 */
router.get(
  '/contact-points/public',
  contactPointController.listContactPointsValidators,
  validator.validate,
  contactPointController.listContactPoints(true)
);

export default router;
