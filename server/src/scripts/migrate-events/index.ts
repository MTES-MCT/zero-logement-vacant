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
import { Events } from '~/repositories/eventRepository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { compose } from '~/scripts/import-lovac/infra/updater';

const logger = createLogger('migrate-events');

async function run(): Promise<void> {
  const campaigns: Map<CampaignDBO['id'], CampaignDBO> = await Campaigns().then(
    (campaigns) => {
      return new Map(campaigns.map((campaign) => [campaign.id, campaign]));
    }
  );

  const eventUpdater = compose(
    new WritableStream<EventApi<EventType>[]>({
      async write(events) {
        // TODO: update events in batch
        logger.debug('Updating events...', {
          events: events.length
        });
      }
    }),
    batch<EventApi<EventType>>(1000)
  ).getWriter();

  // A stream that removes events in batch
  const eventRemover = compose(
    new WritableStream<EventApi<EventType>['id'][]>({
      async write(ids) {
        logger.debug('Removing events...', {
          events: ids.length
        });
        // await Events().whereIn('id', ids).delete();
      }
    }),
    batch<EventApi<EventType>['id']>(1000)
  ).getWriter();

  const housingOwnerEventsCreator = compose(
    new WritableStream<ReadonlyArray<HousingOwnerEventApi>>({
      async write(events) {
        logger.debug('Inserting housing owner events...', {
          events: events.length
        });
        // await eventRepository.insertManyHousingOwnerEvents(events);
      }
    }),
    batch<HousingOwnerEventApi>(1000)
  ).getWriter();

  const campaignHousingEventsWriter = new WritableStream<
    ReadonlyArray<CampaignHousingEventApi>
  >({
    async write(events) {
      logger.debug('Inserting campaign housing events...', {
        events: events.length
      });
      // await eventRepository.insertManyCampaignHousingEvents(events);
    }
  });
  const campaignHousingEventsCreator = compose(
    campaignHousingEventsWriter,
    batch<CampaignHousingEventApi>(1000)
  ).getWriter();

  const groupHousingEventsUpdater = eventUpdater;

  const housingEventsUpdater = eventUpdater;

  await Readable.toWeb(Events().stream())
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
                      housingGeoCode: housingOwner.housingGeoCode,
                      housingId: housingOwner.housingId
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
                      housingGeoCode: housingOwner.housingGeoCode,
                      housingId: housingOwner.housingId
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
                      housingGeoCode: housingOwner.housingGeoCode,
                      housingId: housingOwner.housingId
                    };
                  })
                ];
                await async.forEach(events, async (event) => {
                  await housingOwnerEventsCreator.write(event);
                });
              }
            )
            .with({ name: 'Ajout dans une campagne' }, async (event: any) => {
              if (event.new.campaignIds.length === 0) {
                await campaignHousingEventsCreator.write({
                  id: uuidv4(),
                  name: 'Ajout dans une campagne',
                  type: 'housing:campaign-attached',
                  nextOld: null,
                  nextNew: {
                    // @ts-expect-error: event.new.campaignIds is not typed
                    name: null
                  },
                  createdAt: event.created_at,
                  createdBy: event.created_by,
                  campaignId: null,
                  housingGeoCode: event.new.id,
                  housingId: event.new.geoCode
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
                housingGeoCode: event.new.id,
                housingId: event.new.geoCode
              });
            })
            .with({ name: 'Suppression d’un groupe' }, async (event: any) => {
              await groupHousingEventsUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-removed',
                createdAt: event.created_at,
                createdBy: event.created_by,
                nextOld: {
                  name: event.old.title
                },
                nextNew: null
              });
            })
            .with(
              { name: 'Changement de statut de suivi' },
              async (event: any) => {
                await housingEventsUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'housing:status-updated',
                  createdAt: event.created_at,
                  createdBy: event.created_by,
                  nextOld: compactUndefined({
                    status:
                      event.old.status !== event.new.status
                        ? event.old.status
                        : undefined,
                    subStatus:
                      event.old.subStatus !== event.new.subStatus
                        ? event.old.subStatus
                        : undefined
                  }),
                  nextNew: compactUndefined({
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
                await housingEventsUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'housing:occupancy-updated',
                  createdAt: event.created_at,
                  createdBy: event.created_by,
                  nextOld: compactUndefined({
                    occupancy:
                      event.old.occupancy !== event.new.occupancy
                        ? // @ts-expect-error: event.old.occupancy is not typed
                          OCCUPANCY_LABELS[event.old.occupancy]
                        : undefined,
                    occupancyIntended:
                      event.old.occupancyIntended !==
                      event.new.occupancyIntended
                        ? // @ts-expect-error: event.old.occupancyIntended is not typed
                          OCCUPANCY_LABELS[event.old.occupancyIntended]
                        : undefined
                  }),
                  nextNew: compactUndefined({
                    occupancy:
                      event.old.occupancy !== event.new.occupancy
                        ? // @ts-expect-error: event.new.occupancy is not typed
                          OCCUPANCY_LABELS[event.new.occupancy]
                        : undefined,
                    occupancyIntended:
                      event.old.occupancyIntended !==
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

              await groupHousingEventsUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-attached',
                createdAt: event.created_at,
                createdBy: event.created_by,
                nextOld: null,
                nextNew: {
                  name: event.new.title
                }
              });
            })
            .with({ name: 'Archivage d’un groupe' }, async (event: any) => {
              await groupHousingEventsUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-archived',
                createdAt: event.created_at,
                createdBy: event.created_by,
                nextOld: {
                  name: event.old.title
                },
                nextNew: null
              });
            })
            .with({ name: 'Retrait d’un groupe' }, async (event: any) => {
              await groupHousingEventsUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:group-removed',
                createdAt: event.created_at,
                createdBy: event.created_by,
                nextOld: {
                  name: event.old.title
                },
                nextNew: null
              });
            })
            .with(
              { name: 'Modification de coordonnées' },
              async (event: any) => {
                await eventUpdater.write({
                  id: event.id,
                  name: event.name,
                  type: 'owner:updated',
                  createdAt: event.created_at,
                  createdBy: event.created_by,
                  nextOld: compactUndefined({
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
                  nextNew: compactUndefined({
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
                createdAt: event.created_at,
                createdBy: event.created_by,
                nextOld: compactUndefined({
                  name:
                    event.old.fullName !== event.new.fullName
                      ? event.old.fullName
                      : undefined,
                  birthdate:
                    event.old.birthdate !== event.new.birthdate
                      ? event.old.birthdate.substring(0, 'yyyy-mm-dd'.length)
                      : undefined
                }),
                nextNew: compactUndefined({
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
                  createdAt: event.created_at,
                  createdBy: event.created_by,
                  nextOld: {
                    status: before
                  },
                  nextNew: {
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

              await housingEventsUpdater.write({
                id: event.id,
                name: event.name,
                type: 'housing:created',
                createdAt: event.created_at,
                createdBy: event.created_by,
                nextOld: null,
                nextNew: {
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
                  createdAt: event.created_at,
                  createdBy: event.created_by,
                  nextOld: null,
                  nextNew: {
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
            .otherwise(Promise.resolve);
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

run().catch((error) => {
  logger.error(error);
});
