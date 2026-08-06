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

vi.mock('~/infra/database/kysely-transaction', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('~/infra/database/kysely-transaction')
    >();
  return {
    ...actual,
    startKyselyTransaction: vi.fn(actual.startKyselyTransaction)
  };
});

import { startKyselyTransaction } from '~/infra/database/kysely-transaction';

import { flipSentCampaignHousings } from '../task';

describe('flipSentCampaignHousings', () => {
  let establishment: EstablishmentApi;
  let user: UserApi;
  const today = '2026-07-15';
  const realFlipCampaignHousingsToWaiting = vi
    .mocked(flipCampaignHousingsToWaiting)
    .getMockImplementation()!;
  const realStartKyselyTransaction = vi
    .mocked(startKyselyTransaction)
    .getMockImplementation()!;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
  });

  afterEach(() => {
    vi.mocked(flipCampaignHousingsToWaiting).mockImplementation(
      realFlipCampaignHousingsToWaiting
    );
    vi.mocked(startKyselyTransaction).mockImplementation(
      realStartKyselyTransaction
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

  it('does not count a campaign toward the housings summary when its transaction call reports failure', async () => {
    // Drain any campaign left un-settled by an earlier test in this file
    // (e.g. the deliberately-failing one above) so it can't pollute the count.
    await flipSentCampaignHousings({ today });
    await seedCampaign('2020-01-01');
    vi.mocked(startKyselyTransaction).mockImplementationOnce(async (cb) => {
      await realStartKyselyTransaction(cb);
      throw new Error('commit failed');
    });

    const summary = await flipSentCampaignHousings({ today });

    expect(summary.failed).toBe(1);
    expect(summary.housings).toBe(0);
  });

  it('processes multiple due campaigns concurrently instead of one at a time', async () => {
    // Drain any campaign left un-settled by an earlier test in this file so
    // it can't add its own call to the overlap count below.
    await flipSentCampaignHousings({ today });
    await seedCampaign('2020-01-01');
    await seedCampaign('2020-01-01');
    await seedCampaign('2020-01-01');
    // Count concurrently in-flight calls instead of measuring wall-clock time:
    // a real elapsed-time budget is flaky under parallel test-suite load,
    // while "more than one call overlapped" is a direct, machine-independent
    // observation of concurrency.
    let inFlight = 0;
    let maxInFlight = 0;
    vi.mocked(flipCampaignHousingsToWaiting).mockImplementation(
      async (campaign, system) => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 20));
        inFlight--;
        return realFlipCampaignHousingsToWaiting(campaign, system);
      }
    );

    await flipSentCampaignHousings({ today });

    expect(maxInFlight).toBeGreaterThan(1);
  });
});
