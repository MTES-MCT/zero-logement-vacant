import { describe, expect, it, vi } from 'vitest';

import { MemoryAdapter } from '../../memory-adapter';
import { createEstablishmentFactory } from '../establishment';
import { createGroupFactory } from '../group';

describe('createGroupFactory', () => {
  it('builds a GroupDTO with required fields', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);
    const group = factory.build();

    expect(group.id).toBeDefined();
    expect(group.title).toBeDefined();
    expect(group.description).toBeDefined();
    expect(group.housingCount).toBe(0);
    expect(group.ownerCount).toBe(0);
    expect(group.archivedAt).toBeNull();
  });

  it('allows overriding fields', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);
    const group = factory.build({ title: 'My Group' });

    expect(group.title).toBe('My Group');
  });

  it('creates via the adapter with table "groups"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const establishment = createEstablishmentFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);

    const group = await factory.create();

    expect(spy).toHaveBeenCalledWith(
      'groups',
      expect.objectContaining({ id: group.id }),
      { establishmentId: establishment.id }
    );
  });

  it('builds a list of groups', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);
    const groups = factory.buildList(3);

    expect(groups).toHaveLength(3);
  });
});
