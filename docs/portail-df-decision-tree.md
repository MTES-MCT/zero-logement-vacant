# Arbre de décision - Vérification des droits Portail DF

## 1. Création de compte

Copier le code ci-dessous dans [Mermaid Live Editor](https://mermaid.live) pour générer le graphique.

```mermaid
flowchart TD
    C1[/"Utilisateur soumet<br/>email + password + establishmentId"/]
    C2{Email est un<br/>compte de test ?}
    C3[/"❌ TestAccountError<br/>(403)"/]
    C4{"PROSPECT<br/>existe en base ZLV ?"}
    C5[/"❌ ProspectMissingError<br/>(404)"/]
    C6{"PROSPECT<br/>valide ?<br/>hasAccount=true<br/>ET hasCommitment=true"}
    C7[/"❌ ProspectInvalidError<br/>(403)"/]
    C8{"ÉTABLISSEMENT ZLV<br/>existe en base ?"}
    C9[/"❌ EstablishmentMissingError<br/>(404)"/]
    C10["Appel API Portail DF<br/>ceremaService.consultUsers(email)<br/>→ Liste de STRUCTURES"]
    C11{"∃ STRUCTURE<br/>avec SIREN = SIREN<br/>établissement ZLV ?"}
    C12[/"❌ ProspectInvalidError<br/>(403)<br/>'Structure inconnue'"/]
    C13{"STRUCTURE.acces_lovac<br/>> date du jour ?<br/>(commitment valide)"}
    C14[/"❌ ProspectInvalidError<br/>(403)<br/>'Pas de commitment LOVAC'"/]
    C15["verifyAccessRights()<br/>sur le GROUPE de la STRUCTURE"]
    C16{"GROUPE.lovac = true<br/>OU GROUPE.niveau_acces = 'lovac' ?"}
    C17[/"❌ ProspectInvalidError<br/>(403)<br/>'niveau_acces_invalide'"/]
    C18{"PÉRIMÈTRE du GROUPE<br/>couvre AU MOINS 1 commune<br/>de l'ÉTABLISSEMENT ZLV ?<br/>(voir règle de couverture)"}
    C19[/"❌ ProspectInvalidError<br/>(403)<br/>'perimetre_invalide'"/]
    C20["✅ Compte USER créé<br/>inséré en base ZLV"]

    C1 --> C2
    C2 -->|Oui| C3
    C2 -->|Non| C4
    C4 -->|Non| C5
    C4 -->|Oui| C6
    C6 -->|Non| C7
    C6 -->|Oui| C8
    C8 -->|Non| C9
    C8 -->|Oui| C10
    C10 --> C11
    C11 -->|Non| C12
    C11 -->|Oui| C13
    C13 -->|Non| C14
    C13 -->|Oui| C15
    C15 --> C16
    C16 -->|Non| C17
    C16 -->|Oui| C18
    C18 -->|Non| C19
    C18 -->|Oui| C20

    style C3 fill:#ffcccc,stroke:#cc0000
    style C5 fill:#ffcccc,stroke:#cc0000
    style C7 fill:#ffcccc,stroke:#cc0000
    style C9 fill:#ffcccc,stroke:#cc0000
    style C12 fill:#ffcccc,stroke:#cc0000
    style C14 fill:#ffcccc,stroke:#cc0000
    style C17 fill:#ffcccc,stroke:#cc0000
    style C19 fill:#ffcccc,stroke:#cc0000
    style C20 fill:#ccffcc,stroke:#00cc00
```

---

## 2. Connexion (mono-établissement)

```mermaid
flowchart TD
    L1[/"Utilisateur soumet<br/>email + password"/]
    L2{"USER<br/>existe en base ZLV ?"}
    L3[/"❌ UserMissingError<br/>(404)"/]
    L4{"USER.deletedAt<br/>!= null ?"}
    L5[/"❌ UserDeletedError<br/>(410)"/]
    L6{Mot de passe<br/>valide ?}
    L7[/"❌ AuthenticationFailedError<br/>(401)"/]
    L8{"USER.role<br/>= ADMIN ?"}
    L9["Flux 2FA Admin<br/>(si config.auth.admin2faEnabled)"]
    L10["signInToEstablishment()<br/>avec USER.establishmentId"]
    L11{"ÉTABLISSEMENT ZLV<br/>existe en base ?"}
    L12[/"❌ EstablishmentMissingError<br/>(404)"/]
    L13["verifyAndUpdatePortailDFRights()"]
    L14{"USER.role<br/>= ADMIN ?"}
    L15["Skip vérification<br/>Portail DF"]
    L16["Appel API Portail DF<br/>ceremaService.consultUsers(email)<br/>→ Liste de STRUCTURES"]
    L17{"∃ STRUCTURE<br/>avec SIREN = SIREN<br/>établissement ZLV ?"}
    L18[/"❌ ForbiddenError<br/>(403)<br/>'Aucune structure correspondant<br/>au SIREN xxx'"/]
    L19["storeUserPerimeter()<br/>Sauvegarde dans table<br/>user_perimeters"]
    L20{"STRUCTURE.acces_lovac<br/>> date du jour ?"}
    L21["⚠️ USER.suspendedAt = now<br/>USER.suspendedCause =<br/>'droits structure expires'<br/>Connexion OK + bandeau"]
    L22["verifyAccessRights()<br/>sur le GROUPE"]
    L23{"GROUPE.lovac = true<br/>OU niveau_acces = 'lovac' ?"}
    L24["⚠️ USER.suspendedAt = now<br/>USER.suspendedCause =<br/>'niveau_acces_invalide'<br/>Connexion OK + bandeau"]
    L25{"PÉRIMÈTRE couvre<br/>AU MOINS 1 commune<br/>établissement ?"}
    L26["⚠️ USER.suspendedAt = now<br/>USER.suspendedCause =<br/>'perimetre_invalide'<br/>Connexion OK + bandeau"]
    L27{"USER était suspendu<br/>pour cause Portail DF ?"}
    L28["Lever suspension<br/>USER.suspendedAt = null<br/>USER.suspendedCause = null"]
    L29["✅ Connexion réussie<br/>Token JWT généré"]

    L1 --> L2
    L2 -->|Non| L3
    L2 -->|Oui| L4
    L4 -->|Oui| L5
    L4 -->|Non| L6
    L6 -->|Non| L7
    L6 -->|Oui| L8
    L8 -->|Oui| L9
    L8 -->|Non| L10
    L9 --> L10
    L10 --> L11
    L11 -->|Non| L12
    L11 -->|Oui| L13
    L13 --> L14
    L14 -->|Oui| L15
    L15 --> L29
    L14 -->|Non| L16
    L16 --> L17
    L17 -->|Non| L18
    L17 -->|Oui| L19
    L19 --> L20
    L20 -->|Non| L21
    L21 --> L29
    L20 -->|Oui| L22
    L22 --> L23
    L23 -->|Non| L24
    L24 --> L29
    L23 -->|Oui| L25
    L25 -->|Non| L26
    L26 --> L29
    L25 -->|Oui| L27
    L27 -->|Oui| L28
    L28 --> L29
    L27 -->|Non| L29

    style L3 fill:#ffcccc,stroke:#cc0000
    style L5 fill:#ffcccc,stroke:#cc0000
    style L7 fill:#ffcccc,stroke:#cc0000
    style L12 fill:#ffcccc,stroke:#cc0000
    style L18 fill:#ffcccc,stroke:#cc0000
    style L21 fill:#fff3cd,stroke:#ffc107
    style L24 fill:#fff3cd,stroke:#ffc107
    style L26 fill:#fff3cd,stroke:#ffc107
    style L29 fill:#ccffcc,stroke:#00cc00
```

---

## 3. Changement d'établissement (multi-établissement)

```mermaid
flowchart TD
    M1["USER connecté<br/>avec établissement A"]
    M2["Clic sur liste déroulante<br/>des établissements"]
    M3["API: GET /establishments<br/>→ Liste établissements<br/>où USER est membre"]
    M4["Sélection établissement B"]
    M5["API: POST /account/change-establishment<br/>changeEstablishment()"]
    M6["verifyAndUpdatePortailDFRights()<br/>pour établissement B"]
    M7{"∃ STRUCTURE Portail DF<br/>avec SIREN = SIREN<br/>établissement B ?"}
    M8[/"❌ ForbiddenError<br/>(403)<br/>'Structure inconnue'"/]
    M9["Vérifications Portail DF<br/>(commitment, LOVAC, périmètre)<br/>→ voir diagramme Connexion"]
    M10["✅ Nouveau Token JWT<br/>avec establishmentId = B"]

    M1 --> M2
    M2 --> M3
    M3 --> M4
    M4 --> M5
    M5 --> M6
    M6 --> M7
    M7 -->|Non| M8
    M7 -->|Oui| M9
    M9 --> M10

    style M8 fill:#ffcccc,stroke:#cc0000
    style M10 fill:#ccffcc,stroke:#00cc00
```

---

## Glossaire des entités

| Entité | Source | Description |
|--------|--------|-------------|
| **USER** | Base ZLV | Utilisateur de l'application ZLV |
| **PROSPECT** | Base ZLV | Demande de création de compte en attente |
| **ÉTABLISSEMENT ZLV** | Base ZLV | Collectivité/EPCI avec ses geoCodes (codes INSEE communes) |
| **STRUCTURE Portail DF** | API Portail DF | Organisation sur Portail DF, identifiée par SIREN, possède `acces_lovac` (date) |
| **GROUPE Portail DF** | API Portail DF | Sous-ensemble d'une structure avec `lovac` (bool), `niveau_acces`, et un périmètre |
| **PÉRIMÈTRE** | API Portail DF | Zone géographique : `comm[]`, `dep[]`, `reg[]`, `fr_entiere` (bool) |

---

## Correspondance ZLV ↔ Portail DF

```
ÉTABLISSEMENT ZLV
├── id: UUID
├── siren: "123456789"  ←──────────────┐
└── geoCodes: ["67482", "67043", ...]  │  Correspondance par SIREN
                                       │
STRUCTURE Portail DF  ─────────────────┘
├── siren: "123456789"
├── acces_lovac: "2025-12-31" (date expiration commitment)
└── GROUPE(S) Portail DF
    ├── lovac: true/false
    ├── niveau_acces: "lovac" | "dvf" | ...
    └── PÉRIMÈTRE
        ├── comm: ["67482", "67218", ...]  (communes)
        ├── dep: ["67", "68", ...]          (départements)
        ├── reg: ["44", ...]                (régions)
        └── fr_entiere: false               (France entière)
```

---

## Règle de couverture du périmètre

Une commune de l'établissement est **couverte** par le périmètre si **AU MOINS UNE** des conditions suivantes est vraie :

```
isCommuneInPerimeter(communeCode, perimeter) = true si :
│
├─ perimeter.fr_entiere = true
│  → Accès France entière, toutes communes couvertes
│
├─ communeCode ∈ perimeter.comm
│  → Commune directement listée (ex: "67482")
│
├─ getDepartment(communeCode) ∈ perimeter.dep
│  → Département de la commune listé (ex: "67" pour "67482")
│
└─ getRegion(getDepartment(communeCode)) ∈ perimeter.reg
   → Région du département listée (ex: "44" Grand Est)
```

**Validation du périmètre** : Le périmètre est valide si **AU MOINS UNE** commune de l'établissement est couverte :

```javascript
// server/src/services/ceremaService/perimeterService.ts:181-183
const hasValidPerimeter = establishmentGeoCodes.some((geoCode) =>
  isCommuneInPerimeter(geoCode, ceremaUser.perimeter!)
);
```

> ⚠️ **Important** : Il suffit d'**une seule** commune couverte pour valider le périmètre, pas toutes !

---

## Légende des couleurs

| Couleur | Signification |
|---------|---------------|
| 🟢 Vert | Succès (compte créé / connexion réussie) |
| 🔴 Rouge | Erreur bloquante (création/connexion refusée) |
| 🟡 Jaune | Avertissement (connexion autorisée avec bandeau) |

---

## Causes de suspension Portail DF

| Cause | Entité | Champ vérifié | Condition d'erreur |
|-------|--------|---------------|-------------------|
| `droits structure expires` | STRUCTURE | `acces_lovac` | Date expirée (< aujourd'hui) |
| `niveau_acces_invalide` | GROUPE | `lovac` ET `niveau_acces` | `lovac=false` ET `niveau_acces≠'lovac'` |
| `perimetre_invalide` | GROUPE.PÉRIMÈTRE | `comm`, `dep`, `reg`, `fr_entiere` | Aucune commune établissement couverte |
| `droits utilisateur expires` | USER Portail DF | Date expiration user | Date expirée |
| `cgu vides` | USER Portail DF | CGU validées | CGU non validées |

---

## Différences Création vs Connexion

| Vérification | Entité.Champ | Création | Connexion |
|--------------|--------------|----------|-----------|
| SIREN non trouvé | STRUCTURE.siren | ❌ Bloqué (403) | ❌ Bloqué (403) |
| Commitment expiré | STRUCTURE.acces_lovac | ❌ Bloqué (403) | ⚠️ Suspendu + bandeau |
| Niveau accès invalide | GROUPE.lovac/niveau_acces | ❌ Bloqué (403) | ⚠️ Suspendu + bandeau |
| Périmètre invalide | GROUPE.PÉRIMÈTRE | ❌ Bloqué (403) | ⚠️ Suspendu + bandeau |

---

## Cas multi-établissement

Un utilisateur peut être membre de **plusieurs établissements ZLV**. Chaque établissement peut correspondre à une **STRUCTURE Portail DF différente** (SIREN différent).

```
USER ZLV
├── Membre de Établissement A (SIREN: 111111111)
│   └── Vérifié contre STRUCTURE Portail DF (SIREN: 111111111)
│
└── Membre de Établissement B (SIREN: 222222222)
    └── Vérifié contre STRUCTURE Portail DF (SIREN: 222222222)
```

**Lors du changement d'établissement** :
1. L'utilisateur clique sur la liste déroulante
2. Sélectionne un autre établissement
3. `changeEstablishment()` appelle `verifyAndUpdatePortailDFRights()` pour le **nouvel établissement**
4. La vérification cherche une STRUCTURE avec le **SIREN du nouvel établissement**
5. Si trouvée : vérification des droits (commitment, LOVAC, périmètre)
6. Si non trouvée : **Connexion refusée** (403)

---

## 4. Filtrage des données par périmètre utilisateur

Le filtrage des données se fait en deux niveaux :
1. **Niveau établissement** : geoCodes de l'établissement ZLV
2. **Niveau utilisateur** : périmètre Portail DF de l'utilisateur (intersection avec les geoCodes établissement)

```mermaid
flowchart TD
    subgraph AUTH["Authentification (middleware auth.ts)"]
        U1["USER connecté<br/>(token JWT)"]
        U2["Charger USER, ESTABLISHMENT,<br/>USER_PERIMETER"]
    end

    subgraph COMPUTE["Calcul effectiveGeoCodes"]
        C1{"USER_PERIMETER<br/>existe ?"}
        C2{"fr_entiere<br/>= true ?"}
        C3["effectiveGeoCodes =<br/>establishment.geoCodes"]
        C4["effectiveGeoCodes =<br/>intersection(<br/>establishment.geoCodes,<br/>user_perimeter)"]
    end

    subgraph FILTERS["Filtres appliqués aux requêtes"]
        F1["🏠 HOUSING<br/>(Parc logement)"]
        F2["🗺️ LOCALITIES<br/>(Carte/communes)"]
        F3["📋 CAMPAIGNS<br/>(Campagnes)"]
        F4["📤 EXPORT<br/>(Export Excel)"]
    end

    subgraph RULES["Règles de filtrage"]
        R1["WHERE geo_code<br/>IN (effectiveGeoCodes)"]
        R2["WHERE geo_code<br/>IN (effectiveGeoCodes)"]
        R3["WHERE establishment_id<br/>= establishmentId"]
        R4["localities =<br/>effectiveGeoCodes"]
    end

    U1 --> U2
    U2 --> C1
    C1 -->|Non| C3
    C1 -->|Oui| C2
    C2 -->|Oui| C3
    C2 -->|Non| C4

    C3 --> F1
    C4 --> F1
    F1 --> R1

    C3 --> F2
    C4 --> F2
    F2 --> R2

    C3 --> F4
    C4 --> F4
    F4 --> R4

    F3 --> R3

    style U1 fill:#e3f2fd,stroke:#1976d2
    style C3 fill:#e8f5e9,stroke:#388e3c
    style C4 fill:#fff3e0,stroke:#f57c00
    style R1 fill:#fff3e0,stroke:#f57c00
    style R2 fill:#fff3e0,stroke:#f57c00
    style R4 fill:#fff3e0,stroke:#f57c00
```

### Calcul des effectiveGeoCodes

À chaque requête authentifiée, le middleware `auth.ts` calcule les `effectiveGeoCodes` :

```typescript
// server/src/middlewares/auth.ts
request.effectiveGeoCodes = filterGeoCodesByPerimeter(
  establishment.geoCodes,
  userPerimeter
);
```

La fonction `filterGeoCodesByPerimeter()` :
- Si **pas de périmètre** : retourne tous les geoCodes de l'établissement
- Si **fr_entiere = true** : retourne tous les geoCodes de l'établissement
- Sinon : retourne l'**intersection** des geoCodes établissement avec le périmètre utilisateur

### Détail des filtres par entité

| Entité | Table | Filtre appliqué | Exemple SQL |
|--------|-------|-----------------|-------------|
| **HOUSING** | `housing` | `geo_code IN effectiveGeoCodes` | `WHERE geo_code IN ('67482', '67043')` |
| **LOCALITIES** | `localities` | `geo_code IN effectiveGeoCodes` | `WHERE geo_code IN ('67482', '67043')` |
| **CAMPAIGNS** | `campaigns` | `establishment_id = X` | `WHERE establishment_id = 'uuid'` |
| **GROUPS** | `groups` | `establishment_id = X` | `WHERE establishment_id = 'uuid'` |
| **OWNERS** | `owners` | Via jointure HOUSING | `JOIN housing ON ... WHERE geo_code IN (...)` |
| **EVENTS** | `events` | Via HOUSING ou CAMPAIGN | Filtré via entité parente |
| **EXPORT** | - | `localities = effectiveGeoCodes` | Filtre dans le stream |

### Exceptions : Admins et Visitors

Les utilisateurs avec le rôle **ADMIN** ou **VISITOR** ne sont **pas filtrés** par le périmètre utilisateur. Ils voient toutes les données de l'établissement (ou tous établissements pour ADMIN).

```typescript
// Dans housingController.ts, localityController.ts, etc.
const isAdminOrVisitor = [UserRole.ADMIN, UserRole.VISITOR].includes(role);
const filters = {
  localities: isAdminOrVisitor
    ? rawFilters.localities  // Pas de filtrage périmètre
    : effectiveGeoCodes      // Filtrage par périmètre
};
```

### Chaîne de filtrage complète

```
USER (token JWT)
    │
    ▼
MIDDLEWARE auth.ts
    │
    ├── Charge USER_PERIMETER depuis user_perimeters
    │
    ├── Calcule effectiveGeoCodes
    │   = intersection(establishment.geoCodes, user_perimeter)
    │
    ▼
effectiveGeoCodes[] ────────────────┐
    │                               │
    │   ┌───────────────────────────┼───────────────────────┐
    │   ▼                           ▼                       ▼
    │ ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
    │ │   HOUSING   │         │  LOCALITIES │         │   EXPORT    │
    │ │ geo_code IN │         │ geo_code IN │         │ localities  │
    │ │ effective   │         │ effective   │         │ = effective │
    │ └─────────────┘         └─────────────┘         └─────────────┘
    │
    └── establishmentId ────────────┐
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌───────────┐   ┌───────────┐   ┌───────────┐
             │ CAMPAIGNS │   │  GROUPS   │   │  DRAFTS   │
             │ estab_id  │   │ estab_id  │   │ estab_id  │
             └───────────┘   └───────────┘   └───────────┘
```

### Stockage du périmètre utilisateur

À la connexion, le périmètre Portail DF de l'utilisateur est stocké dans la table `user_perimeters` :

```
TABLE user_perimeters
├── user_id: UUID (FK → users.id)
├── geo_codes: text[]    (codes INSEE communes)
├── departments: text[]  (codes départements)
├── regions: text[]      (codes régions)
├── fr_entiere: boolean
├── updated_at: timestamp
└── INDEX GIN sur geo_codes, departments, regions
```

### Fichiers implémentant le filtrage

| Fichier | Rôle |
|---------|------|
| `server/src/middlewares/auth.ts` | Calcul de `effectiveGeoCodes` |
| `server/src/models/UserPerimeterApi.ts` | Fonction `filterGeoCodesByPerimeter()` |
| `server/src/controllers/housingController.ts` | Filtrage HOUSING par périmètre |
| `server/src/controllers/localityController.ts` | Filtrage LOCALITIES (carte) par périmètre |
| `server/src/controllers/housingExportController.ts` | Filtrage EXPORT par périmètre |
| `server/src/repositories/localityRepository.ts` | Support filtre `geoCodes` |

---

## Fichiers sources

| Fichier | Rôle |
|---------|------|
| `server/src/controllers/userController.ts` | Création de compte |
| `server/src/controllers/accountController.ts` | Connexion, changement établissement |
| `server/src/services/ceremaService/perimeterService.ts` | Vérification droits, règle de couverture |
| `server/src/services/ceremaService/ceremaService.ts` | Appel API Portail DF |
| `frontend/src/components/modals/SuspendedUserModal/SuspendedUserModal.tsx` | Bandeau de suspension |

---

## Export PDF

Pour chaque diagramme :
1. Copier le code Mermaid
2. Aller sur [https://mermaid.live](https://mermaid.live)
3. Coller le code dans l'éditeur
4. Cliquer sur "Actions" → "Export as PNG" ou "Export as SVG"
5. Convertir en PDF si nécessaire
