# Scripts de test des droits Portail DF

Ces scripts permettent de tester les différents cas d'erreurs liés à la vérification des droits Portail DF lors de la **connexion** et de la **création de compte**.

## Note importante

Ces scripts sont destinés aux **tests manuels uniquement** et ne doivent **pas être commités**.

## Prérequis

Variables d'environnement requises :
```bash
export CEREMA_USERNAME="votre_username"
export CEREMA_PASSWORD="votre_password"
export CEREMA_API="https://portaildf.cerema.fr"  # optionnel
```

## Scripts disponibles

### 1. `test-portaildf-rights.ts`

Teste un email et affiche les informations de droits Portail DF.

```bash
# Tester un email spécifique
npx tsx server/src/scripts/test-portaildf-rights/test-portaildf-rights.ts email@example.fr

# Tester les emails prédéfinis
npx tsx server/src/scripts/test-portaildf-rights/test-portaildf-rights.ts
```

### 2. `generate-test-cases.ts`

Génère tous les cas de test possibles avec un tableau récapitulatif et le code seed à copier.

```bash
npx tsx server/src/scripts/test-portaildf-rights/generate-test-cases.ts email@example.fr
```

### 3. `fetch-test-data.ts`

Récupère les données réelles de Portail DF pour un utilisateur et génère le code seed correspondant.

```bash
npx tsx server/src/scripts/test-portaildf-rights/fetch-test-data.ts email@example.fr
```

---

## Cas de test - CONNEXION

Ces cas testent la connexion d'un utilisateur **existant** en base ZLV.

| ID        | Description                              | Périmètre | Niv.Accès | Structure | Suspendu | Résultat   | Cause                                      |
|-----------|------------------------------------------|-----------|-----------|-----------|----------|------------|-------------------------------------------|
| LOGIN-01  | Utilisateur actif - tous droits valides | ✅        | ✅        | ✅        | 🟢 NON   | OK         | -                                         |
| LOGIN-02  | Suspendu - droits utilisateur expirés   | ✅        | ✅        | ✅        | 🔴 OUI   | SUSPENDED  | droits utilisateur expires                |
| LOGIN-03  | Suspendu - droits structure expirés     | ✅        | ✅        | ❌        | 🔴 OUI   | SUSPENDED  | droits structure expires                  |
| LOGIN-04  | Suspendu - CGU non validées             | ✅        | ✅        | ✅        | 🔴 OUI   | SUSPENDED  | cgu vides                                 |
| LOGIN-05  | Suspendu - niveau accès invalide        | ✅        | ❌        | ✅        | 🔴 OUI   | SUSPENDED  | niveau_acces_invalide                     |
| LOGIN-06  | Suspendu - périmètre invalide           | ❌        | ✅        | ✅        | 🔴 OUI   | SUSPENDED  | perimetre_invalide                        |
| LOGIN-07  | Suspendu - multiple causes              | ✅        | ✅        | ✅        | 🔴 OUI   | SUSPENDED  | droits utilisateur expires, droits structure expires, cgu vides |
| LOGIN-08  | Suspendu - accès + périmètre invalides  | ❌        | ❌        | ✅        | 🔴 OUI   | SUSPENDED  | niveau_acces_invalide, perimetre_invalide |
| LOGIN-09  | Compte supprimé                          | ✅        | ✅        | ✅        | 🟢 NON   | FORBIDDEN  | -                                         |

### Résultats attendus - Connexion

| Résultat   | HTTP | Description                                                |
|------------|------|-----------------------------------------------------------|
| OK         | 200  | Connexion réussie, accès normal au tableau de bord        |
| SUSPENDED  | 200  | Connexion réussie, modal de suspension affiché            |
| FORBIDDEN  | 403  | Connexion refusée, compte supprimé (`deletedAt` défini)   |

> **Note** : Seul le cas FORBIDDEN (compte supprimé) bloque la connexion. Les utilisateurs suspendus peuvent se connecter et verront la modale de suspension.

---

## Cas de test - CRÉATION DE COMPTE

Ces cas testent la création d'un nouveau compte via un **prospect** et un **signup link**.

| ID         | Description                                | Périmètre | Niv.Accès | Structure | Résultat | Cause                                      |
|------------|-------------------------------------------|-----------|-----------|-----------|----------|-------------------------------------------|
| CREATE-01  | Création - tous droits valides            | ✅        | ✅        | ✅        | OK       | -                                         |
| CREATE-02  | Création - niveau accès invalide (BLOQUÉ) | ✅        | ❌        | ✅        | ERROR    | niveau_acces_invalide                     |
| CREATE-03  | Création - périmètre invalide (BLOQUÉ)    | ❌        | ✅        | ✅        | ERROR    | perimetre_invalide                        |
| CREATE-04  | Création - accès + périmètre invalides    | ❌        | ❌        | ✅        | ERROR    | niveau_acces_invalide, perimetre_invalide |
| CREATE-05  | Création - droits structure expirés       | ✅        | ✅        | ❌        | ERROR    | droits structure expires                  |
| CREATE-06  | Création - CGU non validées               | ✅        | ✅        | ✅        | ERROR    | cgu vides                                 |
| CREATE-07  | Création - droits utilisateur expirés     | ✅        | ✅        | ✅        | ERROR    | droits utilisateur expires                |

### Résultats attendus - Création de compte

| Résultat | Description                                                  |
|----------|-------------------------------------------------------------|
| OK       | Compte créé avec succès, redirection vers le tableau de bord |
| ERROR    | Création bloquée, message d'erreur affiché                   |

---

## Légende des colonnes

- **Périmètre** : Le périmètre géographique du groupe Portail DF couvre les geo_codes de l'établissement ZLV
- **Niv.Accès** : Le groupe a `niveau_acces = 'lovac'` OU `lovac = true`
- **Structure** : La date `acces_lovac` de la structure est dans le futur
- **Suspendu** : L'utilisateur a `suspendedAt` défini en base (uniquement pour la connexion)

## Causes de suspension / blocage

| Cause                        | Description                                                    |
|------------------------------|----------------------------------------------------------------|
| `droits utilisateur expires` | Droits utilisateur expirés sur Portail DF                      |
| `droits structure expires`   | `acces_lovac` NULL ou date expirée                             |
| `cgu vides`                  | CGU non validées sur Portail DF                                |
| `niveau_acces_invalide`      | Groupe n'a pas `niveau_acces = 'lovac'` ni `lovac = true`      |
| `perimetre_invalide`         | Périmètre géographique ne couvre pas l'établissement ZLV       |

---

## Utilisateurs de test en seed (development)

### Pour la CONNEXION

| Cas ID   | Email                                      | Cause de suspension                                           | Résultat attendu |
|----------|-------------------------------------------|---------------------------------------------------------------|------------------|
| LOGIN-01 | `test.strasbourg@zlv.fr`                   | (aucune - utilisateur normal Strasbourg)                      | OK               |
| LOGIN-01 | `test.saintlo@zlv.fr`                      | (aucune - utilisateur normal Saint-Lô)                        | OK               |
| LOGIN-02 | `test.suspended.user@zlv.fr`               | `droits utilisateur expires`                                  | SUSPENDED        |
| LOGIN-03 | `test.suspended.structure@zlv.fr`          | `droits structure expires`                                    | SUSPENDED        |
| LOGIN-04 | `test.suspended.cgu@zlv.fr`                | `cgu vides`                                                   | SUSPENDED        |
| LOGIN-05 | `test.suspended.access@zlv.fr`             | `niveau_acces_invalide`                                       | SUSPENDED        |
| LOGIN-06 | `test.suspended.perimeter@zlv.fr`          | `perimetre_invalide`                                          | SUSPENDED        |
| LOGIN-07 | `test.suspended.multiple@zlv.fr`           | `droits utilisateur expires, droits structure expires, cgu vides` | SUSPENDED    |
| LOGIN-08 | `test.suspended.access.perimeter@zlv.fr`   | `niveau_acces_invalide, perimetre_invalide`                   | SUSPENDED        |
| LOGIN-09 | `test.deleted@zlv.fr`                      | (compte supprimé - `deletedAt` défini)                        | FORBIDDEN        |

### Pour la CRÉATION DE COMPTE

| Email                                  | Signup Link ID                    | Résultat attendu |
|----------------------------------------|-----------------------------------|------------------|
| `test.create.valid@zlv.fr`             | `create_01_signup_link`           | OK               |
| `test.create.invalid.access@zlv.fr`    | `create_02_signup_link`           | ERROR            |
| `test.create.invalid.perimeter@zlv.fr` | `create_03_signup_link`           | ERROR            |
| `test.create.invalid.both@zlv.fr`      | `create_04_signup_link`           | ERROR            |
| `test.create.expired.structure@zlv.fr` | `create_05_signup_link`           | ERROR            |
| `test.create.cgu.empty@zlv.fr`         | `create_06_signup_link`           | ERROR            |
| `test.create.expired.user@zlv.fr`      | `create_07_signup_link`           | ERROR            |

---

## Comment tester manuellement

### Tests de CONNEXION

1. **Démarrer l'environnement de développement**
   ```bash
   yarn dev
   ```

2. **Se connecter avec un utilisateur de test**
   - Email : `test.suspended.access@zlv.fr` (ou autre email de la liste ci-dessus)
   - Mot de passe : (défini par `TEST_PASSWORD`)

3. **Vérifier le résultat attendu** :
   - OK : Accès normal au tableau de bord
   - SUSPENDED : Modal de suspension affiché avec le message approprié
   - FORBIDDEN : Erreur 403, impossible de se connecter

### Tests de CRÉATION DE COMPTE

1. **Accéder au lien de création de compte**
   ```
   http://localhost:3000/inscription/{signup_link_id}
   ```

2. **Remplir le formulaire** avec l'email du prospect correspondant

3. **Vérifier le résultat attendu** :
   - OK : Compte créé avec succès
   - ERROR : Message d'erreur affiché, compte non créé

---

## Vérification du périmètre géographique

Le périmètre est vérifié ainsi :

1. Si `fr_entiere = true` → Accès à toute la France ✅
2. Sinon, on vérifie si les geo_codes de l'établissement ZLV sont couverts par :
   - `comm[]` : correspondance directe avec le code commune INSEE (5 chiffres)
   - `dep[]` : les 2-3 premiers chiffres du geo_code correspondent au département
   - `reg[]` : le département est dans la région (via mapping)
   - `epci[]` : l'EPCI contient la commune (nécessite une table de mapping)
