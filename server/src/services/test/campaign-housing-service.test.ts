import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import SystemUserMissingError from '~/errors/systemUserMissingError';
import config from '~/infra/config';
import { kysely } from '~/infra/database/kysely';
import { startKyselyTransaction } from '~/infra/database/kysely-transaction';
import type { EstablishmentApi } from '~/models/EstablishmentApi';
import type { UserApi } from '~/models/UserApi';
import campaignRepository from '~/repositories/campaignRepository';
import { toEventInsert } from '~/repositories/eventRepository';
import userRepository from '~/repositories/userRepository';
import {
  flipCampaignHousingsToWaiting,
  flipHousingsToWaiting,
  resolveSystemUser,
  revertCampaignHousingsToNeverContacted
} from '~/services/campaign-housing-service';
import { factories } from '~/test/factories';
import { genCampaignApi, genEventApi } from '~/test/testFixtures';

describe('campaign-housing-service', () => {
  let establishment: EstablishmentApi;
  let user: UserApi;
  let system: UserApi;

  beforeAll(async () => {
    establishment = await factories.establishment.create();
    user = await factories.user.create({ establishmentId: establishment.id });
    system = (await userRepository.getByEmail(config.app.system))!;
  });

  describe('resolveSystemUser', () => {
    it('resolves the configured system account', async () => {
      await expect(resolveSystemUser()).resolves.toEqual(
        expect.objectContaining({ id: system.id })
      );
    });

    it('throws when the configured system account cannot be resolved', async () => {
      vi.spyOn(userRepository, 'getByEmail').mockResolvedValueOnce(null);

      await expect(resolveSystemUser()).rejects.toThrow(SystemUserMissingError);
    });
  });

  describe('flipHousingsToWaiting', () => {
    it('sets NEVER_CONTACTED housings to WAITING and records events', async () => {
      const housing = await factories.housing.create({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      });

      const flipped = await startKyselyTransaction(() =>
        flipHousingsToWaiting([housing], system)
      );

      expect(flipped).toBe(1);
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll()
        .where('geoCode', '=', housing.geoCode)
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actual?.status).toBe(HousingStatus.WAITING);
      expect(actual?.subStatus).toBeNull();

      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .execute();
      expect(events).toHaveLength(1);
      // The automated flip is attributed to the system account, not the caller.
      expect(events[0].createdBy).toBe(system.id);
    });

    it('returns 0 and writes nothing for an empty set', async () => {
      const flipped = await startKyselyTransaction(() =>
        flipHousingsToWaiting([], system)
      );
      expect(flipped).toBe(0);
    });

    it('does not flip or write an event for a housing no longer NEVER_CONTACTED (guards concurrent writers)', async () => {
      // The DB row is already WAITING — e.g. a concurrent writer flipped it
      // after the caller read its snapshot as NEVER_CONTACTED.
      const housing = await factories.housing.create({
        status: HousingStatus.WAITING,
        subStatus: null
      });

      const flipped = await startKyselyTransaction(() =>
        flipHousingsToWaiting([housing], system)
      );

      expect(flipped).toBe(0);
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll()
        .where('geoCode', '=', housing.geoCode)
        .where('id', '=', housing.id)
        .executeTakeFirst();
      expect(actual?.status).toBe(HousingStatus.WAITING);

      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .execute();
      expect(events).toHaveLength(0);
    });
  });

  describe('flipCampaignHousingsToWaiting', () => {
    it('flips only the campaign NEVER_CONTACTED housings', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const neverContacted = await factories.housing.create({
        status: HousingStatus.NEVER_CONTACTED,
        subStatus: null
      });
      const alreadyWaiting = await factories.housing.create({
        status: HousingStatus.WAITING,
        subStatus: null
      });
      await kysely
        .insertInto('campaignsHousing')
        .values(
          [neverContacted, alreadyWaiting].map((housing) => ({
            campaignId: campaign.id,
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          }))
        )
        .execute();

      const flipped = await startKyselyTransaction(() =>
        flipCampaignHousingsToWaiting(campaign, system)
      );

      expect(flipped).toBe(1);
      const actual = await kysely
        .selectFrom('fastHousing')
        .selectAll()
        .where('geoCode', '=', neverContacted.geoCode)
        .where('id', '=', neverContacted.id)
        .executeTakeFirst();
      expect(actual?.status).toBe(HousingStatus.WAITING);
    });

    it('is idempotent — a second run flips nothing', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
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

      await startKyselyTransaction(() =>
        flipCampaignHousingsToWaiting(campaign, system)
      );
      const second = await startKyselyTransaction(() =>
        flipCampaignHousingsToWaiting(campaign, system)
      );
      expect(second).toBe(0);
    });
  });

  describe('revertCampaignHousingsToNeverContacted', () => {
    const TODAY = '2026-07-15';

    // Attach `housing` to `campaign`, mark it WAITING, and give it a pristine
    // auto-flip status event authored by `author` (defaults to the system).
    async function setupWaitingHousing(
      campaign: ReturnType<typeof genCampaignApi>,
      author: UserApi = system,
      flipOverrides: Partial<{
        nextOld: { status: string };
        nextNew: { status: string };
      }> = {}
    ) {
      const housing = await factories.housing.create({
        status: HousingStatus.WAITING,
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
      const flip = genEventApi({
        type: 'housing:status-updated',
        creator: author,
        nextOld: {
          status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
        },
        nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
        ...flipOverrides
      });
      await kysely.insertInto('events').values(toEventInsert(flip)).execute();
      await kysely
        .insertInto('housingEvents')
        .values({
          eventId: flip.id,
          housingGeoCode: housing.geoCode,
          housingId: housing.id
        })
        .execute();
      return housing;
    }

    async function statusOf(housing: { geoCode: string; id: string }) {
      const row = await kysely
        .selectFrom('fastHousing')
        .selectAll()
        .where('geoCode', '=', housing.geoCode)
        .where('id', '=', housing.id)
        .executeTakeFirst();
      return row?.status;
    }

    async function revertEventsFor(housing: { geoCode: string; id: string }) {
      const events = await kysely
        .selectFrom('events')
        .innerJoin('housingEvents', 'housingEvents.eventId', 'events.id')
        .selectAll('events')
        .where('events.type', '=', 'housing:status-updated')
        .where('housingEvents.housingGeoCode', '=', housing.geoCode)
        .where('housingEvents.housingId', '=', housing.id)
        .where('events.createdBy', '=', system.id)
        .execute();
      return events.filter(
        (event) =>
          (event.nextNew as { status?: string } | null)?.status ===
          HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
      );
    }

    it('reverts a pristine system-flipped housing and writes one reverse event', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housing = await setupWaitingHousing(campaign);

      const count = await startKyselyTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(1);
      expect(await statusOf(housing)).toBe(HousingStatus.NEVER_CONTACTED);
      expect(await revertEventsFor(housing)).toHaveLength(1);
    });

    it('skips when a sibling campaign has genuinely sent', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const sentSibling = await factories
        .campaign(establishment)
        .create(
          { sentAt: '2020-01-01' },
          { associations: { createdBy: user } }
        );
      const housing = await setupWaitingHousing(campaign);
      // Also attach the housing to the already-sent sibling.
      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: sentSibling.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const count = await startKyselyTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });

    it('skips when the latest status event is not the pristine flip shape', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housing = await setupWaitingHousing(campaign, system, {
        nextOld: { status: HOUSING_STATUS_LABELS[HousingStatus.WAITING] },
        nextNew: { status: HOUSING_STATUS_LABELS[HousingStatus.IN_PROGRESS] }
      });

      const count = await startKyselyTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });

    it('skips when the pristine flip was authored by a user, not the system', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housing = await setupWaitingHousing(campaign, user);

      const count = await startKyselyTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });

    it('sees a sibling campaign sentAt written earlier in the same ambient transaction', async () => {
      // The eligibility read must join the caller's transaction, not open its
      // own: a separate transaction would not see this write until commit,
      // and would wrongly treat the sibling as not-yet-sent.
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const sibling = await factories
        .campaign(establishment)
        .create({ sentAt: null }, { associations: { createdBy: user } });
      const housing = await setupWaitingHousing(campaign);
      await kysely
        .insertInto('campaignsHousing')
        .values({
          campaignId: sibling.id,
          housingId: housing.id,
          housingGeoCode: housing.geoCode
        })
        .execute();

      const count = await startKyselyTransaction(async () => {
        await campaignRepository.save({ ...sibling, sentAt: '2020-01-01' });
        return revertCampaignHousingsToNeverContacted(campaign, system, TODAY);
      });

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });

    it('skips a WAITING housing with no status-updated event', async () => {
      const campaign = await factories
        .campaign(establishment)
        .create({}, { associations: { createdBy: user } });
      const housing = await factories.housing.create({
        status: HousingStatus.WAITING,
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

      const count = await startKyselyTransaction(() =>
        revertCampaignHousingsToNeverContacted(campaign, system, TODAY)
      );

      expect(count).toBe(0);
      expect(await statusOf(housing)).toBe(HousingStatus.WAITING);
    });
  });
});
