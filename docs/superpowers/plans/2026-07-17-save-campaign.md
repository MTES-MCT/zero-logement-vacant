# Save a Campaign from the Campaigns List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Enregistrer une campagne" button to the campaigns list that opens a 2-step modal (search & select a group, then create a campaign from it), and close a pre-existing permission gap where any authenticated user — including a read-only Visitor — can currently create campaigns.

**Architecture:** Two independently-created DSFR modal instances (`SelectGroupModal` for step 1, the existing `CreateCampaignFromGroupModal` for step 2) chained via a new orchestrator component (`SaveCampaignFlow`), mirroring the codebase's only existing multi-step-modal precedent (`HousingCreationModal.tsx`). The orchestrator is mounted self-contained inside `CampaignTable.tsx`. A pre-existing role-check gap on campaign creation is fixed at the backend (`hasRole` middleware) and mirrored on both frontend entry points (the new button and the existing group-page button).

**Tech Stack:** React, TypeScript, `@codegouvfr/react-dsfr`, MUI, `react-hook-form` + yup, RTK Query, Vitest + Testing Library + MSW (frontend); Express, Knex, Vitest + supertest (backend).

**Design spec:** `docs/superpowers/specs/2026-07-17-save-campaign-design.md`

## Global Constraints

- Follow `.claude/rules/frontend-conventions.md`: DSFR components first, direct MUI imports, `Readonly<Props>`, `~` import alias, `react-hook-form` + yup for forms, MSW handlers for tests (never `vi.mock` for network data), French apostrophe `’`.
- Follow `.claude/rules/backend-conventions.md`: validation only in routers, no try-catch in controllers, `constants` from `node:http2` for status codes.
- RGAA accessibility is mandatory for every frontend change (`.claude/rules/rgaa-accessibility.md`). Each frontend task below notes the specific criteria it touches.
- TDD is mandatory project-wide: write the failing test before the implementation in every task.
- Run `yarn nx test frontend -- <pattern>` / `yarn nx test server -- <pattern>` to scope test runs; run `yarn nx typecheck frontend` / `yarn nx typecheck server` after touching shared types.

---

### Task 1: Backend — restrict campaign creation to Usual/Admin

**Files:**

- Modify: `server/src/routers/protected.ts:295-302` (the `POST /groups/:id/campaigns` route)
- Test: `server/src/controllers/test/campaign-api.test.ts`

**Interfaces:**

- Consumes: existing `hasRole(roles: UserRole[])` middleware from `~/middlewares/auth` (already imported in `protected.ts` at line 32); existing `genUserApi(establishmentId: string): UserApi` and `tokenProvider(user: UserApi)` test helpers.
- Produces: nothing new — this is a router-level guard with no new exports.

- [ ] **Step 1: Write the failing test**

In `server/src/controllers/test/campaign-api.test.ts`, add `UserRole` to the existing `@zerologementvacant/models` import (currently lines 5-12):

```ts
import {
  CampaignDTO,
  CampaignRemovalPayload,
  CampaignUpdatePayload,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  UserRole,
  type CampaignCreationPayload,
  type UserDTO
} from '@zerologementvacant/models';
```

Then, inside `describe('POST /groups/{id}/campaigns', ...)` (starting at line 344), insert this test right after the `'should throw if the group has been archived'` test (which ends at line 430) and before `'should create the campaign'` (line 432):

```ts
it('should be forbidden for a visitor', async () => {
  const visitor: UserApi = {
    ...genUserApi(establishment.id),
    role: UserRole.VISITOR
  };
  await Users().insert(toUserDBO(visitor));
  const payload: CampaignCreationPayload = {
    title: 'Logements prioritaires',
    description: 'Campagne pour les logements prioritaires',
    sentAt: null
  };

  const { status } = await request(url)
    .post(testRoute(group.id))
    .send(payload)
    .type('json')
    .use(tokenProvider(visitor));

  expect(status).toBe(constants.HTTP_STATUS_FORBIDDEN);
});
```

This requires `UserApi` to be imported — it already is, via `import { GroupApi } from '~/models/GroupApi';`... no, check: the file does not currently import `UserApi`. Add it:

```ts
import { UserApi } from '~/models/UserApi';
```

Add this import alongside the existing `import { GroupApi } from '~/models/GroupApi';` line (line 21).

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn nx test server -- campaign-api.test.ts -t "should be forbidden for a visitor"`
Expected: FAIL — the request currently succeeds (`HTTP_STATUS_CREATED`), not `HTTP_STATUS_FORBIDDEN`, because no role check exists on this route yet.

- [ ] **Step 3: Implement the route guard**

In `server/src/routers/protected.ts`, change the `POST /groups/:id/campaigns` route (lines 295-302) from:

```ts
router.post(
  '/groups/:id/campaigns',
  validator.validate({
    body: schemas.campaignCreationPayload,
    params: object({ id: schemas.id })
  }),
  campaignController.createFromGroup
);
```

to:

```ts
router.post(
  '/groups/:id/campaigns',
  hasRole([UserRole.USUAL, UserRole.ADMIN]),
  validator.validate({
    body: schemas.campaignCreationPayload,
    params: object({ id: schemas.id })
  }),
  campaignController.createFromGroup
);
```

(`hasRole` and `UserRole` are already imported at the top of this file — see lines 1-6 and line 32 — no new imports needed here.)

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn nx test server -- campaign-api.test.ts`
Expected: PASS — all tests in the `POST /groups/{id}/campaigns` block pass, including the new visitor test and the pre-existing `'should validate inputs'`/`'should create the campaign'` tests (which authenticate as `user`, a `USUAL` role, so remain unaffected).

- [ ] **Step 5: Commit**

```bash
git add server/src/routers/protected.ts server/src/controllers/test/campaign-api.test.ts
git commit -m "fix: restrict campaign creation from a group to Usual/Admin roles"
```

---

### Task 2: Frontend — customizable page size on `AdvancedTable`

**Files:**

- Modify: `frontend/src/components/AdvancedTable/AdvancedTable.tsx`
- Test: `frontend/src/components/AdvancedTable/test/AdvancedTable.test.tsx` (new)

**Interfaces:**

- Consumes: nothing new.
- Produces: two new optional props on `AdvancedTableProps<Data>`: `perPageOptions?: number[]` (default `[10, 50, 200, 500]`, unchanged from today) and `defaultPageSize?: number` (default `50`, unchanged from today). Task 5 (`SelectGroupModal`) passes `perPageOptions={[5, 10, 50]}` and `defaultPageSize={5}`.

This task exists because the step-1 mockup shows "5 lignes par page" as the table's default page size, but `AdvancedTable`'s per-page options are currently hardcoded to `[10, 50, 200, 500]` with no way to change them per call site.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/AdvancedTable/test/AdvancedTable.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createColumnHelper } from '@tanstack/react-table';

import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';

interface Row {
  id: string;
  name: string;
}

const columnHelper = createColumnHelper<Row>();
const columns = [columnHelper.accessor('name', { header: 'Nom' })];

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i),
    name: `Row ${i}`
  }));
}

describe('AdvancedTable', () => {
  const user = userEvent.setup();

  it('should default to 50 results per page when perPageOptions is not provided', async () => {
    render(<AdvancedTable columns={columns} data={buildRows(3)} />);

    await screen.findByRole('table');
    expect(
      screen.getByDisplayValue('50 résultats par page')
    ).toBeInTheDocument();
  });

  it('should use a custom default page size and per-page options', async () => {
    render(
      <AdvancedTable
        columns={columns}
        data={buildRows(7)}
        perPageOptions={[5, 10, 50]}
        defaultPageSize={5}
      />
    );

    const table = await screen.findByRole('table');
    expect(
      screen.getByDisplayValue('5 résultats par page')
    ).toBeInTheDocument();
    // 1 header row + 5 data rows
    expect(within(table).getAllByRole('row')).toHaveLength(6);

    const select = screen.getByDisplayValue('5 résultats par page');
    await user.selectOptions(select, '10');

    // 1 header row + remaining 7 data rows (only 7 total)
    expect(within(table).getAllByRole('row')).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn nx test frontend -- AdvancedTable.test.tsx`
Expected: The first test passes already (current default behavior). The second test FAILS with a TypeScript error / `perPageOptions`/`defaultPageSize` not recognized, or (if TS is loose) the `5 résultats par page` option never renders because the component ignores those props.

- [ ] **Step 3: Implement the props**

In `frontend/src/components/AdvancedTable/AdvancedTable.tsx`, update the `PaginationProps` interface (lines 67-76):

```ts
interface PaginationProps {
  /**
   * @default true
   */
  paginate?: boolean;
  /**
   * You must define this when using server-side pagination.
   */
  pageCount?: number;
  /**
   * Options shown in the "results per page" selector.
   * @default [10, 50, 200, 500]
   */
  perPageOptions?: number[];
  /**
   * Initial/uncontrolled page size.
   * @default 50
   */
  defaultPageSize?: number;
}
```

Update the constant and initial state (lines 78-102):

```ts
const ROW_SIZE = 64;
const PER_PAGE_OPTIONS = [10, 50, 200, 500];
const DEFAULT_PAGE_SIZE = 50;

function AdvancedTable<Data extends object>(props: AdvancedTableProps<Data>) {
  // Map our selection to the @tanstack/table internal selection state
  const rowSelection: RowSelectionState =
    props.selection?.ids?.reduce<RowSelectionState>((acc, id) => {
      acc[id] = true;
      return acc;
    }, {}) ?? {};
  const all = props.selection?.all ?? false;
  function setAll(value: boolean): void {
    props.onSelectionChange?.({
      all: value,
      ids: []
    });
  }

  const enableSelection = props.selection !== undefined;

  const paginate = props.paginate ?? true;
  const perPageOptions = props.perPageOptions ?? PER_PAGE_OPTIONS;
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: props.defaultPageSize ?? DEFAULT_PAGE_SIZE
  });
```

Update the `<SelectNext>` options (inside the `paginate ? (...) : null` block, currently lines 322-337):

```tsx
<SelectNext
  label={null}
  options={perPageOptions.map((option) => ({
    label: `${option} résultats par page`,
    value: String(option)
  }))}
  nativeSelectProps={{
    value: String(table.getState().pagination.pageSize),
    onChange: (event) => {
      const value = Number(event.target.value);
      if (value !== null) {
        table.setPageSize(value);
      }
    }
  }}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn nx test frontend -- AdvancedTable.test.tsx`
Expected: PASS — both tests pass; existing consumers (`CampaignTable.tsx`, `GeoPerimetersTable.tsx`) pass neither prop, so they keep the exact same `[10, 50, 200, 500]` / `50` behavior.

Run: `yarn nx test frontend -- CampaignListView.test.tsx`
Expected: PASS — the existing pagination tests (`'should render a page size selector'`, `'should limit visible rows according to page size'`, `'should navigate to the next page'`) still pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AdvancedTable/AdvancedTable.tsx frontend/src/components/AdvancedTable/test/AdvancedTable.test.tsx
git commit -m "feat: allow AdvancedTable callers to customize page size options"
```

---

### Task 3: Frontend — hide "Créer une campagne" on the group page for Visitors

**Files:**

- Modify: `frontend/src/components/Group/GroupNext.tsx`
- Test: `frontend/src/components/Group/test/GroupNext.test.tsx` (new)

**Interfaces:**

- Consumes: `useUser()` from `~/hooks/useUser` (existing, returns `{ isAdmin, isUsual, ... }`).
- Produces: no change to `GroupProps` — this is purely an internal render guard.

This task fixes the frontend half of the same gap Task 1 fixed at the backend, on the pre-existing group-page entry point.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Group/test/GroupNext.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import GroupNext from '~/components/Group/GroupNext';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromGroupDTO } from '~/models/Group';
import { fromUserDTO } from '~/models/User';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';

describe('GroupNext', () => {
  const establishment = genEstablishmentDTO();
  const creator = genUserDTO(UserRole.USUAL, establishment);
  const group = fromGroupDTO(genGroupDTO(creator, [genHousingDTO()]));

  function renderGroup(role: UserRole) {
    const authDTO = genUserDTO(role, establishment);
    const store = configureTestStore({
      auth: genAuthUser(
        fromUserDTO(authDTO),
        fromEstablishmentDTO(establishment)
      )
    });

    render(
      <Provider store={store}>
        <GroupNext
          group={group}
          onCreateCampaign={vi.fn()}
          onExport={vi.fn()}
          onUpdate={vi.fn()}
          onRemove={vi.fn()}
        />
      </Provider>
    );
  }

  it('should hide the "Créer une campagne" button for a visitor', () => {
    renderGroup(UserRole.VISITOR);

    expect(
      screen.queryByRole('button', { name: 'Créer une campagne' })
    ).not.toBeInTheDocument();
  });

  it('should show the "Créer une campagne" button for a usual user', async () => {
    renderGroup(UserRole.USUAL);

    expect(
      await screen.findByRole('button', { name: 'Créer une campagne' })
    ).toBeInTheDocument();
  });

  it('should show the "Créer une campagne" button for an admin', async () => {
    renderGroup(UserRole.ADMIN);

    expect(
      await screen.findByRole('button', { name: 'Créer une campagne' })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn nx test frontend -- GroupNext.test.tsx`
Expected: FAIL on the first test — the button is currently always rendered regardless of role, so `queryByRole` finds it and the `not.toBeInTheDocument()` assertion fails.

- [ ] **Step 3: Implement the guard**

In `frontend/src/components/Group/GroupNext.tsx`, add the import (alongside the other `~/` imports, e.g. after `import FullWidthButton from '~/components/ui/FullWidthButton';`):

```ts
import { useUser } from '~/hooks/useUser';
```

Inside `function Group(props: Readonly<GroupProps>) {`, right after the existing `const findCampaignsQuery = useFindCampaignsQuery(...)` line, add:

```ts
const { isAdmin, isUsual } = useUser();
const canCreateCampaign = isAdmin || isUsual;
```

Then wrap the "Créer une campagne" `<li>` (currently lines 185-193):

```tsx
{
  canCreateCampaign ? (
    <li style={{ width: '100%' }}>
      <FullWidthButton
        priority="primary"
        onClick={campaignFromGroupModal.open}
        disabled={props.group.housingCount === 0}
      >
        Créer une campagne
      </FullWidthButton>
    </li>
  ) : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn nx test frontend -- GroupNext.test.tsx`
Expected: PASS — all three tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Group/GroupNext.tsx frontend/src/components/Group/test/GroupNext.test.tsx
git commit -m "fix: hide the group page's campaign creation button for Visitors"
```

---

### Task 4: Frontend — optional stepper on `CreateCampaignFromGroupModal`

**Files:**

- Modify: `frontend/src/components/Group/CreateCampaignFromGroupModal.tsx`
- Test: `frontend/src/components/Group/test/CreateCampaignFromGroupModal.test.tsx` (new)

**Interfaces:**

- Consumes: DSFR's `Stepper` (`@codegouvfr/react-dsfr/Stepper`), props `currentStep: number`, `stepCount: number`, `title: ReactNode`.
- Produces: a new optional prop on `CreateCampaignFromGroupModalProps`: `stepper?: { currentStep: number; stepCount: number }`. Task 6 (`SaveCampaignFlow`) passes `{ currentStep: 2, stepCount: 2 }`; the existing `GroupNext.tsx` call site (Task 3) passes nothing, so its rendering is unchanged.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Group/test/CreateCampaignFromGroupModal.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import {
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { fromGroupDTO } from '~/models/Group';
import configureTestStore from '~/utils/storeUtils';

const modal = createCampaignFromGroupModal();
const creator = genUserDTO();
const group = fromGroupDTO(genGroupDTO(creator, [genHousingDTO()]));

describe('CreateCampaignFromGroupModal', () => {
  function renderModal(stepper?: { currentStep: number; stepCount: number }) {
    render(
      <Provider store={configureTestStore()}>
        <modal.Component group={group} stepper={stepper} onSubmit={vi.fn()} />
      </Provider>
    );
    modal.open();
  }

  it('should not render a stepper by default', async () => {
    renderModal();

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByText(/Étape \d sur \d/)
    ).not.toBeInTheDocument();
  });

  it('should render a stepper when the stepper prop is provided', async () => {
    renderModal({ currentStep: 2, stepCount: 2 });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Étape 2 sur 2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn nx test frontend -- CreateCampaignFromGroupModal.test.tsx`
Expected: FAIL on the second test — `stepper` is not a recognized prop yet, and no `Stepper` is rendered.

- [ ] **Step 3: Implement the prop**

In `frontend/src/components/Group/CreateCampaignFromGroupModal.tsx`, add the import (alongside the other `@codegouvfr/react-dsfr` imports at the top):

```ts
import Stepper from '@codegouvfr/react-dsfr/Stepper';
```

Update `CreateCampaignFromGroupModalProps` (lines 24-30):

```ts
export type CreateCampaignFromGroupModalProps = Omit<
  ConfirmationModalProps,
  'title' | 'children' | 'onSubmit'
> & {
  group: Group;
  stepper?: { currentStep: number; stepCount: number };
  onSubmit(campaign: Pick<Campaign, 'title' | 'description' | 'sentAt'>): void;
};
```

Update the destructure inside `Component` (line 51):

```ts
const { group, stepper, onSubmit, ...rest } = props;
```

Insert the `Stepper` right after the opening `<modal.Component ...>` tag and before the housing/owner-count `Stack` (currently lines 74-87):

```tsx
      const component = (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <modal.Component
            size="large"
            {...rest}
            onClose={form.reset}
            title="Créer une campagne"
          >
            {stepper && (
              <Stepper
                currentStep={stepper.currentStep}
                stepCount={stepper.stepCount}
                title="Créer une campagne"
              />
            )}

            <Stack
              direction="row"
              spacing="1rem"
              useFlexGap
              sx={{ mt: '-1rem', mb: '0.5rem' }}
            >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn nx test frontend -- CreateCampaignFromGroupModal.test.tsx`
Expected: PASS — both tests pass.

Run: `yarn nx test frontend -- GroupView.test.tsx`
Expected: PASS — the existing "Create a campaign from the group" tests are unaffected since `GroupNext.tsx` doesn't pass `stepper`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Group/CreateCampaignFromGroupModal.tsx frontend/src/components/Group/test/CreateCampaignFromGroupModal.test.tsx
git commit -m "feat: support an optional stepper header in CreateCampaignFromGroupModal"
```

---

### Task 5: Frontend — `SelectGroupModal` (step 1: search & select a group)

**Files:**

- Create: `frontend/src/components/Campaign/SelectGroupModal.tsx`
- Test: `frontend/src/components/Campaign/test/SelectGroupModal.test.tsx` (new)

**Interfaces:**

- Consumes: `useFindGroupsQuery()` from `~/services/group.service` (existing, returns `{ data?: Group[] }`); `AppSearchBar` from `~/components/_app/AppSearchBar/AppSearchBar` (prop `onSearch(text: string): void`); `AdvancedTable` from `~/components/AdvancedTable/AdvancedTable` with the new `perPageOptions`/`defaultPageSize` props from Task 2; `createExtendedModal` from `~/components/modals/ConfirmationModal/ExtendedModal`; DSFR `Stepper`.
- Produces: `createSelectGroupModal(options?): { Component(props: { onSelect(group: Group): void }): JSX.Element; open(): void; close(): void; id: string }`. Task 6 imports `createSelectGroupModal` as the default export and calls `.open()`/`.close()`/renders `.Component`.

RGAA notes for this task: the table's "Action" column re-uses `AdvancedTable`'s existing `<th scope="col">` header semantics (criterion 5.6/5.7, already satisfied by `AdvancedTable`); each row's "Sélectionner" button gets a distinguishing `aria-label` (criterion 6.1/11.9 — a screen reader user tabbing through rows must be able to tell them apart, not hear "Sélectionner" repeated identically); the search input's label comes from `AppSearchBar`'s existing `<label htmlFor>` wiring (criterion 11.1/11.4, already satisfied).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/Campaign/test/SelectGroupModal.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import createSelectGroupModal from '~/components/Campaign/SelectGroupModal';
import data from '~/mocks/handlers/data';
import configureTestStore from '~/utils/storeUtils';

const selectGroupModal = createSelectGroupModal();
const creator = genUserDTO();

describe('SelectGroupModal', () => {
  const user = userEvent.setup();

  function renderModal(onSelect = vi.fn()) {
    render(
      <Provider store={configureTestStore()}>
        <selectGroupModal.Component onSelect={onSelect} />
      </Provider>
    );
    selectGroupModal.open();
  }

  it('should exclude archived and empty groups from the list', async () => {
    const housings = [genHousingDTO()];
    const eligible = genGroupDTO(creator, housings);
    const archived = {
      ...genGroupDTO(creator, housings),
      archivedAt: new Date().toJSON()
    };
    const empty = genGroupDTO(creator, []);
    data.groups.push(eligible, archived, empty);

    renderModal();

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(eligible.title);
    expect(within(dialog).queryByText(archived.title)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(empty.title)).not.toBeInTheDocument();
  });

  it('should filter groups by a case-insensitive substring match on submit', async () => {
    const housings = [genHousingDTO()];
    const match = { ...genGroupDTO(creator, housings), title: 'URBA-EXP' };
    const nonMatch = {
      ...genGroupDTO(creator, housings),
      title: 'CITE-AVENIR'
    };
    data.groups.push(match, nonMatch);

    renderModal();

    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText(match.title);
    const input = within(dialog).getByRole('searchbox', {
      name: 'Rechercher un groupe'
    });
    await user.type(input, 'urba');
    const searchButton = within(dialog).getByRole('button', {
      name: 'Rechercher'
    });
    await user.click(searchButton);

    await within(dialog).findByText(match.title);
    expect(within(dialog).queryByText(nonMatch.title)).not.toBeInTheDocument();
  });

  it('should sort groups by creation date, most recent first', async () => {
    const housings = [genHousingDTO()];
    const oldest = {
      ...genGroupDTO(creator, housings),
      title: 'Oldest',
      createdAt: new Date('2024-01-01').toJSON()
    };
    const newest = {
      ...genGroupDTO(creator, housings),
      title: 'Newest',
      createdAt: new Date('2024-06-01').toJSON()
    };
    const middle = {
      ...genGroupDTO(creator, housings),
      title: 'Middle',
      createdAt: new Date('2024-03-01').toJSON()
    };
    data.groups.push(oldest, newest, middle);

    renderModal();

    const dialog = await screen.findByRole('dialog');
    const table = await within(dialog).findByRole('table');
    await within(table).findByText('Newest');
    const rows = within(table).getAllByRole('row').slice(1);
    const titles = rows.map((row) => row.textContent);
    expect(titles[0]).toContain('Newest');
    expect(titles[1]).toContain('Middle');
    expect(titles[2]).toContain('Oldest');
  });

  it('should show no rows when the search matches nothing', async () => {
    const housings = [genHousingDTO()];
    data.groups.push({
      ...genGroupDTO(creator, housings),
      title: 'URBA-EXP'
    });

    renderModal();

    const dialog = await screen.findByRole('dialog');
    const table = await within(dialog).findByRole('table');
    const input = within(dialog).getByRole('searchbox', {
      name: 'Rechercher un groupe'
    });
    await user.type(input, 'no-match-at-all');
    const searchButton = within(dialog).getByRole('button', {
      name: 'Rechercher'
    });
    await user.click(searchButton);

    expect(within(table).queryAllByRole('row')).toHaveLength(1); // header row only
  });

  it('should call onSelect with the chosen group', async () => {
    const housings = [genHousingDTO()];
    const group = genGroupDTO(creator, housings);
    data.groups.push(group);
    const onSelect = vi.fn();

    renderModal(onSelect);

    const dialog = await screen.findByRole('dialog');
    const selectButton = await within(dialog).findByRole('button', {
      name: `Sélectionner le groupe ${group.title}`
    });
    await user.click(selectButton);

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: group.id, title: group.title })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn nx test frontend -- SelectGroupModal.test.tsx`
Expected: FAIL — the module `~/components/Campaign/SelectGroupModal` does not exist yet.

- [ ] **Step 3: Implement `SelectGroupModal`**

Create `frontend/src/components/Campaign/SelectGroupModal.tsx`:

```tsx
import Button from '@codegouvfr/react-dsfr/Button';
import Stepper from '@codegouvfr/react-dsfr/Stepper';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import AppSearchBar from '~/components/_app/AppSearchBar/AppSearchBar';
import AdvancedTable from '~/components/AdvancedTable/AdvancedTable';
import {
  createExtendedModal,
  type ExtendedModalOptions
} from '~/components/modals/ConfirmationModal/ExtendedModal';
import type { Group } from '~/models/Group';
import { useFindGroupsQuery } from '~/services/group.service';

export type SelectGroupModalOptions = Partial<ExtendedModalOptions>;

export interface SelectGroupModalProps {
  onSelect(group: Group): void;
}

const columnHelper = createColumnHelper<Group>();

function isEligible(group: Group): boolean {
  return group.archivedAt === null && group.housingCount > 0;
}

export function createSelectGroupModal(
  options?: Readonly<SelectGroupModalOptions>
) {
  const modal = createExtendedModal({
    id: options?.id ?? 'select-group-modal',
    isOpenedByDefault: options?.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props: Readonly<SelectGroupModalProps>) {
      const { data: groups } = useFindGroupsQuery();
      const [searchText, setSearchText] = useState<string>('');

      const filteredGroups = useMemo(() => {
        const eligible = (groups ?? []).filter(isEligible);
        const matches = searchText
          ? eligible.filter((group) =>
              group.title.toLowerCase().includes(searchText.toLowerCase())
            )
          : eligible;
        return [...matches].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
      }, [groups, searchText]);

      const columns = useMemo(
        () => [
          columnHelper.accessor('title', {
            header: 'Nom du groupe'
          }),
          columnHelper.display({
            id: 'actions',
            header: 'Action',
            cell: ({ row }) => (
              <Button
                priority="secondary"
                size="small"
                title={`Sélectionner le groupe ${row.original.title}`}
                nativeButtonProps={{
                  'aria-label': `Sélectionner le groupe ${row.original.title}`
                }}
                onClick={() => props.onSelect(row.original)}
              >
                Sélectionner
              </Button>
            )
          })
        ],
        [props]
      );

      function search(text: string): void {
        setSearchText(text);
      }

      return (
        <modal.Component
          title="Enregistrer une campagne"
          size="large"
          onClose={() => setSearchText('')}
        >
          <Stepper
            currentStep={1}
            stepCount={2}
            title="Sélectionner le groupe de logements"
            nextTitle="Créer une campagne"
          />

          <AppSearchBar label="Rechercher un groupe" onSearch={search} />

          <AdvancedTable
            caption="Groupes de logements"
            columns={columns}
            data={filteredGroups}
            perPageOptions={[5, 10, 50]}
            defaultPageSize={5}
            tableProps={{ noCaption: true }}
          />
        </modal.Component>
      );
    }
  };
}

export default createSelectGroupModal;
```

Note: `modal.Component`'s `buttons` prop is intentionally omitted — DSFR's `ModalProps['buttons']` type does not accept an empty array, and the step-1 mockup's action zone has no footer buttons (selection happens per-row via "Sélectionner").

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn nx test frontend -- SelectGroupModal.test.tsx`
Expected: PASS — all five tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Campaign/SelectGroupModal.tsx frontend/src/components/Campaign/test/SelectGroupModal.test.tsx
git commit -m "feat: add SelectGroupModal for searching and selecting a group"
```

---

### Task 6: Frontend — `SaveCampaignFlow` orchestrator + entry point

**Files:**

- Create: `frontend/src/components/Campaign/SaveCampaignFlow.tsx`
- Modify: `frontend/src/components/Campaign/CampaignTable.tsx`
- Test: `frontend/src/components/Campaign/test/SaveCampaignFlow.test.tsx` (new)

**Interfaces:**

- Consumes: `createSelectGroupModal` (default export, Task 5); `createCampaignFromGroupModal` from `~/components/Group/CreateCampaignFromGroupModal` (existing, extended in Task 4); `useCreateCampaignFromGroupMutation` from `~/services/campaign.service` (existing); `useUser()` from `~/hooks/useUser`; `useNotification` from `~/hooks/useNotification`.
- Produces: `SaveCampaignFlow` — a self-contained default-exported component with no props, rendering its own trigger button and both modal instances. `CampaignTable.tsx` mounts `<SaveCampaignFlow />` with no wiring required.

RGAA notes: the new button follows the same DSFR `Button` + `iconId` pattern already used throughout the app (criterion 1.1, decorative icon paired with visible text, no bare icon-only button); the two chained modals rely on DSFR's own focus-trap/`aria-modal` handling for each dialog (criterion 7.1/7.3/12.8), unchanged from the existing `HousingCreationModal.tsx` precedent — no custom focus management is introduced.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/Campaign/test/SaveCampaignFlow.test.tsx`:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole } from '@zerologementvacant/models';
import {
  genEstablishmentDTO,
  genGroupDTO,
  genHousingDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { Provider } from 'react-redux';

import SaveCampaignFlow from '~/components/Campaign/SaveCampaignFlow';
import data from '~/mocks/handlers/data';
import { fromEstablishmentDTO } from '~/models/Establishment';
import { fromUserDTO } from '~/models/User';
import { genAuthUser } from '~/test/fixtures';
import configureTestStore from '~/utils/storeUtils';

describe('SaveCampaignFlow', () => {
  const user = userEvent.setup();
  const establishment = genEstablishmentDTO();
  const creator = genUserDTO(UserRole.USUAL, establishment);

  function renderFlow(role: UserRole = UserRole.USUAL) {
    const authDTO = genUserDTO(role, establishment);
    const store = configureTestStore({
      auth: genAuthUser(
        fromUserDTO(authDTO),
        fromEstablishmentDTO(establishment)
      )
    });

    render(
      <Provider store={store}>
        <SaveCampaignFlow />
      </Provider>
    );
  }

  it('should hide the button for a visitor', () => {
    renderFlow(UserRole.VISITOR);

    expect(
      screen.queryByRole('button', { name: 'Enregistrer une campagne' })
    ).not.toBeInTheDocument();
  });

  it('should show the button for a usual user', () => {
    renderFlow(UserRole.USUAL);

    expect(
      screen.getByRole('button', { name: 'Enregistrer une campagne' })
    ).toBeInTheDocument();
  });

  it('should create a campaign from a group selected in step 1', async () => {
    const group = genGroupDTO(creator, [genHousingDTO()]);
    data.groups.push(group);

    renderFlow();

    const openButton = screen.getByRole('button', {
      name: 'Enregistrer une campagne'
    });
    await user.click(openButton);

    const selectDialog = await screen.findByRole('dialog');
    const selectButton = await within(selectDialog).findByRole('button', {
      name: `Sélectionner le groupe ${group.title}`
    });
    await user.click(selectButton);

    const createDialog = await screen.findByRole('dialog');
    await within(createDialog).findByText('Étape 2 sur 2');
    const title = await within(createDialog).findByLabelText(/^Nom/);
    await user.type(title, 'Ma campagne');
    const confirm = await within(createDialog).findByText('Confirmer');
    await user.click(confirm);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(data.campaigns).toContainEqual(
      expect.objectContaining({
        title: 'Ma campagne',
        groupId: group.id
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn nx test frontend -- SaveCampaignFlow.test.tsx`
Expected: FAIL — the module `~/components/Campaign/SaveCampaignFlow` does not exist yet.

- [ ] **Step 3: Implement `SaveCampaignFlow`**

Create `frontend/src/components/Campaign/SaveCampaignFlow.tsx`:

```tsx
import Button from '@codegouvfr/react-dsfr/Button';
import { useState } from 'react';

import { createCampaignFromGroupModal } from '~/components/Group/CreateCampaignFromGroupModal';
import { useNotification } from '~/hooks/useNotification';
import { useUser } from '~/hooks/useUser';
import type { Campaign } from '~/models/Campaign';
import type { Group } from '~/models/Group';
import { useCreateCampaignFromGroupMutation } from '~/services/campaign.service';

import createSelectGroupModal from './SelectGroupModal';

const selectGroupModal = createSelectGroupModal();
const campaignFromGroupModal = createCampaignFromGroupModal({
  id: 'save-campaign-from-group-modal'
});

function SaveCampaignFlow() {
  const { isAdmin, isUsual } = useUser();
  const canCreateCampaign = isAdmin || isUsual;

  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const [createCampaignFromGroup, createCampaignFromGroupMutation] =
    useCreateCampaignFromGroupMutation();

  useNotification({
    toastId: 'save-campaign-from-group',
    isError: createCampaignFromGroupMutation.isError,
    isLoading: createCampaignFromGroupMutation.isLoading,
    isSuccess: createCampaignFromGroupMutation.isSuccess,
    message: {
      error: 'Erreur lors de la création de la campagne',
      loading: 'Création de la campagne...',
      success: 'La campagne a été ajoutée'
    }
  });

  function handleGroupSelect(group: Group): void {
    setSelectedGroup(group);
    selectGroupModal.close();
    campaignFromGroupModal.open();
  }

  function handleCampaignSubmit(
    campaign: Pick<Campaign, 'title' | 'description' | 'sentAt'>
  ): void {
    if (selectedGroup) {
      createCampaignFromGroup({ campaign, group: selectedGroup })
        .unwrap()
        .then(() => {
          campaignFromGroupModal.close();
          setSelectedGroup(null);
        });
    }
  }

  if (!canCreateCampaign) {
    return null;
  }

  return (
    <>
      <Button
        iconId="fr-icon-save-line"
        priority="primary"
        onClick={selectGroupModal.open}
      >
        Enregistrer une campagne
      </Button>

      <selectGroupModal.Component onSelect={handleGroupSelect} />

      {selectedGroup && (
        <campaignFromGroupModal.Component
          group={selectedGroup}
          stepper={{ currentStep: 2, stepCount: 2 }}
          onSubmit={handleCampaignSubmit}
        />
      )}
    </>
  );
}

export default SaveCampaignFlow;
```

Then, in `frontend/src/components/Campaign/CampaignTable.tsx`, add the import (alongside the other local imports at the bottom of the import block):

```ts
import SaveCampaignFlow from './SaveCampaignFlow';
```

And mount it as a second child of the toolbar `Stack` (currently lines 197-216):

```tsx
<Stack
  direction="row"
  sx={{
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    mb: '-1rem'
  }}
>
  {campaigns && (
    <Typography
      variant="body2"
      sx={{ color: fr.colors.decisions.text.mention.grey.default }}
    >
      {displayCount(campaigns.length, 'campagne', {
        capitalize: true,
        feminine: true
      })}
    </Typography>
  )}

  <SaveCampaignFlow />
</Stack>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn nx test frontend -- SaveCampaignFlow.test.tsx`
Expected: PASS — all three tests pass.

Run: `yarn nx test frontend -- CampaignListView.test.tsx`
Expected: PASS — the existing `CampaignListView` tests are unaffected (the new button renders for the `USUAL` auth user those tests already use, but none of them assert on the toolbar's exact children count).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Campaign/SaveCampaignFlow.tsx frontend/src/components/Campaign/CampaignTable.tsx frontend/src/components/Campaign/test/SaveCampaignFlow.test.tsx
git commit -m "feat: add \"Enregistrer une campagne\" button to the campaigns list"
```

---

### Task 7: Full regression pass + RGAA self-review

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Run the full frontend suite**

Run: `yarn nx test frontend`
Expected: PASS — no regressions in `CampaignListView.test.tsx`, `GroupView.test.tsx`, `GroupHeader.test.tsx`, or any other suite touching `AdvancedTable`, `CreateCampaignFromGroupModal`, or `GroupNext`.

- [ ] **Step 2: Run the full backend suite**

Run: `yarn nx test server -- campaign-api.test.ts`
Expected: PASS — all `Campaign API` tests, including the new visitor-forbidden case.

- [ ] **Step 3: Typecheck both workspaces**

Run: `yarn nx typecheck frontend` and `yarn nx typecheck server`
Expected: PASS — no type errors from the new `stepper`/`perPageOptions`/`defaultPageSize` optional props.

- [ ] **Step 4: Manual RGAA self-review**

Per `.claude/rules/rgaa-accessibility.md`, manually verify in a running dev server (`yarn workspace @zerologementvacant/front dev`):

- Keyboard-only navigation through both modal steps (Tab/Shift+Tab/Enter/Escape) — no keyboard trap, focus lands sensibly in step 2 after step 1 closes (criteria 7.1, 7.3, 12.8, 12.9).
- Focus indicator visibility on the search input, table row buttons, and stepper (criterion 10.7).
- Screen-reader announcement of the two distinct "Sélectionner le groupe X" button labels (criterion 6.1, 11.9).
- Visual comparison of both modal steps against the Figma screenshots (`16477:62849`, `16477:64023`) for 1:1 parity.

Report any finding using the format mandated in `.claude/rules/rgaa-accessibility.md` (`⚠️ RGAA (critère N.M — sujet)`).

- [ ] **Step 5: Commit (if any fixes were needed)**

Only if Step 4 surfaced an issue requiring a code change:

```bash
git add <changed files>
git commit -m "fix: address RGAA finding in save-campaign flow"
```
