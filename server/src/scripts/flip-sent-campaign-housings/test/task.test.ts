import { HousingStatus } from '@zerologementvacant/models';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { kysely } from '~/infra/database/kysely';
import type { EstablishmentApi } from '~/models/EstablishmentApi';
import type { UserApi } from '~/models/UserApi';
import { factories } from '~/test/factories';

vi.mock('~/services/campaign-housing-service', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('~/services/campaign-housing-service')
    >();
  return {
    ...actual,
    flipCampaignHousingsToWaiting: vi.fn(actual.flipCampaignHousingsToWaiting)
  };
});

import { flipCampaignHousingsToWaiting } from '~/services/campaign-housing-service';

import { flipSentCampaignHousings } from '../task';

describe('flipSentCampaignHousings', () => {
  let establishment: EstablishmentApi;
  let user: UserApi;
  const today = '2026-07-15';
  const realFlipCampaignHousingsToWaiting = vi
    .mocked(flipCampaignHousingsToWaiting)
    .getMockImplementation()!;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  afterEach(() => {
    vi.mocked(flipCampaignHousingsToWaiting).mockImplementation(
      realFlipCampaignHousingsToWaiting
    );
  });

  async function seedCampaign(sentAt: string | null) {
    const campaign = await factories
      .campaign(establishment)
      .create({ sentAt }, { associations: { createdBy: user } });
    const housing = await factories.housing.create({
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: null
    });
    await kysely
      .insertInto('campaignsHousing')
      .values({
        campaignId: campaign.id,
        housingId: housing.id,
        housingGeoCode: housing.geoCode
      })
      .execute();
    return { campaign, housing };
  }

  it('flips housings of campaigns whose send date has passed', async () => {
    const { housing } = await seedCampaign('2020-01-01');

    const summary = await flipSentCampaignHousings({ today });

    expect(summary.housings).toBeGreaterThanOrEqual(1);
    const actual = await kysely
      .selectFrom('fastHousing')
      .selectAll()
      .where('geoCode', '=', housing.geoCode)
      .where('id', '=', housing.id)
      .executeTakeFirst();
    expect(actual?.status).toBe(HousingStatus.WAITING);
  });

  it('leaves future-dated campaigns untouched', async () => {
    const { housing } = await seedCampaign('2999-01-01');

    await flipSentCampaignHousings({ today });

    const actual = await kysely
      .selectFrom('fastHousing')
      .selectAll()
      .where('geoCode', '=', housing.geoCode)
      .where('id', '=', housing.id)
      .executeTakeFirst();
    expect(actual?.status).toBe(HousingStatus.NEVER_CONTACTED);
  });

  it('is idempotent — a second run writes no new status events', async () => {
    const { housing } = await seedCampaign('2020-01-01');
    const statusEventsFor = () =>
      kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .execute();

    await flipSentCampaignHousings({ today });
    const eventsAfterFirst = await statusEventsFor();

    await flipSentCampaignHousings({ today });
    const eventsAfterSecond = await statusEventsFor();

    expect(eventsAfterSecond).toHaveLength(eventsAfterFirst.length);
  });

  it('continues flipping other campaigns when one campaign fails', async () => {
    const { campaign: failing } = await seedCampaign('2020-01-01');
    const { campaign: healthy, housing: healthyHousing } =
      await seedCampaign('2020-01-01');
    vi.mocked(flipCampaignHousingsToWaiting).mockImplementation(
      async (campaign, system) => {
        if (campaign.id === failing.id) {
          throw new Error('boom');
        }
        return realFlipCampaignHousingsToWaiting(campaign, system);
      }
    );

    const summary = await flipSentCampaignHousings({ today });

    expect(summary.failed).toBe(1);
    expect(vi.mocked(flipCampaignHousingsToWaiting)).toHaveBeenCalledWith(
      expect.objectContaining({ id: healthy.id }),
      expect.anything()
    );
    const healthyRow = await kysely
      .selectFrom('fastHousing')
      .selectAll()
      .where('geoCode', '=', healthyHousing.geoCode)
      .where('id', '=', healthyHousing.id)
      .executeTakeFirst();
    expect(healthyRow?.status).toBe(HousingStatus.WAITING);
  });
});
