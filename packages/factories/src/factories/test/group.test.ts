import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../../memory-adapter';
import { createGroupFactory } from '../group';

describe('createGroupFactory', () => {
  it('builds a GroupDTO with required fields', () => {
    const factory = createGroupFactory(new MemoryAdapter());
    const group = factory.build();

    expect(group.id).toBeDefined();
    expect(group.title).toBeDefined();
    expect(group.description).toBeDefined();
    expect(group.housingCount).toBe(0);
    expect(group.ownerCount).toBe(0);
    expect(group.archivedAt).toBeNull();
  });

  it('allows overriding fields', () => {
    const factory = createGroupFactory(new MemoryAdapter());
    const group = factory.build({ title: 'My Group' });

    expect(group.title).toBe('My Group');
  });

  it('creates via the adapter with table "groups"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createGroupFactory(adapter);

    const group = await factory.create();

    expect(spy).toHaveBeenCalledWith('groups', expect.objectContaining({ id: group.id }));
  });

  it('builds a list of groups', () => {
    const factory = createGroupFactory(new MemoryAdapter());
    const groups = factory.buildList(3);

    expect(groups).toHaveLength(3);
  });
});
