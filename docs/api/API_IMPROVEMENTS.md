# API Zero Logement Vacant - Revue et Améliorations

> **Date:** 2026-02-24

Ce document recense les bonnes pratiques identifiées dans l'API ZLV ainsi que les axes d'amélioration potentiels.

## Points Positifs

### Sécurité

- **Authentification JWT** : Implémentation correcte avec token dans le header `x-access-token`
- **Rate limiting** : Limites de taux appliquées sur les endpoints d'authentification (10 req/min) et globalement (100 req/5min)
- **Validation des entrées** : Utilisation systématique de express-validator et Yup
- **Helmet** : Headers de sécurité configurés (CSP, HSTS, X-Content-Type-Options)
- **CORS** : Configuration restrictive

### Architecture

- **Séparation des routes** : Routes protégées et non protégées clairement séparées
- **Middleware de validation** : Pattern cohérent avec validators + validate middleware
- **Gestion d'erreurs** : Error handler centralisé avec Sentry
- **Configuration** : Utilisation de convict pour la configuration typée

### Conventions REST

- **Méthodes HTTP** : Utilisation correcte de GET, POST, PUT, DELETE
- **Codes de statut** : Utilisation appropriée des codes HTTP
- **Pagination** : Support de la pagination sur les endpoints de liste

---

## Axes d'Amélioration

### 1. Conventions REST à Corriger

#### 1.1 `POST /housing/:housingId` → `PUT /housing/:housingId`

**Problème** : POST est utilisé pour mettre à jour un logement existant, alors que PUT est la méthode HTTP standard pour les mises à jour idempotentes.

**Arguments** :
- ✅ **Sémantique HTTP** : PUT signifie "remplacer/mettre à jour une ressource existante", POST signifie "créer une nouvelle ressource"
- ✅ **Idempotence** : PUT est idempotent (plusieurs appels identiques = même résultat), ce qui correspond au comportement attendu
- ✅ **Cohérence** : Les autres endpoints de mise à jour utilisent déjà PUT (`PUT /groups/:id`, `PUT /campaigns/:id`)
- ✅ **Documentation** : Les développeurs externes s'attendront à PUT pour une mise à jour

**Impact** :
- 🔴 **Breaking change frontend** : Toutes les requêtes de mise à jour de logement doivent être modifiées
- Fichiers impactés : `frontend/src/services/housing-service.ts`, composants React utilisant ce service

**Coût** : ⭐ Faible (2-4h)
- Modifier le verbe dans `protected.ts`
- Mettre à jour le frontend (1 fichier service + tests)
- Vérifier les tests E2E

---

#### 1.2 `POST /housing/list` → `PATCH /housing/bulk`

**Problème** : POST utilisé pour une mise à jour en lot, sémantique confuse.

**Arguments** :
- ✅ **Sémantique** : PATCH est prévu pour les modifications partielles, parfait pour les mises à jour en lot
- ✅ **Clarté** : `/bulk` indique explicitement une opération en masse
- ❌ **Risque** : PATCH moins bien supporté par certains proxies/firewalls anciens (rare)

**Impact** :
- 🔴 **Breaking change frontend**

**Coût** : ⭐ Faible (2-4h)

---

#### 1.3 `POST /campaigns/:id/groups` → `POST /groups/:id/campaigns`

**Problème** : La sémantique est inversée. On crée une campagne DEPUIS un groupe, pas un groupe depuis une campagne.

**Arguments** :
- ✅ **RESTful** : L'URL devrait refléter l'action : "créer une campagne pour ce groupe"
- ✅ **Intuitivité** : Un développeur comprendra immédiatement que POST sur `/groups/:id/campaigns` crée une campagne liée au groupe

**Impact** :
- 🔴 **Breaking change frontend**
- Possibilité de garder l'ancien endpoint en parallèle avec deprecation warning

**Coût** : ⭐ Faible (2-4h)

---

#### 1.4 `POST /owners` (recherche) → `GET /owners?q=...`

**Problème** : POST est utilisé pour une opération de lecture (recherche).

**Arguments** :
- ✅ **HTTP standard** : GET pour les lectures, POST pour les écritures
- ✅ **Cache** : Les requêtes GET sont cachables par les navigateurs et CDN, pas POST
- ✅ **Bookmarkable** : Une URL GET peut être partagée/bookmarkée
- ❌ **Complexité** : Si les filtres sont très complexes (nested objects), GET peut devenir difficile avec les query params

**Impact** :
- 🔴 **Breaking change frontend**
- Nécessite de transformer le body JSON en query parameters

**Coût** : ⭐⭐ Moyen (4-8h)
- Refactoring du endpoint backend
- Adapter le frontend
- Gérer la sérialisation des filtres complexes

---

#### 1.5 `/geo/perimeters` → `/geo-perimeters`

**Problème** : Incohérence de nommage avec les autres endpoints.

**Arguments** :
- ✅ **Cohérence** : Tous les autres endpoints utilisent des tirets (`contact-points`, `owner-prospects`)
- ✅ **REST convention** : Les ressources sont nommées en kebab-case

**Impact** :
- 🔴 **Breaking change frontend** (mineur)

**Coût** : ⭐ Faible (1-2h)

---

### 2. Versioning de l'API (`/api/v1/`)

**Problème** : L'API n'est pas versionnée, ce qui rend les changements breaking impossibles sans casser les clients existants.

**Arguments** :
- ✅ **Évolutivité** : Permet d'introduire des breaking changes sans impacter les clients existants
- ✅ **Migration progressive** : Les clients peuvent migrer à leur rythme
- ✅ **Best practice** : Standard de l'industrie (Google, Stripe, GitHub...)
- ❌ **Complexité** : Maintenance de plusieurs versions en parallèle
- ❌ **Overhead** : Plus de code si plusieurs versions coexistent

**Recommandation** :
```
/api/v1/housing
/api/v1/campaigns
```

**Impact** :
- 🔴 **Breaking change majeur** sur tous les endpoints
- Nécessite une stratégie de migration (v1 par défaut, v2 en preview)

**Coût** : ⭐⭐⭐ Élevé (2-3 jours)
- Refactoring de la structure des routers
- Mise à jour de tous les appels frontend
- Documentation des versions
- Tests E2E à adapter

**Recommandation** : Implémenter lors de la prochaine refonte majeure de l'API.

---

### 3. Réponses d'Erreur Standardisées (RFC 7807)

**Problème** : Le format des erreurs varie selon les endpoints, rendant le traitement côté client inconsistant.

**Arguments** :
- ✅ **Standard** : RFC 7807 est un standard IETF adopté par de nombreuses APIs
- ✅ **Debugging** : Structure claire avec `type`, `title`, `detail`, `instance`
- ✅ **Extensible** : Champs additionnels possibles (`errors[]` pour les validations)
- ✅ **Machine-readable** : Le champ `type` permet une gestion automatisée des erreurs

**Format recommandé** :
```json
{
  "type": "https://zlv.beta.gouv.fr/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Le champ 'email' est invalide",
  "instance": "/api/users/creation",
  "errors": [
    { "field": "email", "message": "Format d'email invalide" }
  ]
}
```

**Impact** :
- 🟡 **Changement non-breaking** si implémenté progressivement
- Frontend doit adapter la gestion des erreurs

**Coût** : ⭐⭐ Moyen (1-2 jours)
- Créer un error handler centralisé
- Adapter les classes d'erreur existantes
- Mettre à jour le frontend pour parser le nouveau format

---

### 4. HATEOAS / Hypermedia

**Problème** : Les réponses ne contiennent pas de liens vers les ressources liées, le client doit connaître les URLs à l'avance.

**Arguments** :
- ✅ **Découvrabilité** : Le client peut naviguer l'API sans documentation
- ✅ **Découplage** : Les URLs peuvent changer sans casser les clients
- ✅ **Richardson Maturity Level 3** : Plus haut niveau de maturité REST
- ❌ **Verbosité** : Augmente la taille des réponses
- ❌ **Complexité** : Rarement utilisé en pratique, peu de clients l'exploitent
- ❌ **Over-engineering** : Pour une application avec un seul frontend, peu de valeur ajoutée

**Format recommandé** :
```json
{
  "id": "uuid",
  "title": "Campagne 2024",
  "_links": {
    "self": { "href": "/api/campaigns/uuid" },
    "housing": { "href": "/api/campaigns/uuid/housing" },
    "export": { "href": "/api/campaigns/uuid/export" }
  }
}
```

**Impact** :
- 🟢 **Non-breaking** si ajouté comme champs optionnels

**Coût** : ⭐⭐⭐ Élevé (3-5 jours)
- Modifier tous les DTOs
- Créer un helper de génération de liens
- Adapter le frontend (optionnel)

**Recommandation** : ❌ **Non prioritaire**. Le ROI est faible pour une application avec un frontend unique et maîtrisé.

---

### 5. Filtrage et Tri Avancé

**Points positifs** : Le filtrage existe déjà sur `/housing` avec Yup schemas.

**Améliorations possibles** :

| Amélioration | Argument | Impact | Coût |
|--------------|----------|--------|------|
| Documentation des opérateurs | Les développeurs ne savent pas quels filtres sont disponibles | 🟢 Non-breaking | ⭐ Faible |
| Tri multi-champs (`sort=status,-createdAt`) | Permet des tris composés | 🟢 Non-breaking | ⭐ Faible |
| Standard JSON:API | Standardisation | 🔴 Breaking | ⭐⭐⭐ Élevé |

**Recommandation** : Documenter les filtres existants dans Swagger, ajouter le tri multi-champs.

---

### 6. Compression GZIP/Brotli

**Problème** : Les réponses volumineuses (liste de logements, exports) ne sont pas compressées.

**Arguments** :
- ✅ **Performance** : Réduction de 70-90% de la taille des réponses JSON
- ✅ **Bande passante** : Économie pour les utilisateurs mobiles
- ✅ **Temps de réponse** : Transfert plus rapide malgré la compression
- ✅ **Facile** : Une ligne de code avec le middleware `compression`
- ❌ **CPU** : Légère augmentation de l'utilisation CPU serveur (négligeable)

**Implémentation** :
```typescript
import compression from 'compression';
app.use(compression());
```

**Impact** :
- 🟢 **Non-breaking**, transparent pour les clients

**Coût** : ⭐ Très faible (30 min)
- Installer le package `compression`
- Ajouter une ligne dans `server.ts`

**Recommandation** : ✅ **À faire immédiatement**, excellent ROI.

---

### 7. Cache HTTP

**Problème** : Aucun header de cache, chaque requête va jusqu'au serveur même pour des données statiques.

**Arguments** :
- ✅ **Performance** : Les données peu changeantes (établissements, communes) peuvent être cachées
- ✅ **Économie serveur** : Moins de requêtes à traiter
- ✅ **UX** : Réponses instantanées pour les données cachées
- ❌ **Complexité** : Nécessite une stratégie d'invalidation

**Cas d'usage** :
| Endpoint | Cache recommandé | Justification |
|----------|-----------------|---------------|
| `/establishments` | `max-age=3600` (1h) | Liste rarement modifiée |
| `/localities` | `max-age=86400` (24h) | Données INSEE stables |
| `/housing` | `no-cache` | Données temps réel |
| `/campaigns` | `no-cache, private` | Données sensibles |

**Impact** :
- 🟢 **Non-breaking**

**Coût** : ⭐ Faible (2-4h)
- Ajouter les headers dans les controllers concernés
- Documenter la stratégie de cache

---

### 8. ETag et Concurrence Optimiste

**Problème** : Deux utilisateurs peuvent modifier le même logement simultanément, le dernier écrase les modifications du premier sans avertissement.

**Arguments** :
- ✅ **Intégrité** : Prévient la perte de données lors de modifications concurrentes
- ✅ **UX** : Alerte l'utilisateur qu'il travaille sur une version obsolète
- ✅ **Standard HTTP** : `If-Match`, `ETag` sont des headers standards
- ❌ **Complexité frontend** : Nécessite de gérer le cas 412 Precondition Failed
- ❌ **Calcul hash** : Légère surcharge pour calculer l'ETag

**Implémentation** :
```typescript
// GET - Génération
res.set('ETag', `"${hash(resource)}"`);

// PUT - Vérification
const ifMatch = req.headers['if-match'];
if (ifMatch && ifMatch !== currentETag) {
  return res.status(412).json({ error: 'Precondition Failed' });
}
```

**Impact** :
- 🟡 **Potentiellement breaking** si le frontend ne gère pas le 412

**Coût** : ⭐⭐ Moyen (1-2 jours)
- Middleware de génération d'ETag
- Middleware de vérification If-Match
- Gestion du 412 côté frontend
- Tests

**Recommandation** : Implémenter sur les ressources critiques (`housing`, `owners`) en priorité.

---

### 9. Health Checks Live/Ready Séparés

**Point positif** : Un health check existe déjà à `/`.

**Problème** : Le health check actuel vérifie tout (DB, Redis, S3, Brevo), ce qui peut bloquer le déploiement si un service non-critique est down.

**Arguments** :
- ✅ **Kubernetes-ready** : Standard K8s avec `livenessProbe` et `readinessProbe`
- ✅ **Résilience** : Le serveur peut continuer à fonctionner même si Brevo est down
- ✅ **Déploiement** : Un check `/health/ready` trop strict peut empêcher les rolling updates

**Endpoints recommandés** :
- `/health/live` : L'application est en cours d'exécution (toujours 200 si le process tourne)
- `/health/ready` : L'application peut accepter du trafic (DB connectée)

**Impact** :
- 🟢 **Non-breaking** (nouveaux endpoints)

**Coût** : ⭐ Faible (2-4h)
- Créer les deux nouveaux endpoints
- Configurer Clever Cloud pour utiliser `/health/ready`

---

### 10. Documentation OpenAPI (✅ Implémenté)

**Nouvellement implémenté** :
- Swagger UI disponible à `/api-docs`
- Spécification OpenAPI à `/api-docs.json`
- Désactivé en production par défaut (activer avec `ENABLE_SWAGGER=true`)

**Améliorations futures** :

| Amélioration | Argument | Coût |
|--------------|----------|------|
| Exemples de requêtes/réponses | Facilite l'onboarding | ⭐ Faible |
| Documentation des codes d'erreur | Gestion d'erreur exhaustive | ⭐ Faible |
| Génération TypeScript depuis OpenAPI | DRY, types toujours à jour | ⭐⭐ Moyen |

---

## Checklist de Mise en Conformité

### Priorité 1 - Quick Wins (ROI élevé, coût faible)

| Amélioration | Coût | Impact | Justification |
|--------------|------|--------|---------------|
| ✅ Documentation Swagger | ⭐ | Aucun breaking | Déjà implémenté |
| [ ] Compression gzip | ⭐ (30 min) | Aucun breaking | -70% taille réponses, 1 ligne de code |
| [ ] Health checks live/ready | ⭐ (2-4h) | Aucun breaking | Meilleure résilience déploiement |

### Priorité 2 - Corrections API (améliore la cohérence)

| Amélioration | Coût | Impact | Quand |
|--------------|------|--------|-------|
| [ ] `POST /housing/:id` → `PUT` | ⭐ (2-4h) | Breaking frontend | Prochain sprint |
| [ ] `/geo/perimeters` → `/geo-perimeters` | ⭐ (1-2h) | Breaking frontend | Prochain sprint |
| [ ] `POST /owners` → `GET /owners?q=` | ⭐⭐ (4-8h) | Breaking frontend | Prochain sprint |
| [ ] `POST /housing/list` → `PATCH /housing/bulk` | ⭐ (2-4h) | Breaking frontend | Prochain sprint |

### Priorité 3 - Améliorations structurelles

| Amélioration | Coût | Impact | Recommandation |
|--------------|------|--------|----------------|
| [ ] Cache HTTP (headers) | ⭐ (2-4h) | Aucun breaking | À faire |
| [ ] Erreurs RFC 7807 | ⭐⭐ (1-2j) | Semi-breaking | À planifier |
| [ ] ETags concurrence | ⭐⭐ (1-2j) | Semi-breaking | Sur ressources critiques |

### Priorité 4 - Évolutions majeures (à planifier)

| Amélioration | Coût | Impact | Recommandation |
|--------------|------|--------|----------------|
| [ ] Versioning API v1/v2 | ⭐⭐⭐ (2-3j) | Breaking majeur | Lors d'une refonte |
| [ ] HATEOAS | ⭐⭐⭐ (3-5j) | Non-breaking | ❌ Non prioritaire |
| [ ] GraphQL | ⭐⭐⭐⭐ (semaines) | Parallèle à REST | ❌ Non recommandé actuellement |

### Synthèse des Coûts

| Priorité | Effort total estimé | Valeur ajoutée |
|----------|---------------------|----------------|
| P1 Quick Wins | ~4h | Haute (performance, résilience) |
| P2 Corrections | ~12h | Moyenne (cohérence, maintenabilité) |
| P3 Améliorations | ~3 jours | Moyenne (robustesse) |
| P4 Évolutions | 1-2 semaines | Variable |

**Recommandation** : Commencer par P1, intégrer P2 dans le prochain sprint de refactoring, planifier P3 sur 2-3 sprints.

---

## Notes sur la Documentation Swagger

### Accès

- **Développement** : `http://localhost:3001/api-docs`
- **Production** : Désactivé par défaut, activer via `ENABLE_SWAGGER=true`

### Fichiers Modifiés

- `server/src/infra/swagger.ts` : Configuration OpenAPI
- `server/src/infra/server.ts` : Intégration Swagger UI
- `server/src/routers/protected.ts` : Annotations JSDoc des routes protégées
- `server/src/routers/unprotected.ts` : Annotations JSDoc des routes publiques

### Maintenance

Pour ajouter de nouvelles routes documentées :

```typescript
/**
 * @swagger
 * /endpoint:
 *   get:
 *     summary: Description courte
 *     tags: [TagName]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: param
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Description succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchemaName'
 */
router.get('/endpoint', handler);
```
