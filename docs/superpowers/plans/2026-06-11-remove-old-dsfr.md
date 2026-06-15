# Remove `frontend/src/components/_dsfr/` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete `frontend/src/components/_dsfr/`. Migrate the 15 live consumers to MUI + DSFR-direct patterns per `.claude/rules/frontend-conventions.md`; confirm the rest of `_dsfr/` is dead code, then remove the folder.

**Architecture:** One PR, six ordered commits. Each commit covers one legacy export (or the dead-code sweep / the final folder delete). All consumers are TSX files; the swap is mostly mechanical (imports + JSX). MUI `Container` / `Stack` / `Grid` / `Typography` replace the wrappers; `~/components/ui/Icon` replaces the legacy `Icon`.

**Tech Stack:** React + TypeScript, `@mui/material`, `@codegouvfr/react-dsfr`, Vite + SWC, Vitest, Nx, Yarn v4.

---

## Reference: legacy → new prop mapping

Use this table when editing each file.

### `Container` (`_dsfr`) → `@mui/material/Container`

| Legacy prop            | Replacement                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `as="main"`            | `component="main"`                                                                            |
| `as="section"`         | `component="section"`                                                                         |
| `as="article"` etc.    | `component="article"` etc.                                                                    |
| `fluid`                | `maxWidth={false}` (or drop the wrapper, use `<Box component="…">` if you don't need padding) |
| (no `fluid`, centered) | `maxWidth="xl"` (closest match to DSFR `fr-container`)                                        |
| `spacing="py-4w"`      | `sx={{ py: '2rem' }}` (DSFR `4w` ≈ 2rem)                                                      |
| `spacing="py-2w"`      | `sx={{ py: '1rem' }}`                                                                         |
| `className="…"`        | `className="…"` (DSFR utility classes like `fr-mb-2w` still work)                             |

### `Row` (`_dsfr`) → `@mui/material/Stack` (default) or `@mui/material/Grid` (only if `Col` siblings set sizes via `n=…`)

| Legacy `Row` prop         | `Stack` replacement           | `Grid container` replacement                                |
| ------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `gutters`                 | `spacing="1.5rem"`            | `spacing={2}` (kept numeric — `Grid` accepts theme spacing) |
| `alignItems="top"`        | `alignItems="flex-start"`     | same                                                        |
| `alignItems="middle"`     | `alignItems="center"`         | same                                                        |
| `alignItems="bottom"`     | `alignItems="flex-end"`       | same                                                        |
| `justifyContent="left"`   | `justifyContent="flex-start"` | same                                                        |
| `justifyContent="center"` | `justifyContent="center"`     | same                                                        |
| `justifyContent="right"`  | `justifyContent="flex-end"`   | same                                                        |
| `className="…"`           | `className="…"`               | `className="…"`                                             |

`Row` defaults to `direction="row"` for `Stack`.

### `Col` (`_dsfr`) → `@mui/material/Grid` (size) when sibling of `Grid container`; or just remove (flow into parent `Stack`)

| Legacy `Col` prop | Replacement                           |
| ----------------- | ------------------------------------- |
| `n="4"`           | `size={4}`                            |
| `n="5"`           | `size={5}`                            |
| no `n`            | `size="grow"` (fills remaining space) |
| `offset="1"`      | `offset={1}`                          |
| `className="…"`   | `className="…"`                       |

If the parent is now a `Stack` (no column sizing in any sibling), drop `<Col>` entirely and inline its children.

### `Text` (`_dsfr`) → `@mui/material/Typography`

| Legacy `Text` prop    | Replacement                                         |
| --------------------- | --------------------------------------------------- |
| `as="p"` (default)    | `component="p"`                                     |
| `as="span"`           | `component="span"`                                  |
| `size="xs"`           | `variant="caption"`                                 |
| `size="sm"`           | `variant="body2"`                                   |
| `size="md"` (default) | `variant="body1"`                                   |
| `size="lg"`           | `variant="subtitle1"`                               |
| `size="lead"`         | `variant="h6"`                                      |
| `bold`                | `sx={{ fontWeight: 700 }}`                          |
| `spacing="mb-0"`      | `sx={{ mb: 0 }}`                                    |
| `spacing="mb-1w"`     | `sx={{ mb: '0.25rem' }}`                            |
| `spacing="mb-2w"`     | `sx={{ mb: '0.5rem' }}` (or `className="fr-mb-2w"`) |
| `className="…"`       | `className="…"` (DSFR utility classes still work)   |
| `alt` (Spectral font) | not used in any consumer — ignore                   |

When merging `bold` + `spacing` + `className`, use a single `sx={{…}}` block and keep `className` separate.

### `Icon` (`_dsfr`) → `~/components/ui/Icon`

The new `Icon` (`frontend/src/components/ui/Icon.tsx`) accepts: `name: FrIconClassName | RiIconClassName`, `size?: 'xs' | 'sm' | 'md' | 'lg'`, `color?: string`, `className?: string`. It always renders a centered `<span>` with `aria-hidden`.

| Legacy `Icon` prop                | Replacement                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `name="fr-icon-…"`                | `name="fr-icon-…"`                                                 |
| `size="xs"`                       | `size="xs"`                                                        |
| `size="sm"` (default)             | `size="sm"`                                                        |
| `size="1x"`                       | `size="md"` (closest match; 1x ≈ 1em)                              |
| `size="lg"`                       | `size="lg"`                                                        |
| `size="xl"`                       | `size="lg"` (no `xl` in the new component — accepted visual drift) |
| `iconPosition="center"`           | drop — new component centers via `Box span`                        |
| `iconPosition="left"` / `"right"` | drop — let the parent flex container handle position               |
| `verticalAlign="middle"`          | drop — new component is a centered span                            |
| `className="…"`                   | `className="…"`                                                    |
| `color="…"`                       | `color="…"`                                                        |
| `title="…"`                       | not used in any consumer — ignore                                  |

If a consumer relied on `iconPosition="right"` to reorder icon+text, restructure the JSX (icon comes after text in source order).

---

## File Inventory

**Files modified (consumers — 15):**

| Path                                                                          | Imports used                      |
| ----------------------------------------------------------------------------- | --------------------------------- |
| `frontend/src/components/GroupRemoveHousingModal/GroupRemoveHousingModal.tsx` | `Text`                            |
| `frontend/src/components/ExtendedToggle/ExtendedToggle.tsx`                   | `Icon`                            |
| `frontend/src/components/Label/Label.tsx`                                     | `Text`, `TextAs` (type)           |
| `frontend/src/components/modals/ConfirmationModal/ConfirmationModal.tsx`      | `Container`                       |
| `frontend/src/components/Collapse/Collapse.tsx`                               | `Icon`, `Text`                    |
| `frontend/src/components/HousingListFilters/HousingListFiltersSidemenu.tsx`   | `Icon`                            |
| `frontend/src/components/MainContainer/MainContainer.tsx`                     | `Container`                       |
| `frontend/src/components/GeoPerimeterCard/GeoPerimeterCard.tsx`               | `Icon`, `Row`                     |
| `frontend/src/views/HousingList/HousingListMap.tsx`                           | `Text`                            |
| `frontend/src/views/Resources/ResourcesView.tsx`                              | `Icon`                            |
| `frontend/src/views/Resources/StatusView.tsx`                                 | `Col`, `Row`                      |
| `frontend/src/views/Account/ResetPasswordView.tsx`                            | `Col`, `Container`, `Row`, `Text` |
| `frontend/src/views/Account/ForgottenPasswordView.tsx`                        | `Col`, `Container`, `Row`, `Text` |
| `frontend/src/views/Account/AccountCreation/AccountPasswordCreationView.tsx`  | `Row`, `Text`                     |

**Files deleted:**

- `frontend/src/components/modals/GroupCampaignCreationModal/` — orphaned consumer (no callers).
- `frontend/src/components/_dsfr/` — entire folder, after all consumers migrated.

---

## Task 1: Verify dead `_dsfr` exports and delete the orphaned consumer

**Files:**

- Delete: `frontend/src/components/_dsfr/components/interface/` (Modal, Pagination, Select, Table — if grep is clean)
- Keep (until Task 6): `frontend/src/components/_dsfr/utils/`, `frontend/src/components/_dsfr/hooks/` — still consumed by `_dsfr/components/foundation/*` (Icon, Container, Row, Col, Text). They are removed wholesale when Task 6 deletes the entire `_dsfr/` folder.
- Delete: `frontend/src/components/modals/GroupCampaignCreationModal/` (entire directory)
- Modify: `frontend/src/components/_dsfr/index.js`, `frontend/src/components/_dsfr/index.d.ts`, `frontend/src/components/_dsfr/components/interface/index.js`, `frontend/src/components/_dsfr/components/interface/index.d.ts` (remove dead re-exports)

- [ ] **Step 1: Exhaustive grep for dead-export references**

Run each grep below from the repo root. Each should return **only files inside `frontend/src/components/_dsfr/`** (the legacy folder's own internal references). Any hit outside that folder is a real consumer and must be migrated, not deleted.

```bash
# Modal* exports
rg -n "from '[^']*_dsfr[^']*'" frontend/src apps/front-e2e | rg -i "Modal|ModalClose|ModalContent|ModalFooter|ModalTitle"

# Pagination
rg -n "from '[^']*_dsfr[^']*'" frontend/src apps/front-e2e | rg "Pagination"

# Select
rg -n "from '[^']*_dsfr[^']*'" frontend/src apps/front-e2e | rg "Select|SearchableSelect|SelectWrapper"

# Table
rg -n "from '[^']*_dsfr[^']*'" frontend/src apps/front-e2e | rg "Table|SimpleTable"

# utils & hooks
rg -n "from '[^']*_dsfr/utils" frontend/src apps/front-e2e
rg -n "from '[^']*_dsfr/hooks" frontend/src apps/front-e2e

# Direct subpath imports we might have missed
rg -n "_dsfr/components/interface" frontend/src apps/front-e2e
```

Expected: every match is inside `frontend/src/components/_dsfr/`. If anything else surfaces, **stop and migrate that consumer first** (extend the plan).

- [ ] **Step 2: Confirm `GroupCampaignCreationModal` is orphaned**

```bash
rg -n "GroupCampaignCreationModal" frontend/src apps/front-e2e
```

Expected: only files **inside** `frontend/src/components/modals/GroupCampaignCreationModal/`. If anything else surfaces, abandon the orphan deletion and migrate it like the other consumers instead.

- [ ] **Step 3: Delete confirmed-dead subfolders**

```bash
rm -rf frontend/src/components/_dsfr/components/interface
rm -rf frontend/src/components/modals/GroupCampaignCreationModal
```

Do **not** delete `_dsfr/utils/` or `_dsfr/hooks/` here — they are still required by `_dsfr/components/foundation/*` (Icon, Container, Row, Col, Text). Task 6 removes the whole `_dsfr/` folder.

- [ ] **Step 4: Remove the dead re-exports from `_dsfr/index.*`**

Edit `frontend/src/components/_dsfr/index.js`:

```js
export * from './components/foundation';
```

Edit `frontend/src/components/_dsfr/index.d.ts`:

```ts
export * from './components/foundation';
```

(Drop the `./components/interface` re-export line in both files.)

- [ ] **Step 5: Verify build is still green**

```bash
yarn nx typecheck frontend
yarn nx lint frontend
```

Expected: both pass. Any failure means a hidden consumer existed — investigate before continuing.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/_dsfr frontend/src/components/modals/GroupCampaignCreationModal
git commit -m "chore(front): verify _dsfr dead exports

Modal*, Pagination*, Select*, Table* have zero external consumers.
Same for GroupCampaignCreationModal. Drop them ahead of the
live-consumer migration. _dsfr/utils and _dsfr/hooks stay until
Task 6 because foundation/* still depends on them."
```

---

## Task 2: Migrate `Icon` consumers to `~/components/ui/Icon`

**Files (5):**

- Modify: `frontend/src/components/ExtendedToggle/ExtendedToggle.tsx`
- Modify: `frontend/src/components/Collapse/Collapse.tsx`
- Modify: `frontend/src/components/HousingListFilters/HousingListFiltersSidemenu.tsx`
- Modify: `frontend/src/components/GeoPerimeterCard/GeoPerimeterCard.tsx`
- Modify: `frontend/src/views/Resources/ResourcesView.tsx`

- [ ] **Step 1: `ExtendedToggle.tsx`**

Replace the import line:

```ts
// before
import { Icon } from '../_dsfr';
// after
import Icon from '~/components/ui/Icon';
```

Replace the JSX (drop `iconPosition`; `size="xs"` stays):

```tsx
// before
<Icon
  className={styles.icon}
  iconPosition="center"
  name={icon}
  size="xs"
/>
// after
<Icon className={styles.icon} name={icon} size="xs" />
```

- [ ] **Step 2: `Collapse.tsx`**

Replace the import line (Text stays in `_dsfr` for now — migrated in Task 3):

```ts
// before
import { Icon, Text } from '../_dsfr';
// after
import { Text } from '../_dsfr';
import Icon from '~/components/ui/Icon';
```

Replace the three `<Icon>` usages (all use `size="1x"` → `size="md"`; drop `iconPosition`):

```tsx
// before (first usage, inside the headerLeft span)
{
  props.icon && <Icon name={props.icon} iconPosition="left" size="1x" />;
}
// after
{
  props.icon && <Icon name={props.icon as FrIconClassName} size="md" />;
}
```

```tsx
// before (the two arrow icons)
<Icon
  className="align-right"
  iconPosition="right"
  name={collapseIcon}
  size="1x"
/>
// after
<Icon className="align-right" name={collapseIcon} size="md" />
```

Note: `props.icon` is typed `string` on the `Props` interface; widening to `FrIconClassName | RiIconClassName` is required because the new `Icon` rejects arbitrary strings. Update the `Props` interface accordingly:

```ts
// before
import type { ReactNode } from 'react';
//   …
interface Props {
  className?: string;
  dropdown?: boolean;
  icon?: string;
  // …
}
// after
import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
import type { ReactNode } from 'react';
//   …
interface Props {
  className?: string;
  dropdown?: boolean;
  icon?: FrIconClassName | RiIconClassName;
  // …
}
```

Then drop the `as FrIconClassName` cast in the first JSX edit above (the prop type already matches).

`collapseIcon` is a local literal `'fr-icon-arrow-down-s-line' | 'fr-icon-arrow-up-s-line'` — already assignable to `FrIconClassName`.

- [ ] **Step 3: `HousingListFiltersSidemenu.tsx`**

Replace the import line:

```ts
// before
import { Icon } from '../_dsfr';
// after
import Icon from '~/components/ui/Icon';
```

Replace the `<Icon>` inside `TitleWithIcon`:

```tsx
// before
<Icon name={props.icon} className={styles.icon} verticalAlign="middle" />
// after
<Icon name={props.icon} className={styles.icon} />
```

- [ ] **Step 4: `GeoPerimeterCard.tsx`**

Replace the import line (keep `Row` for Task 5):

```ts
// before
import { Icon, Row } from '../_dsfr';
// after
import { Row } from '../_dsfr';
import Icon from '~/components/ui/Icon';
```

Replace the `<Icon>` (`size="1x"` → `size="md"`; drop `iconPosition`):

```tsx
// before
<Icon
  name="fr-icon-france-fill"
  iconPosition="center"
  size="1x"
/>
// after
<Icon name="fr-icon-france-fill" size="md" />
```

- [ ] **Step 5: `ResourcesView.tsx`**

Replace the import line:

```ts
// before
import { Icon } from '../../components/_dsfr';
// after
import Icon from '~/components/ui/Icon';
```

Replace the `<Icon>` (`size="xl"` → `size="lg"`; drop `iconPosition`). The `name` prop is typed `string` in the local `Props` — widen it to `FrIconClassName | RiIconClassName`:

```ts
// before (inside Props interface)
icon: string;
// after
icon: FrIconClassName | RiIconClassName;
```

Add the type imports near the top of the file:

```ts
import type { FrIconClassName, RiIconClassName } from '@codegouvfr/react-dsfr';
```

Replace the `<Icon>` JSX:

```tsx
// before
<Icon name={icon} iconPosition="center" size="xl" />
// after
<Icon name={icon} size="lg" />
```

- [ ] **Step 6: Verify**

```bash
yarn nx typecheck frontend
yarn nx lint frontend
yarn nx test frontend
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ExtendedToggle frontend/src/components/Collapse frontend/src/components/HousingListFilters frontend/src/components/GeoPerimeterCard frontend/src/views/Resources/ResourcesView.tsx
git commit -m "refactor(front): migrate Icon to ui/Icon

Drop \`Icon\` from _dsfr in 5 consumers; route through the project's
~/components/ui/Icon wrapper. Map size=\"1x\" → \"md\", \"xl\" → \"lg\";
drop iconPosition/verticalAlign — handled by parent layout or by
ui/Icon's centered span."
```

---

## Task 3: Migrate `Text` consumers to MUI `Typography`

**Files (8):**

- Modify: `frontend/src/components/GroupRemoveHousingModal/GroupRemoveHousingModal.tsx`
- Modify: `frontend/src/components/Label/Label.tsx`
- Modify: `frontend/src/components/Collapse/Collapse.tsx` (Icon already migrated in Task 2)
- Modify: `frontend/src/views/HousingList/HousingListMap.tsx`
- Modify: `frontend/src/views/Account/ResetPasswordView.tsx`
- Modify: `frontend/src/views/Account/ForgottenPasswordView.tsx`
- Modify: `frontend/src/views/Account/AccountCreation/AccountPasswordCreationView.tsx`

- [ ] **Step 1: `GroupRemoveHousingModal.tsx`**

```tsx
// before
import { Text } from '../_dsfr';
// …
<Text>
  Êtes-vous sûr de vouloir supprimer ces logements de ce groupe ? Vous pourrez
  toujours retrouver ces logements dans votre parc de logements.
</Text>;
// after
import Typography from '@mui/material/Typography';
// …
<Typography component="p" variant="body1">
  Êtes-vous sûr de vouloir supprimer ces logements de ce groupe ? Vous pourrez
  toujours retrouver ces logements dans votre parc de logements.
</Typography>;
```

- [ ] **Step 2: `Label.tsx`** (also drops the `TextAs` type import)

Rewrite the whole file:

```tsx
import Typography from '@mui/material/Typography';
import classNames from 'classnames';
import type { PropsWithChildren } from 'react';

import styles from './label.module.scss';

interface Props {
  spacing?: string;
  as?: 'p' | 'span';
}

function Label(props: PropsWithChildren<Props>) {
  return (
    <Typography
      component={props.as ?? 'p'}
      variant="body2"
      className={classNames(
        styles.label,
        props.spacing && `fr-${props.spacing}`
      )}
    >
      {props.children}
    </Typography>
  );
}

export default Label;
```

The legacy `Text` translated DSFR spacing tokens (e.g. `"mb-1w"` → `"fr-mb-1w"`) via `getSpace`. Mirror that by prepending `fr-` to whatever string `props.spacing` is. Callers pass strings like `"mb-1w"` (see `HousingListMap.tsx`); we keep that contract.

- [ ] **Step 3: `Collapse.tsx`**

Replace the remaining import + the one `<Text>` usage:

```tsx
// before
import { Text } from '../_dsfr';
import Icon from '~/components/ui/Icon';
// after
import Icon from '~/components/ui/Icon';
import Typography from '@mui/material/Typography';
```

```tsx
// before
<Text as="span" className="fr-mb-0" size="sm">
  {props.title}
</Text>
// after
<Typography component="span" variant="body2" className="fr-mb-0">
  {props.title}
</Typography>
```

- [ ] **Step 4: `HousingListMap.tsx`**

```tsx
// before
import { Text } from '../../components/_dsfr';
// …
<Text spacing="mb-0">
  {displayHousingCount({
    filteredHousingCount,
    filteredOwnerCount,
    totalCount
  })}
</Text>;
// after
import Typography from '@mui/material/Typography';
// …
<Typography component="p" variant="body1" sx={{ mb: 0 }}>
  {displayHousingCount({
    filteredHousingCount,
    filteredOwnerCount,
    totalCount
  })}
</Typography>;
```

- [ ] **Step 5: `ResetPasswordView.tsx`** (keep `Col`, `Container`, `Row` imports — they're migrated in Tasks 4 & 5)

```ts
// before
import { Col, Container, Row, Text } from '../../components/_dsfr';
// after
import { Col, Container, Row } from '../../components/_dsfr';
// + add at the top, near the other MUI imports
import Typography from '@mui/material/Typography'; // already present — keep one copy
```

Replace the two `<Text>` usages:

```tsx
// before
<Text>Recommencez la procédure ou contactez le support.</Text>
// after
<Typography component="p" variant="body1">
  Recommencez la procédure ou contactez le support.
</Typography>
```

```tsx
// before
<Text>
  Essayez de vous connecter en utilisant votre nouveau mot de passe.
</Text>
// after
<Typography component="p" variant="body1">
  Essayez de vous connecter en utilisant votre nouveau mot de passe.
</Typography>
```

- [ ] **Step 6: `ForgottenPasswordView.tsx`** (keep `Col`, `Container`, `Row`)

```ts
// before
import { Col, Container, Row, Text } from '../../components/_dsfr';
// after
import { Col, Container, Row } from '../../components/_dsfr';
```

Replace the three `<Text>` usages inside the `EmailSent` component and the form:

```tsx
// before
<Text>Un email vous a été envoyé avec les instructions à suivre.</Text>
// after
<Typography component="p" variant="body1">
  Un email vous a été envoyé avec les instructions à suivre.
</Typography>
```

```tsx
// before
<Text className="subtitle">
  Vous ne trouvez pas le mail ? Vérifiez qu’il ne s’est pas glissé dans
  vos spams ou
  <AppLinkAsButton …>renvoyer le mail</AppLinkAsButton>
  .
</Text>
// after
<Typography component="p" variant="body1" className="subtitle">
  Vous ne trouvez pas le mail ? Vérifiez qu’il ne s’est pas glissé dans
  vos spams ou
  <AppLinkAsButton …>renvoyer le mail</AppLinkAsButton>
  .
</Typography>
```

```tsx
// before
<Text size="sm" className={confirmationClasses}>
  Email envoyé.
</Text>
// after
<Typography component="p" variant="body2" className={confirmationClasses}>
  Email envoyé.
</Typography>
```

```tsx
// before (inside the form)
<Text>
  Vous allez <b>recevoir un email</b> qui vous permettra de créer
  un nouveau mot de passe.
</Text>
// after
<Typography component="p" variant="body1">
  Vous allez <b>recevoir un email</b> qui vous permettra de créer
  un nouveau mot de passe.
</Typography>
```

`Typography` is already imported at the top of this file.

- [ ] **Step 7: `AccountPasswordCreationView.tsx`** (keep `Row`)

```ts
// before
import { Row, Text } from '../../../components/_dsfr';
// after
import { Row } from '../../../components/_dsfr';
```

Replace the one `<Text>` usage inside `LinkMissing`:

```tsx
// before
<Text>Recommencez la procédure ou contactez le support.</Text>
// after
<Typography component="p" variant="body1">
  Recommencez la procédure ou contactez le support.
</Typography>
```

`Typography` is already imported.

- [ ] **Step 8: Verify**

```bash
yarn nx typecheck frontend
yarn nx lint frontend
yarn nx test frontend
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/GroupRemoveHousingModal frontend/src/components/Label frontend/src/components/Collapse frontend/src/views/HousingList/HousingListMap.tsx frontend/src/views/Account/ResetPasswordView.tsx frontend/src/views/Account/ForgottenPasswordView.tsx frontend/src/views/Account/AccountCreation/AccountPasswordCreationView.tsx
git commit -m "refactor(front): migrate Text to MUI Typography

Replace the _dsfr Text wrapper with @mui/material/Typography across
7 consumers; inline TextAs as 'p' | 'span' in Label and drop the type
re-export."
```

---

## Task 4: Migrate `Container` consumers to `@mui/material/Container`

**Files (4):**

- Modify: `frontend/src/components/modals/ConfirmationModal/ConfirmationModal.tsx`
- Modify: `frontend/src/components/MainContainer/MainContainer.tsx`
- Modify: `frontend/src/views/Account/ResetPasswordView.tsx` (Text already migrated)
- Modify: `frontend/src/views/Account/ForgottenPasswordView.tsx` (Text already migrated)

- [ ] **Step 1: `ConfirmationModal.tsx`** — fluid container becomes `Box component="section"`

```ts
// before
import { Container } from '../../_dsfr';
// after
import Box from '@mui/material/Box';
```

```tsx
// before
<Container as="section" fluid>
  {children}
</Container>
// after
<Box component="section">{children}</Box>
```

- [ ] **Step 2: `MainContainer.tsx`** — outer fluid wrapper, inner centered section

```ts
// before
import { Container } from '../_dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
// after
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
```

Replace the JSX body:

```tsx
// before
<Container fluid spacing="py-4w" className={props.grey ? 'bg-100' : ''}>
  <Container as="section">
    {props.title && (
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: '1.5rem' }}
      >
        <Typography component="h1" variant="h3">
          {props.title}
        </Typography>
        {props.titleAction}
      </Stack>
    )}
    {props.children}
  </Container>
</Container>
// after
<Box className={props.grey ? 'bg-100' : ''} sx={{ py: '2rem' }}>
  <Container component="section" maxWidth="xl">
    {props.title && (
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: '1.5rem' }}
      >
        <Typography component="h1" variant="h3">
          {props.title}
        </Typography>
        {props.titleAction}
      </Stack>
    )}
    {props.children}
  </Container>
</Box>
```

The outer wrapper is fluid → `Box` keeps the background color + vertical padding without forcing a max-width. The inner section becomes a MUI `Container` with `maxWidth="xl"` (closest DSFR equivalent).

- [ ] **Step 3: `ResetPasswordView.tsx`** (Row/Col remain — migrated in Task 5)

```ts
// before
import { Col, Container, Row } from '../../components/_dsfr';
// after
import { Col, Row } from '../../components/_dsfr';
import Container from '@mui/material/Container';
```

Replace each of the three `<Container as="main" className="grow-container" spacing="py-4w">` opens with:

```tsx
<Container component="main" className="grow-container" maxWidth="xl" sx={{ py: '2rem' }}>
```

(no other Container shape used; close tags remain `</Container>`.)

- [ ] **Step 4: `ForgottenPasswordView.tsx`** (Row/Col remain)

```ts
// before
import { Col, Container, Row } from '../../components/_dsfr';
// after
import { Col, Row } from '../../components/_dsfr';
import Container from '@mui/material/Container';
```

Replace the one `<Container as="main" spacing="py-4w" className="grow-container">` open with:

```tsx
<Container component="main" maxWidth="xl" className="grow-container" sx={{ py: '2rem' }}>
```

- [ ] **Step 5: Verify**

```bash
yarn nx typecheck frontend
yarn nx lint frontend
yarn nx test frontend
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/modals/ConfirmationModal frontend/src/components/MainContainer frontend/src/views/Account/ResetPasswordView.tsx frontend/src/views/Account/ForgottenPasswordView.tsx
git commit -m "refactor(front): migrate Container to MUI Container

Swap the _dsfr Container wrapper for @mui/material/Container in 4
consumers. Fluid containers become Box; centered containers use
maxWidth=\"xl\" (closest match to fr-container); spacing=\"py-4w\"
becomes sx={{ py: '2rem' }}."
```

---

## Task 5: Migrate `Row` / `Col` consumers to `Stack` / `Grid`

**Files (5):**

- Modify: `frontend/src/components/GeoPerimeterCard/GeoPerimeterCard.tsx` (Icon already migrated)
- Modify: `frontend/src/views/Resources/StatusView.tsx`
- Modify: `frontend/src/views/Account/ResetPasswordView.tsx` (Text + Container already migrated)
- Modify: `frontend/src/views/Account/ForgottenPasswordView.tsx` (Text + Container already migrated)
- Modify: `frontend/src/views/Account/AccountCreation/AccountPasswordCreationView.tsx` (Text already migrated)

- [ ] **Step 1: `GeoPerimeterCard.tsx`** — single `Row` with `justifyContent="right"`, no sibling `Col`. Use `Stack`.

```ts
// before
import { Icon, Row } from '../_dsfr';
import Icon from '~/components/ui/Icon'; // already added in Task 2
// after (remove the _dsfr import altogether)
import Icon from '~/components/ui/Icon';
import Stack from '@mui/material/Stack';
```

(If you also still see `import { Row } from '../_dsfr';` from Task 2's partial edit, remove that line too.)

```tsx
// before
<Row justifyContent="right">
  <AppLink … >Afficher (.json)</AppLink>
</Row>
// after
<Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
  <AppLink … >Afficher (.json)</AppLink>
</Stack>
```

- [ ] **Step 2: `StatusView.tsx`** — `Row` with `Col n="4"` siblings → `Grid container` + `Grid size`.

```ts
// before
import { Col, Row } from '../../components/_dsfr';
// after
import Grid from '@mui/material/Grid';
```

Replace the header row:

```tsx
// before
<Row className="fr-py-1w bordered-b bg-100">
  <Col n="4"><b>Statuts</b></Col>
  <Col n="4"><b>Sous statuts</b></Col>
</Row>
// after
<Grid container className="fr-py-1w bordered-b bg-100">
  <Grid size={4}><b>Statuts</b></Grid>
  <Grid size={4}><b>Sous statuts</b></Grid>
</Grid>
```

Replace the outer state row:

```tsx
// before
<Row
  className={classNames('fr-py-1w', {
    'bordered-b': stateIndex !== HousingStates.length - 1,
  })}
  key={state + '_' + stateIndex}
>
  <Col n="4"><b>{state.title}</b></Col>
  <Col>
    {state.subStatusList?.map(…)}
  </Col>
</Row>
// after
<Grid
  container
  className={classNames('fr-py-1w', {
    'bordered-b': stateIndex !== HousingStates.length - 1,
  })}
  key={state + '_' + stateIndex}
>
  <Grid size={4}><b>{state.title}</b></Grid>
  <Grid size="grow">
    {state.subStatusList?.map(…)}
  </Grid>
</Grid>
```

Replace the inner sub-status row:

```tsx
// before
<Row
  className={classNames('fr-py-1w', {
    'bordered-b': subStatusIndex + 1 !== state.subStatusList?.length,
  })}
  key={state + '_' + subStatus + '_' + subStatusIndex}
>
  <Col>{subStatus.title}</Col>
</Row>
// after
<Grid
  container
  className={classNames('fr-py-1w', {
    'bordered-b': subStatusIndex + 1 !== state.subStatusList?.length,
  })}
  key={state + '_' + subStatus + '_' + subStatusIndex}
>
  <Grid size="grow">{subStatus.title}</Grid>
</Grid>
```

- [ ] **Step 3: `ResetPasswordView.tsx`** — three `Row gutters alignItems="middle"` with `Col` + `Col n="5" offset="1"`, plus a `Row justifyContent="right"` for the submit button.

The outer rows have column sizing (`n="5"`, `offset="1"`) → `Grid container`. The submit-button row has no sizing → `Stack`.

```ts
// before
import { Col, Row } from '../../components/_dsfr';
// after
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
```

For each of the three `<Row gutters alignItems="middle">` open tags, replace with:

```tsx
<Grid container spacing={2} alignItems="center">
```

For each `<Col>` open tag (no `n`) inside one of those rows, replace with:

```tsx
<Grid size="grow">
```

For each `<Col n="5" offset="1" className="align-right">` open tag, replace with:

```tsx
<Grid size={5} offset={1} className="align-right">
```

Close tags become `</Grid>`.

For the two `<Row justifyContent="right">` opens that contain the submit / link buttons, replace with:

```tsx
<Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
```

(close `</Stack>`.)

- [ ] **Step 4: `ForgottenPasswordView.tsx`** — one `Row gutters alignItems="middle"` with `Col` + `Col n="5" offset="1"`, plus a `Row justifyContent="right"` for the submit button.

```ts
// before
import { Col, Row } from '../../components/_dsfr';
// after
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
```

```tsx
// before
<Row gutters alignItems="middle">
  <Col>
    …
  </Col>
  <Col n="5" offset="1" className="align-right">
    <img … />
  </Col>
</Row>
// after
<Grid container spacing={2} alignItems="center">
  <Grid size="grow">
    …
  </Grid>
  <Grid size={5} offset={1} className="align-right">
    <img … />
  </Grid>
</Grid>
```

```tsx
// before
<Row justifyContent="right">
  <Button type="submit">Envoyer un email de réinitialisation</Button>
</Row>
// after
<Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
  <Button type="submit">Envoyer un email de réinitialisation</Button>
</Stack>
```

- [ ] **Step 5: `AccountPasswordCreationView.tsx`** — one `Row` with no sizing, around an `AppLink`. Use `Stack`.

```ts
// before
import { Row } from '../../../components/_dsfr';
// after
import Stack from '@mui/material/Stack';
```

```tsx
// before
<Row>
  <AppLink
    iconId="fr-icon-home-4-fill"
    iconPosition="left"
    isSimple
    to="/"
  >
    Revenir à l’accueil
  </AppLink>
</Row>
// after
<Stack direction="row">
  <AppLink
    iconId="fr-icon-home-4-fill"
    iconPosition="left"
    isSimple
    to="/"
  >
    Revenir à l’accueil
  </AppLink>
</Stack>
```

- [ ] **Step 6: Verify**

```bash
yarn nx typecheck frontend
yarn nx lint frontend
yarn nx test frontend
```

- [ ] **Step 7: Browser spot-check (per the consumer-page map in the spec)**

```bash
yarn workspace @zerologementvacant/front dev
```

Visit each URL and check nothing is visibly broken (no oversized headings, no missing spacing, no overlapping content; small font / margin drift is acceptable per the spec):

- `/mot-de-passe/oublie`
- `/mot-de-passe/nouveau`
- `/inscription/*` (password creation step)
- `/ressources`
- `/ressources/statuts`
- `/analyses/parc-vacant`, `/analyses/lutte`
- `/parc-de-logements` (list + map tabs, filters side-menu open, _Périmètres_ modal open in both sidemenu and map)
- `/groupes/:id` (open "Supprimer du groupe")
- `/proprietaires/:id`, `/logements/:housingId`, `/compte`
- `/campagnes/:id` (delete a campaign — `ConfirmationModal` smoke)

If a page looks visibly wrong, tune the `Typography variant` / `Stack` spacing in that file before moving on.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/GeoPerimeterCard frontend/src/views/Resources/StatusView.tsx frontend/src/views/Account
git commit -m "refactor(front): migrate Row/Col to Stack/Grid

Rows with column-sized siblings become Grid container + Grid size=N.
Rows that are pure flex rows become Stack direction=row. _dsfr Row
and Col now have no remaining consumers."
```

---

## Task 6: Delete `_dsfr/` folder

**Files:**

- Delete: `frontend/src/components/_dsfr/` (entire folder)

- [ ] **Step 1: Confirm nothing in the repo still touches `_dsfr`**

```bash
rg -n "_dsfr" frontend/src apps/front-e2e
```

Expected: zero matches. If anything surfaces, **stop and migrate that consumer** instead of continuing.

- [ ] **Step 2: Delete the folder**

```bash
rm -rf frontend/src/components/_dsfr
```

- [ ] **Step 3: Verify the build is still green**

```bash
yarn nx typecheck frontend
yarn nx lint frontend
yarn nx test frontend
yarn nx build frontend
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/_dsfr
git commit -m "chore(front): remove _dsfr folder

All live consumers have been migrated to MUI primitives and the
project's ~/components/ui/Icon wrapper. Drop the legacy folder."
```

---

## Open the PR

```bash
git push -u origin refactor/remove-old-dsfr
gh pr create --title "refactor(front): remove _dsfr legacy components" --body "$(cat <<'EOF'
## Summary
- Migrate the 15 live consumers of `frontend/src/components/_dsfr/` to MUI + DSFR-direct patterns per `.claude/rules/frontend-conventions.md`.
- Confirm `_dsfr/components/interface/*`, `_dsfr/utils/*`, `_dsfr/hooks/*` and `components/modals/GroupCampaignCreationModal/` are orphaned and delete them.
- Delete the entire `_dsfr/` folder.

Replacement map: `Container` → MUI `Container`, `Text` → MUI `Typography`, `Icon` → `~/components/ui/Icon`, `Row` → `Stack` (or `Grid container` if column-sized), `Col` → `Grid size={…}`.

## Test plan
- [ ] `yarn nx typecheck frontend` green
- [ ] `yarn nx lint frontend` green
- [ ] `yarn nx test frontend` green
- [ ] Visual spot-check on:
  - [ ] `/mot-de-passe/oublie`, `/mot-de-passe/nouveau`, `/inscription/*`
  - [ ] `/ressources`, `/ressources/statuts`, `/analyses/parc-vacant`, `/analyses/lutte`
  - [ ] `/parc-de-logements` (list + map, filters sidemenu, *Périmètres* modal)
  - [ ] `/groupes/:id` "Supprimer du groupe" modal
  - [ ] `/proprietaires/:id`, `/logements/:housingId`, `/compte`
  - [ ] `/campagnes/:id` delete-campaign confirmation modal

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr edit "$(gh pr view --json number -q .number)" --add-label "refactor,front" --add-assignee "@me"
```
