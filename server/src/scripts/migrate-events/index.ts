import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_STATUS_VALUES,
  CampaignStatus,
  EventType,
  OCCUPANCY_LABELS,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { compactUndefined } from '@zerologementvacant/utils';
import async from 'async';
import { Array, pipe } from 'effect';
import { Readable } from 'node:stream';
import { WritableStream } from 'node:stream/web';
import { match, Pattern } from 'ts-pattern';
import { v4 as uuidv4 } from 'uuid';
import { batch } from 'web-streams-utils';
import { string } from 'yup';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import {
  CampaignHousingEventApi,
  EventApi,
  HousingOwnerEventApi
} from '~/models/EventApi';
import {
  HOUSING_OWNER_EQUIVALENCE,
  HOUSING_OWNER_RANK_EQUIVALENCE,
  HousingOwnerApi
} from '~/models/HousingOwnerApi';
import { CampaignDBO, Campaigns } from '~/repositories/campaignRepository';
import eventRepository, {
  EventRecordDBO,
  Events,
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import {
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { compose, createUpdater } from '~/scripts/import-lovac/infra/updater';

const logger = createLogger('migrate-events');

async function run(): Promise<void> {
  const campaigns: Map<CampaignDBO['id'], CampaignDBO> = await Campaigns().then(
    (campaigns) => {
      return new Map(campaigns.map((campaign) => [campaign.id, campaign]));
    }
  );

  const eventUpdater = createUpdater<EventRecordDBO<EventType>>({
    destination: 'database',
    temporaryTable: 'event_updates_tmp',
    likeTable: 'events',
    async update(events): Promise<void> {
      logger.debug('Updating events...', {
        events: events.length
      });

      const temporaryTable = 'event_updates_tmp';
      await Events()
        .update({
          // @ts-expect-error: knex’s types are bad
          type: db.ref(`${temporaryTable}.type`),
          // @ts-expect-error: knex’s types are bad
          next_old: db.ref(`${temporaryTable}.next_old`),
          // @ts-expect-error: knex’s types are bad
          next_new: db.ref(`${temporaryTable}.next_new`)
        })
        .updateFrom(temporaryTable)
        .where(`${EVENTS_TABLE}.id`, db.ref(`${temporaryTable}.id`))
        .whereIn(
          `${temporaryTable}.id`,
          events.map((event) => event.id)
        );
    }
  }).getWriter();

  // A stream that removes events in batch
  const eventRemover = compose(
    new WritableStream<EventApi<EventType>['id'][]>({
      async write(ids) {
        logger.debug('Removing events...', {
          events: ids.length
        });
        await Events().whereIn('id', ids).delete();
      }
    }),
    batch<EventApi<EventType>['id']>(1000)
  ).getWriter();

  const housingOwnerEventsCreator = compose(
    new WritableStream<ReadonlyArray<HousingOwnerEventApi>>({
      async write(events) {
        await eventRepository.insertManyHousingOwnerEvents(events);
      }
    }),
    batch<HousingOwnerEventApi>(1000)
  ).getWriter();

  const campaignHousingEventsCreator = compose(
    new WritableStream<ReadonlyArray<CampaignHousingEventApi>>({
      async write(events) {
        await eventRepository.insertManyCampaignHousingEvents(events);
      }
    }),
    batch<CampaignHousingEventApi>(1000)
  ).getWriter();

  const stream = Events()
    .select(`${EVENTS_TABLE}.*`)
    // Fetch related housing events to get their up-to-date geo codes
    // because the INSEE code might have changed
    .leftJoin(
      `${HOUSING_EVENTS_TABLE}`,
      `${HOUSING_EVENTS_TABLE}.event_id`,
      `${EVENTS_TABLE}.id`
    )
    .select(
      `${HOUSING_EVENTS_TABLE}.housing_geo_code`,
      `${HOUSING_EVENTS_TABLE}.housing_id`
    )
    .stream();

  await Readable.toWeb(stream)
    .pipeThrough(
      progress({
        name: 'Migration des événements',
        initial: 0,
        total: 18_189_561
      })
    )
    .pipeTo(
      new WritableStream({
        async write(event) {
          await match(event)
            .returnType<Promise<void>>()
            .with(
              { name: 'Modification arborescence de suivi' },
              async (event: any) => {
                await eventRemover.write(event.id);
              }
            )
            .with({ name: 'Absent du millésime 2023' }, async (event: any) => {
              await eventRemover.write(event.id);
            })
            .with(
              { name: 'Changement de propriétaires' },
              async (event: any) => {
                // Retrieve the actual housing
                // that should be attached to this event
                const housingGeoCode: string | null = event.housing_geo_code;
                const housingId: string =
                  event.housing_id ??
                  event.new[0].housingId ??
                  event.old[0].housingId;
                const department: string | undefined =
                  event.new[0].housingGeoCode?.substring(0, 2)?.toLowerCase();
                const table = department
                  ? `${housingTable}_${department}`
                  : housingTable;
                const housing: Pick<HousingRecordDBO, 'id' | 'geo_code'> =
                  !housingGeoCode
                    ? await db(table)
                        .where({ id: housingId })
                        .select('id', 'geo_code')
                        .first()
                    : null;
                const geoCode: string = housingGeoCode ?? housing.geo_code;
                const id: string = housingId ?? housing.id;

                const substract = Array.differenceWith(
                  HOUSING_OWNER_EQUIVALENCE
                );
                const added = substract(event.new, event.old);
                const removed = substract(event.old, event.new);
                const updated = pipe(
                  Array.intersectionWith(HOUSING_OWNER_EQUIVALENCE)(
                    event.old,
                    event.new
                  ),
                  Array.filter((housingOwner) => {
                    return !Array.containsWith(HOUSING_OWNER_RANK_EQUIVALENCE)(
                      event.new,
                      housingOwner
                    );
                  })
                );
                const events = [
                  ...added.map<HousingOwnerEventApi>((housingOwner) => {
                    return {
                      id: uuidv4(),
                      name: 'Propriétaire ajouté au logement',
                      type: 'housing:owner-attached',
                      // Keep the same creation date and creator as the original event
                      createdAt: event.created_at,
                      createdBy: event.created_by,
                      nextOld: null,
                      nextNew: {
                        name: housingOwner.fullName,
                        rank: housingOwner.rank
                      },
                      ownerId: housingOwner.ownerId,
                      housingGeoCode: geoCode,
                      housingId: id
                    };
                  }),
                  ...removed.map<HousingOwnerEventApi>((housingOwner) => {
                    return {
                      id: uuidv4(),
                      name: 'Propriétaire retiré du logement',
                      type: 'housing:owner-detached',
                      createdAt: event.created_at,
                      createdBy: event.created_by,
                      nextOld: {
                        name: housingOwner.fullName,
                        rank: housingOwner.rank
                      },
                      nextNew: null,
                      ownerId: housingOwner.ownerId,
                      housingGeoCode: geoCode,
                      housingId: id
                    };
                  }),
                  ...updated.flatMap<HousingOwnerEventApi>((housingOwner) => {
                    const newHousingOwner: HousingOwnerApi | undefined =
                      event.new.find((ho: HousingOwnerApi) =>
                        HOUSING_OWNER_EQUIVALENCE(ho, housingOwner)
                      );
                    if (!newHousingOwner) {
                      logger.warn(
                        `Housing owner ${housingOwner.ownerId} not found in new owners`
                      );
                      return [];
                    }

                    return {
                      id: uuidv4(),
                      name: 'Propriétaire mis à jour',
                      type: 'housing:owner-updated',
                      createdAt: event.created_at,
                      createdBy: event.created_by,
                      nextOld: {
                        name: housingOwner.fullName,
                        rank: housingOwner.rank
                      },
                      nextNew: {
                        name: newHousingOwner.fullName,
                        rank: newHousingOwner.rank
                      },
                      ownerId: housingOwner.ownerId,
                      housingGeoCode: geoCode,
                      housingId: id
                    };
                  })
                ];
                await async.forEach(events, async (event) => {
                  await housingOwnerEventsCreator.write(event);
                });
              }
            )
            .with(
              // Match with `type: 'empty'` to avoid mixing old and new events
              { name: 'Ajout dans une campagne', type: 'empty' },
              async (event: any) => {
                // Fetch the actual housing
                // because the INSEE code might have changed
                // due to a fusion/separation of township
                const geoCode = event.new.geoCode.substring(0, 2).toLowerCase();
                const housing:
                  | Pick<HousingRecordDBO, 'geo_code' | 'id'>
                  | undefined = await db(`fast_housing_${geoCode}`)
                  .select('geo_code', 'id')
                  .where('id', event.new.id)
                  .first();
                if (!housing) {
                  logger.warn('Housing not found', {
                    geoCode: event.new.geoCode,
                    id: event.new.id
                  });
                  return;
                }

                if (event.new.campaignIds.length === 0) {
                  await campaignHousingEventsCreator.write({
                    id: uuidv4(),
                    name: 'Ajout dans une campagne',
                    type: 'housing:campaign-attached',
                    nextOld: null,
                    nextNew: {
                      name: null
                    },
                    createdAt: event.created_at,
                    createdBy: event.created_by,
                    campaignId: null,
                    housingGeoCode: housing.geo_code,
                    housingId: housing.id
                  });
                  return;
                }

                const diff: ReadonlyArray<string> = Array.difference(
                  event.new.campaignIds,
                  event.old.campaignIds
                );
                const campaign = campaigns.get(diff[0]);
                if (!campaign) {
                  logger.warn(
                    `Campaign ${diff[0]} not found for event ${event.id}`
                  );
                  return;
                }

                await campaignHousingEventsCreator.write({
                  id: uuidv4(),
                  name: 'Ajout dans une campagne',
                  type: 'housing:campaign-attached',
                  nextOld: null,
                  nextNew: {
                    name: campaign.title
                  },
                  createdAt: event.created_at,
                  createdBy: event.created_by,
                  campaignId: campaign.id,
                  housingGeoCode: housing.geo_code,
                  housingId: housing.id
                });
              }
            )
            .with({ name: 'Suppression d’un groupe' }, async (event: any) => {
              await eventUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-removed',
                created_at: event.created_at,
                created_by: event.created_by,
                next_old: {
                  name: event.old.title
                },
                next_new: null
              });
            })
            .with(
              { name: 'Changement de statut de suivi' },
              async (event: any) => {
                await eventUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'housing:status-updated',
                  created_at: event.created_at,
                  created_by: event.created_by,
                  next_old: compactUndefined({
                    status:
                      event.old.status !== event.new.status
                        ? event.old.status
                        : undefined,
                    subStatus:
                      event.old.subStatus !== event.new.subStatus
                        ? event.old.subStatus
                        : undefined
                  }),
                  next_new: compactUndefined({
                    status:
                      event.old.status !== event.new.status
                        ? event.new.status
                        : undefined,
                    subStatus:
                      event.old.subStatus !== event.new.subStatus
                        ? event.new.subStatus
                        : undefined
                  })
                });
              }
            )
            .with(
              {
                name: Pattern.union(
                  'Changement de statut d’occupation',
                  "Modification du statut d'occupation"
                )
              },
              async (event: any) =>
                await eventUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'housing:occupancy-updated',
                  created_at: event.created_at,
                  created_by: event.created_by,
                  next_old: compactUndefined({
                    occupancy: !event.old
                      ? null
                      : event.old.occupancy !== event.new.occupancy
                        ? // @ts-expect-error: event.old.occupancy is not typed
                          OCCUPANCY_LABELS[event.old.occupancy]
                        : undefined,
                    occupancyIntended:
                      !!event.old &&
                      event.old.occupancyIntended !==
                        event.new.occupancyIntended
                        ? // @ts-expect-error: event.old.occupancyIntended is not typed
                          OCCUPANCY_LABELS[event.old.occupancyIntended]
                        : undefined
                  }),
                  next_new: compactUndefined({
                    occupancy:
                      event.old?.occupancy !== event.new.occupancy
                        ? // @ts-expect-error: event.new.occupancy is not typed
                          OCCUPANCY_LABELS[event.new.occupancy]
                        : undefined,
                    occupancyIntended:
                      event.old?.occupancyIntended !==
                      event.new.occupancyIntended
                        ? // @ts-expect-error: event.new.occupancyIntended is not typed
                          OCCUPANCY_LABELS[event.new.occupancyIntended]
                        : undefined
                  })
                })
            )
            .with(
              { name: 'Changement de propriétaire principal' },
              async (event: any) => {
                await eventRemover.write(event.id);
              }
            )
            .with({ name: 'Ajout dans un groupe' }, async (event: any) => {
              string().required().trim().min(1).validateSync(event.new.title);

              await eventUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-attached',
                created_at: event.created_at,
                created_by: event.created_by,
                next_old: null,
                next_new: {
                  name: event.new.title
                }
              });
            })
            .with({ name: 'Archivage d’un groupe' }, async (event: any) => {
              await eventUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-archived',
                created_at: event.created_at,
                created_by: event.created_by,
                next_old: {
                  name: event.old.title
                },
                next_new: null
              });
            })
            .with({ name: 'Retrait d’un groupe' }, async (event: any) => {
              await eventUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-removed',
                created_at: event.created_at,
                created_by: event.created_by,
                next_old: {
                  name: event.old.title
                },
                next_new: null
              });
            })
            .with(
              { name: 'Modification de coordonnées' },
              async (event: any) => {
                await eventUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'owner:updated',
                  created_at: event.created_at,
                  created_by: event.created_by,
                  next_old: compactUndefined({
                    name:
                      event.old.fullName !== event.new.fullName
                        ? event.old.fullName
                        : undefined,
                    email:
                      event.old.email !== event.new.email
                        ? event.old.email
                        : undefined,
                    phone:
                      event.old.phone !== event.new.phone
                        ? event.old.phone
                        : undefined
                  }),
                  next_new: compactUndefined({
                    name:
                      event.old.fullName !== event.new.fullName
                        ? event.new.fullName
                        : undefined,
                    email:
                      event.old.email !== event.new.email
                        ? event.new.email
                        : undefined,
                    phone:
                      event.old.phone !== event.new.phone
                        ? event.new.phone
                        : undefined
                  })
                });
              }
            )
            .with(
              {
                name: 'Conflit d’informations venant d’une source externe concernant le statut d’occupation'
              },
              async (event: any) => {
                await eventRemover.write(event.id);
              }
            )
            .with({ name: "Modification d'identité" }, async (event: any) => {
              await eventUpdater.write({
                id: event.id,
                name: event.name,
                type: 'owner:updated',
                created_at: event.created_at,
                created_by: event.created_by,
                next_old: compactUndefined({
                  name:
                    event.old.fullName !== event.new.fullName
                      ? event.old.fullName
                      : undefined,
                  birthdate:
                    event.old.birthdate !== event.new.birthdate
                      ? event.old.birthdate.substring(0, 'yyyy-mm-dd'.length)
                      : undefined
                }),
                next_new: compactUndefined({
                  name:
                    event.old.fullName !== event.new.fullName
                      ? event.new.fullName
                      : undefined,
                  birthdate:
                    event.old.birthdate !== event.new.birthdate
                      ? event.new.birthdate.substring(0, 'yyyy-mm-dd'.length)
                      : undefined
                })
              });
            })
            .with(
              { name: 'Modification du statut de la campagne' },
              async (event: any) => {
                const getStatus = (campaign: any) =>
                  match(campaign.status)
                    .when(
                      (status) => CAMPAIGN_STATUS_VALUES.includes(status),
                      (status: CampaignStatus) => CAMPAIGN_STATUS_LABELS[status]
                    )
                    .when(
                      (status) => status === undefined,
                      () => {
                        return null;
                      }
                    )
                    .otherwise(() => {
                      throw new Error('Unknown campaign status');
                    });

                const before = getStatus(event.old);
                const after = getStatus(event.new);

                if (!before || !after) {
                  await eventRemover.write(event.id);
                  return;
                }

                await eventUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'campaign:updated',
                  created_at: event.created_at,
                  created_by: event.created_by,
                  next_old: {
                    status: before
                  },
                  next_new: {
                    status: after
                  }
                });
              }
            )
            .with({ name: 'Création du logement' }, async (event: any) => {
              string()
                .required()
                .trim()
                .oneOf(OCCUPANCY_VALUES)
                .validateSync(event.new.occupancy);

              await eventUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:created',
                created_at: event.created_at,
                created_by: event.created_by,
                next_old: null,
                next_new: {
                  source: 'datafoncier-manual',
                  // @ts-expect-error: event.new.occupancy is not typed
                  occupancy: OCCUPANCY_LABELS[event.new.occupancy]
                }
              });
            })
            .with(
              { name: "Création d'un nouveau propriétaire" },
              async (event: any) => {
                string()
                  .required()
                  .trim()
                  .min(1)
                  .validateSync(event.new.fullName);

                await eventUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'owner:created',
                  created_at: event.created_at,
                  created_by: event.created_by,
                  next_old: null,
                  next_new: {
                    name: event.new.fullName,
                    birthdate:
                      event.new.birthdate &&
                      event.new.birthdate.length > 0 &&
                      event.new.birthdate !== '0001-01-01T00:00:00.000Z'
                        ? event.new.birthdate.substring(0, 'yyyy-mm-dd'.length)
                        : null,
                    email: event.new.email?.length ? event.new.email : null,
                    phone: event.new.phone?.length ? event.new.phone : null,
                    address: event.new.rawAddress?.length
                      ? event.new.rawAddress
                      : null,
                    additionalAddress: null
                  }
                });
              }
            )
            .with(
              {
                name: 'Conflit d’informations possible venant d’une source externe concernant le propriétaire et/ou la propriété'
              },
              async (event: any) => {
                await eventRemover.write(event.id);
              }
            )
            .otherwise(() => Promise.resolve());
        },

        async close() {
          logger.info('Closing streams...');
          await eventUpdater.close();
          await eventRemover.close();
          await housingOwnerEventsCreator.close();
          await campaignHousingEventsCreator.close();
        },

        async abort() {
          logger.info('Aborting streams...');
          await eventUpdater.abort();
          await eventRemover.abort();
          await housingOwnerEventsCreator.abort();
          await campaignHousingEventsCreator.abort();
        }
      })
    );
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error(error);
  });
