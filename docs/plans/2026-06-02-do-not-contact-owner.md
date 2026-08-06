# Plan — « Ne pas contacter » un propriétaire

**Date:** 2026-06-02
**Branche:** `claude/jovial-proskuriakova-134d43`
**Figma:** https://www.figma.com/design/kfEYtoHqhonLyCDTcDm5wu/?node-id=16365-2270

## Objectif

Permettre d'indiquer qu'un propriétaire ne souhaite pas (ou plus) être contacté, depuis
la modale d'édition d'un propriétaire dans un logement. Le propriétaire :

- est affiché parmi les **destinataires secondaires** (jamais principal) avec un badge rouge **« Ne pas contacter »** ;
- est **exclu des campagnes** (les campagnes ne ciblent que le destinataire principal, rang 1) ;
- déclenche un **message informatif** lors de la création d'une campagne depuis un groupe.

## Décisions validées avec le PO (Lucas)

1. **Modèle de données** : nouveau rang dédié `DO_NOT_CONTACT_OWNER_RANK = -4`.
   3ᵉ catégorie distincte (ni « active » rang ≥ 1, ni « archivée » {0,-1,-2,-3}),
   affichée parmi les secondaires, exclue des campagnes (rang ≠ 1).
2. **Alerte campagne** : purement informative, non bloquante.
3. **Cas principal → NPC** : promouvoir automatiquement le propriétaire actif suivant
   au rang principal (géré par `computeOwnersAfterRankTransition`).

## État des lieux (code existant)

- Rang = entier unique sur `owners_housing` : `1` principal, `2–6` secondaires,
  `0` ancien, `-1` incorrect, `-2` en attente, `-3` décédé.
  Constantes + gardes : `packages/models/src/HousingOwnerDTO.ts`.
- Colonne DB `rank` = `INTEGER` sans contrainte (migration `023-owners.ts`) → `-4` persiste sans migration.
- Route `PUT /housing/:housingId/owners` : `// TODO: validate inputs` → aucune validation de rang à modifier.
- Destinataire campagne : jointure `.andOnVal('rank', 1)` dans `housingRepository.ts:481` → `-4` exclu d'office.
- Modale d'édition = `HousingOwnerEditionAside.tsx` (2 radios aujourd'hui).
- Badge de rang = `RankBadge.tsx` (rendu dans la colonne « Rang de contact », les cartes logement, etc.).
- Fiche propriétaire = `OwnerView.tsx` ; chaque carte logement rend déjà un `RankBadge` via `OwnerHousingCard`.

## Implémentation (TDD — tests d'abord à chaque étape)

### 1. `packages/models` — `HousingOwnerDTO.ts`

- `export const DO_NOT_CONTACT_OWNER_RANK = -4 as const;`
- `type DoNotContactOwnerRank = typeof DO_NOT_CONTACT_OWNER_RANK;`
- Étendre `OwnerRank = InactiveOwnerRank | ActiveOwnerRank | DoNotContactOwnerRank`.
- `isDoNotContactOwnerRank(rank): rank is DoNotContactOwnerRank` (`=== -4`).
- **Inchangé** : `isActiveOwnerRank` (`>= 1`), `isInactiveOwnerRank` ({0,-1,-2,-3}),
  `isSecondaryOwner` (`>= 2`), `isPrimaryOwner` (`=== 1`) — `-4` n'entre dans aucun.
- Vérifier les usages de `OWNER_RANKS` ; ajouter `-4` seulement si nécessaire (pas dans le pool aléatoire des fixtures pour ne pas casser les tests existants).
- Tests : `isDoNotContactOwnerRank` + propriété « -4 n'est ni actif ni inactif ni secondaire ».

### 2. Frontend — `models/HousingOwnerRank.ts` (cœur logique)

- `OwnerRankLabel` += `'doNotContact'`.
- `rankToLabel(-4) → 'doNotContact'` ; `labelToRank('doNotContact') → -4`.
- **`computeOwnersAfterRankTransition`** : ajouter un bucket `doNotContactOwners` (rang -4) ;
  l'**append dans toutes les branches existantes** (vide dans les tests actuels → comportement inchangé) ;
  ajouter les nouvelles branches :
  - `primary → doNotContact` : ré-ordonner les actifs restants en 1..n (le suivant devient principal), sélection à -4.
  - `secondary → doNotContact` : ré-ordonner les actifs restants en 1..n, sélection à -4.
  - `doNotContact → primary` : sélection à 1, actifs décalés.
  - `doNotContact → secondary` : sélection au dernier rang actif.
  - `doNotContact → {previous|incorrect|awaiting|deceased}` et l'inverse.
- Tests `HousingOwnerRank.test.ts` : une assertion par transition + « préserve les NPC lors d'une transition non liée ».

### 3. Frontend — UI modale `HousingOwnerEditionAside.tsx`

- Schéma `rank: yup.string().oneOf(['primary','secondary','doNotContact'])`.
- `isActive` initial : `housingOwner != null && !isInactiveOwnerRank(housingOwner.rank)` (donc `true` pour -4).
- Mapping initial du rang : ajouter `.with(-4, () => 'doNotContact')`.
- 3ᵉ radio **« À ne pas contacter »** → `field.onChange('doNotContact')`.
- Tests composant : la 3ᵉ option s'affiche ; la sélectionner ⇒ `onSave` reçoit `rank: 'doNotContact'`.

### 4. Frontend — badges & regroupements

- `RankBadge.tsx` : `.when(isDoNotContactOwnerRank, () => 'Ne pas contacter')`, famille de couleur rouge
  (via `fr.colors.*` / `ColorFamily`, jamais de hex), icône d'avertissement conforme à la maquette.
- `useHousingOwners.tsx` : exposer `doNotContactOwners` et les inclure dans `activeOwners`
  (après les secondaires) pour qu'ils apparaissent dans la table « Propriétaires ».
- `SecondaryOwnerList.tsx` : filtre `isSecondaryOwner(o) || isDoNotContactOwnerRank(o.rank)`
  (apparition dans « Destinataires secondaires » de la fiche logement).
- `OwnerStatusTag.tsx` : inchangé (-4 ⇒ `null`, donc pas dans « Propriétaires archivés »).
- Vérifier que la carte destinataire secondaire (OwnerList/OwnerCard) rend bien le badge.

### 5. Frontend — fiche propriétaire `OwnerView.tsx`

- Badge par logement : **déjà gratuit** via `RankBadge` dans `OwnerHousingCard`.
- Badge au niveau du nom : afficher « Ne pas contacter » lorsque le propriétaire est NPC
  sur **tous** ses logements ZLV (cas « un seul logement » de la maquette).
  → **à confirmer** avec Lucas (tous vs au moins un) en revue.

### 6. Frontend — alerte création de campagne `CreateCampaignFromGroupModal.tsx`

- Ajouter un `<Alert severity="warning" small>` informatif (non bloquant).
- Décompte : si l'agrégat `group.ownerCount` se calcule à un seul endroit côté serveur,
  ajouter un `doNotContactCount` (petit ajout) ; **sinon** message statique
  « Les propriétaires marqués « À ne pas contacter » ne seront pas inclus comme destinataires de cette campagne. »
  → décision finale en implémentation selon le coût.
- Test : l'alerte est présente dans la modale.

### 7. Backend

- **Aucune migration** si la colonne `rank` n'a pas de contrainte CHECK (à vérifier par grep) ; sinon ajouter une migration.
- `updateHousingOwners` : aucun changement (persiste le rang du payload). Vérifier que les events
  `housing:owner-updated` acceptent -4 (type `OwnerRank`).
- Jointure destinataire campagne : aucun changement (rang 1 only).
- Fixtures `genHousingOwnerApi` : -4 valide via le type ; ne pas l'ajouter au pool aléatoire.
- Test API : `PUT /housing/:id/owners` accepte et persiste rang -4 ; un NPC n'est jamais destinataire de campagne.

## Hors périmètre (à confirmer)

- Exports de publipostage : les destinataires = principal uniquement, donc les NPC ne sont jamais
  envoyés ; pas de changement attendu (à vérifier sur le stream « owners » de l'export).

## Ordre d'exécution

models → HousingOwnerRank (logique) → modale → badges/regroupements → fiche propriétaire →
alerte campagne → backend (vérif + test API). Tests d'abord à chaque étape.
