# Group Rename Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Modifier" tertiary button next to the group title that opens a modal to edit the group name and description.

**Architecture:** Create a `RenameGroupModal` following the existing modal factory pattern (`createConfirmationModal`). Add the button in `GroupNext.tsx` next to the `<h1>` title. Wire the `onUpdate` callback already available in `GroupViewNext`.

**Tech Stack:** React, TypeScript, react-hook-form + yup, `@codegouvfr/react-dsfr` Button, `createConfirmationModal` factory

---

### Task 1: Create `RenameGroupModal` component

**Files:**
- Create: `frontend/src/components/Group/RenameGroupModal.tsx`
- Create: `frontend/src/components/Group/RenameGroupModal.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createRenameGroupModal } from './RenameGroupModal';

describe('RenameGroupModal', () => {
  it('calls onSubmit with updated title and description', async () => {
    const modal = createRenameGroupModal();
    const onSubmit = vi.fn();
    render(
      <modal.Component
        group={{ id: '1', title: 'Old title', description: 'Old desc', housingCount: 0, ownerCount: 0, createdAt: '', archivedAt: null, createdBy: null }}
        onSubmit={onSubmit}
        isOpenedByDefault
      />
    );
    const titleInput = screen.getByLabelText(/Nom du groupe/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New title');
    const descInput = screen.getByLabelText(/Description/i);
    await userEvent.clear(descInput);
    await userEvent.type(descInput, 'New desc');
    await userEvent.click(screen.getByText('Confirmer'));
    expect(onSubmit).toHaveBeenCalledWith({ title: 'New title', description: 'New desc' });
  });
});
```

**Step 2: Run to verify it fails**

```bash
yarn nx test front -- RenameGroupModal
```

Expected: FAIL — module not found

**Step 3: Implement**

```tsx
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { object, string, type InferType } from 'yup';

import AppTextInputNext from '~/components/_app/AppTextInput/AppTextInputNext';
import {
  createConfirmationModal,
  type ConfirmationModalOptions,
  type ConfirmationModalProps
} from '~/components/modals/ConfirmationModal/ConfirmationModalNext';
import type { Group } from '~/models/Group';
import type { GroupPayload } from '~/models/GroupPayload';

export type RenameGroupModalOptions = Partial<ConfirmationModalOptions>;

export type RenameGroupModalProps = Omit<
  ConfirmationModalProps,
  'title' | 'children' | 'onSubmit'
> & {
  group: Group;
  onSubmit(payload: Pick<GroupPayload, 'title' | 'description'>): void;
};

const schema = object({
  title: string().trim().required('Veuillez renseigner un nom'),
  description: string().trim().default('')
});

type FormSchema = InferType<typeof schema>;

export function createRenameGroupModal(options?: Readonly<RenameGroupModalOptions>) {
  const modal = createConfirmationModal({
    id: options?.id ?? 'rename-group-modal',
    isOpenedByDefault: options?.isOpenedByDefault ?? false
  });

  return {
    ...modal,
    Component(props: Readonly<RenameGroupModalProps>) {
      const { group, onSubmit, ...rest } = props;

      const form = useForm<FormSchema>({
        resolver: yupResolver(schema),
        defaultValues: {
          title: group.title,
          description: group.description ?? ''
        },
        mode: 'onBlur'
      });

      const handleSubmit: SubmitHandler<FormSchema> = (data) => {
        onSubmit({ title: data.title, description: data.description });
      };

      return (
        <modal.Component
          {...rest}
          title="Modifier le groupe"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <AppTextInputNext<FormSchema>
            label="Nom du groupe (obligatoire)"
            name="title"
            control={form.control}
          />
          <AppTextInputNext<FormSchema>
            label="Description"
            name="description"
            control={form.control}
            textArea
          />
        </modal.Component>
      );
    }
  };
}
```

**Step 4: Run tests**

```bash
yarn nx test front -- RenameGroupModal
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/components/Group/RenameGroupModal.tsx frontend/src/components/Group/RenameGroupModal.test.tsx
git commit -m "feat(frontend): add RenameGroupModal component"
```

---

### Task 2: Wire button + modal in `GroupNext.tsx`

**Files:**
- Modify: `frontend/src/components/Group/GroupNext.tsx`

**Step 1: Add modal instance + button + Component render**

In `GroupNext.tsx`:
1. Import `createRenameGroupModal` from `./RenameGroupModal` and `Button` from `@codegouvfr/react-dsfr/Button`.
2. Add `const renameGroupModal = createRenameGroupModal();` alongside the other modal constants at module top level.
3. In the `<Stack direction="row">` next to the `<h1>` title (line ~68), add:
   ```tsx
   <Button
     priority="tertiary no outline"
     iconId="fr-icon-edit-line"
     iconPosition="right"
     size="small"
     onClick={renameGroupModal.open}
   >
     Modifier
   </Button>
   ```
4. Add `<renameGroupModal.Component group={props.group} onSubmit={updateGroup} />` alongside the other modal components at the bottom of the return.

**Step 2: Verify typecheck**

```bash
yarn nx typecheck front
```

Expected: no errors

**Step 3: Commit**

```bash
git add frontend/src/components/Group/GroupNext.tsx
git commit -m "feat(frontend): wire rename group modal to Modifier button"
```
