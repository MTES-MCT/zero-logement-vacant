import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../memory-adapter';
import { createUserFactory } from './user';

describe('createUserFactory', () => {
  it('builds a UserDTO with required fields', () => {
    const factory = createUserFactory(new MemoryAdapter());
    const user = factory.build();

    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.activatedAt).toBeDefined();
  });

  it('allows overriding fields', () => {
    const factory = createUserFactory(new MemoryAdapter());
    const user = factory.build({ email: 'custom@example.com' });

    expect(user.email).toBe('custom@example.com');
  });

  it('creates via the adapter with table "users"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createUserFactory(adapter);

    const user = await factory.create();

    expect(spy).toHaveBeenCalledWith('users', expect.objectContaining({ id: user.id }));
  });

  it('builds a list of users', () => {
    const factory = createUserFactory(new MemoryAdapter());
    const users = factory.buildList(3);

    expect(users).toHaveLength(3);
    expect(new Set(users.map((u) => u.id)).size).toBe(3);
  });
});
