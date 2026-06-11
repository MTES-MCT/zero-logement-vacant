import { describe, expect, it } from 'vitest';

import createFactories, { MemoryAdapter } from '../index';

describe('createFactories', () => {
  it('returns factories for all entities', () => {
    const factories = createFactories(new MemoryAdapter());

    expect(factories.user).toBeDefined();
    expect(factories.establishment).toBeDefined();
    expect(factories.owner).toBeDefined();
    expect(factories.housing).toBeDefined();
    expect(typeof factories.group).toBe('function');
    expect(typeof factories.campaign).toBe('function');
  });

  it('each unscoped factory builds its entity', () => {
    const factories = createFactories(new MemoryAdapter());

    expect(factories.user.build().id).toBeDefined();
    expect(factories.establishment.build().siren).toBeDefined();
    expect(factories.owner.build().fullName).toBeDefined();
    expect(factories.housing.build().geoCode).toBeDefined();
  });

  it('scoped campaign factory builds a CampaignDTO with no establishmentId', () => {
    const factories = createFactories(new MemoryAdapter());
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    const campaign = factories
      .campaign(establishment)
      .build({}, { associations: { createdBy: user } });

    expect(campaign.id).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign).not.toHaveProperty('establishmentId');
  });

  it('scoped group factory builds a GroupDTO with no establishmentId', () => {
    const factories = createFactories(new MemoryAdapter());
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    const group = factories
      .group(establishment)
      .build({}, { associations: { createdBy: user } });

    expect(group.id).toBeDefined();
    expect(group.title).toBeDefined();
    expect(group).not.toHaveProperty('establishmentId');
  });

  it('campaign.create forwards establishmentId as adapter context', async () => {
    const calls: Array<{ table: string; context: unknown }> = [];
    const adapter = {
      async create(table: string, entity: unknown, context: unknown) {
        calls.push({ table, context });
        return entity as never;
      }
    };
    const factories = createFactories(adapter as never);
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    await factories
      .campaign(establishment)
      .create({}, { associations: { createdBy: user } });

    expect(calls).toEqual([
      { table: 'campaigns', context: { establishmentId: establishment.id } }
    ]);
  });

  it('group.create forwards establishmentId as adapter context', async () => {
    const calls: Array<{ table: string; context: unknown }> = [];
    const adapter = {
      async create(table: string, entity: unknown, context: unknown) {
        calls.push({ table, context });
        return entity as never;
      }
    };
    const factories = createFactories(adapter as never);
    const establishment = factories.establishment.build();
    const user = factories.user.build();

    await factories
      .group(establishment)
      .create({}, { associations: { createdBy: user } });

    expect(calls).toEqual([
      { table: 'groups', context: { establishmentId: establishment.id } }
    ]);
  });
});
