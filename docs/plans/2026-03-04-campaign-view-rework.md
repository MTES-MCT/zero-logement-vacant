# Campaign View Rework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the status-branching campaign view with a single unified layout, add a real-time return count backed by DB triggers, and gate `POST /campaigns` behind the `new-campaigns` feature flag on the server.

**Architecture:** Two DB triggers maintain `campaigns.return_count` incrementally (on `housing_events` insert) and via full recompute (on `campaigns.sent_at` change). The frontend new view (`CampaignViewNext`) is already wired behind the `new-campaigns` PostHog flag in `App.tsx`. See `docs/database/trigger-campaign-return-count.md` for trigger details and `docs/plans/2026-03-04-campaign-view-rework-design.md` for the full design rationale.

**Tech Stack:** TypeScript, Knex (migrations), Express, posthog-node, React, DSFR (`@codegouvfr/react-dsfr`), MUI, RTK Query, react-hook-form + yup, Vitest

---

## Task 1: Add `returnCount` to `CampaignDTO`

**Files:**
- Modify: `packages/models/src/CampaignDTO.ts`
- Modify: `packages/models/src/test/fixtures.ts`

**Step 1: Add the field to the DTO**

In `CampaignDTO.ts`, add to the `CampaignDTO` interface after `groupId`:

```typescript
returnCount: number | null;
```

`null` means `sentAt` is not set — the count is not meaningful yet.

**Step 2: Update the fixture**

In `fixtures.ts`, `genCampaignDTO` currently returns no `returnCount`. Add it:

```typescript
export function genCampaignDTO(group?: GroupDTO): CampaignDTO {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    filters: {},
    status: faker.helpers.arrayElement(CAMPAIGN_STATUS_VALUES),
    createdAt: faker.date.past().toJSON(),
    groupId: group?.id,
    returnCount: null   // add this
  };
}
```

**Step 3: Run typecheck across the monorepo**

```bash
yarn nx run-many -t typecheck
```

Expected: errors in `server/` and `frontend/` where `CampaignDTO` is used — these are fixed in subsequent tasks. The `packages/` themselves should pass.

**Step 4: Commit**

```bash
git add packages/models/src/CampaignDTO.ts packages/models/src/test/fixtures.ts
git commit -m "feat(models): add returnCount field to CampaignDTO"
```

---

## Task 2: DB migration — `return_count` column + triggers

**Files:**
- Create: `server/src/infra/database/migrations/20260304_campaigns-add-return-count.ts`

**Step 1: Write the migration**

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add the column
  await knex.schema.alterTable('campaigns', (table) => {
    table.integer('return_count').notNullable().defaultTo(0);
  });

  // 2. Backfill: compute return_count for campaigns that already have a sent_at.
  await knex.raw(`
    UPDATE campaigns c
    SET return_count = (
      SELECT COUNT(DISTINCT ch.housing_id)
      FROM campaigns_housing ch
      WHERE ch.campaign_id = c.id
        AND EXISTS (
          SELECT 1
          FROM housing_events he
          JOIN events e ON e.id = he.event_id
          WHERE he.housing_geo_code = ch.housing_geo_code
            AND he.housing_id       = ch.housing_id
            AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
            AND e.created_at        > c.sent_at
        )
    )
    WHERE c.sent_at IS NOT NULL
  `);

  // 3. Trigger 1: incremental +1 when a new housing event is inserted.
  //    See docs/database/trigger-campaign-return-count.md for full rationale.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION increment_campaign_return_count()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id       UUID;
      v_campaign_sent_at  TIMESTAMPTZ;
      already_counted     BOOLEAN;
      v_event_type        TEXT;
      v_event_created_at  TIMESTAMPTZ;
    BEGIN
      -- housing_events is a junction table; type and created_at live on events.
      SELECT e.type, e.created_at
      INTO v_event_type, v_event_created_at
      FROM events e
      WHERE e.id = NEW.event_id;

      IF v_event_type NOT IN ('housing:status-updated', 'housing:occupancy-updated') THEN
        RETURN NEW;
      END IF;

      FOR v_campaign_id, v_campaign_sent_at IN (
        SELECT c.id, c.sent_at
        FROM campaigns_housing ch
        JOIN campaigns c ON c.id = ch.campaign_id
        WHERE ch.housing_geo_code = NEW.housing_geo_code
          AND ch.housing_id       = NEW.housing_id
          AND c.sent_at IS NOT NULL
          AND v_event_created_at  > c.sent_at
      ) LOOP
        PERFORM id FROM campaigns WHERE id = v_campaign_id FOR UPDATE;

        SELECT EXISTS (
          SELECT 1
          FROM housing_events he
          JOIN events e ON e.id = he.event_id
          WHERE he.housing_geo_code = NEW.housing_geo_code
            AND he.housing_id       = NEW.housing_id
            AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
            AND e.created_at        > v_campaign_sent_at
            AND he.event_id        != NEW.event_id
        ) INTO already_counted;

        IF NOT already_counted THEN
          UPDATE campaigns
          SET return_count = return_count + 1
          WHERE id = v_campaign_id;
        END IF;
      END LOOP;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_increment_return_count
    AFTER INSERT ON housing_events
    FOR EACH ROW
    EXECUTE FUNCTION increment_campaign_return_count();
  `);

  // 4. Trigger 2: full recompute when sent_at changes.
  //    Needed because changing sent_at retroactively qualifies/disqualifies
  //    events already in the table — the incremental trigger cannot handle this.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION recompute_campaign_return_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.sent_at IS NOT DISTINCT FROM OLD.sent_at THEN
        RETURN NEW;
      END IF;

      IF NEW.sent_at IS NULL THEN
        UPDATE campaigns SET return_count = 0 WHERE id = NEW.id;
        RETURN NEW;
      END IF;

      UPDATE campaigns
      SET return_count = (
        SELECT COUNT(DISTINCT ch.housing_id)
        FROM campaigns_housing ch
        WHERE ch.campaign_id = NEW.id
          AND EXISTS (
            SELECT 1
            FROM housing_events he
            JOIN events e ON e.id = he.event_id
            WHERE he.housing_geo_code = ch.housing_geo_code
              AND he.housing_id       = ch.housing_id
              AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
              AND e.created_at        > NEW.sent_at
          )
      )
      WHERE id = NEW.id;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_recompute_return_count_on_sent_at_change
    AFTER UPDATE OF sent_at ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION recompute_campaign_return_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_recompute_return_count_on_sent_at_change ON campaigns');
  await knex.raw('DROP FUNCTION IF EXISTS recompute_campaign_return_count');
  await knex.raw('DROP TRIGGER IF EXISTS trg_increment_return_count ON housing_events');
  await knex.raw('DROP FUNCTION IF EXISTS increment_campaign_return_count');
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('return_count');
  });
}
```

**Step 2: Run the migration**

```bash
yarn workspace @zerologementvacant/server migrate
```

Expected: no errors.

**Step 3: Commit**

```bash
git add server/src/infra/database/migrations/20260304_campaigns-add-return-count.ts
git commit -m "feat(server): add return_count column and triggers to campaigns"
```

---

## Task 3: Expose `returnCount` in the campaign repository and API model

**Files:**
- Modify: `server/src/repositories/campaignRepository.ts`
- Modify: `server/src/models/CampaignApi.ts`

**Step 1: Write the failing repository tests**

In `server/src/repositories/test/campaignRepository.test.ts`, add:

```typescript
it('should expose returnCount from the database', async () => {
  const campaign = genCampaignApi({ sentAt: new Date().toJSON() });
  await Campaigns().insert({ ...formatCampaignApi(campaign), return_count: 5 });

  const result = await campaignRepository.findOne({
    id: campaign.id,
    establishmentId: campaign.establishmentId
  });

  expect(result?.returnCount).toBe(5);
});

it('should expose returnCount as null when sentAt is null', async () => {
  const campaign = genCampaignApi({ sentAt: undefined });
  await Campaigns().insert({ ...formatCampaignApi(campaign), return_count: 0 });

  const result = await campaignRepository.findOne({
    id: campaign.id,
    establishmentId: campaign.establishmentId
  });

  expect(result?.returnCount).toBeNull();
});
```

**Step 2: Run to verify failure**

```bash
yarn nx test server -- campaignRepository
```

Expected: FAIL — `returnCount` is undefined.

**Step 3: Update `CampaignDBO` — add the column**

In `campaignRepository.ts`, add to `CampaignDBO`:

```typescript
return_count: number;
```

**Step 4: Update `parseCampaignApi` — map to camelCase**

```typescript
returnCount: campaign.sent_at ? campaign.return_count : null,
```

**Step 5: Update `formatCampaignApi` — map back to snake_case**

```typescript
return_count: campaign.returnCount ?? 0,
```

**Step 6: Update `toCampaignDTO` in `CampaignApi.ts`**

Add `'returnCount'` to the `Struct.pick` call so it is included in API responses.

**Step 7: Run tests**

```bash
yarn nx test server -- campaignRepository
yarn nx typecheck server
```

Expected: all pass.

**Step 8: Commit**

```bash
git add server/src/repositories/campaignRepository.ts server/src/models/CampaignApi.ts
git commit -m "feat(server): map return_count to returnCount in campaign repository"
```

---

## Task 4: Gate `POST /campaigns` with the `new-campaigns` PostHog flag

**Files:**
- Create: `server/src/services/posthogService.ts`
- Modify: `server/src/infra/config.ts`
- Modify: `server/src/controllers/campaignController.ts`

**Step 1: Install posthog-node**

```bash
yarn workspace @zerologementvacant/server add posthog-node
```

**Step 2: Write the failing controller test**

In `server/src/controllers/test/campaign-api.test.ts`, add a block:

```typescript
describe('POST /campaigns when new-campaigns flag is enabled', () => {
  it('should return 404', async () => {
    // Arrange
    vi.spyOn(posthogService, 'isFeatureEnabled').mockResolvedValue(true);

    // Act
    const { status } = await request(app)
      .post('/api/campaigns')
      .use(tokenProvider(user))
      .send(validPayload);

    // Assert
    expect(status).toBe(constants.HTTP_STATUS_NOT_FOUND);
  });
});
```

**Step 3: Run to verify failure**

```bash
yarn nx test server -- campaign-api
```

Expected: FAIL — returns 200/201, not 404.

**Step 4: Add PostHog config**

In `server/src/infra/config.ts`, add under the existing config keys:

```typescript
posthog: {
  apiKey: {
    doc: 'PostHog API key',
    format: String,
    default: '',
    env: 'POSTHOG_API_KEY'
  },
  host: {
    doc: 'PostHog host',
    format: String,
    default: 'https://eu.i.posthog.com',
    env: 'POSTHOG_HOST'
  }
}
```

**Step 5: Create the PostHog service**

```typescript
// server/src/services/posthogService.ts
import { PostHog } from 'posthog-node';
import config from '~/infra/config';

const posthog = new PostHog(config.get('posthog.apiKey'), {
  host: config.get('posthog.host')
});

export async function isFeatureEnabled(
  flag: string,
  distinctId: string
): Promise<boolean> {
  return (await posthog.isFeatureEnabled(flag, distinctId)) === true;
}

export default posthog;
```

**Step 6: Add the flag check to the `create` controller**

At the very top of the `create` handler body, before any processing:

```typescript
const flagEnabled = await isFeatureEnabled('new-campaigns', auth.establishmentId);
if (flagEnabled) {
  response.status(constants.HTTP_STATUS_NOT_FOUND).end();
  return;
}
```

Import `isFeatureEnabled` from `~/services/posthogService`.

**Step 7: Run tests**

```bash
yarn nx test server -- campaign-api
yarn nx typecheck server
```

Expected: all pass.

**Step 8: Commit**

```bash
git add server/src/services/posthogService.ts server/src/infra/config.ts server/src/controllers/campaignController.ts
git commit -m "feat(server): return 404 on POST /campaigns when new-campaigns flag is enabled"
```

---

## Task 5: Forward `returnCount` in the frontend campaign model

**Files:**
- Modify: `frontend/src/models/Campaign.ts` (only if needed)
- Modify: `frontend/src/services/campaign.service.ts` (only if needed)

**Step 1: Check if `Campaign` already extends `CampaignDTO`**

Open `frontend/src/models/Campaign.ts`. If `Campaign extends CampaignDTO`, `returnCount` flows through automatically — no changes needed.

If `returnCount` is missing, add it explicitly: `returnCount: number | null`.

**Step 2: Run typecheck**

```bash
yarn nx typecheck frontend
```

Expected: no errors.

**Step 3: Commit (only if files changed)**

```bash
git add frontend/src/models/Campaign.ts
git commit -m "feat(frontend): forward returnCount from campaign API response"
```

---

## Task 6: `CampaignStatCard` component

**Files:**
- Create: `frontend/src/components/Campaign/CampaignStatCard.tsx`
- Create: `frontend/src/components/Campaign/test/CampaignStatCard.test.tsx`

A reusable stat card: icon + label on top row, value or action in the slot below.

**Step 1: Write the failing test**

```typescript
// frontend/src/components/Campaign/test/CampaignStatCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CampaignStatCard from '../CampaignStatCard';

describe('CampaignStatCard', () => {
  it('renders the label', () => {
    // Arrange + Act
    render(
      <CampaignStatCard iconId="fr-icon-home-4-fill" label="Nombre de logements">
        <span>27</span>
      </CampaignStatCard>
    );

    // Assert
    expect(screen.getByText('Nombre de logements')).toBeInTheDocument();
  });

  it('renders children as the value slot', () => {
    // Arrange + Act
    render(
      <CampaignStatCard iconId="fr-icon-home-4-fill" label="Nombre de logements">
        <span>27</span>
      </CampaignStatCard>
    );

    // Assert
    expect(screen.getByText('27')).toBeInTheDocument();
  });
});
```

**Step 2: Run to verify failure**

```bash
yarn nx test frontend -- CampaignStatCard
```

Expected: FAIL — module not found.

**Step 3: Implement the component**

```typescript
// frontend/src/components/Campaign/CampaignStatCard.tsx
import { fr } from '@codegouvfr/react-dsfr';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';
import Icon from '~/components/ui/Icon';

interface Props {
  iconId: string;
  label: string;
  children: ReactNode;
}

const Card = styled(Stack)({
  borderRight: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
  padding: '0.75rem 1rem',
  '&:last-child': {
    borderRight: 'none'
  }
});

function CampaignStatCard(props: Readonly<Props>) {
  return (
    <Card spacing="0.25rem">
      <Stack direction="row" spacing="0.5rem" alignItems="center">
        <Icon name={props.iconId} size="sm" />
        <Typography variant="body2" color="text.secondary">
          {props.label}
        </Typography>
      </Stack>
      {props.children}
    </Card>
  );
}

export default CampaignStatCard;
```

**Step 4: Run tests**

```bash
yarn nx test frontend -- CampaignStatCard
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/Campaign/CampaignStatCard.tsx frontend/src/components/Campaign/test/CampaignStatCard.test.tsx
git commit -m "feat(frontend): add CampaignStatCard component"
```

---

## Task 7: `CampaignSentAtModal` component

**Files:**
- Create: `frontend/src/components/Campaign/CampaignSentAtModal.tsx`
- Create: `frontend/src/components/Campaign/test/CampaignSentAtModal.test.tsx`

A DSFR confirmation modal with a date input, using `createModal` for imperative open/close and `react-hook-form` for form state. Called for both initial `sentAt` set and re-edit.

**Step 1: Write the failing test**

```typescript
// frontend/src/components/Campaign/test/CampaignSentAtModal.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CampaignSentAtModal, { sentAtModal } from '../CampaignSentAtModal';

describe('CampaignSentAtModal', () => {
  it('renders the title', () => {
    // Arrange + Act
    render(<CampaignSentAtModal onConfirm={vi.fn()} />);

    // Assert
    expect(screen.getByText('Indiquer la date d\u2019envoi')).toBeInTheDocument();
  });

  it('calls onConfirm with the entered date on submit', async () => {
    // Arrange
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<CampaignSentAtModal onConfirm={onConfirm} />);
    sentAtModal.open();

    // Act
    await user.type(screen.getByLabelText('Date d\u2019envoi'), '2024-03-01');
    await user.click(screen.getByRole('button', { name: /confirmer/i }));

    // Assert
    expect(onConfirm).toHaveBeenCalledWith('2024-03-01');
  });
});
```

**Step 2: Run to verify failure**

```bash
yarn nx test frontend -- CampaignSentAtModal
```

Expected: FAIL.

**Step 3: Implement the component**

```typescript
// frontend/src/components/Campaign/CampaignSentAtModal.tsx
import Input from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';

export const sentAtModal = createModal({
  id: 'campaign-sent-at-modal',
  isOpenedByDefault: false
});

interface FormValues {
  sentAt: string;
}

interface Props {
  defaultValue?: string;
  onConfirm: (isoDate: string) => void;
}

function CampaignSentAtModal(props: Readonly<Props>) {
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: { sentAt: props.defaultValue ?? '' }
  });

  function onSubmit(values: FormValues): void {
    props.onConfirm(values.sentAt);
    sentAtModal.close();
  }

  return (
    <sentAtModal.Component
      title="Indiquer la date d\u2019envoi"
      buttons={[
        {
          children: 'Annuler',
          priority: 'secondary',
          doClosesModal: true
        },
        {
          children: 'Confirmer',
          onClick: handleSubmit(onSubmit),
          doClosesModal: false
        }
      ]}
    >
      <Typography sx={{ mb: '1rem' }}>
        {`Indiquer la date d\u2019envoi permet d\u2019afficher le taux de retour de la
        campagne et d\u2019inscrire cette date dans l\u2019historique de chacun des logements.`}
      </Typography>
      <Input
        label="Date d\u2019envoi"
        nativeInputProps={{
          type: 'date',
          ...register('sentAt')
        }}
      />
    </sentAtModal.Component>
  );
}

export default CampaignSentAtModal;
```

**Step 4: Run tests**

```bash
yarn nx test frontend -- CampaignSentAtModal
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/Campaign/CampaignSentAtModal.tsx frontend/src/components/Campaign/test/CampaignSentAtModal.test.tsx
git commit -m "feat(frontend): add CampaignSentAtModal component"
```

---

## Task 8: Extract `CampaignDraftContent` from `CampaignDraft`

**Files:**
- Create: `frontend/src/views/Campaign/CampaignDraftContent.tsx`
- Modify: `frontend/src/views/Campaign/CampaignDraft.tsx`

The "Courrier" form in `CampaignDraft` is a large self-contained block. Extract it into `CampaignDraftContent` so it can be reused in the new tabs.

**Step 1: Extract the form JSX and all its state/handlers**

Move the entire `<form id="draft" ...>...</form>` block plus all associated state (`values`, `setValues`, the draft hooks, `save`, `update`, `create`, `setBody`, `setLogo`, etc.) into `CampaignDraftContent.tsx` with props `{ campaign: Campaign }`.

**Step 2: Update `CampaignDraft`**

Replace the extracted block with `<CampaignDraftContent campaign={props.campaign} />`. The "Destinataires" tab and stepper stay in `CampaignDraft` as-is.

**Step 3: Run existing tests**

```bash
yarn nx test frontend -- CampaignDraft
yarn nx typecheck frontend
```

Expected: all pass, no regressions.

**Step 4: Commit**

```bash
git add frontend/src/views/Campaign/CampaignDraftContent.tsx frontend/src/views/Campaign/CampaignDraft.tsx
git commit -m "refactor(frontend): extract CampaignDraftContent for reuse in CampaignViewNext"
```

---

## Task 9: Implement `CampaignViewNext`

**Files:**
- Modify: `frontend/src/views/Campaign/CampaignViewNext.tsx`
- Create: `frontend/src/views/Campaign/test/CampaignViewNext.test.tsx`

The routing is already wired in `App.tsx` — `CampaignViewNext` renders at `/campagnes/:id` when the `new-campaigns` flag is on.

**Step 1: Write the failing view-level integration tests**

Follow the Arrange / Act / Assert pattern. The MSW server is started automatically by Vitest — do not call `server.listen()`.

```typescript
// frontend/src/views/Campaign/test/CampaignViewNext.test.tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { genCampaignDTO } from '@zerologementvacant/models';
import { describe, it, expect } from 'vitest';
import { fromCampaignDTO } from '~/models/Campaign';
import { http, HttpResponse } from 'msw';
import { server } from '~/mocks/server'; // pre-configured MSW server
import { renderWithRouter } from '~/test/testUtils';
import CampaignViewNext from '../CampaignViewNext';

const campaign = fromCampaignDTO({
  ...genCampaignDTO(),
  title: 'Ma campagne test',
  sentAt: undefined,
  returnCount: null
});

beforeEach(() => {
  server.use(
    http.get('/api/campaigns/:id', () => HttpResponse.json(campaign)),
    http.put('/api/campaigns/:id', () => HttpResponse.json(campaign)),
    http.delete('/api/campaigns/:id', () => new HttpResponse(null, { status: 204 }))
  );
});

describe('CampaignViewNext', () => {
  it('renders the campaign title', async () => {
    // Arrange + Act
    renderWithRouter(<CampaignViewNext />, `/campagnes/${campaign.id}`);

    // Assert
    await screen.findByText('Ma campagne test');
  });

  it('shows a breadcrumb link to Campagnes', async () => {
    // Arrange + Act
    renderWithRouter(<CampaignViewNext />, `/campagnes/${campaign.id}`);

    // Assert
    expect(await screen.findByRole('link', { name: /campagnes/i })).toBeInTheDocument();
  });

  it('shows waiting state when sentAt is null', async () => {
    // Arrange + Act
    renderWithRouter(<CampaignViewNext />, `/campagnes/${campaign.id}`);

    // Assert — both "Nombre de retours" and "Taux de retour" show the waiting label
    const waiting = await screen.findAllByText(/en attente de la date d\u2019envoi/i);
    expect(waiting.length).toBeGreaterThanOrEqual(2);
  });

  it('opens the sent-at modal on button click', async () => {
    // Arrange
    const user = userEvent.setup();
    renderWithRouter(<CampaignViewNext />, `/campagnes/${campaign.id}`);
    await screen.findByText('Ma campagne test');

    // Act
    await user.click(screen.getByRole('button', { name: /indiquer la date d\u2019envoi/i }));

    // Assert
    expect(screen.getByText(/permet d\u2019afficher le taux de retour/i)).toBeInTheDocument();
  });

  it('navigates to /campagnes after deleting the campaign', async () => {
    // Arrange
    const user = userEvent.setup();
    const { history } = renderWithRouter(<CampaignViewNext />, `/campagnes/${campaign.id}`);
    await screen.findByText('Ma campagne test');

    // Act
    await user.click(screen.getByRole('button', { name: /supprimer la campagne/i }));

    // Assert
    await waitFor(() => expect(history.location.pathname).toBe('/campagnes'));
  });
});
```

**Step 2: Run to verify failure**

```bash
yarn nx test frontend -- CampaignViewNext
```

Expected: FAIL — component renders null.

**Step 3: Implement `CampaignViewNext`**

```typescript
// frontend/src/views/Campaign/CampaignViewNext.tsx
import { fr } from '@codegouvfr/react-dsfr';
import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Button from '@codegouvfr/react-dsfr/Button';
import Tabs from '@codegouvfr/react-dsfr/Tabs';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import { fr as dateFr } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';

import CampaignCreatedFromGroup from '~/components/Campaign/CampaignCreatedFromGroup';
import CampaignRecipients from '~/components/Campaign/CampaignRecipients';
import CampaignSentAtModal, { sentAtModal } from '~/components/Campaign/CampaignSentAtModal';
import CampaignStatCard from '~/components/Campaign/CampaignStatCard';
import CampaignTitle from '~/components/Campaign/CampaignTitle';
import { useNotification } from '~/hooks/useNotification';
import {
  useGetCampaignQuery,
  useRemoveCampaignMutation,
  useUpdateCampaignMutation
} from '~/services/campaign.service';
import { useCountHousingQuery } from '~/services/housing.service';
import CampaignDraftContent from './CampaignDraftContent';

const MetricsStrip = styled(Stack)({
  border: `1px solid ${fr.colors.decisions.border.default.grey.default}`,
  borderRadius: '0.25rem'
});

function CampaignViewNext() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaign, isLoading } = useGetCampaignQuery(id as string);
  const { data: count } = useCountHousingQuery({ campaignIds: [id as string] });
  const housingCount = count?.housing ?? 0;

  const [updateCampaign] = useUpdateCampaignMutation();
  const [removeCampaign, removeMutation] = useRemoveCampaignMutation();

  useNotification({
    toastId: 'remove-campaign',
    isError: removeMutation.isError,
    isLoading: removeMutation.isLoading,
    isSuccess: removeMutation.isSuccess,
    message: {
      error: 'Erreur lors de la suppression de la campagne',
      loading: 'Suppression en cours\u2026',
      success: 'Campagne supprim\u00e9e'
    }
  });

  async function handleDelete(): Promise<void> {
    if (!campaign) return;
    await removeCampaign(campaign.id).unwrap();
    navigate('/campagnes');
  }

  async function handleSentAtConfirm(isoDate: string): Promise<void> {
    if (!campaign) return;
    await updateCampaign({ ...campaign, sentAt: new Date(isoDate).toJSON() });
  }

  if (isLoading || !campaign) return null;

  const returnCount = campaign.returnCount;
  const returnRate =
    campaign.sentAt && returnCount !== null && housingCount > 0
      ? `${Math.round((returnCount / housingCount) * 100)}\u00a0%`
      : null;

  return (
    <Stack spacing="2rem" sx={{ px: '1.5rem', py: '2rem', maxWidth: '87rem', mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack spacing="0.5rem">
          <Breadcrumb
            currentPageLabel={campaign.title}
            homeLinkProps={{ href: '/' }}
            segments={[{ label: 'Campagnes', linkProps: { href: '/campagnes' } }]}
          />
          <CampaignTitle as="h1" campaign={campaign} />
          {campaign.description && (
            <Stack spacing="0.25rem">
              <Typography variant="subtitle2">Description</Typography>
              <Typography>{campaign.description}</Typography>
            </Stack>
          )}
          <CampaignCreatedFromGroup campaign={campaign} />
        </Stack>
        <Button
          iconId="fr-icon-delete-line"
          priority="tertiary no outline"
          onClick={handleDelete}
        >
          Supprimer la campagne
        </Button>
      </Stack>

      {/* Metrics */}
      <MetricsStrip direction="row">
        <CampaignStatCard iconId="fr-icon-home-4-fill" label="Nombre de logements">
          <Typography variant="h6">{housingCount}</Typography>
        </CampaignStatCard>

        <CampaignStatCard iconId="fr-icon-group-fill" label="Nombre de propri\u00e9taires">
          <Typography variant="h6">{count?.owners ?? '\u2014'}</Typography>
        </CampaignStatCard>

        <CampaignStatCard iconId="fr-icon-mail-send-line" label="Date d\u2019envoi">
          {campaign.sentAt ? (
            <Stack direction="row" alignItems="center" spacing="0.5rem">
              <Typography>
                {format(new Date(campaign.sentAt), 'd MMMM yyyy', { locale: dateFr })}
              </Typography>
              <Button
                iconId="fr-icon-edit-line"
                priority="tertiary no outline"
                size="small"
                title="Modifier la date d\u2019envoi"
                onClick={() => sentAtModal.open()}
              />
            </Stack>
          ) : (
            <Button priority="secondary" size="small" onClick={() => sentAtModal.open()}>
              Indiquer la date d\u2019envoi
            </Button>
          )}
        </CampaignStatCard>

        <CampaignStatCard iconId="ri-discuss-line" label="Nombre de retours">
          {campaign.sentAt ? (
            <Typography variant="h6">{returnCount ?? '\u2014'}</Typography>
          ) : (
            <WaitingState />
          )}
        </CampaignStatCard>

        <CampaignStatCard iconId="ri-discuss-line" label="Taux de retour">
          {campaign.sentAt ? (
            <Typography variant="h6">{returnRate ?? '\u2014'}</Typography>
          ) : (
            <WaitingState />
          )}
        </CampaignStatCard>
      </MetricsStrip>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            label: 'Destinataires',
            content: <CampaignRecipients campaign={campaign} />
          },
          {
            label: 'Courrier',
            content: <CampaignDraftContent campaign={campaign} />
          }
        ]}
      />

      <CampaignSentAtModal
        defaultValue={campaign.sentAt?.slice(0, 10)}
        onConfirm={handleSentAtConfirm}
      />
    </Stack>
  );
}

function WaitingState() {
  return (
    <Typography variant="body2" color="text.disabled">
      En attente de la date d\u2019envoi
    </Typography>
  );
}

export default CampaignViewNext;
```

**Step 4: Run tests**

```bash
yarn nx test frontend -- CampaignViewNext
```

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/views/Campaign/CampaignViewNext.tsx frontend/src/views/Campaign/test/CampaignViewNext.test.tsx
git commit -m "feat(frontend): implement CampaignViewNext unified layout"
```

---

## Task 10: Final verification

**Step 1: Full test suite**

```bash
yarn nx run-many -t test --exclude=zero-logement-vacant
```

Expected: all tests pass.

**Step 2: Full typecheck**

```bash
yarn nx run-many -t typecheck
```

Expected: no errors.

**Step 3: Visual check against Figma**

Start both dev servers:

```bash
yarn workspace @zerologementvacant/front dev
yarn workspace @zerologementvacant/server dev
```

- Enable the `new-campaigns` flag in PostHog (or temporarily hardcode it for local testing)
- Navigate to `/campagnes/:id` and compare against the Figma screenshot in `docs/plans/2026-03-04-campaign-view-rework-design.md`
- Set a `sentAt` date via the modal and verify the metrics update (retours + taux)
- Delete the campaign and verify redirect to `/campagnes`
- Call `POST /api/campaigns` directly and verify it returns 404

**Step 4: Commit docs**

```bash
git add docs/
git commit -m "docs: add campaign view rework design, implementation plan and trigger documentation"
```
