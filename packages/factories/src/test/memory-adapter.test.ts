import { describe, expect, it } from 'vitest';
import type { UserDTO } from '@zerologementvacant/models';
import { MemoryAdapter } from '../memory-adapter';

describe('MemoryAdapter', () => {
  it('creates an entity and returns it unchanged', async () => {
    const adapter = new MemoryAdapter();
    const user = {
      id: 'user-1',
      email: 'test@example.com'
    } as UserDTO;

    const result = await adapter.create('users', user);

    expect(result).toBe(user);
  });
});
