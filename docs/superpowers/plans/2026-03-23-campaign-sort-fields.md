# Campaign Sort Fields Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow sorting campaigns by `title`, `housingCount`, `ownerCount`, `sentAt`, `returnCount`, and `returnRate` server-side.

**Architecture:** All six fields are stored columns on the `campaigns` table (`housing_count`, `owner_count`, `return_count` are trigger-maintained integers; `return_rate` is a `GENERATED ALWAYS AS STORED` float). Backend: extend `CampaignSortableApi` and add `orderBy` handlers in `campaignSortQuery`. Frontend: extend `CampaignSortable` / `isCampaignSortable`, add Ord functions to models, update the MSW handler, add `meta.sort` to four columns, and add view-level sort tests.

**Tech Stack:** TypeScript, Knex, TanStack Table, Vitest, Supertest, MSW

---

### Task 1: Extend `CampaignSortableApi`

**Files:**
- Modify: `server/src/models/CampaignApi.ts:72-78`

No test needed — TypeScript enforces correctness at compile time. The change propagates to `CampaignSortApi` automatically.

**Step 1: Update the type**

Replace the current `CampaignSortableApi` definition:

```typescript
export type CampaignSortableApi = Sort<
  Pick<
    CampaignApi,
    | 'title'
    | 'createdAt'
    | 'sentAt'
    | 'housingCount'
    | 'ownerCount'
    | 'returnCount'
    | 'returnRate'
  > & {
    status: string;
  }
>;
export type CampaignSortApi = Sort<CampaignSortableApi>;
```

**Step 2: Typecheck**

```bash
yarn nx typecheck server
```

Expected: no errors.

**Step 3: Commit**

```bash
git add server/src/models/CampaignApi.ts
git commit -m "feat(server): extend CampaignSortableApi with housingCount, ownerCount, returnCount, returnRate"
```

---

### Task 2: Write failing API sort tests

**Files:**
- Modify: `server/src/controllers/test/campaign-api.test.ts`

Add a new `describe('sorting')` block inside the existing `describe('GET /campaigns')` block (after the `'should filter by group'` test, before the closing `}`).

**Step 1: Add the failing tests**

```typescript
describe('sorting', () => {
  let campaigns: CampaignApi[];

  beforeEach(async () => {
    campaigns = Array.from({ length: 3 }).map(() =>
      genCampaignApi(establishment.id, user)
    );
    await Campaigns().insert(campaigns.map(formatCampaignApi));
    // Set distinct sortable values directly (triggers won't fire in test setup)
    await Promise.all([
      Campaigns()
        .where({ id: campaigns[0].id })
        .update({ housing_count: 10, owner_count: 5, return_count: 1 }),
      Campaigns()
        .where({ id: campaigns[1].id })
        .update({ housing_count: 20, owner_count: 3, return_count: 4 }),
      Campaigns()
        .where({ id: campaigns[2].id })
        .update({ housing_count: 5, owner_count: 8, return_count: 2 })
    ]);
  });

  it('should sort by housingCount ascending', async () => {
    const { body, status } = await request(url)
      .get('/api/campaigns')
      .query('sort=housingCount')
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
    const ids = body.map((c: CampaignDTO) => c.id);
    expect(ids).toEqual([
      campaigns[2].id, // housing_count: 5
      campaigns[0].id, // housing_count: 10
      campaigns[1].id  // housing_count: 20
    ]);
  });

  it('should sort by ownerCount descending', async () => {
    const { body, status } = await request(url)
      .get('/api/campaigns')
      .query('sort=-ownerCount')
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
    const ids = body.map((c: CampaignDTO) => c.id);
    expect(ids).toEqual([
      campaigns[2].id, // owner_count: 8
      campaigns[0].id, // owner_count: 5
      campaigns[1].id  // owner_count: 3
    ]);
  });

  it('should sort by returnCount ascending', async () => {
    const { body, status } = await request(url)
      .get('/api/campaigns')
      .query('sort=returnCount')
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
    const ids = body.map((c: CampaignDTO) => c.id);
    expect(ids).toEqual([
      campaigns[0].id, // return_count: 1
      campaigns[2].id, // return_count: 2
      campaigns[1].id  // return_count: 4
    ]);
  });

  it('should sort by returnRate ascending', async () => {
    // return_rate = return_count / housing_count (GENERATED ALWAYS AS)
    // campaigns[0]: 1/10 = 0.1
    // campaigns[1]: 4/20 = 0.2
    // campaigns[2]: 2/5  = 0.4
    const { body, status } = await request(url)
      .get('/api/campaigns')
      .query('sort=returnRate')
      .use(tokenProvider(user));

    expect(status).toBe(constants.HTTP_STATUS_OK);
    const ids = body.map((c: CampaignDTO) => c.id);
    expect(ids).toEqual([
      campaigns[0].id, // 0.1
      campaigns[1].id, // 0.2
      campaigns[2].id  // 0.4
    ]);
  });
});
```

**Step 2: Run to verify they fail**

```bash
yarn nx test server -- campaign-api
```

Expected: 4 failing tests — the sort fields are not handled, so the default `created_at desc` order is applied instead.

---

### Task 3: Add sort keys to `campaignSortQuery`

**Files:**
- Modify: `server/src/repositories/campaignRepository.ts:67-81`

**Step 1: Add the four new keys**

Inside `campaignSortQuery`, extend the `keys` object:

```typescript
const campaignSortQuery = (sort?: CampaignSortApi) =>
  sortQuery(sort, {
    keys: {
      title: (query) => query.orderBy(`${campaignsTable}.title`, sort?.title),
      createdAt: (query) =>
        query.orderBy(`${campaignsTable}.created_at`, sort?.createdAt),
      sentAt: (query) =>
        query.orderBy(`${campaignsTable}.sent_at`, sort?.sentAt),
      status: (query) =>
        query.orderByRaw(
          `(case ${campaignsTable}.status when 'archived' then 3 when 'in-progress' then 2 when 'sending' then 1 else 0 end) ${sort?.status}`
        ),
      housingCount: (query) =>
        query.orderBy(`${campaignsTable}.housing_count`, sort?.housingCount),
      ownerCount: (query) =>
        query.orderBy(`${campaignsTable}.owner_count`, sort?.ownerCount),
      returnCount: (query) =>
        query.orderBy(`${campaignsTable}.return_count`, sort?.returnCount),
      returnRate: (query) =>
        query.orderByRaw(
          `${campaignsTable}.return_rate ${sort?.returnRate} NULLS LAST`
        )
    },
    default: (query) => query.orderBy('created_at', 'desc')
  });
```

**Step 2: Run tests to verify they pass**

```bash
yarn nx test server -- campaign-api
```

Expected: all 4 new sort tests pass.

**Step 3: Commit**

```bash
git add server/src/repositories/campaignRepository.ts \
        server/src/controllers/test/campaign-api.test.ts
git commit -m "feat(server): add housingCount, ownerCount, returnCount, returnRate sort to campaigns"
```

---

### Task 4: Add Ord functions to models + extend frontend sort types + update MSW handler

Three files need updating so the MSW mock can sort by the new fields in frontend tests.

**Files:**
- Modify: `packages/models/src/CampaignDTO.ts`
- Modify: `frontend/src/models/Campaign.tsx`
- Modify: `frontend/src/mocks/handlers/campaign-handlers.ts`

**Step 1: Add Ord comparators to `packages/models/src/CampaignDTO.ts`**

Add after the existing `bySentAt` export:

```typescript
export const byHousingCount: Ord<CampaignDTO> = contramap(
  (campaign: CampaignDTO) => campaign.housingCount
)(DEFAULT_ORDER);

export const byOwnerCount: Ord<CampaignDTO> = contramap(
  (campaign: CampaignDTO) => campaign.ownerCount
)(DEFAULT_ORDER);

export const byReturnCount: Ord<CampaignDTO> = contramap(
  (campaign: CampaignDTO) => campaign.returnCount ?? 0
)(DEFAULT_ORDER);

export const byReturnRate: Ord<CampaignDTO> = contramap(
  (campaign: CampaignDTO) => campaign.returnRate ?? 0
)(DEFAULT_ORDER);
```

**Step 2: Extend `CampaignSortable` and `isCampaignSortable` in `frontend/src/models/Campaign.tsx`**

Replace the current definitions:

```typescript
export type CampaignSortable = Pick<
  Campaign,
  'title' | 'createdAt' | 'sentAt' | 'housingCount' | 'ownerCount' | 'returnCount' | 'returnRate'
> & {
  status: string;
};
export type CampaignSort = Sort<CampaignSortable>;

export function isCampaignSortable(key: string): key is keyof CampaignSortable {
  return [
    'title',
    'status',
    'createdAt',
    'sentAt',
    'housingCount',
    'ownerCount',
    'returnCount',
    'returnRate'
  ].includes(key);
}
```

**Step 3: Update the MSW `sort` function in `frontend/src/mocks/handlers/campaign-handlers.ts`**

Add the new imports at the top:

```typescript
import {
  byCreatedAt,
  byHousingCount,
  byOwnerCount,
  byReturnCount,
  byReturnRate,
  bySentAt,
  byStatus,
  byTitle,
  // ...existing imports
} from '@zerologementvacant/models';
```

Update the `ordering` map inside `sort()`:

```typescript
const ordering: Partial<Record<keyof CampaignSortable, Ord<CampaignDTO>>> = {
  title: byTitle,
  status: byStatus,
  createdAt: byCreatedAt,
  sentAt: bySentAt,
  housingCount: byHousingCount,
  ownerCount: byOwnerCount,
  returnCount: byReturnCount,
  returnRate: byReturnRate
};
```

**Step 4: Typecheck**

```bash
yarn nx typecheck frontend
yarn nx run-many -t typecheck --projects=models
```

Expected: no errors.

**Step 5: Commit**

```bash
git add packages/models/src/CampaignDTO.ts \
        frontend/src/models/Campaign.tsx \
        frontend/src/mocks/handlers/campaign-handlers.ts
git commit -m "feat(models): add Ord comparators for campaign housingCount, ownerCount, returnCount, returnRate"
```

---

### Task 5: Write failing frontend sort tests

**Files:**
- Modify: `frontend/src/views/Campaign/test/CampaignListViewNext.test.tsx`

**Step 1: Update `renderView` to accept and use `options.campaigns`**

Replace the campaigns generation inside `renderView`:

```typescript
function renderView(options?: RenderViewOptions) {
  const establishment = options?.establishment ?? genEstablishmentDTO();
  const auth = options?.auth ?? genUserDTO(UserRole.USUAL, establishment);
  const housings = faker.helpers.multiple(() => genHousingDTO(), {
    count: { min: 1, max: 10 }
  });
  const group = genGroupDTO(auth, housings);
  const campaigns =
    options?.campaigns ??
    faker.helpers.multiple(() => genCampaignDTO(group, auth));

  data.establishments.push(establishment);
  data.users.push(auth);
  data.campaigns.push(...campaigns);
  // ... rest unchanged
}
```

**Step 2: Add failing tests for the new sort columns**

Replace the empty `// TODO` blocks for `Housing count`, `Owner count`, `Sending date`, `Return count`, `Return rate`:

```typescript
describe('Housing count', () => {
  it('should sort by housing count ascending', async () => {
    renderView({
      campaigns: [
        { ...genCampaignDTO(), housingCount: 10 },
        { ...genCampaignDTO(), housingCount: 3 },
        { ...genCampaignDTO(), housingCount: 7 }
      ]
    });

    const table = await screen.findByRole('table');
    const sort = await within(table).findByRole('button', {
      name: 'Trier par nombre de logements'
    });

    await user.click(sort);

    const cells = await within(table).findAllByText(/^\d+ logements?$/);
    const counts = cells.map((cell) => Number(cell.textContent?.split(' ')[0]));
    expect(counts.length).toBeGreaterThan(0);
    expect(counts).toBeSorted();
  });
});

describe('Owner count', () => {
  it('should sort by owner count ascending', async () => {
    renderView({
      campaigns: [
        { ...genCampaignDTO(), ownerCount: 8 },
        { ...genCampaignDTO(), ownerCount: 2 },
        { ...genCampaignDTO(), ownerCount: 5 }
      ]
    });

    const table = await screen.findByRole('table');
    const sort = await within(table).findByRole('button', {
      name: 'Trier par nombre de propriétaires'
    });

    await user.click(sort);

    const cells = await within(table).findAllByText(/^\d+ propriétaires?$/);
    const counts = cells.map((cell) => Number(cell.textContent?.split(' ')[0]));
    expect(counts.length).toBeGreaterThan(0);
    expect(counts).toBeSorted();
  });
});

describe('Sending date', () => {
  it('should sort by sending date ascending', async () => {
    renderView({
      campaigns: [
        { ...genCampaignDTO(), sentAt: '2024-03-15' },
        { ...genCampaignDTO(), sentAt: '2024-01-10' },
        { ...genCampaignDTO(), sentAt: '2024-06-01' }
      ]
    });

    const table = await screen.findByRole('table');
    const sort = await within(table).findByRole('button', {
      name: 'Trier par date d\u2019envoi'
    });

    await user.click(sort);

    // sentAt column shows dd/MM/yyyy; createdAt also shows dates — filter to
    // cells that are in the sentAt column by finding the column index
    const headers = await within(table).findAllByRole('columnheader');
    const sentAtIndex = headers.findIndex(
      (h) => h.textContent === 'Date d\u2019envoi'
    );
    const rows = await within(table).findAllByRole('row');
    const dataRows = rows.slice(1); // skip header
    const dates = dataRows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      return cells[sentAtIndex]?.textContent ?? '';
    });
    expect(dates.filter(Boolean).length).toBeGreaterThan(0);
    expect(dates.filter(Boolean)).toBeSorted({
      compare: (a: string, b: string) => {
        const parse = (d: string) =>
          new Date(d.split('/').reverse().join('-'));
        return Order.mapInput(parse)(Order.Date)(a, b);
      }
    });
  });
});

describe('Return count', () => {
  it('should sort by return count ascending', async () => {
    renderView({
      campaigns: [
        { ...genCampaignDTO(), sentAt: '2024-01-01', housingCount: 10, returnCount: 5, returnRate: 0.5 },
        { ...genCampaignDTO(), sentAt: '2024-01-01', housingCount: 10, returnCount: 1, returnRate: 0.1 },
        { ...genCampaignDTO(), sentAt: '2024-01-01', housingCount: 10, returnCount: 3, returnRate: 0.3 }
      ]
    });

    const table = await screen.findByRole('table');
    const sort = await within(table).findByRole('button', {
      name: 'Trier par nombre de retours'
    });

    await user.click(sort);

    const cells = await within(table).findAllByText(/^\d+ retours$/);
    const counts = cells.map((cell) => Number(cell.textContent?.split(' ')[0]));
    expect(counts.length).toBeGreaterThan(0);
    expect(counts).toBeSorted();
  });
});

describe('Return rate', () => {
  it('should sort by return rate ascending', async () => {
    renderView({
      campaigns: [
        { ...genCampaignDTO(), sentAt: '2024-01-01', housingCount: 10, returnCount: 5, returnRate: 0.5 },
        { ...genCampaignDTO(), sentAt: '2024-01-01', housingCount: 10, returnCount: 1, returnRate: 0.1 },
        { ...genCampaignDTO(), sentAt: '2024-01-01', housingCount: 10, returnCount: 3, returnRate: 0.3 }
      ]
    });

    const table = await screen.findByRole('table');
    const sort = await within(table).findByRole('button', {
      name: 'Trier par taux de retour'
    });

    await user.click(sort);

    const cells = await within(table).findAllByText(/^\d+(\.\d+)? %$/);
    const rates = cells.map((cell) =>
      parseFloat(cell.textContent?.replace(' %', '') ?? '0')
    );
    expect(rates.length).toBeGreaterThan(0);
    expect(rates).toBeSorted();
  });
});
```

**Step 3: Run to verify they fail**

```bash
yarn nx test frontend -- CampaignListViewNext
```

Expected: 5 new failing tests — sort buttons don't exist yet because `meta.sort` is missing from the columns.

---

### Task 6: Add sort metadata to frontend columns

**Files:**
- Modify: `frontend/src/components/Campaign/CampaignTableNext.tsx`

**Step 1: Add `meta.sort` to the four columns**

The four `columnHelper.accessor` calls for `housingCount`, `ownerCount`, `returnCount`, `returnRate` currently have no `meta` property. Add it to each:

```typescript
columnHelper.accessor('housingCount', {
  header: 'Logements',
  meta: {
    sort: { title: 'Trier par nombre de logements' }
  },
  cell: ({ cell }) =>
    `${cell.getValue()} logement${cell.getValue() > 1 ? 's' : ''}`
}),
columnHelper.accessor('ownerCount', {
  header: 'Propriétaires',
  meta: {
    sort: { title: 'Trier par nombre de propriétaires' }
  },
  cell: ({ cell }) =>
    `${cell.getValue()} propriétaire${cell.getValue() > 1 ? 's' : ''}`
}),
columnHelper.accessor('returnCount', {
  header: 'Retours',
  meta: {
    sort: { title: 'Trier par nombre de retours' }
  },
  cell: ({ cell, row }) => {
    const value = `${cell.getValue()} retours`;
    return row.original.sentAt ? value : <WaitingBadge />;
  }
}),
columnHelper.accessor('returnRate', {
  header: 'Taux de retour',
  meta: {
    sort: { title: 'Trier par taux de retour' }
  },
  cell: ({ cell, row }) => {
    if (!row.original.sentAt) {
      return <WaitingBadge />;
    }
    const value = cell.getValue();
    if (!value) {
      return null;
    }
    const formatted = pipe(
      value,
      Number.round(2),
      Number.multiply(100),
      (n) => `${n} %`
    );
    return formatted;
  }
}),
```

**Step 2: Run frontend tests to verify they pass**

```bash
yarn nx test frontend -- CampaignListViewNext
```

Expected: all 5 new sort tests pass.

**Step 3: Typecheck**

```bash
yarn nx typecheck frontend
```

Expected: no errors.

**Step 4: Commit**

```bash
git add frontend/src/components/Campaign/CampaignTableNext.tsx \
        frontend/src/views/Campaign/test/CampaignListViewNext.test.tsx
git commit -m "feat(frontend): enable sorting on housingCount, ownerCount, returnCount, returnRate columns"
```

---

### Task 7: Final verification

**Step 1: Run full server test suite**

```bash
yarn nx test server
```

Expected: all tests pass.

**Step 2: Run full frontend test suite**

```bash
yarn nx test frontend
```

Expected: all tests pass.
