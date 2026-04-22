import { EventType } from '@zerologementvacant/models';
import { TransformStream } from 'node:stream/web';
import db from '~/infra/database';
import {
  EventRecordDBO,
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE
} from '~/repositories/eventRepository';
import { HousingRecordDBO, housingTable } from '~/repositories/housingRepository';
import {
  HOUSING_NOTES_TABLE,
  NoteRecordDBO,
  NOTES_TABLE
} from '~/repositories/noteRepository';
import { SourceHousing } from './source-housing';

const CHUNK_SIZE = 500;

interface HousingEnrichment {
  housing: HousingRecordDBO | null;
  events: ReadonlyArray<EventRecordDBO<EventType>>;
  notes: ReadonlyArray<NoteRecordDBO>;
}

export type EnrichedSourceHousing = {
  source: SourceHousing;
  existing: HousingEnrichment;
};

export function createSourceHousingEnricher(): TransformStream<
  SourceHousing,
  EnrichedSourceHousing
> {
  const buffer: SourceHousing[] = [];

  async function flushBuffer(
    controller: TransformStreamDefaultController<EnrichedSourceHousing>
  ): Promise<void> {
    if (buffer.length === 0) return;
    const chunk = buffer.splice(0);

    const rows = await db(housingTable)
      .select(`${housingTable}.*`)
      .select(
        db.raw(`COALESCE(
          json_agg(DISTINCT to_jsonb(${EVENTS_TABLE}.*)) FILTER (WHERE ${EVENTS_TABLE}.id IS NOT NULL),
          '[]'
        ) AS events`)
      )
      .select(
        db.raw(`COALESCE(
          json_agg(DISTINCT to_jsonb(${NOTES_TABLE}.*)) FILTER (WHERE ${NOTES_TABLE}.id IS NOT NULL),
          '[]'
        ) AS notes`)
      )
      .leftJoin(HOUSING_EVENTS_TABLE, (join) => {
        join
          .on(`${HOUSING_EVENTS_TABLE}.housing_geo_code`, `${housingTable}.geo_code`)
          .on(`${HOUSING_EVENTS_TABLE}.housing_id`, `${housingTable}.id`);
      })
      .leftJoin(EVENTS_TABLE, (join) => {
        join
          .on(`${EVENTS_TABLE}.id`, `${HOUSING_EVENTS_TABLE}.event_id`)
          .onIn(`${EVENTS_TABLE}.type`, [
            'housing:occupancy-updated',
            'housing:status-updated'
          ]);
      })
      .leftJoin(HOUSING_NOTES_TABLE, (join) => {
        join
          .on(`${HOUSING_NOTES_TABLE}.housing_geo_code`, `${housingTable}.geo_code`)
          .on(`${HOUSING_NOTES_TABLE}.housing_id`, `${housingTable}.id`);
      })
      .leftJoin(NOTES_TABLE, `${NOTES_TABLE}.id`, `${HOUSING_NOTES_TABLE}.note_id`)
      .whereIn(
        [`${housingTable}.geo_code`, `${housingTable}.local_id`],
        chunk.map((s) => [s.geo_code, s.local_id])
      )
      .groupBy(`${housingTable}.geo_code`, `${housingTable}.id`) as Array<
      HousingRecordDBO & {
        events: EventRecordDBO<EventType>[];
        notes: NoteRecordDBO[];
      }
    >;

    const byKey = new Map(
      rows.map((r) => [`${r.geo_code}:${r.local_id}`, r])
    );

    for (const source of chunk) {
      const row = byKey.get(`${source.geo_code}:${source.local_id}`);
      if (!row) {
        controller.enqueue({
          source,
          existing: { housing: null, events: [], notes: [] }
        });
      } else {
        const { events, notes, ...housing } = row;
        controller.enqueue({
          source,
          existing: {
            housing: housing as HousingRecordDBO,
            events,
            notes
          }
        });
      }
    }
  }

  return new TransformStream<SourceHousing, EnrichedSourceHousing>({
    async transform(source, controller) {
      buffer.push(source);
      if (buffer.length >= CHUNK_SIZE) {
        await flushBuffer(controller);
      }
    },
    async flush(controller) {
      await flushBuffer(controller);
    }
  });
}
