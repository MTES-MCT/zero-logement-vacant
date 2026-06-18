# Zéro Logement Vacant - Mistral Workflow Guide

> **Note:** Ce fichier définit les règles **spécifiques** pour travailler avec Mistral sur le projet Zéro Logement Vacant.
> Pour les conventions techniques générales, voir [AGENTS.md](AGENTS.md) ou [CLAUDE.md](CLAUDE.md) (symlink vers AGENTS.md).

---

## 👥 Contexte d'Équipe
- **Projet** : [Zéro Logement Vacant](https://zerologementvacant.beta.gouv.fr) (service public numérique).
- **Stack** : Yarn v4 monorepo (Nx) avec React (frontend), Express (backend), PostgreSQL.
- **Objectif** : Développer des fonctionnalités **front-end** à partir de maquettes Figma, avec rigueur et respect des conventions.

---

## 🚫 Interdits Absolus (pour Mistral)
1. **❌ Aucun commit** sans accord **explicite** de l'équipe (ex: *"commit", "fais un commit"*).
2. **❌ Aucune PR** sans consentement **clair** (ex: *"créer une PR", "ouvre une PR"*).
3. **❌ Jamais merger une PR** (même si demandé).
4. **❌ Pas de push** sur `main`, `protected`, ou toute branche par défaut.
5. **❌ Pas de modifications** de code non demandées (sauf bugs critiques bloquants).

---

## 🟢 Workflow Obligatoire
### 1️⃣ **L'équipe fournit**
- Maquettes Figma (liens ou exports).
- Fonctionnements attendus (comportements, interactions, edge cases).
- Contexte métier (si nécessaire).

### 2️⃣ **Mistral développe en local**
- **Frontend uniquement** (React + TypeScript).
- **TDD obligatoire** :
  - Tests **avant** l’implémentation (Vitest + `@fast-check/vitest`).
  - 1 test → 1 implémentation → validation → repeat.
- **Respect strict** des conventions (voir [Conventions Clés](#-conventions-clés)).
- **Pas de commit/PR** sans validation de l'équipe.

### 3️⃣ **L'équipe teste en localhost**
- Mistral fournira les commandes pour lancer le front :
  ```bash
  yarn workspace @zerologementvacant/front dev  # localhost:3000
  ```
- Validation **visuelle** (vs Figma) et **fonctionnelle**.

### 4️⃣ **Si OK**
- L'équipe dit **"commit"** → Mistral fait un commit **en anglais** (ex: `feat(housing): add vacancy filter`).
- L'équipe dit **"créer une PR"** → Mistral crée une **draft PR** (jamais ready-for-review sans accord).
- Mistral donne le **lien de la PR** pour review.

---
---

## 📚 Ressources Obligatoires
- **Design Système de l’État (DSFR)** :
  - [Documentation officielle](https://www.systeme-de-design.gouv.fr/version-courante/fr)
  - [Storybook DSFR](https://www.systeme-de-design.gouv.fr/v1.14/storybook/index.html?path=/) 
  - [Vue DS (pour référence)](https://docs.vue-ds.fr/guide/pour-commencer)
- **Outils** :
  - Figma (maquettes à fournir).
  - [React DSFR (`@codegouvfr/react-dsfr`)](https://github.com/GouvernementFR/dsfr-react).

---
---

## 🎨 Conventions Clés (Résumé)

### 📂 Structure Frontend
| Type               | Emplacement                          | Exemple                     |
|--------------------|--------------------------------------|-----------------------------|
| Composants partagés | `frontend/src/components/ui/`        | `Button`, `Card`             |
| Composants métiers  | `frontend/src/components/<Feature>/` | `HousingCard`, `CampaignList`|
| Vues (pages)        | `frontend/src/views/<Feature>/`      | `HousingListView`           |
| Tests unitaires     | `components/<X>/test/<X>.test.tsx`    | `HousingCard.test.tsx`      |
| Tests d’intégration | `views/<X>/test/<X>View.test.tsx`    | `HousingListView.test.tsx`  |

### ⚛️ Développement
- **Composants** :
  - **DSFR en priorité** (`@codegouvfr/react-dsfr`).
  - **MUI** pour les layouts (`Box`, `Stack`, `Grid`).
  - **Emotion** (`styled()`) pour les styles custom (jamais de SCSS).
- **Couleurs** :
  - **Tokens DSFR** : `fr.colors.blueFranceMain525` (depuis `@codegouvfr/react-dsfr`).
  - **Variables CSS** : `--blue-france-main-525` (depuis `frontend/src/colors.scss`).
  - ❌ **Jamais** de hex codes (`#6a6af4` → `--blue-france-main-525`).
- **Espacements** :
  - Toujours en `rem` (ex: `margin: "1rem"`).
  - ❌ **Jamais** `px` ou `spacing={2}` (MUI).
- **Typographie** :
  - Utiliser les composants DSFR (`<Text>`, `<Title>`) avec leurs props.

### 📦 Imports
- **Alias** : `~` pour `frontend/src/` (ex: `import Button from '~/components/ui/Button'`).
- **MUI** : Imports **directs** (ex: `import Box from '@mui/material/Box'`).
- **Workspace** : `@zerologementvacant/models`, `@zerologementvacant/schemas`, etc.

### 🧪 Tests (TDD)
- **Framework** : **Vitest** (pas Jest).
- **Mocks API** :
  - **MSW** (handlers dans `src/mocks/handlers/`).
  - **Jamais** de `vi.mock` pour les composants (utiliser `mockAPI.use()`).
- **Interactions** : `userEvent.setup()` (pas `fireEvent`).
- **Fixtures** : Toujours étendre `gen*DTO()` depuis `@zerologementvacant/models`.
- **Property-based tests** : `@fast-check/vitest` pour les schémas de validation.

### 🔤 Langue
- **Code/Commits/PR** : **Anglais** (ex: `feat(housing): add filter`).
- **Textes UI** : **Français** avec apostrophe `’` (U+2019), jamais `'` (U+0027).

### 🧩 Formulaires
- **Hook** : `react-hook-form` + `yup` (resolver).
- **Validation** : Schémas partagés dans `@zerologementvacant/schemas`.
- ❌ **Jamais** le legacy `useForm` (dans `hooks/useForm.tsx`).

### 🪟 Modales (DSFR)
- **Ouverture** : Impérative via `createModal` ou `createConfirmationModal`.
- **Formulaires** : Toujours avec `react-hook-form`.

---
---

## 🛠 Commandes Utiles
| Action               | Commande                                  |
|----------------------|-------------------------------------------|
| Lancer le front      | `yarn workspace @zerologementvacant/front dev` |
| Lancer le back       | `yarn workspace @zerologementvacant/server dev` |
| Tests front          | `yarn nx test frontend`                   |
| Tests back           | `yarn nx test server`                     |
| Build front          | `yarn nx build frontend`                  |
| Typecheck            | `yarn nx run-many -t typecheck`            |

---
---

## 📌 Notes Supplémentaires
- **Figma → Code** :
  - Mistral traduira les maquettes en **DSFR + MUI + Emotion** (pas de Tailwind).
  - Validation **visuelle** avec l'équipe avant de finaliser.
- **Questions** :
  - Mistral posera des questions **courtes et précises** si un point n’est pas clair (ex: *"Le bouton doit-il être `primary` ou `secondary` ?"*).
- **Priorités** :
  1. Respect des maquettes Figma.
  2. Respect des conventions DSFR.
  3. Fonctionnalité > Perfection du code (on refactorise après si besoin).

---
---

## 🔗 Liens Internes
- [AGENTS.md](AGENTS.md) (conventions générales du monorepo).
- [.claude/rules/frontend-conventions.md](.claude/rules/frontend-conventions.md) (règles frontend détaillées).
- [.claude/rules/figma-design-system.md](.claude/rules/figma-design-system.md) (traduction Figma → code).
