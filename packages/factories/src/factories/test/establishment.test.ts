import { describe, expect, it, vi } from 'vitest';
import { MemoryAdapter } from '../../memory-adapter';
import { createEstablishmentFactory } from '../establishment';

describe('createEstablishmentFactory', () => {
  it('builds an EstablishmentDTO with required fields', () => {
    const factory = createEstablishmentFactory(new MemoryAdapter());
    const establishment = factory.build();

    expect(establishment.id).toBeDefined();
    expect(establishment.siren).toBeDefined();
    expect(establishment.geoCodes.length).toBeGreaterThan(0);
  });

  it('allows overriding fields', () => {
    const factory = createEstablishmentFactory(new MemoryAdapter());
    const establishment = factory.build({ siren: '123456789' });

    expect(establishment.siren).toBe('123456789');
  });

  it('creates via the adapter with table "establishments"', async () => {
    const adapter = new MemoryAdapter();
    const spy = vi.spyOn(adapter, 'create');
    const factory = createEstablishmentFactory(adapter);

    const establishment = await factory.create();

    expect(spy).toHaveBeenCalledWith('establishments', expect.objectContaining({ id: establishment.id }));
  });

  it('builds a list of establishments', () => {
    const factory = createEstablishmentFactory(new MemoryAdapter());
    const establishments = factory.buildList(3);

    expect(establishments).toHaveLength(3);
  });
});
