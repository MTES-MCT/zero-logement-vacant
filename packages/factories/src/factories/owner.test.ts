import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createOwnerFactory } from './owner';

describe('createOwnerFactory', () => {
  it('builds an OwnerDTO with required fields', () => {
    const factory = createOwnerFactory(new MemoryAdapter());
    const owner = factory.build();

    expect(owner.id).toBeDefined();
    expect(owner.fullName).toBeDefined();
  });

  it('allows overriding fields', () => {
    const factory = createOwnerFactory(new MemoryAdapter());
    const owner = factory.build({ fullName: 'Jean Dupont' });

    expect(owner.fullName).toBe('Jean Dupont');
  });

  it('creates via the adapter with table "owners"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createOwnerFactory(adapter);

    const owner = await factory.create();

    expect(spy).toHaveBeenCalledWith('owners', expect.objectContaining({ id: owner.id }));
  });

  it('builds a list of owners', () => {
    const factory = createOwnerFactory(new MemoryAdapter());
    const owners = factory.buildList(3);

    expect(owners).toHaveLength(3);
    expect(new Set(owners.map((o) => o.id)).size).toBe(3);
  });
});
