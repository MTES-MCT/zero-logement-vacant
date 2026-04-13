import { describe, expect, it } from 'vitest';
import createFactories, { MemoryAdapter } from '../index';

describe('createFactories', () => {
  it('returns factories for all entities', () => {
    const factories = createFactories(new MemoryAdapter());

    expect(factories.user).toBeDefined();
    expect(factories.establishment).toBeDefined();
    expect(factories.owner).toBeDefined();
    expect(factories.housing).toBeDefined();
    expect(factories.group).toBeDefined();
    expect(factories.campaign).toBeDefined();
  });

  it('each factory builds its entity', () => {
    const factories = createFactories(new MemoryAdapter());
    const user = factories.user.build();

    expect(user.id).toBeDefined();
    expect(factories.establishment.build().siren).toBeDefined();
    expect(factories.owner.build().fullName).toBeDefined();
    expect(factories.housing.build().geoCode).toBeDefined();
    expect(factories.group.build().title).toBeDefined();
    expect(
      factories.campaign.build({}, { associations: { createdBy: user } }).status
    ).toBeDefined();
  });

  it('each factory creates via the adapter', async () => {
    const adapter = new MemoryAdapter();
    const factories = createFactories(adapter);

    const user = await factories.user.create();
    const housing = await factories.housing.create();

    expect(user.id).toBeDefined();
    expect(housing.id).toBeDefined();
  });
});
