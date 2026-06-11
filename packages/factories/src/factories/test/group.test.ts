import { describe, expect, it, vi } from 'vitest';

import { MemoryAdapter } from '../../memory-adapter';
import { createEstablishmentFactory } from '../establishment';
import { createGroupFactory } from '../group';
import { createUserFactory } from '../user';

describe('createGroupFactory', () => {
  it('builds a GroupDTO with required fields', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const user = createUserFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);
    const group = factory.build({}, { associations: { createdBy: user } });

    expect(group.id).toBeDefined();
    expect(group.title).toBeDefined();
    expect(group.description).toBeDefined();
    expect(group.housingCount).toBe(0);
    expect(group.ownerCount).toBe(0);
    expect(group.archivedAt).toBeNull();
    expect(group.createdBy).toStrictEqual(user);
  });

  it('throws when createdBy association is not provided', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);

    expect(() => factory.build()).toThrow('createdBy association is required');
  });

  it('allows overriding fields', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const user = createUserFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);
    const group = factory.build(
      { title: 'My Group' },
      { associations: { createdBy: user } }
    );

    expect(group.title).toBe('My Group');
  });

  it('creates via the adapter with table "groups"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const establishment = createEstablishmentFactory(adapter).build();
    const user = createUserFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);

    const group = await factory.create(
      {},
      { associations: { createdBy: user } }
    );

    expect(spy).toHaveBeenCalledWith(
      'groups',
      expect.objectContaining({ id: group.id }),
      { establishmentId: establishment.id }
    );
  });

  it('builds a list of groups', () => {
    const adapter = new MemoryAdapter();
    const establishment = createEstablishmentFactory(adapter).build();
    const user = createUserFactory(adapter).build();
    const factory = createGroupFactory(adapter, establishment);
    const groups = factory.buildList(
      3,
      {},
      { associations: { createdBy: user } }
    );

    expect(groups).toHaveLength(3);
  });
});
